const cfg = window.SITE_DATA.supabase;

let token =
  sessionStorage.getItem("dts_token") || "";

let calendarDate =
  new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

let currentReservations = [];
let currentProperties = [];
let currentCleanings = [];
let currentRatePeriods = [];


const loginView =
  document.getElementById("loginView");

const portalView =
  document.getElementById("portalView");

const loginForm =
  document.getElementById("loginForm");

const loginMessage =
  document.getElementById("loginMessage");

const portalMessage =
  document.getElementById("portalMessage");

const reservationList =
  document.getElementById("reservationList");

const logoutButton =
  document.getElementById("logoutButton");

const manualReservationForm =
  document.getElementById("manualReservationForm");

const manualReservationMessage =
  document.getElementById("manualReservationMessage");

const manualProperty =
  document.getElementById("manualProperty");

const bookingSource =
  document.getElementById("bookingSource");

const brokerageFields =
  document.getElementById("brokerageFields");

const ownerCalendar =
  document.getElementById("ownerCalendar");

const calendarPrev =
  document.getElementById("calendarPrev");

const calendarNext =
  document.getElementById("calendarNext");

const calendarToday =
  document.getElementById("calendarToday");

const cleaningList =
  document.getElementById("cleaningList");

const cleaningMessage =
  document.getElementById("cleaningMessage");

const ratePeriodForm =
  document.getElementById("ratePeriodForm");

const ratePeriodMessage =
  document.getElementById("ratePeriodMessage");

const ratePeriodsList =
  document.getElementById("ratePeriodsList");

const rateProperty =
  document.getElementById("rateProperty");

const rateStayRule =
  document.getElementById("rateStayRule");

const propertySettingsList =
  document.getElementById("propertySettingsList");

const propertySettingsMessage =
  document.getElementById("propertySettingsMessage");


const dashboardStats =
  document.getElementById("dashboardStats");

const dashboardCalendar =
  document.getElementById("dashboardCalendar");

const dashboardPendingList =
  document.getElementById("dashboardPendingList");

const dashboardUpcoming =
  document.getElementById("dashboardUpcoming");

const pendingReservationList =
  document.getElementById("pendingReservationList");

const sidebarPendingCount =
  document.getElementById("sidebarPendingCount");

const ownerPageTitle =
  document.getElementById("ownerPageTitle");

const ownerPageSubtitle =
  document.getElementById("ownerPageSubtitle");


const headers = (extra = {}) => ({
  apikey: cfg.publishableKey,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  ...extra
});


function message(
  el,
  text,
  isError = false
) {
  el.className =
    isError
      ? "notice error"
      : "notice";

  el.textContent = text;
}


async function login(
  email,
  password
) {
  const res =
    await fetch(
      `${cfg.url}/auth/v1/token?grant_type=password`,
      {
        method: "POST",

        headers: {
          apikey:
            cfg.publishableKey,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            email,
            password
          })
      }
    );

  const body =
    await res.json();

  if (!res.ok) {
    throw new Error(
      body.msg ||
      "Could not sign in."
    );
  }

  token =
    body.access_token;

  sessionStorage.setItem(
    "dts_token",
    token
  );
}


async function fetchTable(
  table,
  query = ""
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/${table}${query}`,
      {
        headers: headers()
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }

  return res.json();
}


async function loadProperties() {
  const properties =
    await fetchTable(
      "properties",
      "?select=id,name,cleaning_fee,pet_fee,max_dogs&order=name"
    );

  currentProperties =
    properties;

  const propertyOptions =
    `<option value="">
      Choose property
    </option>` +

    properties
      .map(
        property => `
          <option value="${property.id}">
            ${property.name}
          </option>
        `
      )
      .join("");

  manualProperty.innerHTML =
    propertyOptions;

  rateProperty.innerHTML =
    propertyOptions;

  return properties;
}



async function updateProperty(
  id,
  changes
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/properties?id=eq.${id}`,
      {
        method: "PATCH",
        headers:
          headers({
            Prefer:
              "return=minimal"
          }),
        body:
          JSON.stringify(changes)
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }
}


async function loadReservations() {
  const [
    reservations,
    properties
  ] =
    await Promise.all([
      fetchTable(
        "reservations",
        "?select=*&order=created_at.desc"
      ),

      fetchTable(
        "properties",
        "?select=id,name,cleaning_fee,pet_fee,max_dogs"
      )
    ]);

  currentProperties =
    properties;

  const propertyMap =
    Object.fromEntries(
      properties.map(
        property => [
          property.id,
          property.name
        ]
      )
    );

  currentReservations =
    reservations.map(
      reservation => ({
        ...reservation,

        property_name:
          propertyMap[
            reservation.property_id
          ] ||
          "Property"
      })
    );

  return currentReservations;
}


async function loadCleanings() {
  const cleanings =
    await fetchTable(
      "cleaning_assignments",
      "?select=*&order=checkout_date.asc"
    );

  const propertyMap =
    Object.fromEntries(
      currentProperties.map(
        property => [
          property.id,
          property.name
        ]
      )
    );

  const reservationMap =
    Object.fromEntries(
      currentReservations.map(
        reservation => [
          reservation.id,
          reservation
        ]
      )
    );

  currentCleanings =
    cleanings.map(
      cleaning => ({
        ...cleaning,

        property_name:
          propertyMap[
            cleaning.property_id
          ] ||
          "Property",

        reservation:
          reservationMap[
            cleaning.reservation_id
          ] ||
          null
      })
    );

  return currentCleanings;
}



async function loadRatePeriods() {
  const periods =
    await fetchTable(
      "rate_periods",
      "?select=*&order=start_date.asc"
    );

  const propertyMap =
    Object.fromEntries(
      currentProperties.map(
        property => [
          property.id,
          property.name
        ]
      )
    );

  currentRatePeriods =
    periods.map(
      period => ({
        ...period,
        property_name:
          propertyMap[
            period.property_id
          ] ||
          "Property"
      })
    );

  return currentRatePeriods;
}


async function createRatePeriod(
  data
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/rate_periods`,
      {
        method: "POST",
        headers:
          headers({
            Prefer:
              "return=minimal"
          }),
        body:
          JSON.stringify(data)
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }
}


async function updateRatePeriod(
  id,
  changes
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/rate_periods?id=eq.${id}`,
      {
        method: "PATCH",
        headers:
          headers({
            Prefer:
              "return=minimal"
          }),
        body:
          JSON.stringify({
            ...changes,
            updated_at:
              new Date().toISOString()
          })
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }
}


