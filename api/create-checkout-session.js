import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY;

async function getReservation(
  reservationId
) {
  const response =
    await fetch(
      `${supabaseUrl}/rest/v1/reservations?id=eq.${encodeURIComponent(
        reservationId
      )}&select=*`,
      {
        headers: {
          apikey:
            supabaseSecret
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      "Could not load reservation."
    );
  }

  const rows =
    await response.json();

  return rows[0] || null;
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
          "Reservation ID is required"
      });
    }

    if (
      !process.env.STRIPE_SECRET_KEY ||
      !supabaseUrl ||
      !supabaseSecret
    ) {
      return res.status(500).json({
        error:
          "Server payment configuration is incomplete"
      });
    }

    const reservation =
      await getReservation(
        reservationId
      );

    if (!reservation) {
      return res.status(404).json({
        error:
          "Reservation not found"
      });
    }

    const amount =
      Number(
        reservation.amount_due || 0
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        error:
          "Reservation does not have a valid amount due"
      });
    }

    if (!reservation.guest_email) {
      return res.status(400).json({
        error:
          "Reservation does not have a guest email"
      });
    }

    const origin =
      req.headers.origin ||
      "https://downtheshoretest.vercel.app";

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer_email:
          reservation.guest_email,

        client_reference_id:
          String(reservation.id),

        metadata: {
          reservation_id:
            String(reservation.id)
        },

        line_items: [
          {
            quantity: 1,

            price_data: {
              currency: "usd",

              unit_amount:
                Math.round(
                  amount * 100
                ),

              product_data: {
                name:
                  `${reservation.property_name || "Down the Shore"} reservation`,

                description:
                  `${reservation.arrival_date} to ${reservation.departure_date}`
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
