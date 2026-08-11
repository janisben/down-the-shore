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

function yesNo(value) {
  if (
    value === true ||
    value === "true" ||
    value === "yes" ||
    value === 1 ||
    value === "1"
  ) {
    return "Yes";
  }

  return "No";
}

function displayValue(
  value,
  fallback = "Not specified"
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return esc(value);
}

function standardSections(lease) {
  const data =
    lease.lease_data || {};

  const propertyName =
    data.property_name ||
    "the rental property";

  const guestName =
    esc(data.guest_name || "");

  const arrival =
    formatDate(data.arrival_date);

  const departure =
    formatDate(data.departure_date);

  const checkIn =
    data.check_in_time ||
    "2:00 PM";

  const checkOut =
    data.check_out_time ||
    "10:00 AM";

  const adults =
    Number(data.adults || 0);

  const children =
    Number(data.children || 0);

  const occupancy =
    adults + children;

  const maximumOccupancy =
    data.maximum_occupancy ||
    data.max_occupancy ||
    "Not specified";

  const rent =
    money(
      data.rent ??
      data.rent_amount ??
      data.amount_due
    );

  const cleaningFee =
    money(data.cleaning_fee || 0);

  const petFee =
    money(data.pet_fee || 0);

  const otherCharges =
    money(data.other_charges || 0);

  const securityDeposit =
    money(data.security_deposit || 0);

  const totalDue =
    money(data.amount_due || 0);

  const paymentSchedule =
    data.payment_schedule_text ||
    data.payment_schedule ||
    "See reservation payment schedule.";

  const dogs =
    Number(data.dogs || 0);

  const dogNames =
    data.dog_names ||
    "None";

  const maxDogs =
    Number(
      data.max_dogs || 2
    );

  const petsPermitted =
    dogs > 0
      ? "Yes"
      : "No";

  const beds =
    data.beds ||
    data.bed_configuration ||
    data.bed_sizes ||
    "Not specified";

  const washerDryer =
    yesNo(data.washer_dryer);

  const internet =
    yesNo(
      data.internet ??
      data.wifi
    );

  const smartTv =
    yesNo(data.smart_tv);

  const coffeePot =
    yesNo(data.coffee_pot);

  const stockedKitchen =
    yesNo(
      data.fully_stocked_kitchen
    );

  const otherAmenities =
    data.other_amenities ||
    "None";

  const sheets =
    yesNo(data.sheets_provided);

  const bathTowels =
    yesNo(
      data.bath_towels_provided
    );

  const beachTowels =
    yesNo(
      data.beach_towels_provided
    );

  const blankets =
    yesNo(
      data.blankets_provided
    );

  const pillows =
    yesNo(
      data.pillows_provided
    );

  const mattressPads =
    yesNo(
      data.mattress_pads_provided
    );

  const beachTags =
    Number(
      data.beach_tags || 0
    );

  const beachChairs =
    Number(
      data.beach_chairs || 0
    );

  const beachTagCharge =
    money(
      data.beach_tag_replacement_fee ||
      50
    );

  const specialConditions =
    data.special_conditions ||
    "None";

  return [
    {
      key: "rental_terms",
      title: "1. Vacation Rental",
      requires_initials: false,
      html: `
        <p>
          This Summer Rental Agreement
          ("Agreement") is made between
          <strong>Janis Benstock
          ("Landlord")</strong> and
          <strong>${guestName}
          ("Tenant")</strong> for the
          short-term rental of the Property
          described below.
        </p>

        <p>
          <strong>Property:</strong>
          ${esc(propertyName)},
          Ocean City, New Jersey
        </p>

        <p>
          <strong>Arrival:</strong>
          ${esc(arrival)}<br>
          <strong>Departure:</strong>
          ${esc(departure)}<br>
          <strong>Check-in:</strong>
          ${esc(checkIn)}<br>
          <strong>Check-out:</strong>
          ${esc(checkOut)}<br>
          <strong>Maximum Occupancy:</strong>
          ${esc(maximumOccupancy)}<br>
          <strong>Number of Guests:</strong>
          ${occupancy || "Not specified"}
        </p>

        <p>
          <strong>Rent:</strong>
          ${rent}<br>
          <strong>Cleaning Fee:</strong>
          ${cleaningFee}<br>
          <strong>Pet Fee:</strong>
          ${petFee}<br>
          <strong>Other Charges:</strong>
          ${otherCharges}<br>
          <strong>Security Deposit:</strong>
          ${securityDeposit}<br>
          <strong>Total Due:</strong>
          ${totalDue}
        </p>

        <p>
          <strong>Payment Schedule:</strong><br>
          ${esc(paymentSchedule)}
        </p>

        <p>
          The payment schedule and
          reservation-specific charges shown
          above are incorporated into this
          Agreement.
        </p>

        <p>
          Tenant agrees to rent the Property
          from Landlord for the dates shown
          above. The Property is being rented
          as a <strong>short-term vacation or
          seasonal accommodation</strong> and
          not as a year-round residential
          tenancy.
        </p>

        <p>
          Tenant understands that this
          Agreement is for temporary occupancy
          associated with a vacation or
          seasonal rental. The parties intend
          the occupancy to be treated
          consistently with applicable New
          Jersey law governing transient and
          seasonal rentals.
        </p>
      `
    },

    {
      key: "occupancy_use",
      title: "2. Occupancy and Use",
      requires_initials: true,
      html: `
        <p>
          The Property may be occupied only by
          the persons included in the approved
          reservation and may not exceed the
          stated maximum occupancy.
        </p>

        <p>
          Tenant may use the Property only as
          a private residence for the rental
          period. The Property may not be used
          for any unlawful, commercial,
          professional, event, party, or other
          purpose inconsistent with a private
          vacation stay.
        </p>

        <p>
          No recreational vehicle, camper,
          trailer, or similar vehicle may be
          used for sleeping or additional
          occupancy at the Property without
          Landlord's written permission.
        </p>

        <p>
          Tenant may not alter the Property or
          install fixtures, appliances,
          air-conditioning units, or other
          equipment without Landlord's written
          consent.
        </p>

        <p>
          Tenant is responsible for the
          conduct of all occupants, guests,
          invitees, and approved animals at
          the Property.
        </p>
      `
    },

    {
      key: "condition",
      title: "3. Condition of Property",
      requires_initials: false,
      html: `
        <p>
          Tenant accepts the Property in its
          existing condition, subject to any
          specific written representations
          made by Landlord.
        </p>

        <p>
          If Tenant has not personally
          inspected the Property before
          entering into this Agreement, Tenant
          understands that photographs,
          descriptions, and other information
          may not convey every feature or
          condition of the Property.
        </p>

        <p>
          Tenant must promptly notify Landlord
          after check-in of any significant
          pre-existing damage, unsafe
          condition, or material problem
          discovered upon arrival. Failure to
          report an existing condition
          promptly may make it more difficult
          to determine whether the condition
          occurred before or during Tenant's
          stay.
        </p>
      `
    },

    {
      key: "damage_deposit",
      title:
        "4. Damage, Cleaning and Security Deposit",
      requires_initials: true,
      html: `
        <p>
          Tenant agrees to return the Property
          at the end of the rental period in
          substantially the same condition in
          which it was received, ordinary wear
          from reasonable use excepted.
        </p>

        <p>
          Tenant is responsible for damage,
          breakage, missing property, excessive
          cleaning, unauthorized occupants,
          unauthorized animals, rule
          violations, and other charges caused
          by Tenant or Tenant's occupants,
          guests, invitees, or animals.
        </p>

        <p>
          Any security deposit identified for
          the reservation may be applied to
          amounts properly due for damage,
          excessive cleaning, missing items,
          unpaid charges, or other obligations
          under this Agreement.
        </p>

        <p>
          The security deposit does
          <strong>not</strong> limit Tenant's
          liability. Tenant remains responsible
          for amounts properly due that exceed
          the security deposit.
        </p>

        <p>
          Following termination of the rental
          period, Landlord will inspect the
          Property and determine whether any
          deductions are required. Landlord
          will <strong>initiate the return of
          any remaining refundable security
          deposit by Bill Pay check within
          seven (7) days after termination of
          the lease.</strong>
        </p>

        <p>
          Tenant remains responsible for
          damage or other amounts properly due
          that are discovered after the initial
          inspection, including conditions that
          could not reasonably have been
          discovered during that inspection.
        </p>
      `
    },

    {
      key: "pets",
      title: "5. Pets and Animals",
      requires_initials: true,
      html: `
        <p>
          <strong>Pets permitted:</strong>
          ${petsPermitted}<br>
          <strong>Number of approved dogs:</strong>
          ${dogs}<br>
          <strong>Dog name(s):</strong>
          ${esc(dogNames)}<br>
          <strong>Pet fee:</strong>
          ${petFee}<br>
          <strong>Maximum dogs permitted:</strong>
          ${maxDogs}
        </p>

        ${
          dogs > 0
            ? `
              <p>
                Only the approved animal(s)
                listed for this reservation may
                occupy the Property. Tenant is
                responsible for supervising all
                animals, cleaning up after them,
                preventing excessive barking or
                nuisance, and paying for any
                damage or additional cleaning
                caused by them.
              </p>
            `
            : `
              <p>
                No pet or animal may occupy the
                Property without Landlord's
                prior written approval.
              </p>
            `
        }

        <p>
          An unauthorized animal constitutes a
          material violation of this Agreement
          and may result in termination of
          occupancy to the extent permitted by
          law, in addition to responsibility
          for resulting charges or damages.
        </p>

        <p>
          Nothing in this paragraph is intended
          to limit rights or obligations
          applicable to an assistance animal
          under applicable law.
        </p>
      `
    },

    {
      key: "house_rules",
      title: "6. House Rules and Conduct",
      requires_initials: true,
      html: `
        <p>
          <strong>No smoking or vaping is
          permitted anywhere on the Property,
          indoors or outdoors.</strong>
        </p>

        <p>
          Tenant and all occupants must respect
          neighbors and avoid unreasonable
          noise, nuisance, disturbance, or
          conduct that interferes with the
          peaceful use of surrounding
          properties.
        </p>

        <p>
          Outdoor noise must be kept to a
          minimum, particularly after
          <strong>10:00 PM</strong>.
        </p>

        <p>
          Tenant must comply with reasonable
          written instructions provided by
          Landlord concerning parking, trash,
          recycling, use of outdoor areas,
          safety, check-out procedures, and
          care of the Property.
        </p>

        <p>
          Tenant is responsible for placing
          trash and recycling in the
          appropriate exterior containers and
          complying with applicable Ocean City
          requirements and instructions
          supplied by Landlord.
        </p>

        <p>
          A serious or repeated violation of
          these rules may constitute a default
          under this Agreement.
        </p>
      `
    },

    {
      key: "amenities",
      title:
        "7. Amenities and Property Details",
      requires_initials: false,
      html: `
        <p>
          <strong>Beds:</strong>
          ${displayValue(beds)}<br>
          <strong>Washer/Dryer:</strong>
          ${washerDryer}<br>
          <strong>Internet/Wi-Fi:</strong>
          ${internet}<br>
          <strong>Smart TV:</strong>
          ${smartTv}<br>
          <strong>Coffee Pot:</strong>
          ${coffeePot}<br>
          <strong>Fully Stocked Kitchen:</strong>
          ${stockedKitchen}<br>
          <strong>Other Included Amenities:</strong>
          ${displayValue(otherAmenities, "None")}
        </p>

        <p>
          Landlord will make reasonable efforts
          to maintain the appliances,
          utilities, internet service,
          television, air conditioning, and
          other amenities provided with the
          Property.
        </p>

        <p>
          Temporary interruption, breakdown,
          loss of service, or failure of an
          appliance or amenity does not
          automatically entitle Tenant to a
          refund. Landlord will make reasonable
          efforts to arrange repair or
          restoration after being notified.
        </p>
      `
    },

    {
      key: "linens",
      title: "8. Linens and Personal Items",
      requires_initials: false,
      html: `
        <p>
          <strong>Sheets provided:</strong>
          ${sheets}<br>
          <strong>Bath towels provided:</strong>
          ${bathTowels}<br>
          <strong>Beach towels provided:</strong>
          ${beachTowels}<br>
          <strong>Blankets provided:</strong>
          ${blankets}<br>
          <strong>Pillows provided:</strong>
          ${pillows}<br>
          <strong>Mattress pads provided:</strong>
          ${mattressPads}
        </p>

        <p>
          Tenant is responsible for bringing
          any linens, towels, or personal items
          identified above as
          <strong>not provided</strong>.
        </p>

        <p>
          Any reservation-specific written
          agreement concerning linens or other
          items controls over a general
          property description.
        </p>
      `
    },

    {
      key: "beach_items",
      title:
        "9. Beach Tags and Beach Chairs",
      requires_initials: false,
      html: `
        <p>
          <strong>Beach Tags:</strong>
          ${beachTags}<br>
          <strong>Beach Chairs:</strong>
          ${beachChairs}
        </p>

        <p>
          Tenant is responsible for the care
          and return of all beach tags and
          beach chairs provided with the
          Property.
        </p>

        <p>
          The replacement charge for each
          missing beach tag is
          <strong>${beachTagCharge}</strong>.
        </p>

        <p>
          Tenant is responsible for the
          reasonable replacement cost of any
          missing or damaged beach chair or
          other reusable property item supplied
          for the stay.
        </p>
      `
    },

    {
      key: "utilities",
      title: "10. Utilities",
      requires_initials: false,
      html: `
        <p>
          Unless the reservation specifically
          states otherwise, ordinary utilities
          associated with the rental are
          included in the rental amount.
        </p>

        <p>
          If any utility or service is
          specifically excluded or separately
          payable by Tenant, that term will be
          shown in the reservation or Special
          Conditions.
        </p>

        <p>
          Temporary utility or internet outages
          beyond Landlord's reasonable control
          do not automatically entitle Tenant
          to a refund.
        </p>
      `
    },

    {
      key: "access",
      title: "11. Landlord Access",
      requires_initials: false,
      html: `
        <p>
          Landlord may enter the Property at
          reasonable times when reasonably
          necessary to inspect the Property,
          address an emergency, make or arrange
          repairs, provide services, investigate
          a reported problem or violation, or
          otherwise protect the Property.
        </p>

        <p>
          When circumstances reasonably allow,
          Landlord will attempt to provide
          notice before non-emergency entry.
        </p>
      `
    },

    {
      key: "cancellation",
      title: "12. Cancellation",
      requires_initials: false,
      html: `
        <p>
          A request by Tenant to cancel the
          reservation does not automatically
          release Tenant from the financial
          obligations of this Agreement.
        </p>

        <p>
          Any refund, credit, re-rental
          arrangement, or reduction in amounts
          due will be governed by the
          cancellation terms applicable to the
          reservation and any subsequent
          written agreement between Landlord
          and Tenant.
        </p>

        <p>
          If Tenant cancels and the Property is
          not re-rented on terms acceptable to
          Landlord, Tenant may remain
          responsible for amounts due under
          this Agreement, subject to applicable
          law.
        </p>
      `
    },

    {
      key: "default",
      title: "13. Tenant Default",
      requires_initials: false,
      html: `
        <p>
          Failure to make a required payment
          when due, material misrepresentation
          in the reservation, unauthorized
          occupancy, unauthorized animals,
          serious property damage, prohibited
          conduct, or a material violation of
          this Agreement may constitute a
          default.
        </p>

        <p>
          Landlord's rights following a default
          are subject to applicable New Jersey
          law.
        </p>
      `
    },

    {
      key: "casualty",
      title:
        "14. Casualty and Rentability",
      requires_initials: false,
      html: `
        <p>
          If the Property becomes materially
          unfit for occupancy because of fire,
          casualty, severe property damage, or
          another condition affecting the
          Property itself and the rental cannot
          reasonably continue, Landlord may
          terminate the affected portion of the
          rental and return an equitable
          prorated share of prepaid rent for
          the unusable period.
        </p>

        <p>
          Conditions outside Landlord's
          reasonable control—including weather,
          beach conditions, neighborhood
          conditions, nearby construction,
          municipal activity, or temporary
          interruption of an appliance,
          utility, or amenity—do not by
          themselves make the Property unfit
          for occupancy.
        </p>
      `
    },

    {
      key: "subletting",
      title:
        "15. No Subletting or Transfer",
      requires_initials: false,
      html: `
        <p>
          Tenant may not sublet, assign,
          transfer, or otherwise permit another
          person to take over the Property or
          reservation without Landlord's prior
          written approval.
        </p>
      `
    },

    {
      key: "megans_law",
      title:
        "16. Megan’s Law Information",
      requires_initials: false,
      html: `
        <p>
          New Jersey law provides for
          registration and community
          notification concerning certain
          convicted sex offenders.
        </p>

        <p>
          Information that is publicly
          available may be obtained from
          appropriate official New Jersey
          law-enforcement resources. Tenant is
          responsible for making any inquiry
          Tenant considers appropriate
          regarding the area surrounding the
          Property.
        </p>
      `
    },

    {
      key: "property_rules",
      title: "17. Property Rules",
      requires_initials: false,
      html: `
        <p>
          Tenant agrees to comply with
          reasonable written rules established
          by Landlord concerning occupancy,
          maintenance, parking, trash and
          recycling, noise, smoking, safety,
          use of outdoor areas, and other
          matters reasonably related to the
          Property.
        </p>

        <p>
          Those rules and any check-in/check-out
          instructions provided by Landlord are
          incorporated into Tenant's
          responsibilities under this
          Agreement.
        </p>
      `
    },

    {
      key: "special_conditions",
      title: "18. Special Conditions",
      requires_initials: false,
      html: `
        <p>
          ${esc(specialConditions)}
        </p>

        <p>
          Any written Special Condition
          included here is part of this
          Agreement.
        </p>
      `
    },

    {
      key: "owner_disclosure",
      title:
        "19. Licensed Broker Disclosure",
      requires_initials: true,
      html: `
        <p>
          Landlord,
          <strong>Janis Benstock,
          New Jersey Real Estate Broker
          License #1756109</strong>,
          is a licensed New Jersey real estate
          broker.
        </p>

        <p>
          Landlord is offering and renting the
          Property <strong>in her capacity as
          the owner of the Property and not as
          a real estate broker or brokerage
          representing Tenant or another party
          in this transaction.</strong>
        </p>

        <p>
          No brokerage relationship is created
          between Landlord and Tenant by this
          Agreement.
        </p>
      `
    },

    {
      key: "electronic_signatures",
      title:
        "20. Electronic Signatures and Records",
      requires_initials: false,
      html: `
        <p>
          The parties agree that this Agreement
          may be signed electronically and in
          counterparts.
        </p>

        <p>
          Typed signatures, electronic
          signatures, electronic initials,
          timestamps, and related records
          created through the Down the Shore
          signing process are intended to have
          the same effect as signatures and
          initials placed on a paper
          counterpart to the extent permitted
          by law.
        </p>

        <p>
          Each signer acknowledges that use of
          that signer's secure lease link and
          entry of the signer's name or
          initials is intended as that signer's
          electronic act.
        </p>
      `
    },

    {
      key: "acceptance",
      title:
        "21. Acceptance and Execution",
      requires_initials: true,
      html: `
        <p>
          Tenant's signature confirms that
          Tenant has read and agrees to this
          Agreement.
        </p>

        <p>
          Landlord will execute the Agreement
          after:
        </p>

        <ol>
          <li>
            Tenant has completed all required
            signatures and initials; and
          </li>
          <li>
            the required
            <strong>initial payment</strong>
            has been received.
          </li>
        </ol>

        <p>
          The entire rental balance does
          <strong>not</strong> have to be paid
          before Landlord executes the
          Agreement. If the reservation
          includes a payment plan, all
          remaining installments remain due
          according to the payment schedule.
        </p>

        <p>
          The Agreement becomes fully executed
          when Tenant has signed, the required
          initial payment has been received,
          and Landlord has signed.
        </p>

        <p>
          Failure to make a later installment
          payment when due may constitute a
          default under this Agreement.
        </p>
      `
    }
  ];
}

function leaseSections(lease) {
  return standardSections(lease);
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

  const {
    data: tenantSigners,
    error: tenantSignerError
  } =
    await supabase
      .from("lease_signers")
      .select(
        "id, signer_role, signer_name, signed_at, signature_text"
      )
      .eq("lease_id", lease.id)
      .neq("signer_role", "owner");

  if (tenantSignerError) {
    return res.status(500).json({
      error: tenantSignerError.message
    });
  }

  const tenantSignerIds =
    (tenantSigners || [])
      .map(item => item.id);

  let tenantInitials = [];

  if (tenantSignerIds.length) {
    const {
      data: initials,
      error: initialsError
    } =
      await supabase
        .from("lease_initials")
        .select(
          "signer_id, section_key, initials, initialed_at"
        )
        .in(
          "signer_id",
          tenantSignerIds
        );

    if (initialsError) {
      return res.status(500).json({
        error: initialsError.message
      });
    }

    tenantInitials =
      initials || [];
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

    tenant_signers:
      tenantSigners || [],

    tenant_initials:
      tenantInitials,

    sections:
      leaseSections(lease)
  });
}