async function deleteRatePeriod(
  id
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/rate_periods?id=eq.${id}`,
      {
        method: "DELETE",
        headers:
          headers({
            Prefer:
              "return=minimal"
          })
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }
}


async function updateReservation(
  id,
  changes
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/reservations?id=eq.${id}`,
      {
        method: "PATCH",

        headers:
          headers({
            Prefer:
              "return=minimal"
          }),

        body:
          JSON.stringify(changes)
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }
}


async function createReservation(
  data
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/reservations`,
      {
        method: "POST",

        headers:
          headers({
            Prefer:
              "return=minimal"
          }),

        body:
          JSON.stringify(data)
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }
}


async function updateCleaning(
  id,
  changes
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/cleaning_assignments?id=eq.${id}`,
      {
        method: "PATCH",

        headers:
          headers({
            Prefer:
              "return=minimal"
          }),

        body:
          JSON.stringify({
            ...changes,
            updated_at:
              new Date().toISOString()
          })
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }
}


async function addPayment(
  id,
  amount,
  method
) {
  const now =
    new Date().toISOString();

  const res =
    await fetch(
      `${cfg.url}/rest/v1/payments`,
      {
        method: "POST",

        headers:
          headers({
            Prefer:
              "return=minimal"
          }),

        body:
          JSON.stringify({
            reservation_id: id,

            amount:
              Number(amount),

            payment_method:
              method,

            received_at:
              now
          })
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }

  await updateReservation(
    id,
    {
      payment_status:
        "paid",

      payment_method:
        method,

      amount_received:
        Number(amount),

      payment_received_at:
        now,

      hold_expires_at:
        null,

      status:
        "booked"
    }
  );
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
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}


function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return Number(
    value
  ).toLocaleString(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD"
    }
  );
}


function parseDate(value) {
  return new Date(
    `${value}T12:00:00`
  );
}


function isSaturday(value) {
  return (
    parseDate(value).getDay() === 6
  );
}


function nightsBetween(
  startDate,
  endDate
) {
  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.round(
    (
      parseDate(endDate) -
      parseDate(startDate)
    ) /
    millisecondsPerDay
  );
}


