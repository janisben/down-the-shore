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


function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  );
}


async function sendEmail(
  req,
  {
    to,
    subject,
    html
  }
) {
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
            subject,
            html
          })
      }
    );

  let body = {};

  try {
    body =
      await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      body.error ||
      body.message ||
      "Email could not be sent."
    );
  }

  return body;
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
        and the agreement is ready for your signature.
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

  await sendEmail(
    req,
    {
      to,

      subject:
        `Owner signature required — ${propertyName}`,

      html
    }
  );

  return true;
}


async function notificationAlreadySent(
  reservationId,
  notificationType,
  recipientEmail
) {
  const {
    data,
    error
  } =
    await supabase
      .from(
        "reservation_notifications"
      )
      .select("id")
      .eq(
        "reservation_id",
        reservationId
      )
      .eq(
        "notification_type",
        notificationType
      )
      .eq(
        "recipient_email",
        recipientEmail
      )
      .limit(1);

  if (error) {
    throw error;
  }

  return Boolean(
    data &&
    data.length
  );
}


async function recordNotification(
  reservationId,
  notificationType,
  recipientEmail,
  details = {}
) {
  const {
    error
  } =
    await supabase
      .from(
        "reservation_notifications"
      )
      .insert({
        reservation_id:
          reservationId,

        notification_type:
          notificationType,

        recipient_email:
          recipientEmail,

        sent_at:
          new Date().toISOString(),

        details
      });

  if (
    error &&
    error.code !== "23505"
  ) {
    throw error;
  }
}


async function sendCleanerNotification(
  req,
  reservation
) {
  const {
    data: cleanings,
    error: cleaningError
  } =
    await supabase
      .from(
        "cleaning_assignments"
      )
      .select("*")
      .eq(
        "reservation_id",
        reservation.id
      )
      .limit(1);

  if (cleaningError) {
    throw cleaningError;
  }

  const cleaning =
    cleanings?.[0] ||
    null;

  if (!cleaning) {
    throw new Error(
      "No cleaning assignment exists for this reservation."
    );
  }

  if (
    cleaning.status ===
      "confirmed" ||
    cleaning.status ===
      "completed"
  ) {
    return {
      skipped: true,
      reason:
        "Cleaner already confirmed."
    };
  }

  if (!cleaning.cleaner_email) {
    throw new Error(
      "Cleaning assignment does not have a cleaner email."
    );
  }

  const alreadySent =
    await notificationAlreadySent(
      reservation.id,
      "cleaner_assignment",
      cleaning.cleaner_email
    );

  if (alreadySent) {
    return {
      skipped: true,
      reason:
        "Cleaner email already sent."
    };
  }

  const response =
    await fetch(
      `${siteOrigin(req)}/api/cleaning-assigned`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            reservationId:
              reservation.id
          })
      }
    );

  let body = {};

  try {
    body =
      await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      body.error ||
      body.message ||
      "Cleaner email could not be sent."
    );
  }

  await recordNotification(
    reservation.id,
    "cleaner_assignment",
    cleaning.cleaner_email,
    {
      cleaning_assignment_id:
        cleaning.id,

      checkout_date:
        cleaning.checkout_date ||
        reservation.departure_date
    }
  );

  return {
    sent: true,
    to:
      cleaning.cleaner_email
  };
}


async function sendBrokerNotifications(
  req,
  reservation,
  property
) {
  /*
    Brokerage-originated reservations
    do not need the owner's listing
    contacts notified by this workflow.
  */
  if (
    reservation.booking_source ===
    "brokerage"
  ) {
    return {
      skipped: true,
      reason:
        "Brokerage reservation."
    };
  }

  const {
    data: contacts,
    error: contactsError
  } =
    await supabase
      .from(
        "property_notification_contacts"
      )
      .select(
        "id,name,email,active"
      )
      .eq(
        "property_id",
        reservation.property_id
      )
      .eq(
        "active",
        true
      );

  if (contactsError) {
    throw contactsError;
  }

  if (
    !contacts ||
    !contacts.length
  ) {
    return {
      skipped: true,
      reason:
        "No active listing contacts."
    };
  }

  const arrival =
    formatDate(
      reservation.arrival_date
    );

  const departure =
    formatDate(
      reservation.departure_date
    );

  const propertyName =
    property?.name ||
    "Down the Shore property";

  const propertyAddress =
    property?.address ||
    "";

  const results = [];

  for (
    const contact of contacts
  ) {
    if (!contact.email) {
      continue;
    }

    const alreadySent =
      await notificationAlreadySent(
        reservation.id,
        "listing_block_dates",
        contact.email
      );

    if (alreadySent) {
      results.push({
        email:
          contact.email,
        skipped:
          true
      });

      continue;
    }

    const displayName =
      contact.name ||
      "there";

    const html = `
      <div style="
        font-family:Arial,Helvetica,sans-serif;
        max-width:620px;
        margin:0 auto;
        line-height:1.6;
        color:#172334;
      ">

        <h2 style="
          color:#0d2b4d;
          font-family:Georgia,'Times New Roman',serif;
          font-weight:400;
        ">
          Down the Shore
        </h2>

        <p>
          Hi ${esc(displayName)},
        </p>

        <p>
          An owner rental has been confirmed.
          Please block the following dates
          on your rental calendar.
        </p>

        <div style="
          background:#f7f4ef;
          padding:18px;
          margin:20px 0;
        ">

          <strong>
            ${esc(propertyName)}
          </strong>

          ${
            propertyAddress
              ? `
                <br>
                ${esc(propertyAddress)}
              `
              : ""
          }

          <br><br>

          <strong>
            ${esc(arrival)}
            –
            ${esc(departure)}
          </strong>

        </div>

        <p>
          Thank you,<br>
          Janis<br>
          Down the Shore
        </p>

      </div>
    `;

    await sendEmail(
      req,
      {
        to:
          contact.email,

        subject:
          `Block dates — ${propertyName}${propertyAddress ? ` — ${propertyAddress}` : ""}`,

        html
      }
    );

    await recordNotification(
      reservation.id,
      "listing_block_dates",
      contact.email,
      {
        contact_id:
          contact.id,

        property_id:
          reservation.property_id,

        property_name:
          propertyName,

        property_address:
          propertyAddress,

        arrival_date:
          reservation.arrival_date,

        departure_date:
          reservation.departure_date
      }
    );

    results.push({
      email:
        contact.email,
      sent:
        true
    });
  }

  return {
    results
  };
}


