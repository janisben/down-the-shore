import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const {
    token,
    signature,
    initials
  } =
    req.body || {};

  if (!token || !signature) {
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
      .eq("access_token", String(token))
      .single();

  if (signerError || !signer) {
    return res.status(404).json({
      error: "Signer not found"
    });
  }

  if (signer.signed_at) {
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
      .eq("id", signer.lease_id)
      .single();

  if (leaseError || !lease) {
    return res.status(404).json({
      error: "Lease not found"
    });
  }

  const {
    data: requiredSigners,
    error: requiredError
  } =
    await supabase
      .from("lease_signers")
      .select(
        "id,signer_role,is_required,signed_at"
      )
      .eq("lease_id", signer.lease_id)
      .eq("is_required", true);

  if (requiredError) {
    return res.status(500).json({
      error: requiredError.message
    });
  }

  const guestSideCompleteBefore =
    (requiredSigners || [])
      .filter(
        item =>
          item.signer_role !== "owner"
      )
      .every(
        item =>
          Boolean(item.signed_at)
      );

  if (signer.signer_role === "owner") {
    if (!guestSideCompleteBefore) {
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

    if (paymentError) {
      return res.status(500).json({
        error: paymentError.message
      });
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
  }

  const signedAt =
    new Date().toISOString();

  const {
    error: updateError
  } =
    await supabase
      .from("lease_signers")
      .update({
        signature_text:
          String(signature).trim(),
        signature_method:
          "typed_name",
        signed_at:
          signedAt,
        updated_at:
          signedAt
      })
      .eq("id", signer.id);

  if (updateError) {
    return res.status(500).json({
      error: updateError.message
    });
  }

  const initialRows =
    Object.entries(initials || {})
      .filter(
        ([, value]) =>
          String(value || "").trim()
      )
      .map(
        ([sectionKey, value]) => ({
          lease_id:
            signer.lease_id,
          signer_id:
            signer.id,
          section_key:
            sectionKey,
          section_title:
            sectionKey,
          initials:
            String(value).trim(),
          initialed_at:
            signedAt
        })
      );

  if (initialRows.length) {
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

    if (initialError) {
      return res.status(500).json({
        error: initialError.message
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
          signer.signer_role
      }
    });

  if (signer.signer_role === "owner") {
    const {
      error: completeError
    } =
      await supabase
        .from("leases")
        .update({
          status: "completed",
          updated_at: signedAt
        })
        .eq("id", signer.lease_id);

    if (completeError) {
      return res.status(500).json({
        error: completeError.message
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
      success: true,
      ownerSigned: true,
      completed: true
    });
  }

  const guestSideComplete =
    (requiredSigners || [])
      .filter(
        item =>
          item.signer_role !== "owner"
      )
      .every(
        item =>
          Boolean(
            item.signed_at ||
            item.id === signer.id
          )
      );

  if (guestSideComplete) {
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
      .eq("id", signer.lease_id);
  }

  return res.status(200).json({
    success: true,
    guestSideComplete
  });
}
