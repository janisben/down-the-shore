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
      "?select=id,name&order=name"
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
        "?select=id,name"
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
    renderRatePeriods();

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
      () => refresh()
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

    if (
      !startDate ||
      !endDate ||
      parseDate(endDate) <=
        parseDate(startDate)
    ) {
      message(
        ratePeriodMessage,
        "End date must be after start date.",
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
          form.get("stay_rule"),
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
              card.querySelector(
                "[data-rate-stay-rule]"
              ).value,
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

toggleBrokerageFields();


if (token) {
  showPortal();
}
