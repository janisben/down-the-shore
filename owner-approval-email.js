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
        24 * 60 * 60 * 1000
      ).toISOString();

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

          let checkoutResult = {};

          try {
            checkoutResult =
              await checkoutResponse.json();
          } catch (_) {}

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

          let emailResult = {};

          try {
            emailResult =
              await emailResponse.json();
          } catch (_) {}

          if (!emailResponse.ok) {
            console.error(
              "Approval email failed:",
              emailResult
            );

            return;
          }

          console.log(
            "Approval email with Stripe payment link sent.",
            emailResult
          );

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
        .trim() || "";

    const cleanerEmail =
      card
        .querySelector(
          "[data-cleaner-email]"
        )
        ?.value
        .trim() || "";

    if (!cleanerEmail) {
      console.error(
        "Cleaner email is missing."
      );

      return;
    }

    button.disabled = true;

    try {
      /*
        First save Melissa's current
        name and email to the cleaning
        assignment.
      */
      await updateCleaning(
        cleaningId,
        {
          cleaner_name:
            cleanerName,

          cleaner_email:
            cleanerEmail
        }
      );


      /*
        Reload the cleaning assignments
        so we use the current database
        record and confirmation token.
      */
      await loadCleanings();


      const cleaning =
        currentCleanings.find(
          item =>
            String(item.id) ===
            String(cleaningId)
        );


      if (!cleaning) {
        throw new Error(
          "Cleaning assignment could not be reloaded."
        );
      }


      if (
        !cleaning.confirmation_token
      ) {
        throw new Error(
          "Cleaning confirmation token is missing."
        );
      }


      const reservation =
        currentReservations.find(
          item =>
            String(item.id) ===
            String(
              cleaning.reservation_id
            )
        );


      const propertyName =
        cleaning.property_name ||
        reservation?.property_name ||
        "Down the Shore property";


      const guestName =
        reservation?.guest_name ||
        cleaning.reservation
          ?.guest_name ||
        "";


      const checkoutDate =
        cleaning.checkout_date ||
        reservation?.departure_date;


      if (!checkoutDate) {
        throw new Error(
          "Cleaning checkout date is missing."
        );
      }


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
                  "Melissa",

                propertyName,

                guestName,

                checkoutDate,

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
        throw new Error(
          result.error ||
          result.details?.message ||
          "Cleaner email failed."
        );
      }


      console.log(
        "Cleaner assignment email sent successfully.",
        result
      );


      if (cleaningMessage) {
        message(
          cleaningMessage,
          `Cleaner saved and email sent to ${cleanerEmail}.`
        );
      }


      renderCleaningDashboard();

    } catch (error) {
      console.error(
        "Cleaner assignment email error:",
        error
      );


      if (cleaningMessage) {
        message(
          cleaningMessage,
          error.message ||
          "Cleaner email could not be sent.",
          true
        );
      }

    } finally {
      button.disabled = false;
    }
  },
  true
);
