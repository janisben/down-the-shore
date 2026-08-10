export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      to,
      guestName,
      propertyName,
      arrivalDate,
      departureDate,
      holdExpiresAt,
      paymentUrl
    } = req.body || {};

    if (
      !to ||
      !propertyName ||
      !arrivalDate ||
      !departureDate ||
      !holdExpiresAt ||
      !paymentUrl
    ) {
      return res.status(400).json({
        error:
          "Missing required reservation information"
      });
    }

    if (
      !process.env.RESEND_API_KEY
    ) {
      return res.status(500).json({
        error:
          "RESEND_API_KEY is not configured"
      });
    }

    const formatDate =
      value =>
        new Date(
          `${value}T12:00:00`
        ).toLocaleDateString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric"
          }
        );

    const holdExpiration =
      new Date(
        holdExpiresAt
      ).toLocaleString(
        "en-US",
        {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }
      );

    const safe =
      value =>
        String(
          value ?? ""
        )
          .replaceAll(
            "&",
            "&amp;"
          )
          .replaceAll(
            "<",
            "&lt;"
          )
          .replaceAll(
            ">",
            "&gt;"
          )
          .replaceAll(
            '"',
            "&quot;"
          )
          .replaceAll(
            "'",
            "&#039;"
          );

    const subject =
      `Your dates are approved — ${propertyName}`;

    const html = `
      <div style="
        max-width:640px;
        margin:0 auto;
        font-family:Arial,Helvetica,sans-serif;
        line-height:1.6;
        color:#172334;
      ">

        <h1 style="
          font-family:Georgia,'Times New Roman',serif;
          font-weight:400;
          color:#0d2b4d;
        ">
          Great news — your dates are approved.
        </h1>

        <p>
          Hi ${safe(
            guestName ||
            "there"
          )},
        </p>

        <p>
          Your reservation request for
          <strong>
            ${safe(propertyName)}
          </strong>
          has been approved.
        </p>

        <div style="
          background:#f7f4ef;
          padding:20px;
          margin:24px 0;
        ">

          <p style="margin:0 0 8px;">
            <strong>
              ${safe(
                formatDate(
                  arrivalDate
                )
              )}
              –
              ${safe(
                formatDate(
                  departureDate
                )
              )}
            </strong>
          </p>

          <p style="margin:0;">
            Your reservation is being
            held for you for
            <strong>24 hours</strong>.
          </p>

          <p style="margin:8px 0 0;">
            Your hold expires
            <strong>
              ${safe(
                holdExpiration
              )}
            </strong>.
          </p>

        </div>

        <p>
          Complete your credit-card
          payment using the secure
          Stripe payment button below.
        </p>

        <p style="
          margin:28px 0;
          text-align:center;
        ">
          <a
            href="${safe(paymentUrl)}"
            style="
              display:inline-block;
              padding:14px 24px;
              background:#0d2b4d;
              color:#ffffff;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold;
            "
          >
            Pay securely by credit card
          </a>
        </p>

        <p>
          Please complete the required
          lease and payment steps before
          the hold expires. If the
          reservation requirements are
          not completed within the
          24-hour hold period, the dates
          may be released.
        </p>

        <p>
          Thank you,<br>
          Janis<br>
          Down the Shore
        </p>

        <p style="
          margin-top:30px;
          font-size:12px;
          color:#6f7782;
        ">
          Owner is a New Jersey licensed
          real estate broker,
          License No. 1756109.
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

          body:
            JSON.stringify({
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
        "Reservation approval email error:",
        data
      );

      return res
        .status(
          response.status
        )
        .json({
          error:
            "Approval email failed",

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
      "reservation-approved error:",
      error
    );

    return res.status(500).json({
      error:
        "Internal server error"
    });
  }
}
