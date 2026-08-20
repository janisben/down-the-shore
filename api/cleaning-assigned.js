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
      reservationId,

      to,
      cleanerName:
        suppliedCleanerName,
      propertyName:
        suppliedPropertyName,
      guestName:
        suppliedGuestName,
      checkoutDate:
        suppliedCheckoutDate,
      confirmationToken:
        suppliedConfirmationToken
    } = req.body || {};


    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error:
          "RESEND_API_KEY is not configured"
      });
    }


    let cleanerEmail =
      to || null;

    let cleanerName =
      suppliedCleanerName ||
      "Melissa";

    let propertyName =
      suppliedPropertyName ||
      null;

    let guestName =
      suppliedGuestName ||
      "Guest";

    let checkoutDate =
      suppliedCheckoutDate ||
      null;

    let confirmationToken =
      suppliedConfirmationToken ||
      null;


    /*
      If reservationId was supplied,
      load the cleaning assignment,
      reservation, and property from
      Supabase.

      This keeps the API compatible
      with both calling methods.
    */
    if (reservationId) {
      if (
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


      let cleaning = null;


      for (
        let attempt = 0;
        attempt < 10;
        attempt++
      ) {
        const cleaningResponse =
          await fetch(
            `${supabaseUrl}/rest/v1/cleaning_assignments?reservation_id=eq.${encodeURIComponent(
              reservationId
            )}&select=*&limit=1`,
            {
              headers:
                authHeaders
            }
          );


        if (!cleaningResponse.ok) {
          throw new Error(
            `Could not load cleaning assignment: ${await cleaningResponse.text()}`
          );
        }


        const cleaningRows =
          await cleaningResponse.json();


        cleaning =
          cleaningRows[0] ||
          null;


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
        reservationRows[0] ||
        null;


      if (!reservation) {
        return res.status(404).json({
          error:
            "Reservation could not be found"
        });
      }


      let property = null;


      if (reservation.property_id) {
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


        property =
          propertyRows[0] ||
          null;
      }


      cleanerEmail =
        cleaning.cleaner_email ||
        cleanerEmail;


      cleanerName =
        cleaning.cleaner_name ||
        cleanerName;


      propertyName =
        property?.name ||
        suppliedPropertyName ||
        "Down the Shore rental";


      guestName =
        reservation.guest_name ||
        suppliedGuestName ||
        "Guest";


      checkoutDate =
        cleaning.checkout_date ||
        reservation.departure_date ||
        suppliedCheckoutDate;


      confirmationToken =
        cleaning.confirmation_token ||
        suppliedConfirmationToken;
    }


    /*
      Direct-data mode.

      This is what the restored
      owner.js and the Save cleaner
      button currently send.
    */
    if (!cleanerEmail) {
      return res.status(400).json({
        error:
          "Missing cleaner email"
      });
    }


    if (!propertyName) {
      return res.status(400).json({
        error:
          "Missing property name"
      });
    }


    if (!checkoutDate) {
      return res.status(400).json({
        error:
          "Missing checkout date"
      });
    }


    if (!confirmationToken) {
      return res.status(400).json({
        error:
          "Missing cleaning confirmation token"
      });
    }


    const confirmationUrl =
      `${siteOrigin(
        req
      )}/cleaning-confirm.html?token=${encodeURIComponent(
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
                cleanerEmail
              ],

              subject,

              html
            })
        }
      );


    let emailData = {};


    try {
      emailData =
        await emailResponse.json();
    } catch (_) {}


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