async function runOwnerCompletionNotifications(
  req,
  reservationId
) {
  const {
    data: reservation,
    error: reservationError
  } =
    await supabase
      .from("reservations")
      .select("*")
      .eq(
        "id",
        reservationId
      )
      .single();

  if (
    reservationError ||
    !reservation
  ) {
    throw new Error(
      reservationError?.message ||
      "Reservation could not be found."
    );
  }

  const {
    data: property,
    error: propertyError
  } =
    await supabase
      .from("properties")
      .select(
        "id,name,address"
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
    throw new Error(
      propertyError?.message ||
      "Property could not be found."
    );
  }

  const results = {
    cleaner: null,
    brokers: null
  };

  /*
    Each notification is deliberately
    independent. A temporary email failure
    must NOT undo or block the completed lease.
  */

  try {
    results.cleaner =
      await sendCleanerNotification(
        req,
        reservation
      );
  } catch (error) {
    console.error(
      "Automatic cleaner notification error:",
      error
    );

    results.cleaner = {
      error:
        error.message
    };
  }

  try {
    results.brokers =
      await sendBrokerNotifications(
        req,
        reservation,
        property
      );
  } catch (error) {
    console.error(
      "Automatic broker notification error:",
      error
    );

    results.brokers = {
      error:
        error.message
    };
  }

  return results;
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


    /*
      OWNER SIGNATURE

      Guest signatures must be complete.

      Payment is intentionally NOT checked
      here. The owner's signature is the
      authoritative confirmation trigger.
    */

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
      OWNER SIGNATURE COMPLETES LEASE
      AND FIRES AUTOMATIONS
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


      let notifications = {};

      try {
        notifications =
          await runOwnerCompletionNotifications(
            req,
            lease.reservation_id
          );
      } catch (notificationError) {
        /*
          Never fail the lease signature
          because of an email problem.
        */
        console.error(
          "Owner completion notification error:",
          notificationError
        );

        notifications = {
          error:
            notificationError.message
        };
      }


      await supabase
        .from("lease_events")
        .insert({
          lease_id:
            signer.lease_id,

          signer_id:
            signer.id,

          event_type:
            "owner_completion_notifications",

          event_data: {
            triggered_at:
              signedAt,

            notifications
          }
        });


      return res.status(200).json({
        success:
          true,

        ownerSigned:
          true,

        completed:
          true,

        notifications
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
      const {
        error: ownerReadyError
      } =
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
        ownerReadyError
      ) {
        return res.status(500).json({
          error:
            ownerReadyError.message
        });
      }


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
      NO PAYMENT YET

      The guest has finished signing.

      Payment method selection remains
      separate from lease signing.
    */

    const {
      error: awaitingPaymentError
    } =
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

    if (
      awaitingPaymentError
    ) {
      return res.status(500).json({
        error:
          awaitingPaymentError.message
      });
    }


    await supabase
      .from("lease_events")
      .insert({
        lease_id:
          lease.id,

        signer_id:
          signer.id,

        event_type:
          "awaiting_payment_method",

        event_data: {
          reservation_id:
            lease.reservation_id
        }
      });


    return res.status(200).json({
      success:
        true,

      guestSideComplete:
        true,

      paymentReceived:
        false,

      awaitingOwnerSignature:
        false,

      choosePaymentMethod:
        true,

      reservationId:
        lease.reservation_id
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
