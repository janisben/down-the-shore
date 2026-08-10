const Stripe = require("stripe");

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

module.exports = async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const {
      reservationId,
      guestName,
      guestEmail,
      propertyName,
      arrivalDate,
      departureDate,
      amount
    } = req.body || {};

    if (
      !reservationId ||
      !guestEmail ||
      !propertyName ||
      !arrivalDate ||
      !departureDate ||
      !amount
    ) {
      return res.status(400).json({
        error:
          "Missing required reservation information."
      });
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        error: "Invalid payment amount."
      });
    }

    const amountInCents =
      Math.round(
        numericAmount * 100
      );

    const origin =
      req.headers.origin ||
      "https://downtheshoretest.vercel.app";

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer_email:
          guestEmail,

        client_reference_id:
          reservationId,

        metadata: {
          reservation_id:
            String(reservationId),
          guest_name:
            String(
              guestName || ""
            ),
          property_name:
            String(propertyName),
          arrival_date:
            String(arrivalDate),
          departure_date:
            String(departureDate)
        },

        line_items: [
          {
            quantity: 1,

            price_data: {
              currency: "usd",

              unit_amount:
                amountInCents,

              product_data: {
                name:
                  `${propertyName} reservation`,

                description:
                  `${arrivalDate} to ${departureDate}`
              }
            }
          }
        ],

        success_url:
          `${origin}/property.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${origin}/property.html?payment=cancelled`
      });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error(
      "Stripe Checkout error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Could not start payment."
    });
  }
};
