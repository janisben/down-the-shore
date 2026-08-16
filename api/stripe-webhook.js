import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY;

export const config = {
  api: {
    bodyParser: false
  }
};

function siteOrigin(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL
      .replace(/\/+$/, "");
  }

  const host =
    req.headers[
      "x-forwarded-host"
    ] ||
    req.headers.host;

  const protocol =
    req.headers[
      "x-forwarded-proto"
    ] ||
    "https";

  return `${protocol}://${host}`;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

async function rawBody(req) {
  const chunks = [];

  for await (
    const chunk of req
  ) {
    chunks.push(
      Buffer.isBuffer(
        chunk
      )
        ? chunk
        : Buffer.from(
            chunk
          )
    );
  }

  return Buffer.concat(
    chunks
  );
}

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

        ...(options.headers ||
          {})
      }
    }
  );
}

async function sendOwnerEmail(
  req,
  {
    to,
    guestName,
    propertyName,
    signingUrl
  }
) {
  if (!to) {
    return false;
  }

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#24231f;max-width:640px;margin:0 auto;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;">
        Down the Shore
      </h1>

      <p>Hi Janis,</p>

      <p>
        The tenant has signed the rental agreement
        and the required payment has been received.
        The agreement is ready for your signature.
      </p>

      <div style="background:#f5f1e8;padding:18px;margin:22px 0;">
        <p style="margin:0 0 8px;">
          <strong>
            ${esc(
              propertyName
            )}
          </strong>
        </p>

        <p style="margin:0;">
          Tenant:
          ${esc(
            guestName
          )}
        </p>
      </div>

      <p style="margin:26px 0;">
        <a
          href="${esc(
            signingUrl
          )}"
          style="display:inline-block;background:#15385f;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:4px;"
        >
          Review and sign rental agreement
        </a>
      </p>

      <p>
        Down the Shore
      </p>
    </div>
  `;

  const response =
    await fetch(
      `${siteOrigin(
        req
      )}/api/send-email`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            to,

            subject:
              `Owner signature required — ${propertyName}`,

            html
          })
      }
    );

  if (!response.ok) {
    throw new Error(
      "Owner signature email could not be sent."
    );
  }

  return true;
}

async function loadPayments(
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

async function loadReservation(
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

async function handleCompletedSession(
  req,
  session
) {
  const reservationId =
    session.metadata
      ?.reservation_id ||
    session.client_reference_id;

  /*
    Generic Stripe tests may have
    no reservation attached.
  */

  if (!reservationId) {
    console.log(
      "Stripe checkout session has no reservation ID; ignoring."
    );

    return;
  }

  const amountPaid =
    Number(
      session.amount_total ||
      0
    ) / 100;

  if (
    amountPaid <= 0
  ) {
    throw new Error(
      "Stripe session has no paid amount."
    );
  }

  const reservation =
    await loadReservation(
      reservationId
    );

  if (!reservation) {
    throw new Error(
      "Reservation was not found for Stripe payment."
    );
  }

  /*
    Prevent Stripe from processing the
    exact same Checkout Session twice.

    We store the Checkout Session ID in
    owner_notes only as a lightweight
    idempotency marker if it is not already
    present.

    Existing owner notes are preserved.
  */

  const sessionMarker =
    `[stripe:${session.id}]`;

  const ownerNotes =
    String(
      reservation.owner_notes ||
      ""
    );

  if (
    ownerNotes.includes(
      sessionMarker
    )
  ) {
    console.log(
      "Stripe Checkout Session already processed:",
      session.id
    );

    return;
  }

  /*
    Record this individual payment.
  */

  const paymentResponse =
    await supabaseFetch(
      "payments",
      {
        method:
          "POST",

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
              new Date()
                .toISOString()
          })
      }
    );

  if (
    !paymentResponse.ok
  ) {
    throw new Error(
      "Could not log Stripe payment."
    );
  }

  /*
    Recalculate cumulative amount paid.
  */

  const payments =
    await loadPayments(
      reservationId
    );

  const totalPaid =
    payments.reduce(
      (
        sum,
        payment
      ) =>
        sum +
        Number(
          payment.amount ||
          0
        ),
      0
    );

  const reservationTotal =
    Number(
      reservation.amount_due ||
      0
    );

  const paidInFull =
    reservationTotal > 0 &&
    totalPaid >=
      reservationTotal;

  const paymentTime =
    new Date()
      .toISOString();

  const updatedOwnerNotes =
    ownerNotes
      ? `${ownerNotes}\n${sessionMarker}`
      : sessionMarker;

  /*
    Update reservation without falsely
    marking partial installment payments
    as fully paid.
  */

  const reservationResponse =
    await supabaseFetch(
      `reservations?id=eq.${encodeURIComponent(
        reservationId
      )}`,
      {
        method:
          "PATCH",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify({
            status:
              paidInFull
                ? "booked"
                : "pending_payment",

            payment_status:
              paidInFull
                ? "paid"
                : "partial",

            payment_method:
              "credit_card",

            amount_received:
              totalPaid,

            payment_received_at:
              paymentTime,

            hold_expires_at:
              paidInFull
                ? null
                : reservation.hold_expires_at,

            owner_notes:
              updatedOwnerNotes
          })
      }
    );

  if (
    !reservationResponse.ok
  ) {
    throw new Error(
      "Could not update reservation after Stripe payment."
    );
  }

  /*
    Do not advance the lease until the
    required reservation amount has been paid.
  */

  if (!paidInFull) {
    console.log(
      `Partial Stripe payment received: ${amountPaid}. Total paid: ${totalPaid}.`
    );

    return;
  }

  /*
    Find lease for reservation.
  */

  const leaseResponse =
    await supabaseFetch(
      `leases?reservation_id=eq.${encodeURIComponent(
        reservationId
      )}&select=*`
    );

  if (
    !leaseResponse.ok
  ) {
    throw new Error(
      "Could not load lease after Stripe payment."
    );
  }

  const leases =
    await leaseResponse.json();

  const lease =
    leases[0] ||
    null;

  if (!lease) {
    return;
  }

  /*
    Confirm tenant side is complete.
  */

  const signersResponse =
    await supabaseFetch(
      `lease_signers?lease_id=eq.${encodeURIComponent(
        lease.id
      )}&select=*`
    );

  if (
    !signersResponse.ok
  ) {
    throw new Error(
      "Could not load lease signers."
    );
  }

  const signers =
    await signersResponse.json();

  const guestSigners =
    signers.filter(
      signer =>
        signer.is_required &&
        signer.signer_role !==
          "owner"
    );

  const guestComplete =
    guestSigners.every(
      signer =>
        Boolean(
          signer.signed_at
        )
    );

  if (!guestComplete) {
    return;
  }

  const ownerSigner =
    signers.find(
      signer =>
        signer.signer_role ===
        "owner"
    );

  if (!ownerSigner) {
    throw new Error(
      "Owner signer record was not found."
    );
  }

  const leaseUpdateResponse =
    await supabaseFetch(
      `leases?id=eq.${encodeURIComponent(
        lease.id
      )}`,
      {
        method:
          "PATCH",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify({
            status:
              "awaiting_owner_signature",

            updated_at:
              paymentTime
          })
      }
    );

  if (
    !leaseUpdateResponse.ok
  ) {
    throw new Error(
      "Could not advance lease to owner signature."
    );
  }

  const eventResponse =
    await supabaseFetch(
      `lease_events?lease_id=eq.${encodeURIComponent(
        lease.id
      )}&event_type=eq.owner_signature_requested&select=id`
    );

  let alreadyRequested =
    false;

  if (
    eventResponse.ok
  ) {
    const events =
      await eventResponse.json();

    alreadyRequested =
      events.length > 0;
  }

  if (
    !alreadyRequested &&
    ownerSigner.signer_email &&
    ownerSigner.access_token
  ) {
    const signingUrl =
      `${siteOrigin(
        req
      )}/lease.html?token=${encodeURIComponent(
        ownerSigner.access_token
      )}`;

    await sendOwnerEmail(
      req,
      {
        to:
          ownerSigner.signer_email,

        guestName:
          lease.lease_data
            ?.guest_name ||
          "Guest",

        propertyName:
          lease.lease_data
            ?.property_name ||
          "Down the Shore rental",

        signingUrl
      }
    );

    await supabaseFetch(
      "lease_events",
      {
        method:
          "POST",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify({
            lease_id:
              lease.id,

            signer_id:
              ownerSigner.id,

            event_type:
              "owner_signature_requested",

            event_data: {
              to:
                ownerSigner
                  .signer_email,

              payment_received:
                totalPaid
            }
          })
      }
    );
  }
}

function constructStripeEvent(
  body,
  signature
) {
  const secrets = [
    process.env
      .STRIPE_WEBHOOK_SECRET_SANDBOX,

    process.env
      .STRIPE_WEBHOOK_SECRET
  ].filter(Boolean);

  if (
    secrets.length === 0
  ) {
    throw new Error(
      "Stripe webhook configuration is missing."
    );
  }

  let lastError =
    null;

  for (
    const secret of secrets
  ) {
    try {
      return stripe.webhooks
        .constructEvent(
          body,
          signature,
          secret
        );
    } catch (error) {
      lastError =
        error;
    }
  }

  throw (
    lastError ||
    new Error(
      "Stripe webhook signature verification failed."
    )
  );
}

export default async function handler(
  req,
  res
) {
  if (
    req.method !==
    "POST"
  ) {
    return res
      .status(405)
      .json({
        error:
          "Method not allowed"
      });
  }

  try {
    const body =
      await rawBody(
        req
      );

    const signature =
      req.headers[
        "stripe-signature"
      ];

    if (!signature) {
      return res
        .status(400)
        .send(
          "Missing Stripe signature"
        );
    }

    const event =
      constructStripeEvent(
        body,
        signature
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
          req,
          session
        );
      }
    }

    return res
      .status(200)
      .json({
        received:
          true
      });

  } catch (error) {
    console.error(
      "stripe-webhook error:",
      error
    );

    return res
      .status(400)
      .send(
        `Webhook Error: ${
          error.message ||
          "Unknown error"
        }`
      );
  }
}
