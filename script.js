const data = window.SITE_DATA;

function propertyImage(property) {
  if (property.image) {
    return `
      <div class="property-image">
        <img
          src="${property.image}"
          alt="${property.name}"
          style="object-position:${property.imagePosition || "center"}"
        >
      </div>
    `;
  }

  return `
    <div class="placeholder-image">
      ${property.placeholderLabel || "New photography coming soon"}
    </div>
  `;
}

function renderHome() {
  const brand = data.brand;

  document.title =
    `${brand.name} | Ocean City, NJ Vacation Homes`;

  document
    .querySelectorAll("[data-brand]")
    .forEach(el => {
      el.textContent = brand.name;
    });

  document.querySelector("[data-eyebrow]").textContent =
    brand.eyebrow;

  document.querySelector("[data-headline]").textContent =
    brand.headline;

  document.querySelector("[data-intro]").textContent =
    brand.intro;

  document.querySelector("[data-domain]").textContent =
    brand.domain;

  const contact =
    document.querySelector("[data-contact]");

  if (contact) {
    if (brand.contactEmail) {
      contact.href =
        `mailto:${brand.contactEmail}`;
    } else {
      contact.removeAttribute("href");
      contact.textContent =
        "Contact Janis";
    }
  }

  const grid =
    document.querySelector("[data-property-grid]");

  grid.innerHTML =
    data.properties
      .map(property => `
        <article class="property-card">

          <a
            href="property.html?id=${property.id}"
            aria-label="View ${property.name}"
          >
            ${propertyImage(property)}
          </a>

          <div class="property-copy">

            <div class="property-meta">
              ${property.location}
              · ${property.bedrooms} BR
              · Sleeps ${property.sleeps}
            </div>

            <h3>
              <a href="property.html?id=${property.id}">
                ${property.name}
              </a>
            </h3>

            <p>${property.tagline}</p>

            <a
              class="text-link"
              href="property.html?id=${property.id}"
            >
              View home & book
            </a>

          </div>

        </article>
      `)
      .join("");

  refreshHomeCardPhotos();
}

function supabaseHeaders(prefer = "") {
  const headers = {
    apikey: data.supabase.publishableKey,
    Authorization: `Bearer ${data.supabase.publishableKey}`,
    "Content-Type": "application/json"
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

async function getPropertyRecord(databaseName) {
  const url =
    `${data.supabase.url}/rest/v1/properties` +
    `?select=id,name,cleaning_fee,pet_fee,max_dogs` +
    `&name=eq.${encodeURIComponent(databaseName)}` +
    `&limit=1`;

  const response =
    await fetch(url, {
      headers: supabaseHeaders()
    });

  if (!response.ok) {
    throw new Error(
      "Could not load this property."
    );
  }

  const records =
    await response.json();

  if (!records.length) {
    throw new Error(
      `No database property matches "${databaseName}".`
    );
  }

  return records[0];
}

async function getAvailability(propertyId) {
  const response =
    await fetch(
      `${data.supabase.url}/rest/v1/rpc/get_property_availability`,
      {
        method: "POST",
        headers: supabaseHeaders(),
        body: JSON.stringify({
          p_property_id: propertyId
        })
      }
    );

  if (!response.ok) {
    throw new Error(
      "Availability could not be loaded."
    );
  }

  return response.json();
}

async function getRatePeriods(propertyId) {
  const response =
    await fetch(
      `${data.supabase.url}/rest/v1/rate_periods` +
      `?select=*` +
      `&property_id=eq.${propertyId}` +
      `&order=start_date.asc`,
      {
        headers: supabaseHeaders()
      }
    );

  if (!response.ok) {
    throw new Error(
      "Rates could not be loaded."
    );
  }

  return response.json();
}


async function getPropertyPhotos(propertyId) {
  const response =
    await fetch(
      `${data.supabase.url}/rest/v1/property_photos` +
      `?select=id,property_id,public_url,caption,sort_order,is_primary,created_at` +
      `&property_id=eq.${propertyId}` +
      `&order=is_primary.desc,sort_order.asc,created_at.asc`,
      {
        headers: supabaseHeaders()
      }
    );

  if (!response.ok) {
    console.warn(
      "Property photos could not be loaded."
    );
    return [];
  }

  return response.json();
}

function choosePrimaryPhoto(
  property,
  photos
) {
  const primary =
    photos.find(
      photo => photo.is_primary
    ) ||
    photos[0];

  return (
    primary?.public_url ||
    property.image ||
    ""
  );
}

async function loadManagedPhotosForProperty(
  property
) {
  try {
    const propertyRecord =
      await getPropertyRecord(
        property.databaseName
      );

    return await getPropertyPhotos(
      propertyRecord.id
    );
  } catch (error) {
    console.warn(
      "Managed photos unavailable:",
      error
    );
    return [];
  }
}

async function refreshHomeCardPhotos() {
  const cards =
    document.querySelectorAll(
      ".property-card"
    );

  if (!cards.length) {
    return;
  }

  await Promise.all(
    data.properties.map(
      async (property, index) => {
        const card =
          cards[index];

        if (!card) {
          return;
        }

        const image =
          card.querySelector(
            ".property-image img"
          );

        if (!image) {
          return;
        }

        const photos =
          await loadManagedPhotosForProperty(
            property
          );

        const photoUrl =
          choosePrimaryPhoto(
            property,
            photos
          );

        if (photoUrl) {
          image.src = photoUrl;
        }
      }
    )
  );
}

function propertyGalleryMarkup(
  property,
  photos
) {
  if (!photos.length) {
    return "";
  }

  return `
    <section
      class="managed-photo-gallery"
      data-managed-photo-gallery
      aria-label="${property.name} photos"
      style="margin-top:28px;"
    >
      <div
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:12px;
        "
      >
        ${photos.map(
          (photo, index) => `
            <figure
              style="
                margin:0;
                overflow:hidden;
                background:#f5f1e8;
                border-radius:4px;
              "
            >
              <img
                src="${photo.public_url}"
                alt="${photo.caption || `${property.name} photo ${index + 1}`}"
                loading="${index < 3 ? "eager" : "lazy"}"
                style="
                  display:block;
                  width:100%;
                  aspect-ratio:4 / 3;
                  object-fit:cover;
                "
              >
              ${
                photo.caption
                  ? `
                    <figcaption
                      style="
                        padding:9px 10px;
                        font-size:13px;
                        color:#716f68;
                      "
                    >
                      ${photo.caption}
                    </figcaption>
                  `
                  : ""
              }
            </figure>
          `
        ).join("")}
      </div>
    </section>
  `;
}

function isoDate(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  return new Date(
    `${value}T12:00:00`
  );
}

function addDays(date, number) {
  const copy =
    new Date(date);

  copy.setDate(
    copy.getDate() + number
  );

  return copy;
}

function nightsBetween(
  arrival,
  departure
) {
  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.round(
    (
      parseDate(departure) -
      parseDate(arrival)
    ) /
    millisecondsPerDay
  );
}

function isSaturday(value) {
  return (
    parseDate(value).getDay() === 6
  );
}

function formatMoney(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD"
    }
  );
}

