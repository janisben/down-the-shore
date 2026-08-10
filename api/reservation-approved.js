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
      !process.env.RESEND_API_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      return res.status(500).json({
        error:
          "Server configuration is incomplete"
      });
    }

    const paymentSettingsResponse =
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/payment_settings?select=zelle_recipient,venmo_url,check_payee,check_mailing_address&limit=1`,
        {
          headers: {
            apikey:
              process.env.SUPABASE_SECRET_KEY
          }
        }
      );

    if (!paymentSettingsResponse.ok) {
      console.error(
        "Could not load payment settings:",
        await paymentSettingsResponse.text()
      );

      return res.status(500).json({
        error:
          "Could not load payment settings"
      });
    }

    const paymentSettingsRows =
      await paymentSettingsResponse.json();

    const paymentSettings =
      paymentSettingsRows[0] || {};

    const {
      zelle_recipient,
      venmo_url,
      check_payee,
      check_mailing_address
    } = paymentSettings;

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
            Your reservation is being held
            for you for
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

        <h2 style="
          font-family:Georgia,'Times New Roman',serif;
          font-weight:400;
          color:#0d2b4d;
          margin-top:30px;
        ">
          Choose your payment method
        </h2>

        <div style="
          border:1px solid #e5e7eb;
          padding:20px;
          margin:16px 0;
        ">

          <h3 style="
            margin:0 0 8px;
            color:#0d2b4d;
          ">
            Credit or debit card
          </h3>

          <p style="margin:0 0 18px;">
            Pay securely online through Stripe.
          </p>

          <p style="margin:0;">
            <a
              href="${safe(paymentUrl)}"
              style="
                display:inline-block;
                padding:13px 22px;
                background:#0d2b4d;
                color:#ffffff;
                text-decoration:none;
                border-radius:6px;
                font-weight:bold;
              "
            >
              Pay securely by card
            </a>
          </p>

        </div>

        ${
          zelle_recipient
            ? `
              <div style="
                border:1px solid #e5e7eb;
                padding:20px;
                margin:16px 0;
              ">

                <h3 style="
                  margin:0 0 8px;
                  color:#0d2b4d;
                ">
                  Zelle
                </h3>

                <p style="margin:0;">
                  Send your payment by Zelle to:
                  <strong>
                    ${safe(zelle_recipient)}
                  </strong>
                </p>

              </div>
            `
            : ""
        }

        ${
          venmo_url
            ? `
              <div style="
                border:1px solid #e5e7eb;
                padding:20px;
                margin:16px 0;
              ">

                <h3 style="
                  margin:0 0 8px;
                  color:#0d2b4d;
                ">
                  Venmo
                </h3>

                <p style="margin:0;">
                  <a
                    href="${safe(venmo_url)}"
                    style="
                      color:#155aa8;
                      font-weight:bold;
                    "
                  >
                    Pay with Venmo
                  </a>
                </p>

              </div>
            `
            : ""
        }

        ${
          check_payee &&
          check_mailing_address
            ? `
              <div style="
                border:1px solid #e5e7eb;
                padding:20px;
                margin:16px 0;
              ">

                <h3 style="
                  margin:0 0 8px;
                  color:#0d2b4d;
                ">
                  Check
                </h3>

                <p style="margin:0 0 8px;">
                  Make check payable to:
                  <strong>
                    ${safe(check_payee)}
                  </strong>
                </p>

                <p style="margin:0;">
                  Mail to:<br>
                  <strong>
                    ${safe(
                      check_mailing_address
                    )}
                  </strong>
                </p>

              </div>
            `
            : ""
        }

        <p style="
          margin-top:26px;
        ">
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
