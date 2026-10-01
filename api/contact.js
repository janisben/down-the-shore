function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      name = "",
      email = "",
      phone = "",
      message = "",
      property = "",
      website = ""
    } = req.body || {};

    // Silently accept bot submissions that fill the hidden field.
    if (website) {
      return res.status(200).json({ success: true });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim();
    const cleanPhone = String(phone).trim();
    const cleanMessage = String(message).trim();
    const cleanProperty = String(property).trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return res.status(400).json({
        error: "Please enter your name, email, and message."
      });
    }

    if (
      cleanName.length > 120 ||
      cleanEmail.length > 254 ||
      cleanPhone.length > 40 ||
      cleanProperty.length > 120 ||
      cleanMessage.length > 4000 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        error: "Please check the information you entered."
      });
    }

    if (
      !process.env.RESEND_API_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      return res.status(500).json({
        error: "Email service is not configured."
      });
    }

    const settingsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/payment_settings?select=zelle_recipient&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`
        }
      }
    );

    if (!settingsResponse.ok) {
      console.error(
        "Contact recipient lookup failed:",
        await settingsResponse.text()
      );

      return res.status(500).json({
        error: "Your message could not be sent. Please try again."
      });
    }

    const settingsRows = await settingsResponse.json();
    const ownerEmail = String(
      settingsRows[0]?.zelle_recipient || ""
    ).trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      console.error("A valid private contact recipient is not configured.");
      return res.status(500).json({
        error: "Your message could not be sent. Please try again."
      });
    }

    const subject = cleanProperty
      ? `Website message — ${cleanProperty}`
      : "Website message — Down the Shore";

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#24231f;max-width:640px">
        <h2 style="font-family:Georgia,serif;font-weight:400">New Down the Shore message</h2>
        ${cleanProperty ? `<p><strong>Property:</strong> ${escapeHtml(cleanProperty)}</p>` : ""}
        <p><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
        ${cleanPhone ? `<p><strong>Phone:</strong> ${escapeHtml(cleanPhone)}</p>` : ""}
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(cleanMessage)}</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Down the Shore <bookings@mail.downtheshore.me>",
        to: [ownerEmail],
        reply_to: cleanEmail,
        subject,
        html
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Contact email failed:", responseData);
      return res.status(response.status).json({
        error: "Your message could not be sent. Please try again."
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({
      error: "Your message could not be sent. Please try again."
    });
  }
}