function validateRateDates(
  stayRule,
  startDate,
  endDate
) {
  if (
    !startDate ||
    !endDate ||
    parseDate(endDate) <=
      parseDate(startDate)
  ) {
    throw new Error(
      "End date must be after start date."
    );
  }

  if (
    stayRule ===
    "weekly"
  ) {
    if (
      !isSaturday(startDate) ||
      !isSaturday(endDate)
    ) {
      throw new Error(
        "Weekly-only periods must run Saturday to Saturday."
      );
    }

    if (
      nightsBetween(
        startDate,
        endDate
      ) !== 7
    ) {
      throw new Error(
        "Weekly-only periods must be exactly 7 nights."
      );
    }
  }
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


function reservationCalendarStatus(
  reservation
) {
  if (
    reservation.status ===
    "pending_payment"
  ) {
    if (
      reservation.hold_expires_at &&
      new Date(
        reservation.hold_expires_at
      ) <= new Date()
    ) {
      return null;
    }

    return "pending_payment";
  }

  if (
    reservation.status ===
    "pending" ||
    reservation.status ===
    "requested"
  ) {
    return "pending";
  }

  if (
    reservation.status ===
    "booked"
  ) {
    return "booked";
  }

  if (
    reservation.status ===
    "waitlisted"
  ) {
    return "waitlisted";
  }

  return null;
}


function reservationTouchesDate(
  reservation,
  dateString
) {
  const arrival =
    parseDate(
      reservation.arrival_date
    );

  const departure =
    parseDate(
      reservation.departure_date
    );

  const date =
    parseDate(
      dateString
    );

  return (
    date >= arrival &&
    date < departure
  );
}


function calendarItemsForDay(
  propertyId,
  dateString
) {
  return currentReservations
    .filter(
      reservation =>
        reservation.property_id ===
          propertyId &&

        reservationCalendarStatus(
          reservation
        ) &&

        reservationTouchesDate(
          reservation,
          dateString
        )
    )
    .map(
      reservation => ({
        reservation,

        status:
          reservationCalendarStatus(
            reservation
          )
      })
    );
}


function cleanerIsConfirmed(
  reservation
) {
  return currentCleanings.some(
    cleaning =>
      cleaning.reservation_id ===
        reservation.id &&

      (
        cleaning.status ===
          "confirmed" ||
        cleaning.status ===
          "completed"
      )
  );
}


function calendarItemLabel(
  reservation,
  status
) {
  const name =
    reservation.guest_name ||
    "Guest";

  if (
    status ===
    "pending_payment"
  ) {
    return `${name} · hold`;
  }

  if (
    status ===
    "waitlisted"
  ) {
    return `${name} · waitlist`;
  }

  if (
    status ===
    "pending"
  ) {
    return `${name} · request`;
  }

  if (
    status ===
      "booked" &&
    cleanerIsConfirmed(
      reservation
    )
  ) {
    return `${name} 🧹`;
  }

  return name;
}


function renderPropertyCalendar(
  property
) {
  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();

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

  let cells = "";

  for (
    let blank = 0;
    blank <
      firstDay.getDay();
    blank++
  ) {
    cells += `
      <div
        class="owner-calendar-day blank"
      ></div>
    `;
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

    const items =
      calendarItemsForDay(
        property.id,
        dateString
      );

    const itemHtml =
      items
        .map(
          item => `
            <span
              class="owner-calendar-item ${item.status}"
              title="${item.reservation.guest_name || "Guest"} · ${formatDate(item.reservation.arrival_date)} – ${formatDate(item.reservation.departure_date)}"
            >
              ${calendarItemLabel(
                item.reservation,
                item.status
              )}
            </span>
          `
        )
        .join("");

    cells += `
      <div
        class="owner-calendar-day"
      >

        <div
          class="owner-calendar-date"
        >
          ${day}
        </div>

        ${itemHtml}

      </div>
    `;
  }

  return `
    <section
      class="calendar-property"
    >

      <h3>
        ${property.name}
      </h3>

      <div
        class="owner-calendar-grid"
      >

        <div class="owner-calendar-weekday">Sun</div>
        <div class="owner-calendar-weekday">Mon</div>
        <div class="owner-calendar-weekday">Tue</div>
        <div class="owner-calendar-weekday">Wed</div>
        <div class="owner-calendar-weekday">Thu</div>
        <div class="owner-calendar-weekday">Fri</div>
        <div class="owner-calendar-weekday">Sat</div>

        ${cells}

      </div>

    </section>
  `;
}


function renderOwnerCalendar() {
  const monthTitle =
    calendarDate
      .toLocaleDateString(
        "en-US",
        {
          month:
            "long",

          year:
            "numeric"
        }
      );

  ownerCalendar.innerHTML = `
    <h2
      style="
        text-align:center;
        margin:0 0 22px;
        font-family:Georgia,serif;
        font-weight:400;
      "
    >
      ${monthTitle}
    </h2>

    ${
      currentProperties
        .map(
          renderPropertyCalendar
        )
        .join("")
    }
  `;
}


function cleaningCard(cleaning) {
  const reservation =
    cleaning.reservation;

  const guestName =
    reservation?.guest_name ||
    "Guest";

  const status =
    cleaning.status ||
    "waiting";

  const canEdit =
    status !== "cancelled" &&
    status !== "completed";

  return `
    <article
      class="cleaning-card ${status}"
      data-cleaning-id="${cleaning.id}"
    >

      <h3>
        ${cleaning.property_name}
      </h3>

      <div class="meta">
        Checkout:
        <strong>
          ${formatDate(cleaning.checkout_date)}
        </strong>

        <br>

        Guest:
        ${guestName}
      </div>

      <span class="cleaning-status">
        ${status.replaceAll("_", " ")}
      </span>

      ${
        status === "waiting"
          ? `
            <div class="cleaning-warning">
              Cleaner confirmation is still needed.
            </div>
          `
          : ""
      }

      ${
        status === "confirmed"
          ? `
            <div class="notice">
              Cleaner confirmed
              ${
                cleaning.confirmed_at
                  ? ` · ${new Date(cleaning.confirmed_at).toLocaleString()}`
                  : ""
              }
            </div>
          `
          : ""
      }

      ${
        status === "completed"
          ? `
            <div class="notice">
              Cleaning completed
              ${
                cleaning.completed_at
                  ? ` · ${new Date(cleaning.completed_at).toLocaleString()}`
                  : ""
              }
            </div>
          `
          : ""
      }

      ${
        cleaning.cleaner_name ||
        cleaning.cleaner_email
          ? `
            <div
              class="meta"
              style="margin-top:10px;"
            >
              Cleaner:
              ${cleaning.cleaner_name || ""}

              ${
                cleaning.cleaner_email
                  ? `<br>${cleaning.cleaner_email}`
                  : ""
              }
            </div>
          `
          : ""
      }

      ${
        canEdit
          ? `
            <div
              class="row"
              style="
                margin-top:12px;
                align-items:end;
              "
            >

              <label>
                Cleaner name
                <input
                  type="text"
                  value="${cleaning.cleaner_name || ""}"
                  data-cleaner-name
                >
              </label>

              <label>
                Cleaner email
                <input
                  type="email"
                  value="${cleaning.cleaner_email || ""}"
                  data-cleaner-email
                >
              </label>

              <button
                type="button"
                data-cleaning-action="save-cleaner"
              >
                Save cleaner
              </button>

              ${
                status === "waiting"
                  ? `
                    <button
                      type="button"
                      data-cleaning-action="confirm"
                    >
                      Mark confirmed
                    </button>
                  `
                  : ""
              }

              ${
                status === "confirmed"
                  ? `
                    <button
                      type="button"
                      data-cleaning-action="complete"
                    >
                      Mark completed
                    </button>
                  `
                  : ""
              }

            </div>
          `
          : ""
      }

    </article>
  `;
}


function renderCleaningDashboard() {
  const active =
    currentCleanings.filter(
      cleaning =>
        cleaning.status !==
        "cancelled"
    );

  if (!active.length) {
    cleaningList.innerHTML = `
      <div class="meta">
        No active cleaning assignments.
      </div>
    `;

    return;
  }

  cleaningList.innerHTML =
    active
      .map(cleaningCard)
      .join("");
}



function ratePeriodCard(period) {
  return `
    <article
      class="rate-card"
      data-rate-id="${period.id}"
    >
      <div class="rate-card-grid">

        <label>
          Property
          <select data-rate-property>
            ${
              currentProperties
                .map(
                  property => `
                    <option
                      value="${property.id}"
                      ${
                        property.id ===
                        period.property_id
                          ? "selected"
                          : ""
                      }
                    >
                      ${property.name}
                    </option>
                  `
                )
                .join("")
            }
          </select>
        </label>

        <label>
          Stay rule
          <select data-rate-stay-rule>
            <option
              value="weekly"
              ${
                period.stay_rule ===
                "weekly"
                  ? "selected"
                  : ""
              }
            >
              Weekly only
            </option>
            <option
              value="flexible"
              ${
                period.stay_rule ===
                "flexible"
                  ? "selected"
                  : ""
              }
            >
              Flexible / shorter stays
            </option>
          </select>
        </label>

        <label>
          Start date
          <input
            type="date"
            value="${period.start_date}"
            data-rate-start
          >
        </label>

        <label>
          End date
          <input
            type="date"
            value="${period.end_date}"
            data-rate-end
          >
        </label>

        <label>
          Weekly price
          <input
            type="number"
            min="0"
            step="0.01"
            value="${period.weekly_price ?? ""}"
            data-rate-weekly
          >
        </label>

        <label>
          Nightly price
          <input
            type="number"
            min="0"
            step="0.01"
            value="${period.nightly_price ?? ""}"
            data-rate-nightly
          >
        </label>

        <label>
          Minimum nights
          <input
            type="number"
            min="1"
            value="${period.minimum_nights || 1}"
            data-rate-minimum
          >
        </label>

        <label class="rate-blocked-row">
          <input
            type="checkbox"
            data-rate-blocked
            ${period.blocked ? "checked" : ""}
          >
          Block these dates
        </label>

        <label class="full">
          Notes
          <textarea
            rows="2"
            data-rate-notes
          >${period.notes || ""}</textarea>
        </label>

      </div>

      <div
        class="row"
        style="margin-top:12px;"
      >
        <button
          type="button"
          data-rate-action="save"
        >
          Save changes
        </button>

        <button
          type="button"
          class="danger"
          data-rate-action="delete"
        >
          Delete
        </button>
      </div>
    </article>
  `;
}



function propertySettingsCard(
  property
) {
  return `
    <article
      class="property-settings-card"
      data-property-settings-id="${property.id}"
    >
      <div class="property-settings-grid">

        <div>
          <strong>${property.name}</strong>
        </div>

        <label>
          Cleaning fee
          <input
            type="number"
            min="0"
            step="0.01"
            value="${property.cleaning_fee ?? ""}"
            data-property-cleaning-fee
          >
        </label>

        <label>
          Pet fee per dog
          <input
            type="number"
            min="0"
            step="0.01"
            value="${property.pet_fee ?? ""}"
            data-property-pet-fee
          >
        </label>

        <label>
          Maximum dogs
          <input
            type="number"
            min="0"
            step="1"
            value="${property.max_dogs ?? 0}"
            data-property-max-dogs
          >
        </label>

      </div>

      <div
        class="row"
        style="margin-top:12px;"
      >
        <button
          type="button"
          data-property-settings-action="save"
        >
          Save fees
        </button>
      </div>
    </article>
  `;
}


function renderPropertySettings() {
  if (!currentProperties.length) {
    propertySettingsList.innerHTML = `
      <div class="meta">
        No properties found.
      </div>
    `;
    return;
  }

  propertySettingsList.innerHTML =
    currentProperties
      .map(propertySettingsCard)
      .join("");
}


function renderRatePeriods() {
  if (!currentRatePeriods.length) {
    ratePeriodsList.innerHTML = `
      <div class="meta">
        No rate periods yet. Add your first one above.
      </div>
    `;
    return;
  }

  ratePeriodsList.innerHTML =
    currentRatePeriods
      .map(ratePeriodCard)
      .join("");
}


function reservationCard(r) {
  const status =
    r.status ||
    "pending";

  const paymentStatus =
    r.payment_status ||
    "waiting";


  const showAccept =
    status ===
      "pending" ||
    status ===
      "requested";


  const showDecline =
    status ===
      "pending" ||
    status ===
      "requested";


  const showCancel =
    status ===
      "pending_payment" ||
    status ===
      "booked";


  const showPaymentForm =
    paymentStatus !==
      "paid" &&

    status !==
      "declined" &&

    status !==
      "cancelled" &&

    status !==
      "waitlisted";


  const showPaymentSummary =
    paymentStatus ===
    "paid";


  return `
    <article
      class="card res"
      data-id="${r.id}"
    >

      <div>

        <h2>
          ${r.guest_name || "Guest"}
        </h2>

        <div class="meta">

          <strong>
            ${r.property_name}
          </strong>

          <br>

          ${formatDate(
            r.arrival_date
          )}

          –

          ${formatDate(
            r.departure_date
          )}

          <br>

          ${r.guest_email || ""}

          ${
            r.guest_phone
              ? ` · ${r.guest_phone}`
              : ""
          }

          <br>

          ${r.adults || 0}
          guest(s)

          ${
            r.dogs
              ? ` · ${r.dogs} dog(s)`
              : ""
          }

          ${
            r.booking_source
              ? `<br>Source: ${r.booking_source.replaceAll("_", " ")}`
              : ""
          }

          ${
            r.brokerage_name
              ? `<br>Brokerage: ${r.brokerage_name}`
              : ""
          }

          ${
            r.agent_name
              ? `<br>Agent: ${r.agent_name}`
              : ""
          }

          ${
            r.agent_phone
              ? ` · ${r.agent_phone}`
              : ""
          }

          ${
            r.agent_email
              ? `<br>${r.agent_email}`
              : ""
          }

          ${
            r.amount_due
              ? `<br>Amount due: ${formatMoney(r.amount_due)}`
              : ""
          }

          ${
            r.owner_notes
              ? `<br>Notes: ${r.owner_notes}`
              : ""
          }

        </div>


        <span class="badge">
          ${status.replaceAll("_", " ")}
        </span>

        <span class="badge">
          payment:
          ${paymentStatus.replaceAll("_", " ")}
        </span>


        ${
          r.hold_expires_at &&
          status ===
            "pending_payment"
            ? `
              <div class="meta hold">

                Hold expires:

                ${new Date(
                  r.hold_expires_at
                ).toLocaleString()}

              </div>
            `
            : ""
        }


        ${
          showPaymentSummary
            ? `
              <div class="money">

                <strong>
                  Payment received
                </strong>

                <div
                  class="meta"
                  style="margin-top:6px;"
                >

                  ${formatMoney(
                    r.amount_received
                  )}

                  ${
                    r.payment_method
                      ? ` · ${r.payment_method.replaceAll("_", " ")}`
                      : ""
                  }

                  ${
                    r.payment_received_at
                      ? `<br>${new Date(
                          r.payment_received_at
                        ).toLocaleString()}`
                      : ""
                  }

                </div>

              </div>
            `
            : ""
        }


        ${
          showPaymentForm
            ? `
              <div class="money">

                <strong>
                  Log payment
                </strong>

                <div
                  class="row payment-row"
                >

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    data-amount
                  >

                  <select
                    data-method
                  >
                    <option value="zelle">
                      Zelle
                    </option>

                    <option value="venmo">
                      Venmo
                    </option>

                    <option value="credit_card">
                      Credit card
                    </option>

                    <option value="check">
                      Check
                    </option>
                  </select>

                  <button
                    data-action="paid"
                  >
                    Mark paid
                  </button>

                </div>

              </div>
            `
            : ""
        }

      </div>


      <div class="actions">

        ${
          showAccept
            ? `
              <button
                class="primary"
                data-action="accept"
              >
                Accept · 24h hold
              </button>
            `
            : ""
        }


        ${
          showDecline
            ? `
              <button
                data-action="decline"
              >
                Decline
              </button>
            `
            : ""
        }


        ${
          showCancel
            ? `
              <button
                class="danger"
                data-action="cancel"
              >
                Cancel reservation
              </button>
            `
            : ""
        }

      </div>

    </article>
  `;
}



function activeReservation(
  reservation
) {
  return ![
    "cancelled",
    "declined"
  ].includes(
    reservation.status
  );
}


function pendingReservation(
  reservation
) {
  return [
    "pending",
    "requested"
  ].includes(
    reservation.status
  );
}


function reservationNights(
  reservation
) {
  if (
    !reservation.arrival_date ||
    !reservation.departure_date
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      (
        parseDate(
          reservation.departure_date
        ) -
        parseDate(
          reservation.arrival_date
        )
      ) /
      (
        24 *
        60 *
        60 *
        1000
      )
    )
  );
}


