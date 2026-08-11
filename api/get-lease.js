import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function firstValue(data, keys, fallback = "") {
  for (const key of keys) {
    if (
      data[key] !== undefined &&
      data[key] !== null &&
      data[key] !== ""
    ) {
      return data[key];
    }
  }

  return fallback;
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
      firstValue(
        data,
        ["check_in_time"],
        "2:00 PM"
      ),

    checkOut:
      firstValue(
        data,
        ["check_out_time"],
        "10:00 AM"
      ),

    cleaningFee:
      Number(
        firstValue(
          data,
          ["cleaning_fee"],
          0
        )
      ),

    petFee:
      Number(
        firstValue(
          data,
          ["pet_fee"],
          75
        )
      ),

    maxDogs:
      Number(
        firstValue(
          data,
          ["max_dogs"],
          2
        )
      ),

    beachTagCharge:
      Number(
        firstValue(
          data,
          [
            "beach_tag_replacement_fee",
            "beach_tag_charge"
          ],
          50
        )
      ),

    beachTags:
      Number(
        firstValue(
          data,
          [
            "beach_tags",
            "beach_tag_count",
            "number_of_beach_tags"
          ],
          0
        )
      ),

    beachChairs:
      Number(
        firstValue(
          data,
          [
            "beach_chairs",
            "beach_chair_count",
            "number_of_beach_chairs"
          ],
          0
        )
      ),

    beds:
      firstValue(
        data,
        [
          "bed_sizes",
          "beds",
          "bed_configuration"
        ],
        isCottage
          ? "See property listing or guest information"
          : "See property listing or guest information"
      ),

    washerDryer:
      Boolean(
        firstValue(
          data,
          [
            "washer_dryer",
            "has_washer_dryer"
          ],
          !isCottage
        )
      ),

    internet:
      Boolean(
        firstValue(
          data,
          [
            "internet",
            "has_internet"
          ],
          true
        )
      ),

    smartTv:
      Boolean(
        firstValue(
          data,
          [
            "smart_tv",
            "has_smart_tv"
          ],
          true
        )
      ),

    coffeePot:
      Boolean(
        firstValue(
          data,
          [
            "coffee_pot",
            "has_coffee_pot"
          ],
          true
        )
      ),

    stockedKitchen:
      Boolean(
        firstValue(
          data,
          [
            "fully_stocked_kitchen",
            "stocked_kitchen"
          ],
          true
        )
      ),

    linensText:
      firstValue(
        data,
        ["linens_text"],
        "Guests are responsible for bringing their own sheets, towels, and other personal linens."
      )
  };
}