function formatShortDate(value) {
  return parseDate(value)
    .toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
}

function dateInsideReservation(
  dateString,
  reservation
) {
  const date =
    parseDate(dateString);

  const arrival =
    parseDate(
      reservation.arrival_date
    );

  const departure =
    parseDate(
      reservation.departure_date
    );

  return (
    date >= arrival &&
    date < departure
  );
}

function statusForDate(
  dateString,
  availability
) {
  const matching =
    availability.find(item =>
      dateInsideReservation(
        dateString,
        item
      )
    );

  if (!matching) {
    return "available";
  }

  return (
    matching.availability_status ||
    "available"
  );
}

function rangeContainsStatus(
  arrival,
  departure,
  availability,
  wantedStatus
) {
  let current =
    parseDate(arrival);

  const end =
    parseDate(departure);

  while (current < end) {
    const status =
      statusForDate(
        isoDate(current),
        availability
      );

    if (status === wantedStatus) {
      return true;
    }

    current =
      addDays(current, 1);
  }

  return false;
}

function dateInsideRatePeriod(
  dateString,
  period
) {
  const date =
    parseDate(dateString);

  const start =
    parseDate(period.start_date);

  const end =
    parseDate(period.end_date);

  return (
    date >= start &&
    date < end
  );
}

function ratePeriodsForDate(
  dateString,
  ratePeriods
) {
  return ratePeriods.filter(
    period =>
      dateInsideRatePeriod(
        dateString,
        period
      )
  );
}

function nonBlockedRateForDate(
  dateString,
  ratePeriods
) {
  const periods =
    ratePeriodsForDate(
      dateString,
      ratePeriods
    );

  if (
    periods.some(
      period => period.blocked
    )
  ) {
    return null;
  }

  return (
    periods.find(
      period => !period.blocked
    ) ||
    null
  );
}

function rateStatusForDate(
  dateString,
  ratePeriods
) {
  const periods =
    ratePeriodsForDate(
      dateString,
      ratePeriods
    );

  if (!periods.length) {
    return "unpriced";
  }

  if (
    periods.some(
      period => period.blocked
    )
  ) {
    return "blocked";
  }

  return "priced";
}

function ratePeriodForStay(
  arrival,
  departure,
  ratePeriods
) {
  const matching =
    ratePeriods.filter(
      period => {
        if (period.blocked) {
          return false;
        }

        return (
          parseDate(arrival) >=
            parseDate(period.start_date) &&
          parseDate(departure) <=
            parseDate(period.end_date)
        );
      }
    );

  if (!matching.length) {
    return null;
  }

  matching.sort(
    (a, b) =>
      nightsBetween(
        a.start_date,
        a.end_date
      ) -
      nightsBetween(
        b.start_date,
        b.end_date
      )
  );

  return matching[0];
}

function stayTouchesBlockedRate(
  arrival,
  departure,
  ratePeriods
) {
  let current =
    parseDate(arrival);

  const end =
    parseDate(departure);

  while (current < end) {
    const dateString =
      isoDate(current);

    const periods =
      ratePeriodsForDate(
        dateString,
        ratePeriods
      );

    if (
      periods.some(
        period => period.blocked
      )
    ) {
      return true;
    }

    current =
      addDays(current, 1);
  }

  return false;
}

function stayTouchesUnpricedDate(
  arrival,
  departure,
  ratePeriods
) {
  let current =
    parseDate(arrival);

  const end =
    parseDate(departure);

  while (current < end) {
    const dateString =
      isoDate(current);

    const period =
      nonBlockedRateForDate(
        dateString,
        ratePeriods
      );

    if (!period) {
      return true;
    }

    current =
      addDays(current, 1);
  }

  return false;
}

