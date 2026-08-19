function siteOrigin(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(
      /\/+$/,
      ""
    );
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
      reservationId
    } = req.body || {};

    if (!reservationId) {
      return res.status(400).json({
        error:
          "Missing reservation ID"
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


    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const secretKey =
      process.env
        .SUPABASE_SECRET_KEY;


    const authHeaders = {
      apikey:
        secretKey,

      Authorization:
        `Bearer ${secretKey}`
    };


    /*
      Wait briefly for the cleaning
      assignment to exist.
    */
    let cleaning = null;

    for (
      let attempt = 0;
      attempt < 10;
      attempt++
    ) {
      const response =
        await fetch(
          `${supabaseUrl}/rest/v1/cleaning_assignments?reservation_id=eq.${encodeURIComponent(
            reservationId
          )}&select=*&limit=1`,
          {
            headers:
              authHeaders
          }
        );

      if (!response.ok) {
        throw new Error(
          `Could not load cleaning assignment: ${await response.text()}`
        );
      }

      const rows =
        await response.json();

      cleaning =
        rows[0] || null;

      if (
        cleaning &&
        cleaning.cleaner_email &&
        cleaning.confirmation_token
      ) {
        break;
      }

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            500
          )
      );
    }


    if (!cleaning) {
      return res.status(404).json({
        error:
          "No cleaning assignment was found for this reservation"
      });
    }


    if (!cleaning.cleaner_email) {
      return res.status(400).json({
        error:
          "The cleaning assignment does not have a cleaner email"
      });
    }


    if (!cleaning.confirmation_token) {
      return res.status(400).json({
        error:
          "The cleaning assignment does not have a confirmation token"
      });
    }


    const reservationResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/reservations?id=eq.${encodeURIComponent(
          reservationId
        )}&select=*&limit=1`,
        {
          headers:
            authHeaders
        }
      );

    if (!reservationResponse.ok) {
      throw new Error(
        `Could not load reservation: ${await reservationResponse.text()}`
      );
    }

    const reservationRows =
      await reservationResponse.json();

    const reservation =
      reservationRows[0];

    if (!reservation) {
      return res.status(404).json({
        error:
          "Reservation could not be found"
      });
    }


    const propertyResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/properties?id=eq.${encodeURIComponent(
          reservation.property_id
        )}&select=id,name&limit=1`,
        {
          headers:
            authHeaders
        }
      );

    if (!propertyResponse.ok) {
      throw new Error(
        `Could not load property: ${await propertyResponse.text()}`
      );
    }

    const propertyRows =
      await propertyResponse.json();

    const property =
      propertyRows[0] || null;


    const cleanerName =
      cleaning.cleaner_name ||
      "Melissa";

    const propertyName =
      property?.name ||
      "Down the Shore rental";

    const guestName =
      reservation.guest_name ||
      "Guest";

    const checkoutDate =
      cleaning.checkout_date ||
      reservation.departure_date;


    const confirmationUrl =
      `${siteOrigin(
        req
      )}/cleaning-confirm.html?token=${encodeURIComponent(
        cleaning.confirmation_token
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
          Hi ${esc(cleanerName)},
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

          <br>

          Guest:
          ${esc(guestName)}

        </div>

        <p>
          Please confirm that you can
          handle this cleaning.
        </p>

        <p style="margin:24px 0;">
          <a
            href="${esc(
              confirmationUrl
            )}"
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


    const emailResponse =
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

              to: [
                cleaning.cleaner_email
              ],

              subject,

              html
            })
        }
      );


    const emailData =
      await emailResponse.json();


    if (!emailResponse.ok) {
      console.error(
        "Cleaner email Resend error:",
        emailData
      );

      return res
        .status(
          emailResponse.status
        )
        .json({
          error:
            "Cleaner email failed",

          details:
            emailData
        });
    }


    return res.status(200).json({
      success: true,
      confirmationUrl,
      data:
        emailData
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
