document.addEventListener(
  "click",
  async event => {
    const button =
      event.target.closest(
        'button[data-action="accept"]'
      );

    if (!button) {
      return;
    }

    const card =
      button.closest(
        "[data-id]"
      );

    if (!card) {
      return;
    }

    const reservationId =
      card.dataset.id;

    const reservation =
      currentReservations.find(
        item =>
          String(item.id) ===
          String(reservationId)
      );

    if (
      !reservation ||
      !reservation.guest_email
    ) {
      return;
    }

    const holdExpiresAt =
      new Date(
        Date.now() +
        24 *
        60 *
        60 *
        1000
      ).toISOString();


    async function findCleaningAssignment() {
      /*
        The reservation update and the
        cleaning-assignment creation may
        happen a fraction of a second apart.

        Retry briefly so we do not miss the
        newly-created cleaning record.
      */
      for (
        let attempt = 0;
        attempt < 6;
        attempt++
      ) {
        try {
          const rows =
            await fetchTable(
              "cleaning_assignments",
              `?reservation_id=eq.${encodeURIComponent(
                reservation.id
              )}&select=*&limit=1`
            );

          if (
            rows &&
            rows.length
          ) {
            return rows[0];
          }
        } catch (error) {
          console.warn(
            "Cleaning assignment lookup attempt failed:",
            error
          );
        }

        await new Promise(
          resolve =>
            window.setTimeout(
              resolve,
              500
            )
        );
      }

      return null;
    }


    async function sendCleanerEmail() {
      const cleaning =
        await findCleaningAssignment();

      if (!cleaning) {
        console.error(
          "No cleaning assignment was found for reservation:",
          reservation.id
        );

        return;
      }

      if (!cleaning.cleaner_email) {
        console.error(
          "Cleaning assignment does not have a cleaner email:",
          cleaning.id
        );

        return;
      }

      if (!cleaning.confirmation_token) {
        console.error(
          "Cleaning assignment does not have a confirmation token:",
          cleaning.id
        );

        return;
      }

      const response =
        await fetch(
          "/api/cleaning-assigned",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                to:
                  cleaning.cleaner_email,

                cleanerName:
                  cleaning.cleaner_name ||
                  "Melissa",

                propertyName:
                  reservation.property_name,

                guestName:
                  reservation.guest_name ||
                  "",

                checkoutDate:
                  cleaning.checkout_date ||
                  reservation.departure_date,

                confirmationToken:
                  cleaning.confirmation_token
              })
          }
        );

      let result = {};

      try {
        result =
          await response.json();
      } catch (_) {}

      if (!response.ok) {
        console.error(
          "Automatic cleaner email failed:",
          result
        );

        return;
      }

      console.log(
        "Automatic cleaner assignment email sent.",
        result
      );
    }


    window.setTimeout(
      async () => {
        try {
          const checkoutResponse =
            await fetch(
              "/api/create-checkout-session",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({
                    reservationId:
                      reservation.id,

                    guestName:
                      reservation.guest_name,

                    guestEmail:
                      reservation.guest_email,

                    propertyName:
                      reservation.property_name,

                    arrivalDate:
                      reservation.arrival_date,

                    departureDate:
                      reservation.departure_date,

                    amount:
                      reservation.amount_due
                  })
              }
            );

          const checkoutResult =
            await checkoutResponse.json();

          if (
            !checkoutResponse.ok ||
            !checkoutResult.url
          ) {
            console.error(
              "Stripe Checkout creation failed:",
              checkoutResult
            );

            return;
          }


          const emailResponse =
            await fetch(
              "/api/reservation-approved",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({
                    to:
                      reservation.guest_email,

                    guestName:
                      reservation.guest_name,

                    propertyName:
                      reservation.property_name,

                    arrivalDate:
                      reservation.arrival_date,

                    departureDate:
                      reservation.departure_date,

                    holdExpiresAt,

                    paymentUrl:
                      checkoutResult.url
                  })
              }
            );

          const emailResult =
            await emailResponse.json();

          if (!emailResponse.ok) {
            console.error(
              "Approval email failed:",
              emailResult
            );

            return;
          }

          console.log(
            "Approval email with Stripe payment link sent."
          );


          /*
            Guest email succeeded.
            Now automatically notify Melissa.
          */
          try {
            await sendCleanerEmail();
          } catch (cleanerError) {
            console.error(
              "Automatic cleaner assignment email error:",
              cleanerError
            );
          }

        } catch (error) {
          console.error(
            "Approval/payment email error:",
            error
          );
        }
      },
      1000
    );
  }
);



document.addEventListener(
  "click",
  async event => {
    const button =
      event.target.closest(
        'button[data-cleaning-action="save-cleaner"]'
      );

    if (!button) {
      return;
    }

    console.log(
      "Cleaner Save button detected."
    );

    const card =
      button.closest(
        "[data-cleaning-id]"
      );

    if (!card) {
      console.error(
        "Cleaner card not found."
      );

      return;
    }

    const cleaningId =
      card.dataset.cleaningId;

    const cleanerName =
      card
        .querySelector(
          "[data-cleaner-name]"
        )
        ?.value
        .trim();

    const cleanerEmail =
      card
        .querySelector(
          "[data-cleaner-email]"
        )
        ?.value
        .trim();

    const cleaning =
      currentCleanings.find(
        item =>
          String(item.id) ===
          String(cleaningId)
      );

    if (!cleanerEmail) {
      console.error(
        "Cleaner email is missing."
      );

      return;
    }

    if (!cleaning) {
      console.error(
        "Cleaning record not found:",
        cleaningId
      );

      return;
    }

    if (
      !cleaning.confirmation_token
    ) {
      console.error(
        "Cleaning confirmation token is missing:",
        cleaningId
      );

      return;
    }

    try {
      console.log(
        "Sending cleaner assignment email to:",
        cleanerEmail
      );

      const response =
        await fetch(
          "/api/cleaning-assigned",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                to:
                  cleanerEmail,

                cleanerName:
                  cleanerName ||
                  "",

                propertyName:
                  cleaning.property_name,

                guestName:
                  cleaning.reservation
                    ?.guest_name ||
                  "",

                checkoutDate:
                  cleaning.checkout_date,

                confirmationToken:
                  cleaning.confirmation_token
              })
          }
        );

      let result = {};

      try {
        result =
          await response.json();
      } catch (_) {}

      if (!response.ok) {
        console.error(
          "Cleaner email failed:",
          result
        );

        return;
      }

      console.log(
        "Cleaner assignment email sent.",
        result
      );

    } catch (error) {
      console.error(
        "Cleaner assignment email error:",
        error
      );
    }
  },
  true
);