function validateStayAgainstRate(
  arrival,
  departure,
  ratePeriods
) {
  if (!arrival || !departure) {
    throw new Error(
      "Choose your arrival and departure dates."
    );
  }

  if (
    parseDate(departure) <=
    parseDate(arrival)
  ) {
    throw new Error(
      "Departure must be after arrival."
    );
  }

  if (
    stayTouchesBlockedRate(
      arrival,
      departure,
      ratePeriods
    )
  ) {
    throw new Error(
      "Part of that stay is not available."
    );
  }

  if (
    stayTouchesUnpricedDate(
      arrival,
      departure,
      ratePeriods
    )
  ) {
    throw new Error(
      "Those dates are not currently open for online booking."
    );
  }

  const period =
    ratePeriodForStay(
      arrival,
      departure,
      ratePeriods
    );

  if (!period) {
    throw new Error(
      "Those dates do not fit one currently published rate period."
    );
  }

  const nights =
    nightsBetween(
      arrival,
      departure
    );

  if (
    period.stay_rule ===
    "weekly"
  ) {
    if (
      !isSaturday(arrival) ||
      !isSaturday(departure) ||
      nights !== 7 ||
      arrival !== period.start_date ||
      departure !== period.end_date
    ) {
      throw new Error(
        "This period is available Saturday to Saturday only."
      );
    }

    if (
      period.weekly_price ===
        null ||
      period.weekly_price ===
        undefined
    ) {
      throw new Error(
        "This week does not have a published price yet."
      );
    }
  }

  if (
    period.stay_rule ===
    "flexible"
  ) {
    if (
      nights <
      Number(
        period.minimum_nights ||
        1
      )
    ) {
      throw new Error(
        `This period requires at least ${period.minimum_nights || 1} nights.`
      );
    }

    if (
      period.nightly_price ===
        null ||
      period.nightly_price ===
        undefined
    ) {
      throw new Error(
        "This flexible period does not have a nightly price yet."
      );
    }
  }

  return period;
}