function renderDashboardStats() {
  const booked =
    currentReservations.filter(
      reservation =>
        activeReservation(
          reservation
        ) &&
        reservation.status ===
          "booked"
    );

  const nightsBooked =
    booked.reduce(
      (
        total,
        reservation
      ) =>
        total +
        reservationNights(
          reservation
        ),
      0
    );

  const pendingCount =
    currentReservations.filter(
      pendingReservation
    ).length;

  const cleaningCount =
    currentCleanings.filter(
      cleaning =>
        cleaning.status ===
          "waiting" ||
        cleaning.status ===
          "confirmed"
    ).length;

  const rentalIncome =
    currentReservations
      .filter(
        reservation =>
          reservation.payment_status ===
            "paid" &&
          activeReservation(
            reservation
          )
      )
      .reduce(
        (
          total,
          reservation
        ) =>
          total +
          Number(
            reservation.amount_received ||
            reservation.amount_due ||
            0
          ),
        0
      );

  dashboardStats.innerHTML = `
    <article class="stat-card">
      <div class="stat-icon">▣</div>
      <div>
        <div class="stat-number">
          ${nightsBooked}
        </div>
        <div class="stat-label">
          Nights booked
        </div>
        <div class="stat-sub">
          Active booked stays
        </div>
      </div>
    </article>

    <article class="stat-card">
      <div class="stat-icon">✓</div>
      <div>
        <div class="stat-number">
          ${pendingCount}
        </div>
        <div class="stat-label">
          Pending requests
        </div>
        <div class="stat-sub">
          Needs review
        </div>
      </div>
    </article>

    <article class="stat-card">
      <div class="stat-icon">♨</div>
      <div>
        <div class="stat-number">
          ${cleaningCount}
        </div>
        <div class="stat-label">
          Cleanings
        </div>
        <div class="stat-sub">
          Waiting or confirmed
        </div>
      </div>
    </article>

    <article class="stat-card">
      <div class="stat-icon">$</div>
      <div>
        <div class="stat-number">
          ${formatMoney(
            rentalIncome
          )}
        </div>
        <div class="stat-label">
          Rental income
        </div>
        <div class="stat-sub">
          Payments logged
        </div>
      </div>
    </article>
  `;

  if (pendingCount) {
    sidebarPendingCount.hidden =
      false;

    sidebarPendingCount.textContent =
      pendingCount;
  } else {
    sidebarPendingCount.hidden =
      true;

    sidebarPendingCount.textContent =
      "";
  }
}


