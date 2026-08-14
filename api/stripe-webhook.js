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
    return process.env.SITE_URL.replace(
      /\/+$/,
      ""
    );
  }

  const host =
    req.headers["x-forwarded-host"] ||
    req.headers.host;

  const protocol =
    req.headers["x-forwarded-proto"] ||
    "https";

  return `${protocol}://${host}`;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function rawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
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
        apikey: supabaseSecret,

        Authorization:
          `Bearer ${supabaseSecret}`,

        "Content-Type":
          "application/json",

        ...(options.headers || {})
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
            ${esc(propertyName)}
          </strong>
        </p>

        <p style="margin:0;">
          Tenant:
          ${esc(guestName)}
        </p>
      </div>

      <p style="margin:26px 0;">
        <a
          href="${esc(signingUrl)}"
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

  const response = await fetch(
    `${siteOrigin(req)}/api/send-email`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
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

async function handleCompletedSession(
  req,
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
    Number(session.amount_total || 0) /
    100;

  if (amountPaid <= 0) {
    throw new Error(
      "Stripe session has no paid amount."
    );
  }

  /*
    Prevent duplicate payment logging.
  */

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
        Number(payment.amount || 0),
      0
    );

  if (alreadyLogged < amountPaid) {
    const paymentResponse =
      await supabaseFetch(
        "payments",
        {
          method: "POST",

          headers: {
            Prefer: "return=minimal"
          },

          body: JSON.stringify({
            reservation_id:
              reservationId,

            amount: amountPaid,

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

  /*
    Update reservation.
  */

  const paymentTime =
    new Date().toISOString();

  const reservationResponse =
    await supabaseFetch(
      `reservations?id=eq.${encodeURIComponent(
        reservationId
      )}`,
      {
        method: "PATCH",

        headers: {
          Prefer: "return=minimal"
        },

        body: JSON.stringify({
          status: "booked",

          payment_status: "paid",

          payment_method:
            "credit_card",

          amount_received:
            amountPaid,

          payment_received_at:
            paymentTime,

          hold_expires_at: null
        })
      }
    );

  if (!reservationResponse.ok) {
    throw new Error(
      "Could not update reservation after Stripe payment."
    );
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

  if (!leaseResponse.ok) {
    throw new Error(
      "Could not load lease after Stripe payment."
    );
  }

  const leases =
    await leaseResponse.json();

  const lease =
    leases[0] || null;

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

  if (!signersResponse.ok) {
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
        Boolean(signer.signed_at)
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

  /*
    Advance lease to owner signature.
  */

  const leaseUpdateResponse =
    await supabaseFetch(
      `leases?id=eq.${encodeURIComponent(
        lease.id
      )}`,
      {
        method: "PATCH",

        headers: {
          Prefer: "return=minimal"
        },

        body: JSON.stringify({
          status:
            "awaiting_owner_signature",

          updated_at:
            paymentTime
        })
      }
    );

  if (!leaseUpdateResponse.ok) {
    throw new Error(
      "Could not advance lease to owner signature."
    );
  }

  /*
    Avoid sending duplicate owner emails.
  */

  const eventResponse =
    await supabaseFetch(
      `lease_events?lease_id=eq.${encodeURIComponent(
        lease.id
      )}&event_type=eq.owner_signature_requested&select=id`
    );

  let alreadyRequested = false;

  if (eventResponse.ok) {
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
        method: "POST",

        headers: {
          Prefer: "return=minimal"
        },

        body: JSON.stringify({
          lease_id:
            lease.id,

          signer_id:
            ownerSigner.id,

          event_type:
            "owner_signature_requested",

          event_data: {
            to:
              ownerSigner.signer_email,

            payment_received:
              amountPaid
          }
        })
      }
    );
  }
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({
        error:
          "Method not allowed"
      });
  }

  try {
    /*
      Use the sandbox webhook signing secret
      for Vercel Preview deployments.

      Use the normal Stripe webhook secret
      for Production deployments.
    */

    const webhookSecret =
      process.env.VERCEL_ENV ===
      "preview"
        ? process.env
            .STRIPE_WEBHOOK_SECRET_SANDBOX
        : process.env
            .STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res
        .status(500)
        .json({
          error:
            "Stripe webhook configuration is missing."
        });
    }

    /*
      Stripe signature verification MUST use
      the untouched raw request body.
    */

    const body =
      await rawBody(req);

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
      stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
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
        received: true
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
