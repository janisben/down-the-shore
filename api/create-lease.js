import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";

  const date =
    new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);
}

function formatMoney(value) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD"
    }
  ).format(Number(value || 0));
}

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

  const {
    data,
    error
  } =
    await supabase.auth.getUser(
      token
    );

  if (
    error ||
    !data?.user
  ) {
    throw Object.assign(
      new Error("Owner session is invalid or expired."),
      { statusCode: 401 }
    );
  }

  return data.user;
}

async function sendLeaseEmail(
  req,
  {
    to,
    guestName,
    propertyName,
    arrival,
    departure,
    total,
    signingUrl
  }
) {
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#24231f;max-width:640px;margin:0 auto;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;">
        Down the Shore
      </h1>

      <p>Hi ${esc(guestName)},</p>

      <p>
        Your reservation has been approved. The next step is to
        review and sign your rental agreement.
      </p>

      <div style="background:#f5f1e8;padding:18px;margin:22px 0;">
        <p style="margin:0 0 8px;">
          <strong>${esc(propertyName)}</strong>
        </p>

        <p style="margin:0 0 8px;">
          ${esc(formatDate(arrival))} – ${esc(formatDate(departure))}
        </p>

        <p style="margin:0;">
          <strong>Reservation total: ${esc(formatMoney(total))}</strong>
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
        Please complete all required initials and your signature.
        After the required guest and co-signer signatures are complete,
        the payment step comes next. Janis will sign the agreement
        after the required payment has been received.
      </p>

      <p>
        Thank you,<br>
        Janis<br>
        Down the Shore
      </p>

      <p style="font-size:12px;color:#716f68;margin-top:28px;">
        Owner is a New Jersey licensed real estate broker.
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
        body: JSON.stringify({
          to,
          subject:
            `Your Down the Shore rental agreement — ${propertyName}`,
          html
        })
      }
    );

  let body = null;

  try {
    body = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      body?.error ||
      body?.message ||
      "Lease was created, but the signing email could not be sent."
    );
  }

  return body;
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error:
        "Method not allowed"
    });
  }

  try {
    await requireOwner(req);

    const {
      reservation_id,
      cosigners = []
    } =
      req.body || {};

    if (!reservation_id) {
      return res.status(400).json({
        error:
          "reservation_id is required"
      });
    }

    const {
      data: reservation,
      error: reservationError
    } =
      await supabase
        .from("reservations")
        .select("*")
        .eq(
          "id",
          reservation_id
        )
        .single();

    if (
      reservationError ||
      !reservation
    ) {
      return res.status(404).json({
        error:
          "Reservation not found"
      });
    }

    if (!reservation.guest_email) {
      return res.status(400).json({
        error:
          "The reservation needs a guest email before a lease can be sent."
      });
    }

    const {
      data: property,
      error: propertyError
    } =
      await supabase
        .from("properties")
        .select(
          "id,name,cleaning_fee,pet_fee,max_dogs"
        )
        .eq(
          "id",
          reservation.property_id
        )
        .single();

    if (
      propertyError ||
      !property
    ) {
      return res.status(404).json({
        error:
          "Property not found"
      });
    }

    const rentalType =
      reservation.rental_type ||
      "standard";

    let {
      data: existingLease,
      error: existingLeaseError
    } =
      await supabase
        .from("leases")
        .select("*")
        .eq(
          "reservation_id",
          reservation.id
        )
        .maybeSingle();

    if (existingLeaseError) {
      throw existingLeaseError;
    }

    let lease =
      existingLease;

    if (!lease) {
      const leaseData = {
        reservation_id:
          reservation.id,

        property_id:
          reservation.property_id,

        property_name:
          property.name,

        guest_name:
          reservation.guest_name ||
          "",

        guest_email:
          reservation.guest_email ||
          "",

        guest_phone:
          reservation.guest_phone ||
          "",

        arrival_date:
          reservation.arrival_date,

        departure_date:
          reservation.departure_date,

        adults:
          Number(
            reservation.adults || 0
          ),

        children:
          Number(
            reservation.children || 0
          ),

        dogs:
          Number(
            reservation.dogs || 0
          ),

        dog_names:
          reservation.dog_names ||
          "",

        amount_due:
          Number(
            reservation.amount_due || 0
          ),

        cleaning_fee:
          Number(
            property.cleaning_fee || 0
          ),

        pet_fee:
          Number(
            property.pet_fee || 75
          ),

        max_dogs:
          Number(
            property.max_dogs || 2
          ),

        rental_type:
          rentalType,

        booking_source:
          reservation.booking_source ||
          ""
      };

      const {
        data: createdLease,
        error: leaseError
      } =
        await supabase
          .from("leases")
          .insert({
            reservation_id:
              reservation.id,

            lease_type:
              rentalType,

            status:
              "awaiting_guest_signature",

            lease_data:
              leaseData
          })
          .select()
          .single();

      if (leaseError) {
        throw leaseError;
      }

      lease =
        createdLease;

      const signers = [
        {
          lease_id:
            lease.id,

          signer_role:
            "tenant",

          signer_name:
            reservation.guest_name ||
            null,

          signer_email:
            reservation.guest_email,

          signer_phone:
            reservation.guest_phone ||
            null,

          is_required:
            true,

          sort_order:
            1
        },

        ...(
          Array.isArray(cosigners)
            ? cosigners
                .filter(
                  item =>
                    item &&
                    item.email
                )
                .map(
                  (
                    item,
                    index
                  ) => ({
                    lease_id:
                      lease.id,

                    signer_role:
                      item.role ===
                      "parent_guardian"
                        ? "parent_guardian"
                        : "cosigner",

                    signer_name:
                      item.name ||
                      null,

                    signer_email:
                      item.email,

                    signer_phone:
                      item.phone ||
                      null,

                    is_required:
                      true,

                    sort_order:
                      10 + index
                  })
                )
            : []
        ),

        {
          lease_id:
            lease.id,

          signer_role:
            "owner",

          signer_name:
            "Janis Benstock",

          signer_email:
            null,

          signer_phone:
            null,

          is_required:
            true,

          sort_order:
            99
        }
      ];

      const {
        error: signerInsertError
      } =
        await supabase
          .from("lease_signers")
          .insert(signers);

      if (signerInsertError) {
        throw signerInsertError;
      }

      await supabase
        .from("lease_events")
        .insert({
          lease_id:
            lease.id,

          event_type:
            "lease_created",

          event_data: {
            source:
              "owner_portal",
            rental_type:
              rentalType
          }
        });
    } else if (
      lease.status === "draft"
    ) {
      const {
        data: updatedLease,
        error: updateError
      } =
        await supabase
          .from("leases")
          .update({
            status:
              "awaiting_guest_signature",
            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            lease.id
          )
          .select()
          .single();

      if (updateError) {
        throw updateError;
      }

      lease =
        updatedLease;
    }

    const {
      data: tenantSigner,
      error: tenantSignerError
    } =
      await supabase
        .from("lease_signers")
        .select("*")
        .eq(
          "lease_id",
          lease.id
        )
        .eq(
          "signer_role",
          "tenant"
        )
        .order(
          "sort_order",
          {
            ascending:
              true
          }
        )
        .limit(1)
        .single();

    if (
      tenantSignerError ||
      !tenantSigner
    ) {
      throw new Error(
        "The tenant signing record could not be found."
      );
    }

    const signingUrl =
      `${siteOrigin(req)}/lease.html?token=${encodeURIComponent(tenantSigner.access_token)}`;

    const emailResult =
      await sendLeaseEmail(
        req,
        {
          to:
            reservation.guest_email,

          guestName:
            reservation.guest_name ||
            "there",

          propertyName:
            property.name,

          arrival:
            reservation.arrival_date,

          departure:
            reservation.departure_date,

          total:
            reservation.amount_due,

          signingUrl
        }
      );

    await supabase
      .from("lease_events")
      .insert({
        lease_id:
          lease.id,

        signer_id:
          tenantSigner.id,

        event_type:
          "lease_sent",

        event_data: {
          to:
            reservation.guest_email
        }
      });

    return res.status(200).json({
      success:
        true,

      lease_id:
        lease.id,

      status:
        lease.status,

      signing_url:
        signingUrl,

      email_sent:
        true,

      email:
        emailResult
    });

  } catch (error) {
    console.error(
      "Create lease error:",
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
          "Could not create and send the lease."
      });
  }
}