function renderDashboardCalendar() {
  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();

  const monthTitle =
    calendarDate.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric"
      }
    );

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

  const properties =
    currentProperties.map(
      property => {
        let cells = "";

        for (
          let blank = 0;
          blank <
            firstDay.getDay();
          blank++
        ) {
          cells += `
            <div
              class="dashboard-mini-day blank"
            ></div>
          `;
        }

        for (
          let day = 1;
          day <= daysInMonth;
          day++
        ) {
          const dateString =
            isoDate(
              new Date(
                year,
                month,
                day
              )
            );

          const items =
            calendarItemsForDay(
              property.id,
              dateString
            );

          cells += `
            <div
              class="dashboard-mini-day"
            >
              <div
                class="dashboard-mini-date"
              >
                ${day}
              </div>

              ${
                items
                  .slice(0, 2)
                  .map(
                    item => `
                      <span
                        class="dashboard-mini-item ${item.status}"
                      >
                        ${item.reservation.guest_name || "Guest"}
                      </span>
                    `
                  )
                  .join("")
              }
            </div>
          `;
        }

        return `
          <div
            class="dashboard-calendar-property"
          >
            <h3>
              ${property.name}
            </h3>

            <div
              class="dashboard-mini-grid"
            >
              ${cells}
            </div>
          </div>
        `;
      }
    )
    .join("");

  dashboardCalendar.innerHTML = `
    <div
      class="dashboard-calendar-preview-title"
    >
      ${monthTitle}
    </div>

    <div
      class="dashboard-calendar-properties"
    >
      ${properties}
    </div>
  `;
}


function pendingMiniCard(
  reservation
) {
  return `
    <article
      class="pending-mini"
    >
      <div
        class="pending-mini-top"
      >
        <div>
          <h3>
            ${reservation.property_name}
          </h3>
          <div class="meta">
            ${reservation.guest_name || "Guest"}
          </div>
        </div>

        <div class="amount">
          ${
            reservation.amount_due
              ? formatMoney(
                  reservation.amount_due
                )
              : ""
          }
        </div>
      </div>

      <div class="meta">
        ${formatDate(reservation.arrival_date)}
        –
        ${formatDate(reservation.departure_date)}

        <br>

        ${reservation.adults || 0}
        guest(s)

        ${
          reservation.dogs
            ? ` · ${reservation.dogs} dog(s)`
            : ""
        }
      </div>

      <div
        class="pending-mini-actions"
      >
        <button
          type="button"
          class="review"
          data-dashboard-review="${reservation.id}"
        >
          Review
        </button>
      </div>
    </article>
  `;
}


function renderDashboardPending() {
  const pending =
    currentReservations
      .filter(
        pendingReservation
      )
      .slice(0, 3);

  dashboardPendingList.innerHTML =
    pending.length
      ? pending
          .map(
            pendingMiniCard
          )
          .join("")
      : `
        <div class="empty-state">
          No pending requests right now.
        </div>
      `;

  const allPending =
    currentReservations.filter(
      pendingReservation
    );

  pendingReservationList.innerHTML =
    allPending.length
      ? allPending
          .map(
            reservationCard
          )
          .join("")
      : `
        <div class="empty-state">
          No pending reservation requests.
        </div>
      `;
}


function upcomingEvents() {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const events = [];

  currentReservations
    .filter(
      reservation =>
        activeReservation(
          reservation
        ) &&
        [
          "booked",
          "pending_payment"
        ].includes(
          reservation.status
        )
    )
    .forEach(
      reservation => {
        if (
          reservation.arrival_date
        ) {
          const date =
            parseDate(
              reservation.arrival_date
            );

          if (date >= today) {
            events.push({
              type:
                "checkin",
              date:
                reservation.arrival_date,
              property:
                reservation.property_name,
              guest:
                reservation.guest_name ||
                "Guest",
              time:
                "2:00 PM"
            });
          }
        }

        if (
          reservation.departure_date
        ) {
          const date =
            parseDate(
              reservation.departure_date
            );

          if (date >= today) {
            events.push({
              type:
                "checkout",
              date:
                reservation.departure_date,
              property:
                reservation.property_name,
              guest:
                reservation.guest_name ||
                "Guest",
              time:
                "10:00 AM"
            });
          }
        }
      }
    );

  return events
    .sort(
      (a, b) => {
        const dateDiff =
          parseDate(a.date) -
          parseDate(b.date);

        if (dateDiff !== 0) {
          return dateDiff;
        }

        if (
          a.type === b.type
        ) {
          return 0;
        }

        // On turnover day, checkout happens before check-in.
        return (
          a.type === "checkout"
            ? -1
            : 1
        );
      }
    )
    .slice(0, 4);
}


