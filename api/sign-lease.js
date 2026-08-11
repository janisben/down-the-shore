import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

function siteOrigin(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL
      .replace(/\/+$/, "");
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

async function createCheckoutSession(
  req,
  reservationId
) {
  const response =
    await fetch(
      `${siteOrigin(req)}/api/create-checkout-session`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Origin":
            siteOrigin(req)
        },

        body:
          JSON.stringify({
            reservationId
          })
      }
    );

  let body = {};

  try {
    body =
      await response.json();
  } catch (_) {}

  if (
    !response.ok ||
    !body.url
  ) {
    throw new Error(
      body.error ||
      "The payment page could not be created."
    );
  }

  return body.url;
}

async function sendOwnerReadyEmail(
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
        The tenant has completed the rental agreement
        and the required initial payment has been received.
        The agreement is ready for your signature.
      </p>

      <div style="background:#f5f1e8;padding:18px;margin:22px 0;">
        <p style="margin:0 0 8px;">
          <strong>${esc(propertyName)}</strong>
        </p>

        <p style="margin:0;">
          Tenant: ${esc(guestName)}
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

  const response =
    await fetch(
      `${siteOrigin(req)}/api/send-email`,
      {
        method: "POST",

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
      token,
      signature,
      initials
    } =
      req.body || {};

    if (
      !token ||
      !signature
    ) {
      return res.status(400).json({
        error:
          "Lease token and signature are required"
      });
    }

    const {
      data: signer,
      error: signerError
    } =
      await supabase
        .from("lease_signers")
        .select("*")
        .eq(
          "access_token",
          String(token)
        )
        .single();

    if (
      signerError ||
      !signer
    ) {
      return res.status(404).json({
        error:
          "Signer not found"
      });
    }

    if (
      signer.signed_at
    ) {
      return res.status(409).json({
        error:
          "This signer has already signed."
      });
    }

    const {
      data: lease,
      error: leaseError
    } =
      await supabase
        .from("leases")
        .select("*")
        .eq(
          "id",
          signer.lease_id
        )
        .single();

    if (
      leaseError ||
      !lease
    ) {
      return res.status(404).json({
        error:
          "Lease not found"
      });
    }

    const {
      data: requiredSigners,
      error: requiredError
    } =
      await supabase
        .from("lease_signers")
        .select(
          "id,signer_role,signer_name,signer_email,is_required,signed_at,access_token"
        )
        .eq(
          "lease_id",
          signer.lease_id
        )
        .eq(
          "is_required",
          true
        );

    if (
      requiredError
    ) {
      return res.status(500).json({
        error:
          requiredError.message
      });
    }

    const guestSigners =
      (requiredSigners || [])
        .filter(
          item =>
            item.signer_role !==
            "owner"
        );

    if (
      signer.signer_role ===
      "owner"
    ) {
      const guestsComplete =
        guestSigners.every(
          item =>
            Boolean(
              item.signed_at
            )
        );

      if (
        !guestsComplete
      ) {
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
          .eq(
            "reservation_id",
            lease.reservation_id
          );

      if (
        paymentError
      ) {
        return res.status(500).json({
          error:
            paymentError.message
        });
      }

      const paid =
        (payments || [])
          .reduce(
            (
              total,
              payment
            ) =>
              total +
              Number(
                payment.amount ||
                0
              ),
            0
          );

      if (
        paid <= 0
      ) {
        return res.status(409).json({
          error:
            "A payment must be received before the owner signs."
        });
      }
    }

    const signedAt =
      new Date()
        .toISOString();

    const {
      error: updateError
    } =
      await supabase
        .from("lease_signers")
        .update({
          signature_text:
            String(signature)
              .trim(),

          signature_method:
            "typed_name",

          signed_at:
            signedAt,

          updated_at:
            signedAt
        })
        .eq(
          "id",
          signer.id
        );

    if (
      updateError
    ) {
      return res.status(500).json({
        error:
          updateError.message
      });
    }

    const initialRows =
      Object.entries(
        initials || {}
      )
        .filter(
          ([, value]) =>
            String(
              value || ""
            ).trim()
        )
        .map(
          (
            [
              sectionKey,
              value
            ]
          ) => ({
            lease_id:
              signer.lease_id,

            signer_id:
              signer.id,

            section_key:
              sectionKey,

            section_title:
              sectionKey,

            initials:
              String(value)
                .trim(),

            initialed_at:
              signedAt
          })
        );

    if (
      initialRows.length
    ) {
      const {
        error: initialError
      } =
        await supabase
          .from("lease_initials")
          .upsert(
            initialRows,
            {
              onConflict:
                "signer_id,section_key"
            }
          );

      if (
        initialError
      ) {
        return res.status(500).json({
          error:
            initialError.message
        });
      }
    }

    await supabase
      .from("lease_events")
      .insert({
        lease_id:
          signer.lease_id,

        signer_id:
          signer.id,

        event_type:
          "signer_signed",

        event_data: {
          signer_role:
            signer.signer_role,

          signed_at:
            signedAt
        }
      });

    /*
      OWNER SIGNATURE
    */

    if (
      signer.signer_role ===
      "owner"
    ) {
      const {
        error: completeError
      } =
        await supabase
          .from("leases")
          .update({
            status:
              "completed",

            updated_at:
              signedAt
          })
          .eq(
            "id",
            signer.lease_id
          );

      if (
        completeError
      ) {
        return res.status(500).json({
          error:
            completeError.message
        });
      }

      await supabase
        .from("lease_events")
        .insert({
          lease_id:
            signer.lease_id,

          signer_id:
            signer.id,

          event_type:
            "lease_completed",

          event_data: {
            completed_at:
              signedAt
          }
        });

      return res.status(200).json({
        success:
          true,

        ownerSigned:
          true,

        completed:
          true
      });
    }

    /*
      TENANT / GUEST SIGNATURE
    */

    const guestSideComplete =
      guestSigners.every(
        item =>
          Boolean(
            item.signed_at
          ) ||
          item.id ===
            signer.id
      );

    if (
      !guestSideComplete
    ) {
      return res.status(200).json({
        success:
          true,

        guestSideComplete:
          false
      });
    }

    const {
      data: payments,
      error: paymentError
    } =
      await supabase
        .from("payments")
        .select("amount")
        .eq(
          "reservation_id",
          lease.reservation_id
        );

    if (
      paymentError
    ) {
      return res.status(500).json({
        error:
          paymentError.message
      });
    }

    const paid =
      (payments || [])
        .reduce(
          (
            total,
            payment
          ) =>
            total +
            Number(
              payment.amount ||
              0
            ),
          0
        );

    const ownerSigner =
      (requiredSigners || [])
        .find(
          item =>
            item.signer_role ===
            "owner"
        );

    /*
      PAYMENT ALREADY EXISTS
    */

    if (
      paid > 0
    ) {
      await supabase
        .from("leases")
        .update({
          status:
            "awaiting_owner_signature",

          guest_completed_at:
            signedAt,

          updated_at:
            signedAt
        })
        .eq(
          "id",
          signer.lease_id
        );

      if (
        ownerSigner &&
        ownerSigner.signer_email &&
        ownerSigner.access_token
      ) {
        const signingUrl =
          `${siteOrigin(req)}/lease.html?token=${encodeURIComponent(
            ownerSigner.access_token
          )}`;

        try {
          await sendOwnerReadyEmail(
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

          await supabase
            .from("lease_events")
            .insert({
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
                  paid
              }
            });

        } catch (emailError) {
          console.error(
            "Owner ready email error:",
            emailError
          );
        }
      }

      return res.status(200).json({
        success:
          true,

        guestSideComplete:
          true,

        paymentReceived:
          true,

        awaitingOwnerSignature:
          true
      });
    }

    /*
      NO PAYMENT YET:
      MOVE LEASE TO AWAITING PAYMENT,
      CREATE STRIPE CHECKOUT,
      RETURN PAYMENT URL TO LEASE PAGE
    */

    await supabase
      .from("leases")
      .update({
        status:
          "awaiting_payment",

        guest_completed_at:
          signedAt,

        updated_at:
          signedAt
      })
      .eq(
        "id",
        signer.lease_id
      );

    let checkoutUrl =
      null;

    try {
      checkoutUrl =
        await createCheckoutSession(
          req,
          lease.reservation_id
        );

      await supabase
        .from("lease_events")
        .insert({
          lease_id:
            lease.id,

          signer_id:
            signer.id,

          event_type:
            "payment_checkout_created",

          event_data: {
            reservation_id:
              lease.reservation_id
          }
        });

    } catch (checkoutError) {
      console.error(
        "Checkout creation error:",
        checkoutError
      );

      return res.status(500).json({
        error:
          checkoutError.message ||
          "Your lease was signed, but the payment page could not be opened."
      });
    }

    return res.status(200).json({
      success:
        true,

      guestSideComplete:
        true,

      paymentReceived:
        false,

      awaitingOwnerSignature:
        false,

      checkout_url:
        checkoutUrl
    });

  } catch (error) {
    console.error(
      "Sign lease error:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          "The lease could not be signed."
      });
  }
}
