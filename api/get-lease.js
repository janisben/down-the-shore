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

function money(value) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD"
    }
  ).format(Number(value || 0));
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

function propertyDetails(data) {
  const propertyName =
    data.property_name ||
    "the rental property";

  const isCottage =
    String(propertyName)
      .toLowerCase()
      .includes("cottage");

  return {
    propertyName,
    checkIn:
      data.check_in_time ||
      "2:00 PM",
    checkOut:
      data.check_out_time ||
      "10:00 AM",
    cleaningFee:
      Number(
        data.cleaning_fee || 0
      ),
    petFee:
      Number(
        data.pet_fee || 75
      ),
    maxDogs:
      Number(
        data.max_dogs || 2
      ),
    beachTagCharge:
      Number(
        data.beach_tag_replacement_fee ||
        50
      ),
    linensText:
      data.linens_text ||
      (
        isCottage
          ? "Guests are responsible for bringing their own sheets, towels, and other personal linens unless otherwise stated in the reservation or guest guide."
          : "Guests are responsible for bringing their own sheets, towels, and other personal linens unless otherwise stated in the reservation or guest guide."
      )
  };
}

function standardSections(lease) {
  const data =
    lease.lease_data || {};

  const details =
    propertyDetails(data);

  const dogs =
    Number(data.dogs || 0);

  const dogNames =
    data.dog_names
      ? esc(data.dog_names)
      : "not listed";

  const total =
    money(data.amount_due);

  const guestName =
    esc(data.guest_name || "");

  const arrival =
    formatDate(data.arrival_date);

  const departure =
    formatDate(data.departure_date);

  const occupancy =
    Number(data.adults || 0) +
    Number(data.children || 0);

  const petParagraph =
    dogs > 0
      ? `
        <p>
          This reservation includes
          <strong>${dogs} dog${dogs === 1 ? "" : "s"}</strong>
          (${dogNames}).
          The pet fee is
          <strong>${money(details.petFee)} per dog</strong>,
          with a maximum of
          <strong>${details.maxDogs} dogs</strong>.
          Tenant is responsible for supervising all dogs,
          cleaning up after them, and preventing damage,
          nuisance, excessive barking, or disturbance.
          No animal other than those disclosed for this
          reservation may occupy the Property without
          Landlord's written approval.
        </p>
      `
      : `
        <p>
          No pets or animals are permitted unless they were
          disclosed in advance and approved by Landlord as
          part of the reservation. If Landlord approves a dog,
          the applicable pet fee and property rules will apply.
        </p>
      `;

  return [
    {
      key: "rental_terms",
      title: "1. Rental Terms",
      requires_initials: false,
      html: `
        <p>
          <strong>Landlord:</strong> Janis Benstock
        </p>
        <p>
          <strong>Tenant:</strong> ${guestName}
        </p>
        <p>
          <strong>Property:</strong>
          ${esc(details.propertyName)}, Ocean City, New Jersey
        </p>
        <p>
          <strong>Rental period:</strong>
          ${esc(arrival)} through ${esc(departure)}.
          Check-in is no earlier than
          <strong>${esc(details.checkIn)}</strong>
          and checkout is no later than
          <strong>${esc(details.checkOut)}</strong>,
          unless Landlord agrees otherwise in writing.
        </p>
        <p>
          <strong>Total reservation amount:</strong>
          ${esc(total)}.
          The payment schedule shown for this reservation is
          incorporated into this Agreement.
        </p>
        <p>
          The Property is being rented as a short-term
          vacation or seasonal accommodation. The parties
          acknowledge that this is not intended to create a
          year-round residential tenancy.
        </p>
      `
    },

    {
      key: "occupancy_use",
      title: "2. Occupancy, Use, and Responsibility",
      requires_initials: true,
      html: `
        <p>
          The Property may be used only as a private
          residence by the persons included in this
          reservation. The current reservation reflects
          <strong>${occupancy || "the disclosed number of"}</strong>
          occupant${occupancy === 1 ? "" : "s"}.
          Occupancy may not exceed the property's stated
          maximum occupancy.
        </p>
        <p>
          Tenant may not use the Property for any unlawful,
          commercial, professional, event, party, or other
          purpose inconsistent with a private vacation stay.
          Tenant may not sublet, assign, transfer, or permit
          another person to take over the reservation without
          Landlord's written consent.
        </p>
        <p>
          Tenant is responsible for the conduct of every
          person and animal permitted on the Property by
          Tenant, whether or not that person is named in this
          Agreement.
        </p>
      `
    },

    {
      key: "condition_damage",
      title: "3. Condition, Damage, and Security Deposit",
      requires_initials: true,
      html: `
        <p>
          Tenant accepts the Property in its existing
          condition, subject to any specific written
          representations made by Landlord. Tenant should
          promptly notify Landlord of any material problem or
          pre-existing damage discovered at check-in.
        </p>
        <p>
          Tenant shall return the Property in substantially
          the same condition in which it was received,
          ordinary wear from reasonable use excepted. Tenant
          is responsible for damage, breakage, missing items,
          excessive cleaning, rule violations, unauthorized
          occupants or animals, and other charges caused by
          Tenant or Tenant's guests.
        </p>
        <p>
          Any security deposit identified for this
          reservation may be applied to amounts properly due
          because of damage, excessive cleaning, missing
          property, unpaid charges, or other obligations under
          this Agreement. Tenant remains responsible for
          amounts exceeding the security deposit.
        </p>
      `
    },

    {
      key: "conduct_rules",
      title: "4. Conduct and House Rules",
      requires_initials: true,
      html: `
        <p>
          <strong>No smoking or vaping is permitted anywhere
          on the Property, indoors or outdoors, with no
          exceptions.</strong>
        </p>
        <p>
          Tenant must respect neighbors and avoid unreasonable
          noise, nuisance, disturbance, or conduct that
          interferes with the peaceful use of neighboring
          properties. Outdoor noise must be kept to a minimum,
          especially after <strong>10:00 PM</strong>.
        </p>
        <p>
          Tenant must comply with reasonable written property
          rules, trash and recycling instructions, parking
          instructions, safety requirements, and checkout
          instructions supplied by Landlord.
        </p>
        <p>
          A serious or repeated violation may constitute a
          default and may result in termination of occupancy
          to the extent permitted by law.
        </p>
      `
    },

    {
      key: "pets",
      title: "5. Dogs and Other Animals",
      requires_initials: false,
      html: petParagraph
    },

    {
      key: "linens_tags",
      title: "6. Linens, Beach Tags, and Property Items",
      requires_initials: true,
      html: `
        <p>
          ${esc(details.linensText)}
        </p>
        <p>
          Any beach tags, keys, access devices, remotes, or
          other property items supplied for the stay remain
          Landlord's property and must be returned as
          instructed.
        </p>
        <p>
          Tenant agrees to pay
          <strong>${money(details.beachTagCharge)}</strong>
          for each beach tag that is not returned at the end
          of the stay.
        </p>
      `
    },

    {
      key: "utilities_amenities",
      title: "7. Utilities, Appliances, and Amenities",
      requires_initials: false,
      html: `
        <p>
          Utilities are included unless the reservation,
          rate period, special conditions, or written rental
          terms specifically state otherwise.
        </p>
        <p>
          Landlord will make reasonable efforts to maintain
          appliances, internet service, air conditioning,
          televisions, and other amenities, but temporary
          interruption or failure of an appliance, utility,
          service, or amenity does not automatically entitle
          Tenant to a refund. Landlord will make reasonable
          efforts to arrange repairs when notified.
        </p>
      `
    },

    {
      key: "access",
      title: "8. Landlord Access",
      requires_initials: false,
      html: `
        <p>
          Landlord may enter the Property at reasonable times
          when reasonably necessary to inspect the Property,
          address an emergency, make or arrange repairs,
          provide necessary services, investigate a reported
          problem or rule violation, or as otherwise permitted
          by law. When circumstances reasonably allow,
          Landlord will attempt to provide notice before
          non-emergency entry.
        </p>
      `
    },

    {
      key: "cancellation_default",
      title: "9. Cancellation, Default, and Termination",
      requires_initials: true,
      html: `
        <p>
          A cancellation by Tenant does not automatically
          release Tenant from the financial obligations of
          the reservation. Any refund or credit is governed
          by the cancellation terms applicable to the
          reservation and any written agreement subsequently
          made by Landlord.
        </p>
        <p>
          Failure to make a required payment when due, a
          material misrepresentation in the reservation,
          unauthorized occupancy, serious property damage, or
          a material violation of this Agreement may
          constitute default.
        </p>
        <p>
          Landlord's rights following a default are subject
          to applicable New Jersey law. Nothing in this
          Agreement authorizes unlawful self-help or waives
          rights that cannot legally be waived.
        </p>
      `
    },

    {
      key: "rentability",
      title: "10. Casualty and Rentability",
      requires_initials: false,
      html: `
        <p>
          If the Property becomes materially unfit for
          occupancy because of fire, casualty, or another
          condition affecting the Property itself and the
          stay cannot reasonably continue, Landlord may
          cancel the affected portion of the reservation and
          return an equitable prorated share of prepaid rent
          for the unusable period.
        </p>
        <p>
          Off-site conditions outside Landlord's reasonable
          control, including weather, beach conditions,
          neighborhood conditions, construction elsewhere,
          municipal activity, or temporary interruption of
          amenities, do not by themselves make the Property
          unfit for occupancy.
        </p>
      `
    },

    {
      key: "megans_law",
      title: "11. Megan’s Law Information",
      requires_initials: false,
      html: `
        <p>
          New Jersey law provides for registration and
          community notification concerning certain convicted
          sex offenders. Information that is publicly
          available may be obtained from official New Jersey
          law-enforcement resources. Tenant is responsible for
          making any inquiry Tenant considers appropriate
          regarding the area surrounding the Property.
        </p>
      `
    },

    {
      key: "owner_disclosure",
      title: "12. Owner and Broker-License Disclosure",
      requires_initials: true,
      html: `
        <p>
          Landlord, <strong>Janis Benstock</strong>, is a
          licensed New Jersey real estate broker,
          license number <strong>1756109</strong>.
        </p>
        <p>
          Landlord is offering and renting the Property in
          Landlord's capacity as the owner of the Property,
          and not as a real estate brokerage representing
          Tenant or another party in this transaction.
        </p>
      `
    },

    {
      key: "electronic_signatures",
      title: "13. Electronic Signatures and Counterparts",
      requires_initials: false,
      html: `
        <p>
          The parties agree that this Agreement may be signed
          electronically and in counterparts. Electronic
          signatures, typed signatures used through the
          Down the Shore signing process, and electronic
          records of required initials are intended to have
          the same effect as signatures and initials placed
          on a paper counterpart to the extent permitted by
          applicable law.
        </p>
      `
    },

    {
      key: "acceptance",
      title: "14. Acceptance and Binding Effect",
      requires_initials: true,
      html: `
        <p>
          Tenant's signature confirms Tenant's agreement to
          these terms, but <strong>Landlord will not execute
          this Agreement until the required initial payment
          has been received.</strong>
        </p>
        <p>
          The reservation is not fully executed by Landlord
          until all required Tenant and co-signer signatures
          and initials have been completed, the required
          initial payment has been received, and Landlord has
          signed the Agreement.
        </p>
      `
    }
  ];
}