function renderDashboardUpcoming() {
  const events =
    upcomingEvents();

  dashboardUpcoming.innerHTML =
    events.length
      ? events
          .map(
            event => {
              const date =
                parseDate(
                  event.date
                );

              const month =
                date.toLocaleDateString(
                  "en-US",
                  {
                    month:
                      "short"
                  }
                );

              const day =
                date.getDate();

              return `
                <article
                  class="upcoming-event"
                >
                  <span
                    class="event-type ${event.type}"
                  >
                    ${
                      event.type ===
                        "checkin"
                        ? "CHECK-IN"
                        : "CHECK-OUT"
                    }
                  </span>

                  <div
                    class="event-date"
                  >
                    ${month} ${day}
                  </div>

                  <div
                    class="event-property"
                  >
                    ${event.property}
                  </div>

                  <div
                    class="event-meta"
                  >
                    ${event.guest}
                    <br>
                    ${event.time}
                  </div>
                </article>
              `;
            }
          )
          .join("")
      : `
        <div class="empty-state">
          No upcoming check-ins or check-outs.
        </div>
      `;
}


function renderDashboard() {
  renderDashboardStats();
  renderDashboardCalendar();
  renderDashboardPending();
  renderDashboardUpcoming();
}


function showOwnerView(
  view
) {
  const titles = {
    dashboard: [
      "Welcome back, Janis!",
      "Here’s what’s happening at your shore homes."
    ],
    calendar: [
      "Calendar",
      "See reservations across both properties."
    ],
    pending: [
      "Pending requests",
      "Review new booking requests and start payment holds."
    ],
    reservations: [
      "Reservations",
      "View every reservation in one place."
    ],
    "add-reservation": [
      "Add reservation",
      "Enter an existing or manual booking."
    ],
    pricing: [
      "Pricing & fees",
      "Control rates, stay rules, cleaning fees, and pet fees."
    ],
    cleaning: [
      "Cleaning dashboard",
      "Manage upcoming turnovers and cleaner confirmations."
    ]
  };

  document
    .querySelectorAll(
      "[data-owner-panel]"
    )
    .forEach(
      panel => {
        panel.classList.toggle(
          "active",
          panel.dataset.ownerPanel ===
            view
        );
      }
    );

  document
    .querySelectorAll(
      ".owner-nav-link[data-owner-view]"
    )
    .forEach(
      button => {
        button.classList.toggle(
          "active",
          button.dataset.ownerView ===
            view
        );
      }
    );

  const [
    title,
    subtitle
  ] =
    titles[view] ||
    titles.dashboard;

  ownerPageTitle.textContent =
    title;

  ownerPageSubtitle.textContent =
    subtitle;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function refresh() {
  try {
    portalMessage.className = "";
    portalMessage.textContent = "";

    await loadReservations();
    await loadCleanings();
    await loadRatePeriods();

    reservationList.innerHTML =
      currentReservations.length
        ? currentReservations
            .map(
              reservationCard
            )
            .join("")
        : `
          <div class="card">
            No reservation requests yet.
          </div>
        `;

    renderOwnerCalendar();
    renderCleaningDashboard();
    renderPropertySettings();
    renderRatePeriods();
    renderDashboard();

  } catch (err) {
    message(
      portalMessage,
      err.message,
      true
    );
  }
}


function toggleBrokerageFields() {
  if (
    bookingSource.value ===
    "brokerage"
  ) {
    brokerageFields
      .classList
      .add("show");
  } else {
    brokerageFields
      .classList
      .remove("show");
  }
}


function showPortal() {
  loginView.hidden =
    true;

  portalView.hidden =
    false;

  loadProperties()
    .then(
      async () => {
        await refresh();
        showOwnerView(
          "dashboard"
        );
      }
    );
}


function signOut() {
  token = "";

  sessionStorage.removeItem(
    "dts_token"
  );

  portalView.hidden =
    true;

  loginView.hidden =
    false;
}


loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const form =
      new FormData(
        loginForm
      );

    try {
      await login(
        form.get("email"),
        form.get("password")
      );

      showPortal();

    } catch (err) {
      message(
        loginMessage,
        err.message,
        true
      );
    }
  }
);


logoutButton.addEventListener(
  "click",
  signOut
);


bookingSource.addEventListener(
  "change",
  toggleBrokerageFields
);


calendarPrev.addEventListener(
  "click",
  () => {
    calendarDate =
      new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth() - 1,
        1
      );

    renderOwnerCalendar();
  }
);


calendarNext.addEventListener(
  "click",
  () => {
    calendarDate =
      new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth() + 1,
        1
      );

    renderOwnerCalendar();
  }
);


calendarToday.addEventListener(
  "click",
  () => {
    const today =
      new Date();

    calendarDate =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    renderOwnerCalendar();
  }
);


manualReservationForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    manualReservationMessage.className =
      "";

    manualReservationMessage.textContent =
      "";

    const form =
      new FormData(
        manualReservationForm
      );


    const source =
      form.get(
        "booking_source"
      );


    const amountDue =
      form.get(
        "amount_due"
      );


    const paymentStatus =
      form.get(
        "payment_status"
      );


    const reservation = {

      property_id:
        form.get(
          "property_id"
        ),

      booking_source:
        source,

      guest_name:
        form.get(
          "guest_name"
        ),

      guest_email:
        form.get(
          "guest_email"
        ) || null,

      guest_phone:
        form.get(
          "guest_phone"
        ) || null,

      adults:
        Number(
          form.get(
            "adults"
          ) || 1
        ),

      arrival_date:
        form.get(
          "arrival_date"
        ),

      departure_date:
        form.get(
          "departure_date"
        ),

      amount_due:
        amountDue
          ? Number(
              amountDue
            )
          : null,

      payment_status:
        paymentStatus,

      status:
        "booked",

      brokerage_name:
        source ===
          "brokerage"
          ? form.get(
              "brokerage_name"
            ) || null
          : null,

      agent_name:
        source ===
          "brokerage"
          ? form.get(
              "agent_name"
            ) || null
          : null,

      agent_phone:
        source ===
          "brokerage"
          ? form.get(
              "agent_phone"
            ) || null
          : null,

      agent_email:
        source ===
          "brokerage"
          ? form.get(
              "agent_email"
            ) || null
          : null,

      owner_notes:
        form.get(
          "owner_notes"
        ) || null
    };


    try {

      await createReservation(
        reservation
      );


      message(
        manualReservationMessage,
        "Reservation saved."
      );


      manualReservationForm
        .reset();


      toggleBrokerageFields();


      await refresh();


    } catch (err) {

      message(
        manualReservationMessage,
        err.message,
        true
      );

    }
  }
);