function amenitiesMarkup(details) {
  const items = [
    `<strong>Bed configuration:</strong> ${esc(details.beds)}`,
    `<strong>Washer/dryer:</strong> ${yesNo(details.washerDryer)}`,
    `<strong>Internet:</strong> ${yesNo(details.internet)}`,
    `<strong>Smart TV:</strong> ${yesNo(details.smartTv)}`,
    `<strong>Coffee pot:</strong> ${yesNo(details.coffeePot)}`,
    `<strong>Fully stocked kitchen:</strong> ${yesNo(details.stockedKitchen)}`,
    `<strong>Beach chairs:</strong> ${details.beachChairs}`,
    `<strong>Beach tags:</strong> ${details.beachTags}`
  ];

  return `
    <ul>
      ${items
        .map(item => `<li>${item}</li>`)
        .join("")}
    </ul>
  `;
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
      : "";

  const total =
    money(data.amount_due);

  const securityDeposit =
    Number(
      data.security_deposit || 0
    );

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
          ${dogNames ? `(${dogNames})` : ""}.
          No additional animal may occupy the Property
          without Landlord's advance written approval.
        </p>

        <p>
          The applicable pet fee is
          <strong>${money(details.petFee)} per dog</strong>,
          unless a different amount is specifically shown
          in the reservation. The maximum permitted number
          of dogs is <strong>${details.maxDogs}</strong>.
        </p>

        <p>
          Tenant is responsible for supervising all approved
          dogs, promptly cleaning up after them, preventing
          damage, and preventing excessive barking, nuisance,
          or disturbance. Tenant is responsible for damage
          or extraordinary cleaning caused by an approved
          animal.
        </p>
      `
      : `
        <p>
          <strong>No pets or animals are approved for this
          reservation.</strong> No animal may occupy the
          Property unless Landlord gives advance written
          approval and any applicable pet fee is paid.
        </p>
      `;

  return [
    {
      key: "rental_terms",
      title: "1. Rental Terms",
      requires_initials: false,
      html: `
        <p>
          <strong>Landlord:</strong>
          Janis Benstock
        </p>

        <p>
          <strong>Tenant:</strong>
          ${guestName}
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
          The payment schedule associated with this
          reservation is incorporated into this Agreement.
        </p>

        ${
          securityDeposit > 0
            ? `
              <p>
                <strong>Security deposit:</strong>
                ${money(securityDeposit)}.
              </p>
            `
            : ""
        }

        <p>
          The Property is rented as a short-term seasonal
          vacation accommodation. This Agreement is not
          intended to create a year-round residential
          tenancy.
        </p>
      `
    },

    {
      key: "acceptance_property",
      title: "2. Acceptance and Condition of Property",
      requires_initials: true,
      html: `
        <p>
          Tenant accepts the Property in its existing
          condition, subject to specific written
          representations made by Landlord in this Agreement
          or in the reservation.
        </p>

        <p>
          Tenant understands that opinions concerning the
          condition, appearance, furnishings, and suitability
          of a vacation property are subjective. Tenant
          should promptly notify Landlord of any material
          problem or pre-existing damage discovered at
          check-in so that it can be documented and, when
          appropriate, addressed.
        </p>

        <p>
          Tenant has not relied upon any promise concerning
          the Property that is not contained in the
          reservation, this Agreement, or another written
          communication from Landlord.
        </p>
      `
    },

    {
      key: "occupancy_use",
      title: "3. Occupancy and Use",
      requires_initials: true,
      html: `
        <p>
          The Property may be used only as a private
          residence by the persons permitted under this
          reservation. The reservation currently reflects
          <strong>${occupancy || "the disclosed number of"}</strong>
          occupant${occupancy === 1 ? "" : "s"}.
          Occupancy may not exceed the Property's stated
          maximum occupancy.
        </p>

        <p>
          Tenant may not use the Property for any unlawful,
          commercial, professional, event, party, or other
          purpose inconsistent with a private vacation stay.
          Tenant may not assign or transfer the reservation,
          or permit another person to take over the
          reservation, without Landlord's written consent.
        </p>

        <p>
          Minors may not occupy the Property without the
          adult supervision required by Landlord and
          applicable law.
        </p>

        <p>
          Tenant is responsible for the conduct of every
          person and approved animal permitted onto the
          Property by Tenant.
        </p>
      `
    },

    {
      key: "pets",
      title: "4. Dogs and Other Animals",
      requires_initials: true,
      html: petParagraph
    },

    {
      key: "conduct_rules",
      title: "5. Conduct and House Rules",
      requires_initials: true,
      html: `
        <p>
          <strong>
            No smoking or vaping is permitted anywhere on
            the Property, indoors or outdoors, with no
            exceptions.
          </strong>
        </p>

        <p>
          Tenant must respect neighbors and avoid
          unreasonable noise, nuisance, disturbance, or
          conduct that interferes with neighboring
          properties. Outdoor noise must be kept to a
          minimum, especially after
          <strong>10:00 PM</strong>.
        </p>

        <p>
          Tenant is responsible for placing trash and
          recyclables in the appropriate exterior containers
          and following applicable City of Ocean City
          collection rules and any written instructions
          supplied by Landlord.
        </p>

        <p>
          Tenant must comply with reasonable written parking,
          safety, property, and checkout instructions
          supplied by Landlord.
        </p>

        <p>
          A serious or repeated violation may constitute a
          default and may result in termination of occupancy
          to the extent permitted by applicable law.
        </p>
      `
    },

    {
      key: "condition_damage",
      title: "6. End of Term, Damage, and Security Deposit",
      requires_initials: true,
      html: `
        <p>
          Tenant shall return the Property in substantially
          the same condition in which it was received,
          ordinary wear from reasonable use excepted.
        </p>

        <p>
          Tenant is responsible for damage, breakage,
          missing property, excessive cleaning, unauthorized
          occupants or animals, unpaid charges, and other
          losses caused by Tenant or Tenant's guests.
        </p>

        <p>
          Any security deposit identified for this
          reservation may be applied to amounts properly due
          because of damage, excessive cleaning, missing
          property, unpaid charges, or other obligations
          under this Agreement. Tenant remains responsible
          for amounts exceeding the security deposit.
        </p>

        <p>
          After the rental term ends, Landlord will inspect
          the Property and allow a reasonable opportunity to
          identify damage or other charges that may not be
          apparent during the initial inspection. Landlord
          will <strong>initiate the return of any refundable
          security-deposit balance by Bill Pay within seven
          (7) days after termination of this Agreement</strong>,
          less any lawful deductions.
        </p>
      `
    },

    {
      key: "linens_amenities",
      title: "7. Linens, Beach Items, and Amenities",
      requires_initials: true,
      html: `
        <p>
          <strong>Linens:</strong>
          ${esc(details.linensText)}
        </p>

        <p>
          The following amenities and property items are
          identified for this reservation:
        </p>

        ${amenitiesMarkup(details)}

        <p>
          Beach tags, beach chairs, remotes, and other items
          supplied with the Property remain Landlord's
          property and must remain at or be returned to the
          Property at checkout as instructed.
        </p>

        ${
          details.beachTags > 0
            ? `
              <p>
                The Property is supplied with
                <strong>${details.beachTags} beach tag${details.beachTags === 1 ? "" : "s"}</strong>.
                Tenant agrees to pay
                <strong>${money(details.beachTagCharge)}</strong>
                for each supplied beach tag that is lost,
                missing, or not returned at the end of the
                stay.
              </p>
            `
            : ""
        }

        ${
          details.beachChairs > 0
            ? `
              <p>
                The Property is supplied with
                <strong>${details.beachChairs} beach chair${details.beachChairs === 1 ? "" : "s"}</strong>.
                Tenant is responsible for returning the
                supplied chairs to the Property at the end
                of the stay.
              </p>
            `
            : ""
        }
      `
    },

    {
      key: "utilities",
      title: "8. Utilities, Appliances, and Services",
      requires_initials: false,
      html: `
        <p>
          Utilities are included unless the reservation,
          rate period, special conditions, or other written
          rental terms specifically state otherwise.
        </p>

        <p>
          Landlord will make reasonable efforts to maintain
          appliances, internet service, air conditioning,
          televisions, and other included services and
          amenities. Temporary interruption or failure of an
          appliance, utility, service, or amenity does not
          automatically entitle Tenant to a refund.
        </p>

        <p>
          Tenant shall promptly notify Landlord of a problem.
          Landlord will make reasonable efforts to arrange
          repair or service based upon the circumstances and
          availability of contractors or service providers.
        </p>
      `
    },

    {
      key: "access",
      title: "9. Landlord Access",
      requires_initials: false,
      html: `
        <p>
          Landlord may enter the Property at reasonable times
          when reasonably necessary to inspect the Property,
          address an emergency, make or arrange repairs or
          improvements, provide necessary services,
          investigate a reported problem or rule violation,
          or as otherwise permitted by law.
        </p>

        <p>
          When circumstances reasonably allow, Landlord will
          attempt to provide notice before non-emergency
          entry.
        </p>
      `
    },

    {
      key: "cancellation_default",
      title: "10. Cancellation, Default, and Termination",
      requires_initials: true,
      html: `
        <p>
          Tenant's cancellation does not automatically
          release Tenant from the financial obligations of
          the reservation.
        </p>

        <p>
          If Tenant requests cancellation, any refund,
          credit, release, or continuing payment obligation
          will be determined by the cancellation terms
          applicable to the reservation, Landlord's written
          agreement, the extent to which the Property is
          re-rented, and applicable law.
        </p>

        <p>
          Failure to make a required payment when due,
          material misrepresentation in the reservation,
          unauthorized occupancy, serious property damage,
          or a material violation of this Agreement may
          constitute default.
        </p>

        <p>
          Landlord's remedies following default are subject
          to applicable New Jersey law. Nothing in this
          Agreement authorizes unlawful self-help or waives
          a right that cannot legally be waived.
        </p>
      `
    },

    {
      key: "rentability",
      title: "11. Casualty and Rentability",
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
      title: "12. Megan’s Law Information",
      requires_initials: false,
      html: `
        <p>
          New Jersey law provides for registration and
          community notification concerning certain
          convicted sex offenders. Information that is
          publicly available may be obtained from official
          New Jersey law-enforcement resources. Tenant is
          responsible for making any inquiry Tenant considers
          appropriate concerning the area surrounding the
          Property.
        </p>
      `
    },

    {
      key: "owner_disclosure",
      title: "13. Owner and Real Estate License Disclosure",
      requires_initials: true,
      html: `
        <p>
          Landlord, <strong>Janis Benstock</strong>, is a
          licensed New Jersey real estate broker,
          license number <strong>1756109</strong>.
        </p>

        <p>
          Janis Benstock is offering and renting the Property
          in her capacity as the
          <strong>owner of the Property</strong>.
          She is not acting as a real estate broker or agent
          representing Tenant in this transaction.
        </p>
      `
    },

    {
      key: "electronic_signatures",
      title: "14. Electronic Signatures and Counterparts",
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
      key: "entire_agreement",
      title: "15. Entire Agreement and Written Changes",
      requires_initials: false,
      html: `
        <p>
          This Agreement, the reservation details, the
          payment schedule, and any written terms expressly
          incorporated into the reservation constitute the
          agreement between Landlord and Tenant concerning
          this rental.
        </p>

        <p>
          A change to the material rental terms must be
          agreed to in writing by the parties.
        </p>
      `
    },

    {
      key: "acceptance",
      title: "16. Acceptance and Binding Effect",
      requires_initials: true,
      html: `
        <p>
          Tenant's signature confirms that Tenant has read
          and agrees to this Agreement.
        </p>

        <p>
          <strong>
            Landlord will not execute this Agreement until
            the required initial payment has been received.
          </strong>
          Payment in full is not required before Landlord
          signs when the reservation has an approved payment
          schedule.
        </p>

        <p>
          The Agreement becomes fully executed when the
          required Tenant signature and initials have been
          completed, the required initial payment has been
          received, and Landlord has signed the Agreement.
        </p>
      `
    }
  ];
}

function leaseSections(lease) {
  /*
    Regular seasonal lease only.

    Senior Week and winter rentals intentionally use
    separate lease forms and will not be folded into this
    agreement.
  */
  return standardSections(lease);
}

export default async function handler(req, res) {
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

  const {
    data: allSigners,
    error: allSignersError
  } =
    await supabase
      .from("lease_signers")
      .select(
        "id,signer_role,signer_name,signer_email,signed_at,signature_text"
      )
      .eq("lease_id", lease.id);

  if (allSignersError) {
    return res.status(500).json({
      error: allSignersError.message
    });
  }

  const {
    data: allInitials,
    error: initialsError
  } =
    await supabase
      .from("lease_initials")
      .select(
        "signer_id,section_key,initials,initialed_at"
      )
      .eq("lease_id", lease.id);

  if (initialsError) {
    return res.status(500).json({
      error: initialsError.message
    });
  }

  return res.status(200).json({
    id: lease.id,
    status: lease.status,
    lease_type:
      lease.lease_type || "standard",
    lease_data:
      lease.lease_data || {},

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

    signers:
      allSigners || [],

    initials:
      allInitials || [],

    sections:
      leaseSections(lease)
  });
}
