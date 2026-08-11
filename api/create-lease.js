import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

function leaseSections(lease) {
  // Stage 2 shell.
  // We will replace these placeholder sections with the
  // finalized Down the Shore lease language next.
  return [
    {
      key: "agreement",
      title: "Rental agreement",
      requires_initials: true,
      html:
        "<p>This lease page is connected and ready for the finalized Down the Shore rental agreement language.</p>"
    },
    {
      key: "occupancy",
      title: "Occupancy and responsibility",
      requires_initials: true,
      html:
        "<p>Reservation-specific occupancy and responsibility terms will appear here.</p>"
    },
    {
      key: "property_rules",
      title: "Property rules",
      requires_initials: true,
      html:
        "<p>Property-specific rules will appear here.</p>"
    }
  ];
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error:"Method not allowed"
    });
  }

  const token =
    String(req.query.token || "");

  if (!token) {
    return res.status(400).json({
      error:"Lease token is required"
    });
  }

  const {
    data: signer,
    error: signerError
  } =
    await supabase
      .from("lease_signers")
      .select("*")
      .eq("access_token",token)
      .single();

  if (signerError || !signer) {
    return res.status(404).json({
      error:"Lease link not found"
    });
  }

  const {
    data: lease,
    error: leaseError
  } =
    await supabase
      .from("leases")
      .select("*")
      .eq("id",signer.lease_id)
      .single();

  if (leaseError || !lease) {
    return res.status(404).json({
      error:"Lease not found"
    });
  }

  return res.status(200).json({
    id:lease.id,
    status:lease.status,
    lease_type:lease.lease_type,
    lease_data:lease.lease_data,
    signer:{
      id:signer.id,
      signer_role:signer.signer_role,
      signer_name:signer.signer_name,
      signer_email:signer.signer_email,
      signed_at:signer.signed_at,
      signature_text:signer.signature_text
    },
    sections:leaseSections(lease)
  });
}
