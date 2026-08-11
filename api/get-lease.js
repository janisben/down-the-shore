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

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function amenityList(data) {
  const items = [];

  if (data.bed_configuration) {
    items.push(
      `<strong>Bed configuration:</strong> ${esc(data.bed_configuration)}`
    );
  }

  if (data.washer_dryer) {
    items.push(
      "<strong>Washer/dryer:</strong> Included"
    );
  }

  if (data.internet) {
    items.push(
      "<strong>Internet:</strong> Included"
    );
  }

  if (data.smart_tv) {
    items.push(
      "<strong>Smart TV:</strong> Included"
    );
  }

  if (data.coffee_pot) {
    items.push(
      "<strong>Coffee pot:</strong> Included"
    );
  }

  if (data.fully_stocked_kitchen) {
    items.push(
      "<strong>Fully stocked kitchen:</strong> Included"
    );
  }

  if (
    Number(data.beach_chairs || 0) > 0
  ) {
    items.push(
      `<strong>Beach chairs:</strong> ${Number(data.beach_chairs)}`
    );
  }

  if (
    Number(data.beach_tags || 0) > 0
  ) {
    items.push(
      `<strong>Beach tags:</strong> ${Number(data.beach_tags)}`
    );
  }

  if (!items.length) {
    return "";
  }

  return `
    <ul>
      ${items
        .map(
          item =>
            `<li>${item}</li>`
        )
        .join("")}
    </ul>
  `;
}