function calculateQuote(
  propertyRecord,
  period,
  arrival,
  departure,
  dogs
) {
  const dogCount =
    Number(dogs || 0);

  const maxDogs =
    Number(
      propertyRecord.max_dogs ||
      0
    );

  if (
    dogCount >
    maxDogs
  ) {
    throw new Error(
      `This property allows a maximum of ${maxDogs} dog${maxDogs === 1 ? "" : "s"}.`
    );
  }

  const nights =
    nightsBetween(
      arrival,
      departure
    );

  let rental = 0;

  if (
    period.stay_rule ===
    "weekly"
  ) {
    rental =
      Number(
        period.weekly_price
      );
  } else {
    rental =
      Number(
        period.nightly_price
      ) *
      nights;
  }

  const cleaning =
    Number(
      propertyRecord.cleaning_fee ||
      0
    );

  const petFee =
    Number(
      propertyRecord.pet_fee ||
      0
    ) *
    dogCount;

  const total =
    rental +
    cleaning +
    petFee;

  return {
    rental,
    cleaning,
    petFee,
    dogs: dogCount,
    nights,
    total
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendBookingEmail({
  to,
  guestPhone,
  propertyName,
  guestName,
  arrival,
  departure,
  total,
  isWaitlist,
  reservationId
}) {
  const guestSubject =
    isWaitlist
      ? `Waitlist request received — ${propertyName}`
      : `Booking request received — ${propertyName}`;

  const statusCopy =
    isWaitlist
      ? "These dates currently have a pending hold. Your request has been added to the waitlist."
      : "Your dates have been received and are pending owner approval.";

  const guestHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#24231f;max-width:640px;margin:0 auto;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;">
        Down the Shore
      </h1>

      <p>
        Hi ${escapeHtml(guestName)},
      </p>

      <p>
        ${statusCopy}
      </p>

      <div style="background:#f5f1e8;padding:18px;margin:22px 0;">
        <p style="margin:0 0 8px;">
          <strong>
            ${escapeHtml(propertyName)}
          </strong>
        </p>

        <p style="margin:0 0 8px;">
          ${escapeHtml(formatShortDate(arrival))}
          –
          ${escapeHtml(formatShortDate(departure))}
        </p>

        <p style="margin:0;">
          <strong>
            Stay total:
            ${escapeHtml(formatMoney(total))}
          </strong>
        </p>
      </div>

      <p>
        No payment has been collected yet.
        Janis will review the request and,
        if accepted, will send the lease
        and payment instructions.
      </p>

      <p>
        Thank you,<br>
        Janis<br>
        Down the Shore
      </p>

      <p style="font-size:12px;color:#716f68;margin-top:28px;">
        Owner is a New Jersey licensed
        real estate broker.
      </p>
    </div>
  `;

  const guestResponse =
    await fetch(
      "/api/send-email",
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
              guestSubject,
            html:
              guestHtml
          })
      }
    );

  let guestDetails = null;

  try {
    guestDetails =
      await guestResponse.json();
  } catch (_) {}

  if (!guestResponse.ok) {
    console.error(
      "Guest booking email failed:",
      guestDetails ||
      guestResponse.statusText
    );
  }


  /*
    OWNER NOTIFICATION
  */

  const ownerEmail =
    "janisbenstock@gmail.com";

  const ownerSubject =
  isWaitlist
    ? `WAITLIST REQUEST — ${propertyName}`
    : `NEW BOOKING REQUEST — ${propertyName}`;

const reviewUrl =
  `${window.location.origin}/owner.html?section=pending&reservation=${encodeURIComponent(
    reservationId
  )}`;

const ownerHtml = `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#24231f;max-width:640px;margin:0 auto;">

    <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;">
      New ${
        isWaitlist
          ? "waitlist"
          : "booking"
      } request
    </h1>

    <div style="background:#f5f1e8;padding:18px;margin:22px 0;">

      <p style="margin:0 0 10px;">
        <strong>
          ${escapeHtml(propertyName)}
        </strong>
      </p>

      <p style="margin:0 0 8px;">
        ${escapeHtml(formatShortDate(arrival))}
        –
        ${escapeHtml(formatShortDate(departure))}
      </p>

      <p style="margin:0 0 8px;">
        Guest:
        <strong>
          ${escapeHtml(guestName)}
        </strong>
      </p>

      <p style="margin:0 0 8px;">
        Email:
        ${escapeHtml(to)}
      </p>

      ${
        guestPhone
          ? `
            <p style="margin:0 0 8px;">
              Phone:
              ${escapeHtml(guestPhone)}
            </p>
          `
          : ""
      }

      <p style="margin:0;">
        Stay total:
        <strong>
          ${escapeHtml(formatMoney(total))}
        </strong>
      </p>

    </div>

    <p>
      ${
        isWaitlist
          ? "This request was added to the waitlist."
          : "This reservation is waiting for your approval in the Owner Portal."
      }
    </p>

    <p style="margin:26px 0;">
      <a
        href="${escapeHtml(reviewUrl)}"
        style="
          display:inline-block;
          background:#15385f;
          color:#ffffff;
          text-decoration:none;
          padding:13px 20px;
          border-radius:4px;
          font-weight:bold;
        "
      >
        Review reservation
      </a>
    </p>

    <p>
      Down the Shore
    </p>

  </div>
`;
  try {
    const ownerResponse =
      await fetch(
        "/api/send-email",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              to:
                ownerEmail,

              subject:
                ownerSubject,

              html:
                ownerHtml
            })
        }
      );

    let ownerDetails = null;

    try {
      ownerDetails =
        await ownerResponse.json();
    } catch (_) {}

    if (!ownerResponse.ok) {
      console.error(
        "Owner booking notification failed:",
        ownerDetails ||
        ownerResponse.statusText
      );
    }

  } catch (ownerEmailError) {
    console.error(
      "Owner booking notification error:",
      ownerEmailError
    );
  }


  return {
    sent:
      guestResponse.ok,

    details:
      guestDetails
  };
}

async function submitReservation(
  property,
  propertyRecord,
  formData,
  availability,
  ratePeriods
) {
  const arrival =
    formData.get("arrival");

  const departure =
    formData.get("departure");

  if (
    rangeContainsStatus(
      arrival,
      departure,
      availability,
      "booked"
    )
  ) {
    throw new Error(
      "Part of that stay is already booked. Please choose different dates."
    );
  }

  const period =
    validateStayAgainstRate(
      arrival,
      departure,
      ratePeriods
    );

  const dogs =
    Number(
      formData.get("dogs") ||
      0
    );

  const quote =
    calculateQuote(
      propertyRecord,
      period,
      arrival,
      departure,
      dogs
    );

  const isWaitlist =
    rangeContainsStatus(
      arrival,
      departure,
      availability,
      "pending"
    );

  const payload = {
    property_id:
      propertyRecord.id,

    guest_name:
      formData
        .get("name")
        .trim(),

    guest_email:
      formData
        .get("email")
        .trim(),

    guest_phone:
      formData
        .get("phone")
        .trim() || null,

    arrival_date:
      arrival,

    departure_date:
      departure,

    adults:
      Number(
        formData.get("guests")
      ),

    children:
      0,

    dogs,

    dog_names:
      formData
        .get("dog_names")
        .trim() || null,

    amount_due:
      quote.total,

    payment_status:
      "waiting",

    booking_source:
      "direct_website",

    status:
      isWaitlist
        ? "waitlisted"
        : "pending"
  };

  const response =
  await fetch(
    `${data.supabase.url}/rest/v1/reservations`,
    {
      method: "POST",
      headers:
        supabaseHeaders(
          "return=representation"
        ),
      body:
        JSON.stringify(payload)
    }
  );

if (!response.ok) {
  const details =
    await response.text();

  throw new Error(
    `The request could not be saved. ${details}`
  );
}

const createdRows =
  await response.json();

const createdReservation =
  createdRows?.[0];

if (
  !createdReservation ||
  !createdReservation.id
) {
  throw new Error(
    "The reservation was saved, but its ID could not be returned."
  );
}

const emailResult =
  await sendBookingEmail({
    to:
      payload.guest_email,

    guestPhone:
      payload.guest_phone,

    propertyName:
      property.name,

    guestName:
      payload.guest_name,

    arrival,
    departure,

    total:
      quote.total,

    isWaitlist,

    reservationId:
      createdReservation.id
  });

  return {
    isWaitlist,
    quote,
    period,
    emailSent: emailResult.sent
  };
}

function injectCalendarStyles() {
  if (document.getElementById("dts-flexible-rate-styles")) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "dts-flexible-rate-styles";

  style.textContent = `
    .calendar-day .flexible-price {
      display:block;
      margin-top:3px;
      font-size:9px;
      line-height:1.1;
      font-weight:700;
      color:#0d2b4d;
      white-space:nowrap;
    }

    .flexible-rate-details {
      margin:14px 0 0;
      padding:12px 14px;
      border:1px solid #e0ddd7;
      background:#fffdf8;
    }

    .flexible-rate-details-title {
      margin:0 0 8px;
      font-weight:700;
      color:#172334;
    }

    .flexible-rate-detail {
      padding:7px 0;
      border-top:1px solid #ece7df;
      font-size:13px;
      line-height:1.4;
      color:#4f5966;
    }

    .flexible-rate-detail:first-of-type {
      border-top:0;
      padding-top:0;
    }

    .flexible-rate-detail strong {
      color:#0d2b4d;
    }
  `;

  document.head.appendChild(style);
}

function weeklyPriceLabel(period) {
  if (
    !period ||
    period.stay_rule !== "weekly" ||
    period.weekly_price == null
  ) {
    return "";
  }

  return formatMoney(
    period.weekly_price
  );
}

function compactMoney(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }
  );
}

function flexibleRateDetails(ratePeriods) {
  const flexible =
    ratePeriods
      .filter(
        period =>
          !period.blocked &&
          period.stay_rule === "flexible" &&
          period.nightly_price != null
      )
      .slice()
      .sort(
        (a, b) =>
          parseDate(a.start_date) -
          parseDate(b.start_date)
      );

  if (!flexible.length) {
    return "";
  }

  return `
    <section class="flexible-rate-details">
      <div class="flexible-rate-details-title">
        Short-stay pricing
      </div>

      ${
        flexible
          .map(
            period => `
              <div class="flexible-rate-detail">
                <strong>
                  ${formatMoney(period.nightly_price)}/night
                  · ${Number(period.minimum_nights || 1)}-night minimum
                </strong>
                <br>
                ${formatShortDate(period.start_date)}
                –
                ${formatShortDate(period.end_date)}
              </div>
            `
          )
          .join("")
      }
    </section>
  `;
}

function publishedRateSummary(ratePeriods) {
  const open =
    ratePeriods.filter(
      period => !period.blocked
    );

  const weekly =
    open.filter(
      period =>
        period.stay_rule === "weekly" &&
        period.weekly_price != null
    );

  const flexible =
    open.filter(
      period =>
        period.stay_rule === "flexible" &&
        period.nightly_price != null
    );

  const parts = [];

  if (weekly.length) {
    const prices =
      weekly.map(
        period =>
          Number(period.weekly_price)
      );

    const low =
      Math.min(...prices);

    const high =
      Math.max(...prices);

    parts.push(`
      <div class="rate-summary-line">
        <strong>
          Weekly stays:
          ${
            low === high
              ? formatMoney(low)
              : `${formatMoney(low)}–${formatMoney(high)}`
          }
        </strong>
        Saturday check-in at 2:00 PM · Saturday checkout at 10:00 AM.
      </div>
    `);
  }

  if (flexible.length) {
    const prices =
      flexible.map(
        period =>
          Number(period.nightly_price)
      );

    const low =
      Math.min(...prices);

    const high =
      Math.max(...prices);

    const minimum =
      Math.min(
        ...flexible.map(
          period =>
            Number(
              period.minimum_nights || 1
            )
        )
      );

    parts.push(`
      <div class="rate-summary-line">
        <strong>
          Selected short-stay openings:
          ${
            low === high
              ? `${formatMoney(low)}/night`
              : `${formatMoney(low)}–${formatMoney(high)}/night`
          }
        </strong>
        Minimum stay varies by date; currently as low as ${minimum} night${minimum === 1 ? "" : "s"}.
      </div>
    `);
  }

  return (
    parts.join("") ||
    `
      <div class="rate-summary-line">
        <strong>No published rates right now.</strong>
        Check back soon for newly opened dates.
      </div>
    `
  );
}

function renderWeeklyAvailabilityList(
  ratePeriods,
  availability,
  onChoose
) {
  const container =
    document.querySelector(
      "[data-weekly-rate-list]"
    );

  const section =
    document.querySelector(
      "[data-weekly-list-section]"
    );

  if (!container || !section) {
    return;
  }

  const items =
    ratePeriods
      .filter(
        period =>
          !period.blocked &&
          period.stay_rule === "weekly" &&
          period.weekly_price != null
      )
      .map(
        period => ({
          period,

          isBooked:
            rangeContainsStatus(
              period.start_date,
              period.end_date,
              availability,
              "booked"
            ),

          isPending:
            rangeContainsStatus(
              period.start_date,
              period.end_date,
              availability,
              "pending"
            )
        })
      )
      .filter(
        item => !item.isBooked
      );

  if (!items.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  container.innerHTML =
    items
      .map(
        item => `
          <article
            class="weekly-rate-item ${item.isPending ? "pending" : ""}"
          >
            <div>
              <div class="weekly-rate-dates">
                ${formatShortDate(item.period.start_date)}
                –
                ${formatShortDate(item.period.end_date)}
              </div>

              <div class="weekly-rate-meta">
                Saturday to Saturday ·
                ${
                  item.isPending
                    ? "pending hold — waitlist available"
                    : "available"
                }
              </div>
            </div>

            <div class="weekly-rate-price">
              ${formatMoney(item.period.weekly_price)}
            </div>

            <button
              class="weekly-rate-action"
              type="button"
              data-weekly-select="${item.period.id}"
            >
              Select week
            </button>
          </article>
        `
      )
      .join("");

  container
    .querySelectorAll(
      "[data-weekly-select]"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const period =
              ratePeriods.find(
                item =>
                  String(item.id) ===
                  String(
                    button.dataset.weeklySelect
                  )
              );

            if (period) {
              onChoose(period);
            }
          }
        );
      }
    );
}

function renderMonth(
  monthDate,
  availability,
  ratePeriods,
  selectedArrival,
  selectedDeparture
) {
  const year =
    monthDate.getFullYear();

  const month =
    monthDate.getMonth();

  const firstDay =
    new Date(year, month, 1);

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const monthName =
    firstDay.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric"
      }
    );

  let days = "";

  for (
    let blank = 0;
    blank < firstDay.getDay();
    blank++
  ) {
    days +=
      `<button class="calendar-day blank" tabindex="-1"></button>`;
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const date =
      new Date(year, month, day);

    const dateString =
      isoDate(date);

    const reservationStatus =
      statusForDate(
        dateString,
        availability
      );

    const rateStatus =
      rateStatusForDate(
        dateString,
        ratePeriods
      );

    const period =
      nonBlockedRateForDate(
        dateString,
        ratePeriods
      );

    let status =
      reservationStatus;

    if (
      reservationStatus !== "booked"
    ) {
      if (rateStatus === "blocked") {
        status = "blocked";
      } else if (
        rateStatus === "unpriced"
      ) {
        status = "unpriced";
      }
    }

    const classes =
      [
        "calendar-day",
        status
      ];

    if (
      period &&
      period.stay_rule === "weekly" &&
      dateString === period.start_date
    ) {
      classes.push("weekly-start");
    }

    if (
      dateString === selectedArrival ||
      dateString === selectedDeparture
    ) {
      classes.push("selected");
    }

    if (
      selectedArrival &&
      selectedDeparture &&
      parseDate(dateString) >
        parseDate(selectedArrival) &&
      parseDate(dateString) <
        parseDate(selectedDeparture)
    ) {
      classes.push("in-range");
    }

    const disabled =
      (
        status === "booked" ||
        status === "blocked" ||
        status === "unpriced"
      )
        ? "disabled"
        : "";

    let title = "Available";

    if (status === "pending") {
      title =
        "Pending — you may join the waitlist";
    } else if (
      status === "booked"
    ) {
      title = "Booked";
    } else if (
      status === "blocked"
    ) {
      title = "Not available";
    } else if (
      status === "unpriced"
    ) {
      title =
        "Not currently open for online booking";
    } else if (
      period &&
      period.stay_rule === "weekly"
    ) {
      title =
        dateString === period.start_date
          ? `Saturday-to-Saturday week · ${formatMoney(period.weekly_price)}`
          : "Part of a Saturday-to-Saturday rental week";
    } else if (
      period &&
      period.stay_rule === "flexible"
    ) {
      title =
        `${formatMoney(period.nightly_price)} per night · ${period.minimum_nights || 1} night minimum`;
    }

    days += `
      <button
        type="button"
        class="${classes.join(" ")}"
        data-calendar-date="${dateString}"
        data-calendar-status="${status}"
        title="${title}"
        ${disabled}
      >
        <span>${day}</span>

        ${
          period &&
          period.stay_rule === "weekly" &&
          dateString === period.start_date
            ? `
              <span class="weekly-price">
                ${weeklyPriceLabel(period)}
              </span>
            `
            : ""
        }

        ${
          period &&
          period.stay_rule === "flexible" &&
          period.nightly_price != null
            ? `
              <span class="flexible-price">
                ${compactMoney(period.nightly_price)}/nt
              </span>
            `
            : ""
        }
      </button>
    `;
  }

  return `
    <div class="calendar-month">

      <h4>${monthName}</h4>

      <div class="calendar-weekdays">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div class="calendar-grid">
        ${days}
      </div>

    </div>
  `;
}

async function renderProperty() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const id =
    params.get("id");

  const property =
    data.properties.find(
      item => item.id === id
    ) ||
    data.properties[0];

  const owner =
    data.owners[property.owner];

  document.title =
    `${property.name} | ${data.brand.name}`;

  document
    .querySelectorAll("[data-brand]")
    .forEach(
      el => {
        el.textContent =
          data.brand.name;
      }
    );

  const hero =
    document.querySelector(
      "[data-page-hero]"
    );

  hero.style.backgroundImage =
    property.image
      ? `linear-gradient(rgba(20,20,18,.18), rgba(20,20,18,.52)), url('${property.image}')`
      : `linear-gradient(135deg, #aaa295, #6f6b63)`;

  hero.style.backgroundPosition =
    property.imagePosition ||
    "center";

  document.querySelector(
    "[data-property-name]"
  ).textContent =
    property.name;

  document.querySelector(
    "[data-property-tagline]"
  ).textContent =
    property.tagline;

  document.querySelector(
    "[data-property-status]"
  ).textContent =
    property.status;

  document.querySelector(
    "[data-property-summary]"
  ).textContent =
    property.summary;

  document.querySelector(
    "[data-property-description]"
  ).textContent =
    property.description;

  document.querySelector(
    "[data-rates-note]"
  ).textContent =
    property.ratesNote;

  document.querySelector(
    "[data-facts]"
  ).innerHTML = `
    <span class="fact">
      ${property.bedrooms}
      bedroom${property.bedrooms === 1 ? "" : "s"}
    </span>

    <span class="fact">
      ${property.bathrooms}
      bathroom${property.bathrooms === 1 ? "" : "s"}
    </span>

    <span class="fact">
      Sleeps ${property.sleeps}
    </span>

    <span class="fact">
      ${property.location}
    </span>
  `;

  document.querySelector(
    "[data-amenities]"
  ).innerHTML =
    property.amenities
      .map(
        item =>
          `<li>${item}</li>`
      )
      .join("");

  document.querySelector(
    "[data-owner-name]"
  ).textContent =
    owner.name;

  const form =
    document.querySelector(
      "[data-booking-form]"
    );

  const result =
    document.querySelector(
      "[data-booking-result]"
    );

  const submitButton =
    document.querySelector(
      "[data-submit-button]"
    );

  const dogCountField =
    document.querySelector(
      "[data-dog-count-field]"
    );

  const dogNamesField =
    document.querySelector(
      "[data-dog-names-field]"
    );

  const dogSelect =
    form.elements.dogs;

  form.elements.guests.max =
    String(property.sleeps);

  form.elements.arrival.readOnly =
    true;

  form.elements.departure.readOnly =
    true;

  injectCalendarStyles();

  const propertyRecord =
    await getPropertyRecord(
      property.databaseName
    );

  const propertyId =
    propertyRecord.id;

  const managedPhotos =
    await getPropertyPhotos(
      propertyId
    );

  const managedHero =
    choosePrimaryPhoto(
      property,
      managedPhotos
    );

  if (managedHero) {
    hero.style.backgroundImage =
      `linear-gradient(rgba(20,20,18,.18), rgba(20,20,18,.52)), url('${managedHero}')`;
  }

  if (managedPhotos.length) {
    const description =
      document.querySelector(
        "[data-property-description]"
      );

    const existingGallery =
      document.querySelector(
        "[data-managed-photo-gallery]"
      );

    if (existingGallery) {
      existingGallery.remove();
    }

    if (description) {
      description.insertAdjacentHTML(
        "afterend",
        propertyGalleryMarkup(
          property,
          managedPhotos
        )
      );
    }
  }

  let availability =
    await getAvailability(
      propertyId
    );

  let ratePeriods =
    await getRatePeriods(
      propertyId
    );

  const publishedRateSummaryEl =
    document.querySelector(
      "[data-published-rate-summary]"
    );

  if (publishedRateSummaryEl) {
    publishedRateSummaryEl.innerHTML =
      publishedRateSummary(
        ratePeriods
      );
  }

  if (!property.dogFriendly) {
    dogCountField.style.display =
      "none";

    dogNamesField.style.display =
      "none";

    dogSelect.value = "0";
  } else {
    const maxDogs =
      Number(
        propertyRecord.max_dogs ||
        0
      );

    Array.from(
      dogSelect.options
    ).forEach(
      option => {
        if (
          Number(option.value) >
          maxDogs
        ) {
          option.disabled = true;
        }
      }
    );

    dogSelect.addEventListener(
      "change",
      () => {
        dogNamesField.style.display =
          dogSelect.value === "0"
            ? "none"
            : "block";

        drawCalendar();
      }
    );
  }

  let calendarStart =
    new Date();

  calendarStart =
    new Date(
      calendarStart.getFullYear(),
      calendarStart.getMonth(),
      1
    );

  let selectedArrival = "";
  let selectedDeparture = "";

  const calendarMount =
    document.querySelector(
      "[data-calendar-mount]"
    );

  const calendarWrap =
    document.createElement("div");

  calendarWrap.className =
    "availability-wrap";

  calendarMount.appendChild(
    calendarWrap
  );

  const quoteMount =
    document.querySelector(
      "[data-quote-mount]"
    );

  const quoteBox =
    document.createElement("div");

  quoteBox.className =
    "quote-box";

  quoteBox.hidden = true;

  quoteMount.replaceWith(
    quoteBox
  );

  function currentQuote() {
    if (
      !selectedArrival ||
      !selectedDeparture
    ) {
      return null;
    }

    const period =
      validateStayAgainstRate(
        selectedArrival,
        selectedDeparture,
        ratePeriods
      );

    return {
      period,

      quote:
        calculateQuote(
          propertyRecord,
          period,
          selectedArrival,
          selectedDeparture,
          dogSelect.value
        )
    };
  }

  function renderQuote() {
    quoteBox.hidden = true;
    quoteBox.innerHTML = "";

    if (
      !selectedArrival ||
      !selectedDeparture
    ) {
      return;
    }

    try {
      const {
        period,
        quote
      } =
        currentQuote();

      quoteBox.hidden = false;

      quoteBox.innerHTML = `
        <h3>
          Your stay total
        </h3>

        <div class="quote-row">
          <span>
            ${
              period.stay_rule === "weekly"
                ? `Weekly rental · ${formatShortDate(selectedArrival)} – ${formatShortDate(selectedDeparture)}`
                : `${quote.nights} night${quote.nights === 1 ? "" : "s"} · ${formatMoney(period.nightly_price)}/night`
            }
          </span>

          <strong>
            ${formatMoney(quote.rental)}
          </strong>
        </div>

        <div class="quote-row">
          <span>
            Cleaning fee
          </span>

          <strong>
            ${formatMoney(quote.cleaning)}
          </strong>
        </div>

        ${
          quote.dogs > 0
            ? `
              <div class="quote-row">
                <span>
                  Pet fee · ${quote.dogs} dog${quote.dogs === 1 ? "" : "s"}
                </span>

                <strong>
                  ${formatMoney(quote.petFee)}
                </strong>
              </div>
            `
            : ""
        }

        <div class="quote-row quote-total">
          <span>
            Total
          </span>

          <strong>
            ${formatMoney(quote.total)}
          </strong>
        </div>
      `;

    } catch (error) {
      quoteBox.hidden = false;
      quoteBox.textContent =
        error.message;
    }
  }

  function selectWeeklyPeriod(
    period
  ) {
    selectedArrival =
      period.start_date;

    selectedDeparture =
      period.end_date;

    form.elements.arrival.value =
      selectedArrival;

    form.elements.departure.value =
      selectedDeparture;

    calendarStart =
      new Date(
        parseDate(
          selectedArrival
        ).getFullYear(),

        parseDate(
          selectedArrival
        ).getMonth(),

        1
      );

    drawCalendar();

    document
      .getElementById("booking")
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  }

  function drawCalendar() {
    calendarWrap.innerHTML = `

      <div class="availability-heading">

        <h3>
          Check availability
        </h3>

        <div class="calendar-nav">

          <button
            type="button"
            data-calendar-prev
            aria-label="Previous month"
          >
            ‹
          </button>

          <button
            type="button"
            data-calendar-next
            aria-label="Next month"
          >
            ›
          </button>

        </div>

      </div>

      <div class="calendar-months">

        ${renderMonth(
          calendarStart,
          availability,
          ratePeriods,
          selectedArrival,
          selectedDeparture
        )}

        ${renderMonth(
          new Date(
            calendarStart.getFullYear(),
            calendarStart.getMonth() + 1,
            1
          ),
          availability,
          ratePeriods,
          selectedArrival,
          selectedDeparture
        )}

      </div>

      <div class="availability-legend">

        <span class="legend-item">
          <span class="legend-dot legend-available"></span>
          Available
        </span>

        <span class="legend-item">
          <span class="legend-dot legend-pending"></span>
          Pending — waitlist available
        </span>

        <span class="legend-item">
          <span class="legend-dot legend-booked"></span>
          Booked
        </span>

        <span class="legend-item">
          <span class="legend-dot legend-closed"></span>
          Not currently open
        </span>

      </div>

      ${flexibleRateDetails(ratePeriods)}

      <div
        class="calendar-message"
        data-calendar-message
      ></div>
    `;

    const messageBox =
      calendarWrap.querySelector(
        "[data-calendar-message]"
      );

    if (
      selectedArrival &&
      !selectedDeparture
    ) {
      const arrivalPeriod =
        nonBlockedRateForDate(
          selectedArrival,
          ratePeriods
        );

      if (
        arrivalPeriod &&
        arrivalPeriod.stay_rule === "flexible"
      ) {
        messageBox.textContent =
          `Arrival selected: ${formatShortDate(selectedArrival)} · ${formatMoney(arrivalPeriod.nightly_price)}/night · ${arrivalPeriod.minimum_nights || 1}-night minimum. Choose your departure date.`;
      } else {
        messageBox.textContent =
          `Arrival selected: ${formatShortDate(selectedArrival)}. Choose your departure date.`;
      }

    } else if (
      selectedArrival &&
      selectedDeparture
    ) {
      const pending =
        rangeContainsStatus(
          selectedArrival,
          selectedDeparture,
          availability,
          "pending"
        );

      if (pending) {
        messageBox.className =
          "calendar-message pending-note";

        messageBox.textContent =
          "Some of these dates currently have a pending 24-hour hold. You may still send a request to join the waitlist.";
      } else {
        try {
          const period =
            validateStayAgainstRate(
              selectedArrival,
              selectedDeparture,
              ratePeriods
            );

          messageBox.className =
            "calendar-message";

          if (
            period.stay_rule ===
            "weekly"
          ) {
            messageBox.textContent =
              "Saturday check-in at 2:00 PM · Saturday checkout at 10:00 AM.";
          } else {
            messageBox.textContent =
              `Selected: ${formatShortDate(selectedArrival)} through ${formatShortDate(selectedDeparture)} · ${period.minimum_nights || 1}-night minimum.`;
          }

        } catch (error) {
          messageBox.className =
            "calendar-message pending-note";

          messageBox.textContent =
            error.message;
        }
      }

    } else {
      messageBox.textContent =
        "Choose an available arrival date. Saturday-to-Saturday weeks are marked by their Saturday start date.";
    }

    calendarWrap
      .querySelector(
        "[data-calendar-prev]"
      )
      .onclick =
      () => {
        calendarStart =
          new Date(
            calendarStart.getFullYear(),
            calendarStart.getMonth() - 1,
            1
          );

        drawCalendar();
      };

    calendarWrap
      .querySelector(
        "[data-calendar-next]"
      )
      .onclick =
      () => {
        calendarStart =
          new Date(
            calendarStart.getFullYear(),
            calendarStart.getMonth() + 1,
            1
          );

        drawCalendar();
      };

    calendarWrap
      .querySelectorAll(
        "[data-calendar-date]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const date =
                button.dataset
                  .calendarDate;

              const status =
                button.dataset
                  .calendarStatus;

              if (
                status === "booked" ||
                status === "blocked" ||
                status === "unpriced"
              ) {
                return;
              }

              const rate =
                nonBlockedRateForDate(
                  date,
                  ratePeriods
                );

              if (!rate) {
                return;
              }

              if (
                rate.stay_rule ===
                "weekly"
              ) {
                if (
                  date !==
                  rate.start_date
                ) {
                  selectedArrival = "";
                  selectedDeparture = "";

                  form.elements.arrival.value =
                    "";

                  form.elements.departure.value =
                    "";

                  drawCalendar();
                  return;
                }

                selectWeeklyPeriod(
                  rate
                );

                return;
              }

              if (
                !selectedArrival ||
                selectedDeparture
              ) {
                selectedArrival =
                  date;

                selectedDeparture =
                  "";

                form.elements.arrival.value =
                  date;

                form.elements.departure.value =
                  "";

              } else {
                if (
                  parseDate(date) <=
                  parseDate(
                    selectedArrival
                  )
                ) {
                  selectedArrival =
                    date;

                  selectedDeparture =
                    "";

                  form.elements.arrival.value =
                    date;

                  form.elements.departure.value =
                    "";

                } else {
                  const hitsBooked =
                    rangeContainsStatus(
                      selectedArrival,
                      date,
                      availability,
                      "booked"
                    );

                  if (hitsBooked) {
                    selectedArrival =
                      date;

                    selectedDeparture =
                      "";

                    form.elements.arrival.value =
                      date;

                    form.elements.departure.value =
                      "";

                  } else {
                    selectedDeparture =
                      date;

                    form.elements.departure.value =
                      date;
                  }
                }
              }

              drawCalendar();
            }
          );
        }
      );

    renderWeeklyAvailabilityList(
      ratePeriods,
      availability,
      selectWeeklyPeriod
    );

    renderQuote();
  }

  drawCalendar();

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      result.className =
        "booking-result";

      result.textContent = "";

      submitButton.disabled =
        true;

      submitButton.textContent =
        "Saving request…";

      try {
        const formData =
          new FormData(form);

        const response =
          await submitReservation(
            property,
            propertyRecord,
            formData,
            availability,
            ratePeriods
          );

        result.className =
          "booking-result success";

        const total =
          formatMoney(
            response.quote.total
          );

        if (response.isWaitlist) {
          result.innerHTML =
            `<strong>You’re on the waitlist.</strong><br>Your requested stay total is ${total}. These dates currently have a pending 24-hour hold. Janis has received your request and can contact you if the dates become available.${response.emailSent ? "<br><br>A confirmation email is on its way." : "<br><br>Your request was saved, but the confirmation email could not be sent."}`;

        } else {
          result.innerHTML =
            `<strong>Your dates have been received.</strong><br>Your stay total is ${total}. Your request is pending until Janis confirms the dates, lease, and payment details.${response.emailSent ? "<br><br>A confirmation email is on its way." : "<br><br>Your request was saved, but the confirmation email could not be sent."}`;
        }

        form.reset();

        dogNamesField.style.display =
          "none";

        selectedArrival = "";
        selectedDeparture = "";

        availability =
          await getAvailability(
            propertyId
          );

        ratePeriods =
          await getRatePeriods(
            propertyId
          );

        if (
          publishedRateSummaryEl
        ) {
          publishedRateSummaryEl.innerHTML =
            publishedRateSummary(
              ratePeriods
            );
        }

        drawCalendar();

      } catch (error) {
        console.error(error);

        result.className =
          "booking-result error";

        result.textContent =
          error.message;

      } finally {
        submitButton.disabled =
          false;

        submitButton.textContent =
          "Send booking request";
      }
    }
  );
}
