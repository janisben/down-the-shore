import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY;

async function supabaseFetch(
  path,
  options = {}
) {
  return fetch(
    `${supabaseUrl}/rest/v1/${path}`,
    {
      ...options,

      headers: {
        apikey:
          supabaseSecret,

        "Content-Type":
          "application/json",

        ...(options.headers || {})
      }
    }
  );
}

async function handleCompletedSession(
  session
) {
  const reservationId =
    session.metadata?.reservation_id ||
    session.client_reference_id;

  if (!reservationId) {
    throw new Error(
      "Stripe session is missing reservation ID."
    );
  }

  const amountPaid =
    Number(
      session.amount_total || 0
    ) / 100;

  if (amountPaid <= 0) {
    throw new Error(
      "Stripe session has no paid amount."
    );
  }

  const paymentsResponse =
    await supabaseFetch(
      `payments?reservation_id=eq.${encodeURIComponent(
        reservationId
      )}&payment_method=eq.credit_card&select=amount`
    );

  if (!paymentsResponse.ok) {
    throw new Error(
      "Could not check existing payments."
    );
  }

  const existingPayments =
    await paymentsResponse.json();

  const alreadyLogged =
    existingPayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );

  if (alreadyLogged < amountPaid) {
    const paymentResponse =
      await supabaseFetch(
        "payments",
        {
          method: "POST",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({
              reservation_id:
                reservationId,

              amount:
                amountPaid,

              payment_method:
                "credit_card",

              received_at:
                new Date().toISOString()
            })
        }
      );

    if (!paymentResponse.ok) {
      throw new Error(
        "Could not log Stripe payment."
      );
    }
  }

  const reservationResponse =
    await supabaseFetch(
      `reservations?id=eq.${encodeURIComponent(
        reservationId
      )}`,
      {
        method: "PATCH",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify({
            status:
              "booked",

            payment_status:
              "paid",

            payment_method:
              "credit_card",

            amount_received:
              amountPaid,

            payment_received_at:
              new Date().toISOString(),

            hold_expires_at:
              null
          })
      }
    );

  if (!reservationResponse.ok) {
    throw new Error(
      "Could not update reservation after Stripe payment."
    );
  }
}

export async function POST(
  request
) {
  try {
    const rawBody =
      await request.text();

    const signature =
      request.headers.get(
        "stripe-signature"
      );

    if (
      !signature ||
      !process.env.STRIPE_WEBHOOK_SECRET
    ) {
      return new Response(
        "Missing webhook configuration",
        {
          status: 400
        }
      );
    }

    const event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env
          .STRIPE_WEBHOOK_SECRET
      );

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object;

      if (
        session.payment_status ===
        "paid"
      ) {
        await handleCompletedSession(
          session
        );
      }
    }

    return Response.json({
      received: true
    });

  } catch (error) {
    console.error(
      "stripe-webhook error:",
      error
    );

    return new Response(
      `Webhook Error: ${
        error.message ||
        "Unknown error"
      }`,
      {
        status: 400
      }
    );
  }
}