function standardSections(
  lease
) {
  const data =
    lease.lease_data || {};

  const dogs =
    Number(
      data.dogs || 0
    );

  const dogNames =
    String(
      data.dog_names || ""
    ).trim();

  const occupancy =
    Number(
      data.adults || 0
    ) +
    Number(
      data.children || 0
    );

  const securityDeposit =
    Number(
      data.security_deposit || 0
    );

  const beachTags =
    Number(
      data.beach_tags || 0
    );

  const beachChairs =
    Number(
      data.beach_chairs || 0
    );

  const beachTagReplacementFee =
    Number(
      data.beach_tag_replacement_fee ||
      50
    );

  const amenities =
    amenityList(data);

  const petParagraph =
    dogs > 0
      ? `
        <p>
          This reservation includes
          <strong>
            ${dogs}
            dog${dogs === 1 ? "" : "s"}
          </strong>
          ${
            dogNames
              ? `(${esc(dogNames)})`
              : ""
          }.
          No additional animal may occupy the
          Property without Landlord's advance
          written approval.
        </p>

        <p>
          The pet fee for this reservation is
          <strong>
            ${money(
              Number(data.pet_fee || 0)
            )} per dog
          </strong>.
          The maximum number of dogs permitted
          is
          <strong>
            ${Number(data.max_dogs || 0)}
          </strong>.
        </p>

        <p>
          Tenant is responsible for supervising
          all approved dogs, promptly cleaning
          up after them, preventing damage, and
          preventing excessive barking,
          nuisance, or disturbance.
        </p>
      `
      : `
        <p>
          <strong>
            No pets or animals are approved for
            this reservation.
          </strong>
          No animal may occupy the Property
          without Landlord's advance written
          approval.
        </p>
      `;

  return [
    {
      key:
        "rental_terms",

      title:
        "1. Rental Terms",

      requires_initials:
        false,

      html: `
        <p>
          <strong>Landlord:</strong>
          Janis Benstock
        </p>

        <p>
          <strong>Tenant:</strong>
          ${esc(data.guest_name || "")}
        </p>

        <p>
          <strong>Property:</strong>
          ${esc(data.property_name || "")},
          Ocean City, New Jersey
        </p>

        <p>
          <strong>Rental period:</strong>
          ${esc(formatDate(data.arrival_date))}
          through
          ${esc(formatDate(data.departure_date))}.
          Check-in is no earlier than
          <strong>
            ${esc(data.check_in_time || "2:00 PM")}
          </strong>
          and checkout is no later than
          <strong>
            ${esc(data.check_out_time || "10:00 AM")}
          </strong>,
          unless Landlord agrees otherwise
          in writing.
        </p>

        <p>
          <strong>
            Total reservation amount:
          </strong>
          ${money(data.amount_due)}.
          The payment schedule associated with
          this reservation is incorporated into
          this Agreement.
        </p>

        ${
          securityDeposit > 0
            ? `
              <p>
                <strong>
                  Security deposit:
                </strong>
                ${money(securityDeposit)}.
              </p>
            `
            : ""
        }

        <p>
          The Property is rented as a
          short-term seasonal vacation
          accommodation and is not intended
          to create a year-round residential
          tenancy.
        </p>
      `
    },

    {
      key:
        "acceptance_property",

      title:
        "2. Acceptance and Condition of Property",

      requires_initials:
        true,

      html: `
        <p>
          Tenant accepts the Property in its
          existing condition, subject to
          specific written representations
          made by Landlord in this Agreement
          or in the reservation.
        </p>

        <p>
          Tenant should promptly notify
          Landlord of any material problem or
          pre-existing damage discovered at
          check-in so it can be documented
          and, when appropriate, addressed.
        </p>

        <p>
          Tenant has not relied upon any
          promise concerning the Property
          that is not contained in the
          reservation, this Agreement, or
          another written communication from
          Landlord.
        </p>
      `
    },

    {
      key:
        "occupancy_use",

      title:
        "3. Occupancy and Use",

      requires_initials:
        true,

      html: `
        <p>
          The Property may be used only as a
          private residence by the persons
          permitted under this reservation.
          The reservation reflects
          <strong>
            ${occupancy || "the disclosed number of"}
          </strong>
          occupant${occupancy === 1 ? "" : "s"}.
        </p>

        <p>
          Tenant may not use the Property for
          any unlawful, commercial,
          professional, event, party, or other
          purpose inconsistent with a private
          vacation stay.
        </p>

        <p>
          Tenant may not assign or transfer
          the reservation or permit another
          person to take over the reservation
          without Landlord's written consent.
        </p>

        <p>
          Tenant is responsible for the
          conduct of every person and approved
          animal permitted onto the Property
          by Tenant.
        </p>
      `
    },

    {
      key:
        "pets",

      title:
        "4. Dogs and Other Animals",

      requires_initials:
        true,

      html:
        petParagraph
    },

    {
      key:
        "conduct_rules",

      title:
        "5. Conduct and House Rules",

      requires_initials:
        true,

      html: `
        <p>
          <strong>
            No smoking or vaping is permitted
            anywhere on the Property, indoors
            or outdoors, with no exceptions.
          </strong>
        </p>

        <p>
          Tenant must respect neighbors and
          avoid unreasonable noise, nuisance,
          disturbance, or conduct that
          interferes with neighboring
          properties. Outdoor noise must be
          kept to a minimum, especially after
          <strong>10:00 PM</strong>.
        </p>

        <p>
          Tenant is responsible for following
          applicable trash and recycling
          requirements and any written
          parking, safety, property, and
          checkout instructions supplied by
          Landlord.
        </p>

        <p>
          A serious or repeated violation may
          constitute a default and may result
          in termination of occupancy to the
          extent permitted by applicable law.
        </p>
      `
    },

    {
      key:
        "condition_damage",

      title:
        "6. End of Term, Damage, and Security Deposit",

      requires_initials:
        true,

      html: `
        <p>
          Tenant shall return the Property in
          substantially the same condition in
          which it was received, ordinary wear
          from reasonable use excepted.
        </p>

        <p>
          Tenant is responsible for damage,
          breakage, missing property,
          excessive cleaning, unauthorized
          occupants or animals, unpaid
          charges, and other losses caused by
          Tenant or Tenant's guests.
        </p>

        ${
          securityDeposit > 0
            ? `
              <p>
                The security deposit may be
                applied to amounts properly
                due because of damage,
                excessive cleaning, missing
                property, unpaid charges, or
                other obligations under this
                Agreement. Tenant remains
                responsible for amounts
                exceeding the deposit.
              </p>

              <p>
                Landlord will initiate the
                return of any refundable
                security-deposit balance by
                Bill Pay within seven (7) days
                after termination of this
                Agreement, less any lawful
                deductions.
              </p>
            `
            : ""
        }
      `
    },

    {
      key:
        "linens_amenities",

      title:
        "7. Linens, Beach Items, and Amenities",

      requires_initials:
        true,

      html: `
        ${
          data.linens_text
            ? `
              <p>
                <strong>Linens:</strong>
                ${esc(data.linens_text)}
              </p>
            `
            : ""
        }

        ${
          amenities
            ? `
              <p>
                The following amenities and
                property items are included
                with this reservation:
              </p>

              ${amenities}
            `
            : ""
        }

        <p>
          Beach tags, beach chairs, remotes,
          and other supplied property items
          remain Landlord's property and must
          remain at or be returned to the
          Property at checkout.
        </p>

        ${
          beachTags > 0
            ? `
              <p>
                The Property is supplied with
                <strong>
                  ${beachTags}
                  beach tag${beachTags === 1 ? "" : "s"}
                </strong>.
                Tenant agrees to pay
                <strong>
                  ${money(beachTagReplacementFee)}
                </strong>
                for each supplied beach tag
                that is lost, missing, or not
                returned at the end of the
                stay.
              </p>
            `
            : ""
        }

        ${
          beachChairs > 0
            ? `
              <p>
                The Property is supplied with
                <strong>
                  ${beachChairs}
                  beach chair${beachChairs === 1 ? "" : "s"}
                </strong>.
                Tenant is responsible for
                returning the supplied chairs
                to the Property at the end of
                the stay.
              </p>
            `
            : ""
        }
      `
    },

    {
      key:
        "utilities",

      title:
        "8. Utilities, Appliances, and Services",

      requires_initials:
        false,

      html: `
        <p>
          Utilities are included unless the
          reservation, rate period, special
          conditions, or other written rental
          terms specifically state otherwise.
        </p>

        <p>
          Landlord will make reasonable
          efforts to maintain included
          appliances, internet service, air
          conditioning, televisions, and
          other services and amenities.
          Temporary interruption or failure
          does not automatically entitle
          Tenant to a refund.
        </p>

        <p>
          Tenant shall promptly notify
          Landlord of a problem so reasonable
          efforts can be made to arrange
          repair or service.
        </p>
      `
    },

    {
      key:
        "access",

      title:
        "9. Landlord Access",

      requires_initials:
        false,

      html: `
        <p>
          Landlord may enter the Property at
          reasonable times when reasonably
          necessary to inspect the Property,
          address an emergency, make or
          arrange repairs, provide necessary
          services, investigate a reported
          problem or rule violation, or as
          otherwise permitted by law.
        </p>

        <p>
          When circumstances reasonably allow,
          Landlord will attempt to provide
          notice before non-emergency entry.
        </p>
      `
    },

    {
      key:
        "cancellation_default",

      title:
        "10. Cancellation, Default, and Termination",

      requires_initials:
        true,

      html: `
        <p>
          Tenant's cancellation does not
          automatically release Tenant from
          the financial obligations of the
          reservation.
        </p>

        <p>
          Any refund, credit, release, or
          continuing payment obligation will
          be determined by the cancellation
          terms applicable to the reservation,
          Landlord's written agreement, the
          extent to which the Property is
          re-rented, and applicable law.
        </p>

        <p>
          Failure to make a required payment,
          material misrepresentation,
          unauthorized occupancy, serious
          property damage, or a material
          violation of this Agreement may
          constitute default.
        </p>

        <p>
          Landlord's remedies following
          default are subject to applicable
          New Jersey law.
        </p>
      `
    },

    {
      key:
        "rentability",

      title:
        "11. Casualty and Rentability",

      requires_initials:
        false,

      html: `
        <p>
          If the Property becomes materially
          unfit for occupancy because of fire,
          casualty, or another condition
          affecting the Property itself and
          the stay cannot reasonably continue,
          Landlord may cancel the affected
          portion of the reservation and
          return an equitable prorated share
          of prepaid rent for the unusable
          period.
        </p>

        <p>
          Off-site conditions outside
          Landlord's reasonable control,
          including weather, beach conditions,
          neighborhood conditions,
          construction elsewhere, municipal
          activity, or temporary interruption
          of amenities, do not by themselves
          make the Property unfit for
          occupancy.
        </p>
      `
    },

    {
      key:
        "megans_law",

      title:
        "12. Megan’s Law Information",

      requires_initials:
        false,

      html: `
        <p>
          New Jersey law provides for
          registration and community
          notification concerning certain
          convicted sex offenders.
          Information that is publicly
          available may be obtained from
          official New Jersey law-enforcement
          resources.
        </p>
      `
    },

    {
      key:
        "owner_disclosure",

      title:
        "13. Owner and Real Estate License Disclosure",

      requires_initials:
        true,

      html: `
        <p>
          Landlord,
          <strong>Janis Benstock</strong>,
          is a licensed New Jersey real estate
          broker, license number
          <strong>1756109</strong>.
        </p>

        <p>
          Janis Benstock is offering and
          renting the Property in her capacity
          as the
          <strong>owner of the Property</strong>
          and is not acting as a real estate
          broker or agent representing Tenant
          in this transaction.
        </p>
      `
    },

    {
      key:
        "electronic_signatures",

      title:
        "14. Electronic Signatures and Counterparts",

      requires_initials:
        false,

      html: `
        <p>
          The parties agree that this
          Agreement may be signed
          electronically and in counterparts.
          Electronic signatures and electronic
          records of required initials are
          intended to have the same effect as
          signatures and initials placed on a
          paper counterpart to the extent
          permitted by applicable law.
        </p>
      `
    },

    {
      key:
        "entire_agreement",

      title:
        "15. Entire Agreement and Written Changes",

      requires_initials:
        false,

      html: `
        <p>
          This Agreement, the reservation
          details, the payment schedule, and
          written terms expressly incorporated
          into the reservation constitute the
          agreement between Landlord and
          Tenant concerning this rental.
        </p>

        <p>
          A change to the material rental
          terms must be agreed to in writing.
        </p>
      `
    },

    {
      key:
        "acceptance",

      title:
        "16. Acceptance and Binding Effect",

      requires_initials:
        true,

      html: `
        <p>
          Tenant's signature confirms that
          Tenant has read and agrees to this
          Agreement.
        </p>

        <p>
          <strong>
            Landlord will not execute this
            Agreement until the required
            initial payment has been received.
          </strong>
          Payment in full is not required
          before Landlord signs when the
          reservation has an approved payment
          schedule.
        </p>

        <p>
          The Agreement becomes fully executed
          when the required Tenant signature
          and initials have been completed,
          the required initial payment has
          been received, and Landlord has
          signed the Agreement.
        </p>
      `
    }
  ];
}

