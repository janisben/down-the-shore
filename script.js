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

  if (brand.contactEmail) {
    contact.href =
      `mailto:${brand.contactEmail}`;
  } else {
    contact.removeAttribute("href");
    contact.textContent =
      "Contact information coming soon";
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

async function getPropertyUuid(databaseName) {
  const url =
    `${data.supabase.url}/rest/v1/properties` +
    `?select=id` +
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

  return records[0].id;
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

async function submitReservation(
  property,
  propertyId,
  formData,
  availability
) {
  const arrival =
    formData.get("arrival");

  const departure =
    formData.get("departure");

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

  const isWaitlist =
    rangeContainsStatus(
      arrival,
      departure,
      availability,
      "pending"
    );

  const payload = {
    property_id: propertyId,

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

    arrival_date: arrival,
    departure_date: departure,

    adults:
      Number(
        formData.get("guests")
      ),

    children: 0,

    dogs:
      Number(
        formData.get("dogs") || 0
      ),

    dog_names:
      formData
        .get("dog_names")
        .trim() || null,

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
            "return=minimal"
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

  return {
    isWaitlist
  };
}

function injectCalendarStyles() {
  const style =
    document.createElement("style");

  style.textContent = `

    .availability-wrap {
      margin: 0 0 28px;
      padding: 18px;
      background: #fff;
      border: 1px solid rgba(36,35,31,.14);
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }

    .availability-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .availability-heading h3 {
      margin: 0;
      font-family: Georgia, serif;
      font-size: 24px;
      font-weight: 400;
    }

    .calendar-nav {
      display: flex;
      gap: 8px;
    }

    .calendar-nav button {
      width: 38px;
      height: 38px;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
      font-size: 20px;
    }

    .calendar-months {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .calendar-months .calendar-month:nth-child(2) {
      display: none;
    }

    .calendar-month h4 {
      margin: 0 0 12px;
      text-align: center;
      font-family: Georgia, serif;
      font-size: 18px;
      font-weight: 400;
    }

    .calendar-weekdays,
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .calendar-weekdays div {
      text-align: center;
      font-size: 10px;
      color: #716f68;
      padding: 4px 0;
    }

    .calendar-day {
      aspect-ratio: 1;
      min-width: 0;
      border: 1px solid transparent;
      background: #f7f4ef;
      cursor: pointer;
      font-size: 12px;
      position: relative;
      padding: 0;
    }

    .calendar-day:hover {
      border-color: #24231f;
    }

    .calendar-day.blank {
      visibility: hidden;
    }

    .calendar-day.booked {
      background: #dedede;
      color: #888;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    .calendar-day.pending {
      background: #f3e3ad;
      color: #5f4c00;
    }

    .calendar-day.selected {
      background: #24231f;
      color: white;
    }

    .calendar-day.in-range {
      background: #dfe9e4;
    }

    .calendar-day.pending.in-range {
      background: #ead590;
    }

    .availability-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
      font-size: 11px;
      color: #716f68;
    }

    .legend-item {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border: 1px solid #ccc;
      flex: 0 0 auto;
    }

    .legend-available {
      background: #f7f4ef;
    }

    .legend-pending {
      background: #f3e3ad;
    }

    .legend-booked {
      background: #dedede;
    }

    .calendar-message {
      margin-top: 14px;
      font-size: 13px;
      line-height: 1.5;
    }

    .calendar-message.pending-note {
      padding: 10px;
      background: #fff4cf;
    }

    @media (max-width: 750px) {
      .availability-wrap {
        padding: 14px;
      }

      .availability-heading h3 {
        font-size: 21px;
      }
    }
  `;

  document.head.appendChild(style);
}

function renderMonth(
  monthDate,
  availability,
  selectedArrival,
  selectedDeparture
) {
  const year =
    monthDate.getFullYear();

  const month =
    monthDate.getMonth();

  const firstDay =
    new Date(
      year,
      month,
      1
    );

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
      new Date(
        year,
        month,
        day
      );

    const dateString =
      isoDate(date);

    const status =
      statusForDate(
        dateString,
        availability
      );

    const classes =
      ["calendar-day", status];

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
      status === "booked"
        ? "disabled"
        : "";

    const title =
      status === "pending"
        ? "Pending — you may join the waitlist"
        : status === "booked"
          ? "Booked"
          : "Available";

    days += `
      <button
        type="button"
        class="${classes.join(" ")}"
        data-calendar-date="${dateString}"
        data-calendar-status="${status}"
        title="${title}"
        ${disabled}
      >
        ${day}
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
    .forEach(el => {
      el.textContent =
        data.brand.name;
    });

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

  if (!property.dogFriendly) {
    dogCountField.style.display =
      "none";

    dogNamesField.style.display =
      "none";

    dogSelect.value =
      "0";
  } else {
    dogSelect.addEventListener(
      "change",
      () => {
        dogNamesField.style.display =
          dogSelect.value === "0"
            ? "none"
            : "block";
      }
    );
  }

  form.elements.guests.max =
    String(property.sleeps);

  form.elements.arrival.readOnly =
    true;

  form.elements.departure.readOnly =
    true;

  injectCalendarStyles();

  const propertyId =
    await getPropertyUuid(
      property.databaseName
    );

  let availability =
    await getAvailability(
      propertyId
    );

  let calendarStart =
    new Date();

  calendarStart =
    new Date(
      calendarStart.getFullYear(),
      calendarStart.getMonth(),
      1
    );

  let selectedArrival =
    "";

  let selectedDeparture =
    "";

  const calendarWrap =
    document.createElement("div");

  calendarWrap.className =
    "availability-wrap";

  form.parentNode.insertBefore(
    calendarWrap,
    form
  );

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

      </div>

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
          "Some of these dates are currently pending. You may still send a request to join the waitlist.";
      } else {
        messageBox.className =
          "calendar-message";

        messageBox.textContent =
          `Selected: ${selectedArrival} through ${selectedDeparture}`;
      }
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
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const date =
              button.dataset.calendarDate;

            const status =
              button.dataset.calendarStatus;

            if (
              status === "booked"
            ) {
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
                parseDate(selectedArrival)
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
      });
  }

  drawCalendar();

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      result.className =
        "booking-result";

      result.textContent =
        "";

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
            propertyId,
            formData,
            availability
          );

        result.className =
          "booking-result success";

        if (response.isWaitlist) {
          result.innerHTML =
            `<strong>You’re on the waitlist.</strong><br>These dates currently have a pending 24-hour hold. Janis has received your request and can contact you if the dates become available.`;
        } else {
          result.innerHTML =
            `<strong>Your dates have been received.</strong><br>Your request is pending until Janis confirms the dates, lease, and payment details.`;
        }

        form.reset();

        dogNamesField.style.display =
          "none";

        selectedArrival =
          "";

        selectedDeparture =
          "";

        availability =
          await getAvailability(
            propertyId
          );

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
