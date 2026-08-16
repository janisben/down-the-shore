function siteOrigin(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, "");
  }

  const host =
    req.headers["x-forwarded-host"] ||
    req.headers.host;

  const protocol =
    req.headers["x-forwarded-proto"] ||
    "https";

  return `${protocol}://${host}`;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      to,
      cleanerName,
      propertyName,
      guestName,
      checkoutDate,
      confirmationToken
    } = req.body || {};

    if (
      !to ||
      !propertyName ||
      !checkoutDate ||
      !confirmationToken
    ) {
      return res.status(400).json({
        error:
          "Missing cleaner email, property name, checkout date, or confirmation token"
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error:
          "RESEND_API_KEY is not configured"
      });
    }

    const displayName =
      cleanerName || "there";

    const confirmationUrl =
      `${siteOrigin(req)}/cleaning-confirm.html?token=${encodeURIComponent(
        confirmationToken
      )}`;

    const subject =
      `Cleaning needed — ${propertyName} — ${checkoutDate}`;

    const html = `
      <div style="
        font-family:Arial,Helvetica,sans-serif;
        max-width:600px;
        margin:0 auto;
        line-height:1.6;
        color:#172334;
      ">
        <h2 style="
          color:#0d2b4d;
          font-family:Georgia,'Times New Roman',serif;
          font-weight:400;
        ">
          Down the Shore
        </h2>

        <p>
          Hi ${esc(displayName)},
        </p>

        <p>
          A cleaning is needed for:
        </p>

        <div style="
          background:#f7f4ef;
          padding:18px;
          margin:20px 0;
        ">
          <strong>
            ${esc(propertyName)}
          </strong>

          <br>

          Checkout date:
          <strong>
            ${esc(checkoutDate)}
          </strong>

          ${
            guestName
              ? `
                <br>
                Guest:
                ${esc(guestName)}
              `
              : ""
          }
        </div>

        <p>
          Please confirm that you can handle this cleaning.
        </p>

        <p style="margin:24px 0;">
          <a
            href="${esc(confirmationUrl)}"
            style="
              display:inline-block;
              background:#0d2b4d;
              color:#ffffff;
              text-decoration:none;
              padding:13px 20px;
              border-radius:6px;
              font-weight:bold;
            "
          >
            Confirm cleaning
          </a>
        </p>

        <p>
          Thank you!<br>
          Janis<br>
          Down the Shore
        </p>
      </div>
    `;

    const response =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.RESEND_API_KEY}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            from:
              "Down the Shore <bookings@mail.downtheshore.me>",

            to: [to],

            subject,

            html
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Cleaner email Resend error:",
        data
      );

      return res
        .status(response.status)
        .json({
          error:
            "Cleaner email failed",

          details:
            data
        });
    }

    return res.status(200).json({
      success: true,
      confirmationUrl,
      data
    });

  } catch (error) {
    console.error(
      "cleaning-assigned error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Internal server error"
    });
  }
}
