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
      checkoutDate
    } = req.body || {};

    if (
      !to ||
      !propertyName ||
      !checkoutDate
    ) {
      return res.status(400).json({
        error:
          "Missing cleaner email, property name, or checkout date"
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

    const subject =
      `Cleaning needed — ${propertyName} — ${checkoutDate}`;

    const html = `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.6;
        color: #172334;
      ">
        <h2 style="color:#0d2b4d;">
          Down the Shore
        </h2>

        <p>
          Hi ${displayName},
        </p>

        <p>
          A cleaning is needed for:
        </p>

        <p>
          <strong>${propertyName}</strong><br>
          Checkout date: <strong>${checkoutDate}</strong>
          ${
            guestName
              ? `<br>Guest: ${guestName}`
              : ""
          }
        </p>

        <p>
          Please reply to Janis to confirm that you can handle this cleaning.
        </p>

        <p>
          Thank you!
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
      data
    });

  } catch (error) {
    console.error(
      "cleaning-assigned error:",
      error
    );

    return res.status(500).json({
      error:
        "Internal server error"
    });
  }
}