function seniorWeekSections(lease) {
  const data =
    lease.lease_data || {};

  const securityDeposit =
    data.security_deposit != null
      ? money(data.security_deposit)
      : "50% of total rent";

  return [
    {
      key: "senior_week_occupants",
      title: "Senior Week — Occupants and Co-Signers",
      requires_initials: true,
      html: `
        <p>
          This reservation is designated as a
          <strong>Senior Week rental</strong>.
          Every occupant must be identified to Landlord, and
          every occupant must have a parent or legal guardian
          sign as a required co-signer unless Landlord has
          expressly approved a different arrangement in
          writing.
        </p>
        <p>
          No person who is not included in the approved
          occupant list may stay overnight at the Property.
          Substitution of occupants requires Landlord's
          advance written approval.
        </p>
      `
    },

    {
      key: "senior_week_joint_liability",
      title: "Senior Week — Joint and Several Liability",
      requires_initials: true,
      html: `
        <p>
          Each Tenant, occupant who signs this Agreement, and
          required parent or guardian co-signer agrees to be
          <strong>jointly and severally liable</strong> for
          the obligations covered by that person's
          undertaking, including unpaid rent or charges,
          damage, excessive cleaning, missing property,
          fines or costs arising from prohibited conduct, and
          other amounts properly due under the Agreement.
        </p>
        <p>
          This means Landlord may seek the full amount of an
          obligation from any person who is legally
          responsible for that obligation, subject to
          applicable law, rather than being required to
          divide the claim among the occupants or co-signers.
        </p>
      `
    },

    {
      key: "senior_week_rules",
      title: "Senior Week — Conduct Rules",
      requires_initials: true,
      html: `
        <p>
          <strong>No parties. No alcohol. No unlisted
          overnight guests.</strong>
        </p>
        <p>
          Outdoor and indoor noise must remain reasonable at
          all times, and there must be no unreasonable noise
          or disturbance after <strong>10:00 PM</strong>.
        </p>
        <p>
          Police involvement, a serious disturbance,
          intentional property damage, prohibited alcohol or
          party activity, or a material violation of these
          Senior Week rules may constitute grounds for
          termination of occupancy to the extent permitted by
          law. A termination does not automatically eliminate
          financial responsibility for amounts otherwise due.
        </p>
      `
    },

    {
      key: "senior_week_deposit",
      title: "Senior Week — Security Deposit",
      requires_initials: true,
      html: `
        <p>
          The Senior Week security deposit for this
          reservation is
          <strong>${esc(securityDeposit)}</strong>,
          unless a different amount is specifically shown in
          the reservation.
        </p>
        <p>
          The security deposit does not limit liability.
          Occupants and responsible co-signers remain liable
          for covered damage, cleaning, missing property, or
          other amounts properly due that exceed the deposit.
        </p>
      `
    }
  ];
}

function leaseSections(lease) {
  const sections =
    standardSections(lease);

  if (
    lease.lease_type === "senior_week" ||
    lease.lease_data?.rental_type ===
      "senior_week"
  ) {
    sections.splice(
      sections.length - 2,
      0,
      ...seniorWeekSections(lease)
    );
  }

  return sections;
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const token =
    String(req.query.token || "");

  if (!token) {
    return res.status(400).json({
      error: "Lease token is required"
    });
  }

  const {
    data: signer,
    error: signerError
  } =
    await supabase
      .from("lease_signers")
      .select("*")
      .eq("access_token", token)
      .single();

  if (signerError || !signer) {
    return res.status(404).json({
      error: "Lease link not found"
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

  return res.status(200).json({
    id: lease.id,
    status: lease.status,
    lease_type: lease.lease_type,
    lease_data: lease.lease_data,
    signer: {
      id: signer.id,
      signer_role:
        signer.signer_role,
      signer_name:
        signer.signer_name,
      signer_email:
        signer.signer_email,
      signed_at:
        signer.signed_at,
      signature_text:
        signer.signature_text
    },
    sections:
      leaseSections(lease)
  });
}
