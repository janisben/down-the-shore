import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

function siteOrigin(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, "");
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

async function requireOwner(req) {
  const auth =
    String(
      req.headers.authorization || ""
    );

  const token =
    auth.startsWith("Bearer ")
      ? auth.slice(7).trim()
      : "";

  if (!token) {
    throw Object.assign(
      new Error("Owner authentication required."),
      { statusCode: 401 }
    );
  }

  const { data, error } =
    await supabase.auth.getUser(token);

  if (error || !data?.user) {
    throw Object.assign(
      new Error("Owner session is invalid or expired."),
      { statusCode: 401 }
    );
  }

  return data.user;
}

async function sendOwnerReadyEmail(
  req,
  {
    to,
    propertyName,
    guestName,
    signingUrl
  }
) {
  if (!to) return null;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#24231f;max-width:640px;margin:0 auto;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;">
        Down the Shore
      </h1>

      <p>Hi Janis,</p>

      <p>
        The guest has signed the rental agreement and a payment has
        been received. The agreement is ready for your signature.
      </p>

      <div style="background:#f5f1e8;padding:18px;margin:22px 0;">
        <p style="margin:0 0 8px;">
          <strong>${esc(propertyName)}</strong>
        </p>
        <p style="margin:0;">
          Guest: ${esc(guestName)}
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

      <p>Down the Shore</p>
    </div>
  `;

  const response =
    await fetch(
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
    let body = {};

    try {
      body =
        await response.json();
    } catch (_) {}

    throw new Error(
      body.error ||
      body.message ||
      "Owner-signature email could not be sent."
    );
  }

  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const ownerUser =
      await requireOwner(req);

    const {
      reservation_id,
      lease_id
    } =
      req.body || {};

    if (!reservation_id || !lease_id) {
      return res.status(400).json({
        error:
          "reservation_id and lease_id are required"
      });
    }

    const {
      data: reservation,
      error: reservationError
    } =
      await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservation_id)
        .single();

    if (reservationError || !reservation) {
      return res.status(404).json({
        error: "Reservation not found"
      });
    }

    const {
      data: lease,
      error: leaseError
    } =
      await supabase
        .from("leases")
        .select("*")
        .eq("id", lease_id)
        .eq("reservation_id", reservation_id)
        .single();

    if (leaseError || !lease) {
      return res.status(404).json({
        error: "Lease not found"
      });
    }

    if (lease.status === "completed") {
      return res.status(200).json({
        success: true,
        status: "completed",
        signing_url: null
      });
    }

    const {
      data: signers,
      error: signerError
    } =
      await supabase
        .from("lease_signers")
        .select("*")
        .eq("lease_id", lease.id);

    if (signerError) {
      throw signerError;
    }

    const guestSideComplete =
      (signers || [])
        .filter(
          signer =>
            signer.is_required &&
            signer.signer_role !== "owner"
        )
        .every(
          signer =>
            Boolean(signer.signed_at)
        );

    if (!guestSideComplete) {
      return res.status(409).json({
        error:
          "The required guest signatures are not complete yet."
      });
    }

    const {
      data: payments,
      error: paymentError
    } =
      await supabase
        .from("payments")
        .select("amount")
        .eq("reservation_id", reservation.id);

    if (paymentError) {
      throw paymentError;
    }

    const paid =
      (payments || [])
        .reduce(
          (total, payment) =>
            total +
            Number(payment.amount || 0),
          0
        );

    if (paid <= 0) {
      return res.status(409).json({
        error:
          "A payment must be received before the owner signs."
      });
    }

    const ownerSigner =
      (signers || [])
        .find(
          signer =>
            signer.signer_role === "owner"
        );

    if (!ownerSigner) {
      return res.status(404).json({
        error:
          "Owner signer record was not found."
      });
    }

    if (ownerSigner.signed_at) {
      return res.status(200).json({
        success: true,
        status: "completed",
        signing_url: null
      });
    }

    if (!ownerSigner.signer_email && ownerUser.email) {
      await supabase
        .from("lease_signers")
        .update({
          signer_email: ownerUser.email,
          updated_at: new Date().toISOString()
        })
        .eq("id", ownerSigner.id);
    }

    const transitioned =
      lease.status !==
        "awaiting_owner_signature";

    if (transitioned) {
      const now =
        new Date().toISOString();

      const { error: updateError } =
        await supabase
          .from("leases")
          .update({
            status:
              "awaiting_owner_signature",
            updated_at: now
          })
          .eq("id", lease.id);

      if (updateError) {
        throw updateError;
      }
    }

    const signingUrl =
      `${siteOrigin(req)}/lease.html?token=${encodeURIComponent(ownerSigner.access_token)}`;

    if (transitioned && ownerUser.email) {
      await sendOwnerReadyEmail(
        req,
        {
          to: ownerUser.email,
          propertyName:
            lease.lease_data?.property_name ||
            "Down the Shore rental",
          guestName:
            reservation.guest_name ||
            "Guest",
          signingUrl
        }
      );

      await supabase
        .from("lease_events")
        .insert({
          lease_id: lease.id,
          signer_id: ownerSigner.id,
          event_type:
            "owner_signature_requested",
          event_data: {
            to: ownerUser.email,
            payment_received: paid
          }
        });
    }

    return res.status(200).json({
      success: true,
      status:
        "awaiting_owner_signature",
      signing_url:
        signingUrl,
      email_sent:
        Boolean(
          transitioned &&
          ownerUser.email
        )
    });

  } catch (error) {
    console.error(
      "Owner lease ready error:",
      error
    );

    return res
      .status(
        error.statusCode ||
        500
      )
      .json({
        error:
          error.message ||
          "Could not prepare the owner signature."
      });
  }
}
