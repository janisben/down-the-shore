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

        Authorization:
          `Bearer ${supabaseSecret}`,

        "Content-Type":
          "application/json",

        ...(options.headers || {})
      }
    }
  );
}

async function getReservation(
  reservationId
) {
  const response =
    await supabaseFetch(
      `reservations?id=eq.${encodeURIComponent(
        reservationId
      )}&select=*`
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

async function getPayments(
  reservationId
) {
  const response =
    await supabaseFetch(
      `payments?reservation_id=eq.${encodeURIComponent(
        reservationId
      )}&select=amount`
    );

  if (!response.ok) {
    throw new Error(
      "Could not load reservation payments."
    );
  }

  return await response.json();
}

async function getPaymentSchedule(
  reservationId
) {
  const response =
    await supabaseFetch(
      `payment_schedule?reservation_id=eq.${encodeURIComponent(
        reservationId
      )}&select=id,label,amount_due,due_date,created_at&order=due_date.asc.nullslast,created_at.asc`
    );

  if (!response.ok) {
    throw new Error(
      "Could not load payment schedule."
    );
  }

  return await response.json();
}

function calculateNextPayment({
  totalDue,
  payments,
  schedule
}) {
  const paidTotal =
    (payments || []).reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );

  const remainingBalance =
    Math.max(
      0,
      totalDue - paidTotal
    );

  if (
    remainingBalance <= 0
  ) {
    return {
      paidTotal,
      remainingBalance: 0,
      amount: 0,
      installment: null
    };
  }

  /*
    Apply money already received to scheduled
    installments in chronological order.
  */

  let amountAlreadyApplied =
    paidTotal;

  for (
    const installment
    of schedule || []
  ) {
    const installmentAmount =
      Number(
        installment.amount_due ||
        0
      );

    if (
      !Number.isFinite(
        installmentAmount
      ) ||
      installmentAmount <= 0
    ) {
      continue;
    }

    const amountAppliedHere =
      Math.min(
        amountAlreadyApplied,
        installmentAmount
      );

    amountAlreadyApplied -=
      amountAppliedHere;

    const installmentBalance =
      installmentAmount -
      amountAppliedHere;

    if (
      installmentBalance > 0
    ) {
      return {
        paidTotal,
        remainingBalance,

        amount:
          Math.min(
            installmentBalance,
            remainingBalance
          ),

        installment
      };
    }
  }

  /*
    If all scheduled installments have already
    been satisfied but the reservation still has
    a balance, charge the remaining reservation
    balance.

    This also makes existing reservations work
    even if the schedule does not yet add up to
    the full rental amount.
  */

  return {
    paidTotal,
    remainingBalance,
    amount:
      remainingBalance,
    installment:
      null
  };
}

export default async function handler(
  req,
  res
) {
  if (
    req.method !==
    "POST"
  ) {
    return res.status(405).json({
      error:
        "Method not allowed"
    });
  }

  try {
    const {
      reservationId
    } =
      req.body || {};

    if (!reservationId) {
      return res.status(400).json({
        error:
          "Reservation ID is required"
      });
    }

    if (
      !process.env
        .STRIPE_SECRET_KEY ||
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

    const totalDue =
      Number(
        reservation.amount_due ||
        0
      );

    if (
      !Number.isFinite(
        totalDue
      ) ||
      totalDue <= 0
    ) {
      return res.status(400).json({
        error:
          "Reservation does not have a valid amount due"
      });
    }

    if (
      !reservation.guest_email
    ) {
      return res.status(400).json({
        error:
          "Reservation does not have a guest email"
      });
    }

    const [
      payments,
      schedule
    ] =
      await Promise.all([
        getPayments(
          reservationId
        ),

        getPaymentSchedule(
          reservationId
        )
      ]);

    const payment =
      calculateNextPayment({
        totalDue,
        payments,
        schedule
      });

    if (
      payment.remainingBalance <=
      0
    ) {
      return res.status(409).json({
        error:
          "This reservation is already paid in full"
      });
    }

    if (
      !Number.isFinite(
        payment.amount
      ) ||
      payment.amount <= 0
    ) {
      return res.status(400).json({
        error:
          "No payment is currently due"
      });
    }

    const installment =
      payment.installment;

    const paymentLabel =
      installment?.label ||
      (
        payment.paidTotal > 0
          ? "Remaining balance"
          : "Reservation payment"
      );

    const origin =
      req.headers.origin ||
      process.env.SITE_URL ||
      "https://downtheshoretest.vercel.app";

    const metadata = {
      reservation_id:
        String(
          reservation.id
        ),

      payment_type:
        installment
          ? "installment"
          : "balance",

      payment_label:
        String(
          paymentLabel
        )
    };

    if (
      installment?.id
    ) {
      metadata.payment_schedule_id =
        String(
          installment.id
        );
    }

    const session =
      await stripe.checkout.sessions.create({
        mode:
          "payment",

        customer_email:
          reservation.guest_email,

        client_reference_id:
          String(
            reservation.id
          ),

        metadata,

        line_items: [
          {
            quantity: 1,

            price_data: {
              currency:
                "usd",

              unit_amount:
                Math.round(
                  payment.amount *
                  100
                ),

              product_data: {
                name:
                  `${reservation.property_name || "Down the Shore"} — ${paymentLabel}`,

                description:
                  installment?.due_date
                    ? `${reservation.arrival_date} to ${reservation.departure_date} · Due ${installment.due_date}`
                    : `${reservation.arrival_date} to ${reservation.departure_date}`
              }
            }
          }
        ],

        success_url:
          `${origin}/property.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${origin}/property.html?payment=cancelled`
      });

    return res
      .status(200)
      .json({
        success:
          true,

        url:
          session.url,

        amount:
          payment.amount,

        paid:
          payment.paidTotal,

        remaining_before_payment:
          payment.remainingBalance,

        payment_label:
          paymentLabel,

        payment_schedule_id:
          installment?.id ||
          null
      });

  } catch (error) {
    console.error(
      "create-checkout-session error:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          "Could not start Stripe Checkout"
      });
  }
}