export default async function handler(
  req,
  res
) {
  if (
    req.method !==
    "GET"
  ) {
    return res.status(405).json({
      error:
        "Method not allowed"
    });
  }

  const token =
    String(
      req.query.token || ""
    );

  if (!token) {
    return res.status(400).json({
      error:
        "Lease token is required"
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
        token
      )
      .single();

  if (
    signerError ||
    !signer
  ) {
    return res.status(404).json({
      error:
        "Lease link not found"
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
    data: signers,
    error: signersError
  } =
    await supabase
      .from("lease_signers")
      .select(
        "id,signer_role,signer_name,signer_email,signed_at,signature_text"
      )
      .eq(
        "lease_id",
        lease.id
      )
      .order(
        "sort_order",
        {
          ascending: true
        }
      );

  if (signersError) {
    return res.status(500).json({
      error:
        signersError.message
    });
  }

  const {
    data: initials,
    error: initialsError
  } =
    await supabase
      .from("lease_initials")
      .select(
        "signer_id,section_key,initials,initialed_at"
      )
      .eq(
        "lease_id",
        lease.id
      );

  if (initialsError) {
    return res.status(500).json({
      error:
        initialsError.message
    });
  }

  return res.status(200).json({
    id:
      lease.id,

    status:
      lease.status,

    lease_type:
      lease.lease_type ||
      "standard",

    lease_data:
      lease.lease_data ||
      {},

    signer: {
      id:
        signer.id,

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
      signers || [],

    initials:
      initials || [],

    sections:
      standardSections(
        lease
      )
  });
}