reservationList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "button[data-action]"
      );


    if (!button) {
      return;
    }


    const card =
      button.closest(
        "[data-id]"
      );


    const id =
      card.dataset.id;


    const action =
      button.dataset.action;


    try {

      button.disabled =
        true;


      if (
        action ===
        "accept"
      ) {

        await updateReservation(
          id,
          {
            status:
              "pending_payment",

            hold_expires_at:
              new Date(
                Date.now() +
                24 *
                60 *
                60 *
                1000
              ).toISOString()
          }
        );


        message(
          portalMessage,
          "Accepted. The 24-hour payment hold has started."
        );

      }


      if (
        action ===
        "decline"
      ) {

        await updateReservation(
          id,
          {
            status:
              "declined",

            hold_expires_at:
              null
          }
        );


        message(
          portalMessage,
          "Reservation request declined."
        );

      }


      if (
        action ===
        "cancel"
      ) {

        const confirmed =
          window.confirm(
            "Cancel this reservation and reopen the dates?"
          );


        if (!confirmed) {
          button.disabled =
            false;

          return;
        }


        await updateReservation(
          id,
          {
            status:
              "cancelled",

            hold_expires_at:
              null
          }
        );


        message(
          portalMessage,
          "Reservation cancelled. The dates are available again."
        );

      }


      if (
        action ===
        "paid"
      ) {

        const amount =
          card
            .querySelector(
              "[data-amount]"
            )
            .value;


        const method =
          card
            .querySelector(
              "[data-method]"
            )
            .value;


        if (
          !amount ||
          Number(amount) <= 0
        ) {

          throw new Error(
            "Enter the payment amount first."
          );

        }


        await addPayment(
          id,
          amount,
          method
        );


        message(
          portalMessage,
          `Payment logged as ${method.replaceAll("_", " ")}.`
        );

      }


      await refresh();


    } catch (err) {

      message(
        portalMessage,
        err.message,
        true
      );


    } finally {

      button.disabled =
        false;

    }
  }
);


pendingReservationList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "button[data-action]"
      );


    if (!button) {
      return;
    }


    const card =
      button.closest(
        "[data-id]"
      );


    const id =
      card.dataset.id;


    const action =
      button.dataset.action;


    try {

      button.disabled =
        true;


      if (
        action ===
        "accept"
      ) {

        await updateReservation(
          id,
          {
            status:
              "pending_payment",

            hold_expires_at:
              new Date(
                Date.now() +
                24 *
                60 *
                60 *
                1000
              ).toISOString()
          }
        );


        message(
          portalMessage,
          "Accepted. The 24-hour payment hold has started."
        );

      }


      if (
        action ===
        "decline"
      ) {

        await updateReservation(
          id,
          {
            status:
              "declined",

            hold_expires_at:
              null
          }
        );


        message(
          portalMessage,
          "Reservation request declined."
        );

      }


      if (
        action ===
        "cancel"
      ) {

        const confirmed =
          window.confirm(
            "Cancel this reservation and reopen the dates?"
          );


        if (!confirmed) {
          button.disabled =
            false;

          return;
        }


        await updateReservation(
          id,
          {
            status:
              "cancelled",

            hold_expires_at:
              null
          }
        );


        message(
          portalMessage,
          "Reservation cancelled. The dates are available again."
        );

      }


      if (
        action ===
        "paid"
      ) {

        const amount =
          card
            .querySelector(
              "[data-amount]"
            )
            .value;


        const method =
          card
            .querySelector(
              "[data-method]"
            )
            .value;


        if (
          !amount ||
          Number(amount) <= 0
        ) {

          throw new Error(
            "Enter the payment amount first."
          );

        }


        await addPayment(
          id,
          amount,
          method
        );


        message(
          portalMessage,
          `Payment logged as ${method.replaceAll("_", " ")}.`
        );

      }


      await refresh();


    } catch (err) {

      message(
        portalMessage,
        err.message,
        true
      );


    } finally {

      button.disabled =
        false;

    }
  }
);


cleaningList.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "button[data-cleaning-action]"
      );


    if (!button) {
      return;
    }


    const card =
      button.closest(
        "[data-cleaning-id]"
      );


    const id =
      card.dataset.cleaningId;


    const action =
      button.dataset.cleaningAction;


    try {

      button.disabled =
        true;


      if (
        action ===
        "save-cleaner"
      ) {

        const cleanerName =
          card
            .querySelector(
              "[data-cleaner-name]"
            )
            .value
            .trim();


        const cleanerEmail =
          card
            .querySelector(
              "[data-cleaner-email]"
            )
            .value
            .trim();


        await updateCleaning(
          id,
          {
            cleaner_name:
              cleanerName ||
              null,

            cleaner_email:
              cleanerEmail ||
              null
          }
        );


        message(
          cleaningMessage,
          "Cleaner information saved."
        );

      }


      if (
        action ===
        "confirm"
      ) {

        await updateCleaning(
          id,
          {
            status:
              "confirmed",

            confirmed_at:
              new Date()
                .toISOString()
          }
        );


        message(
          cleaningMessage,
          "Cleaning confirmed."
        );

      }


      if (
        action ===
        "complete"
      ) {

        await updateCleaning(
          id,
          {
            status:
              "completed",

            completed_at:
              new Date()
                .toISOString()
          }
        );


        message(
          cleaningMessage,
          "Cleaning marked completed."
        );

      }


      await refresh();


    } catch (err) {

      message(
        cleaningMessage,
        err.message,
        true
      );


    } finally {

      button.disabled =
        false;

    }
  }
);




