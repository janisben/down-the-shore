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
          item.id ===
          reservationId
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
