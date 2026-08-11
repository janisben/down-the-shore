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
      new Error(
        "Owner authentication required."
      ),
      {
        statusCode: 401
      }
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
      new Error(
        "Owner session is invalid or expired."
      ),
      {
        statusCode: 401
      }
    );
  }

  return data.user;
}

function objectValue(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value
    : {};
}

function mergedLeaseTerms(
  property,
  reservation
) {
  const defaults =
    objectValue(
      property.lease_defaults
    );

  const overrides =
    objectValue(
      reservation.lease_overrides
    );

  return {
    ...defaults,
    ...overrides
  };
}

function numberValue(
  value,
  fallback = 0
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function booleanValue(
  value,
  fallback = false
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  return fallback;
}

function buildLeaseData(
  property,
  reservation
) {
  const terms =
    mergedLeaseTerms(
      property,
      reservation
    );

  return {
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
      numberValue(
        reservation.adults,
        0
      ),

    children:
      numberValue(
        reservation.children,
        0
      ),

    dogs:
      numberValue(
        reservation.dogs,
        0
      ),

    dog_names:
      reservation.dog_names ||
      "",

    amount_due:
      numberValue(
        reservation.amount_due,
        0
      ),

    security_deposit:
      numberValue(
        reservation.security_deposit,
        0
      ),

    cleaning_fee:
      numberValue(
        property.cleaning_fee,
        0
      ),

    pet_fee:
      numberValue(
        property.pet_fee,
        0
      ),

    max_dogs:
      numberValue(
        property.max_dogs,
        0
      ),

    rental_type:
      reservation.rental_type ||
      "standard",

    booking_source:
      reservation.booking_source ||
      "",

    check_in_time:
      terms.check_in_time ||
      "2:00 PM",

    check_out_time:
      terms.check_out_time ||
      "10:00 AM",

    linens_text:
      terms.linens_text ||
      "",

    beach_tags:
      numberValue(
        terms.beach_tags,
        0
      ),

    beach_chairs:
      numberValue(
        terms.beach_chairs,
        0
      ),

    beach_tag_replacement_fee:
      numberValue(
        terms.beach_tag_replacement_fee,
        50
      ),

    bed_configuration:
      terms.bed_configuration ||
      "",

    washer_dryer:
      booleanValue(
        terms.washer_dryer,
        false
      ),

    internet:
      booleanValue(
        terms.internet,
        false
      ),

    smart_tv:
      booleanValue(
        terms.smart_tv,
        false
      ),

    coffee_pot:
      booleanValue(
        terms.coffee_pot,
        false
      ),

    fully_stocked_kitchen:
      booleanValue(
        terms.fully_stocked_kitchen,
        false
      )
  };
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

      <p>
        Hi ${esc(guestName)},
      </p>

      <p>
        Your reservation has been approved.
        The next step is to review and sign
        your rental agreement.
      </p>

      <div style="background:#f5f1e8;padding:18px;margin:22px 0;">
        <p style="margin:0 0 8px;">
          <strong>
            ${esc(propertyName)}
          </strong>
        </p>

        <p style="margin:0 0 8px;">
          ${esc(formatDate(arrival))}
          –
          ${esc(formatDate(departure))}
        </p>

        <p style="margin:0;">
          <strong>
            Reservation total:
            ${esc(formatMoney(total))}
          </strong>
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
        Please complete all required initials
        and your signature. Janis will execute
        the agreement after your signature is
        complete and the required initial
        payment has been received.
      </p>

      <p>
        Thank you,<br>
        Janis<br>
        Down the Shore
      </p>

      <p style="font-size:12px;color:#716f68;margin-top:28px;">
        Owner is a New Jersey licensed real
        estate broker.
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
              `Your Down the Shore rental agreement — ${propertyName}`,

            html
          })
      }
    );

  let body =
    null;

  try {
    body =
      await response.json();
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
    const ownerUser =
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

    if (
      !reservation.guest_email
    ) {
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
          "id,name,cleaning_fee,pet_fee,max_dogs,lease_defaults"
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

    if (
      rentalType !==
      "standard"
    ) {
      return res.status(409).json({
        error:
          "Only the regular summer lease is active right now. Senior Week and winter leases will use separate agreements."
      });
    }

    const leaseData =
      buildLeaseData(
        property,
        reservation
      );

    let {
      data: existingLease,
      error:
        existingLeaseError
    } =
      await supabase
        .from("leases")
        .select("*")
        .eq(
          "reservation_id",
          reservation.id
        )
        .maybeSingle();

    if (
      existingLeaseError
    ) {
      throw existingLeaseError;
    }

    let lease =
      existingLease;

    if (!lease) {
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
            ownerUser.email ||
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
        error:
          signerInsertError
      } =
        await supabase
          .from("lease_signers")
          .insert(signers);

      if (
        signerInsertError
      ) {
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

    } else {

      if (
        lease.status ===
        "completed"
      ) {
        return res.status(409).json({
          error:
            "This lease has already been completed."
        });
      }

      const {
        data: signers,
        error: signerCheckError
      } =
        await supabase
          .from("lease_signers")
          .select(
            "id,signed_at"
          )
          .eq(
            "lease_id",
            lease.id
          );

      if (
        signerCheckError
      ) {
        throw signerCheckError;
      }

      const alreadySigned =
        (signers || [])
          .some(
            signer =>
              Boolean(
                signer.signed_at
              )
          );

      if (
        alreadySigned
      ) {
        return res.status(409).json({
          error:
            "This lease has already been signed and cannot be regenerated with changed lease terms."
        });
      }

      const {
        data: updatedLease,
        error: updateError
      } =
        await supabase
          .from("leases")
          .update({
            lease_type:
              rentalType,

            lease_data:
              leaseData,

            status:
              "awaiting_guest_signature",

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            "id",
            lease.id
          )
          .select()
          .single();

      if (
        updateError
      ) {
        throw updateError;
      }

      lease =
        updatedLease;
    }

    const {
      data: tenantSigner,
      error:
        tenantSignerError
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
      `${siteOrigin(req)}/lease.html?token=${encodeURIComponent(
        tenantSigner.access_token
      )}`;

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