propertySettingsList.addEventListener(
  "click",
  async event => {
    const button =
      event.target.closest(
        "button[data-property-settings-action]"
      );

    if (!button) {
      return;
    }

    const card =
      button.closest(
        "[data-property-settings-id]"
      );

    const id =
      card.dataset.propertySettingsId;

    const cleaningFee =
      card.querySelector(
        "[data-property-cleaning-fee]"
      ).value;

    const petFee =
      card.querySelector(
        "[data-property-pet-fee]"
      ).value;

    const maxDogs =
      card.querySelector(
        "[data-property-max-dogs]"
      ).value;

    try {
      button.disabled = true;

      if (
        cleaningFee === "" ||
        Number(cleaningFee) < 0
      ) {
        throw new Error(
          "Enter a valid cleaning fee."
        );
      }

      if (
        petFee === "" ||
        Number(petFee) < 0
      ) {
        throw new Error(
          "Enter a valid pet fee."
        );
      }

      if (
        maxDogs === "" ||
        Number(maxDogs) < 0
      ) {
        throw new Error(
          "Enter a valid maximum number of dogs."
        );
      }

      await updateProperty(
        id,
        {
          cleaning_fee:
            Number(cleaningFee),
          pet_fee:
            Number(petFee),
          max_dogs:
            Number(maxDogs)
        }
      );

      message(
        propertySettingsMessage,
        "Property fees saved."
      );

      await loadProperties();
      renderPropertySettings();

    } catch (err) {
      message(
        propertySettingsMessage,
        err.message,
        true
      );
    } finally {
      button.disabled = false;
    }
  }
);


rateStayRule.addEventListener(
  "change",
  () => {
    const minimum =
      ratePeriodForm.elements.minimum_nights;

    if (
      rateStayRule.value ===
      "weekly"
    ) {
      minimum.value = "7";
    } else if (
      Number(minimum.value) === 7
    ) {
      minimum.value = "2";
    }
  }
);


ratePeriodForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    ratePeriodMessage.className = "";
    ratePeriodMessage.textContent = "";

    const form =
      new FormData(
        ratePeriodForm
      );

    const startDate =
      form.get("start_date");

    const endDate =
      form.get("end_date");

    const stayRule =
      form.get("stay_rule");

    try {
      validateRateDates(
        stayRule,
        startDate,
        endDate
      );
    } catch (err) {
      message(
        ratePeriodMessage,
        err.message,
        true
      );
      return;
    }

    const weekly =
      form.get("weekly_price");

    const nightly =
      form.get("nightly_price");

    const blocked =
      form.get("blocked") === "on";

    if (
      !blocked &&
      !weekly &&
      !nightly
    ) {
      message(
        ratePeriodMessage,
        "Enter a weekly or nightly price, or block the dates.",
        true
      );
      return;
    }

    try {
      await createRatePeriod({
        property_id:
          form.get("property_id"),
        start_date:
          startDate,
        end_date:
          endDate,
        weekly_price:
          weekly
            ? Number(weekly)
            : null,
        nightly_price:
          nightly
            ? Number(nightly)
            : null,
        stay_rule:
          stayRule,
        minimum_nights:
          Number(
            form.get("minimum_nights") ||
            1
          ),
        blocked,
        notes:
          form.get("notes") ||
          null
      });

      message(
        ratePeriodMessage,
        "Rate period saved."
      );

      ratePeriodForm.reset();
      ratePeriodForm.elements.minimum_nights.value =
        "7";

      await loadRatePeriods();
      renderRatePeriods();

    } catch (err) {
      message(
        ratePeriodMessage,
        err.message,
        true
      );
    }
  }
);


ratePeriodsList.addEventListener(
  "click",
  async event => {
    const button =
      event.target.closest(
        "button[data-rate-action]"
      );

    if (!button) {
      return;
    }

    const card =
      button.closest(
        "[data-rate-id]"
      );

    const id =
      card.dataset.rateId;

    const action =
      button.dataset.rateAction;

    try {
      button.disabled = true;

      if (action === "delete") {
        const confirmed =
          window.confirm(
            "Delete this rate period?"
          );

        if (!confirmed) {
          button.disabled = false;
          return;
        }

        await deleteRatePeriod(id);

        message(
          ratePeriodMessage,
          "Rate period deleted."
        );
      }

      if (action === "save") {
        const startDate =
          card.querySelector(
            "[data-rate-start]"
          ).value;

        const endDate =
          card.querySelector(
            "[data-rate-end]"
          ).value;

        const stayRule =
          card.querySelector(
            "[data-rate-stay-rule]"
          ).value;

        validateRateDates(
          stayRule,
          startDate,
          endDate
        );

        const weekly =
          card.querySelector(
            "[data-rate-weekly]"
          ).value;

        const nightly =
          card.querySelector(
            "[data-rate-nightly]"
          ).value;

        const blocked =
          card.querySelector(
            "[data-rate-blocked]"
          ).checked;

        if (
          !blocked &&
          !weekly &&
          !nightly
        ) {
          throw new Error(
            "Enter a weekly or nightly price, or block the dates."
          );
        }

        await updateRatePeriod(
          id,
          {
            property_id:
              card.querySelector(
                "[data-rate-property]"
              ).value,
            start_date:
              startDate,
            end_date:
              endDate,
            weekly_price:
              weekly
                ? Number(weekly)
                : null,
            nightly_price:
              nightly
                ? Number(nightly)
                : null,
            stay_rule:
              stayRule,
            minimum_nights:
              Number(
                card.querySelector(
                  "[data-rate-minimum]"
                ).value ||
                1
              ),
            blocked,
            notes:
              card.querySelector(
                "[data-rate-notes]"
              ).value ||
              null
          }
        );

        message(
          ratePeriodMessage,
          "Rate period updated."
        );
      }

      await loadRatePeriods();
      renderRatePeriods();

    } catch (err) {
      message(
        ratePeriodMessage,
        err.message,
        true
      );
    } finally {
      button.disabled = false;
    }
  }
);


document.addEventListener(
  "click",
  event => {
    const viewButton =
      event.target.closest(
        "[data-owner-view]"
      );

    if (viewButton) {
      showOwnerView(
        viewButton.dataset.ownerView
      );
      return;
    }

    const reviewButton =
      event.target.closest(
        "[data-dashboard-review]"
      );

    if (reviewButton) {
      showOwnerView(
        "pending"
      );

      const id =
        reviewButton.dataset.dashboardReview;

      window.setTimeout(
        () => {
          const card =
            pendingReservationList
              .querySelector(
                `[data-id="${id}"]`
              );

          if (card) {
            card.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });
          }
        },
        100
      );
    }
  }
);



toggleBrokerageFields();


if (token) {
  showPortal();
}
