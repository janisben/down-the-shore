import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

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
      guestName,
      guestEmail,
      propertyName,
      arrivalDate,
      departureDate,
      amount
    } = req.body || {};

    const numericAmount =
      Number(amount);

    if (
      !reservationId ||
      !guestEmail ||
      !propertyName ||
      !arrivalDate ||
      !departureDate ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        error:
          "Missing or invalid reservation payment information"
      });
    }

    const origin =
      req.headers.origin ||
      "https://downtheshoretest.vercel.app";

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer_email:
          guestEmail,

        client_reference_id:
          String(reservationId),

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
                Math.round(
                  numericAmount *
                  100
                ),

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
      success: true,
      url: session.url
    });

  } catch (error) {
    console.error(
      "create-checkout-session error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Could not start Stripe Checkout"
    });
  }
}
