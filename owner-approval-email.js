document.addEventListener("click", async (event) => {
  const button = event.target.closest(
    'button[data-action="accept"]'
  );

  if (!button) return;

  const card = button.closest("[data-id]");
  if (!card) return;

  const reservationId = card.dataset.id;

  const reservation = currentReservations.find(
    (item) => item.id === reservationId
  );

  if (!reservation || !reservation.guest_email) {
    return;
  }

  const holdExpiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  ).toISOString();

  window.setTimeout(async () => {
    try {
      const response = await fetch(
        "/api/reservation-approved",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: reservation.guest_email,
            guestName: reservation.guest_name,
            propertyName: reservation.property_name,
            arrivalDate: reservation.arrival_date,
            departureDate: reservation.departure_date,
            holdExpiresAt
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "Approval email failed:",
          result
        );
        return;
      }

      console.log("Approval email sent.");
    } catch (error) {
      console.error(
        "Approval email error:",
        error
      );
    }
  }, 1000);
});
