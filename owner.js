const cfg = window.SITE_DATA.supabase;
let token = sessionStorage.getItem("dts_token") || "";

const loginView = document.getElementById("loginView");
const portalView = document.getElementById("portalView");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const portalMessage = document.getElementById("portalMessage");
const reservationList = document.getElementById("reservationList");
const logoutButton = document.getElementById("logoutButton");

const headers = (extra = {}) => ({
  apikey: cfg.publishableKey,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  ...extra
});

function message(el, text, isError = false) {
  el.className = isError ? "notice error" : "notice";
  el.textContent = text;
}

async function login(email, password) {
  const res = await fetch(
    `${cfg.url}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: cfg.publishableKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    }
  );

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.msg || "Could not sign in.");
  }

  token = body.access_token;
  sessionStorage.setItem("dts_token", token);
}

async function fetchTable(table, query = "") {
  const res = await fetch(
    `${cfg.url}/rest/v1/${table}${query}`,
    { headers: headers() }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

async function loadReservations() {
  const [reservations, properties] = await Promise.all([
    fetchTable("reservations", "?select=*&order=created_at.desc"),
    fetchTable("properties", "?select=id,name")
  ]);

  const propertyMap = Object.fromEntries(
    properties.map(p => [p.id, p.name])
  );

  return reservations.map(r => ({
    ...r,
    property_name: propertyMap[r.property_id] || "Property"
  }));
}

async function updateReservation(id, changes) {
  const res = await fetch(
    `${cfg.url}/rest/v1/reservations?id=eq.${id}`,
    {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(changes)
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

async function addPayment(id, amount, method) {
  const now = new Date().toISOString();

  const res = await fetch(
    `${cfg.url}/rest/v1/payments`,
    {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        reservation_id: id,
        amount: Number(amount),
        payment_method: method,
        received_at: now
      })
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  await updateReservation(id, {
    payment_status: "paid",
    payment_method: method,
    amount_received: Number(amount),
    payment_received_at: now,
    hold_expires_at: null,
    status: "booked"
  });
}

function formatDate(value) {
  if (!value) return "";

  return new Date(`${value}T12:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return Number(value).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD"
    }
  );
}

function reservationCard(r) {
  const status = r.status || "pending";
  const paymentStatus = r.payment_status || "waiting";

  const showAccept =
    status === "pending" ||
    status === "requested";

  const showDecline =
    status === "pending" ||
    status === "requested";

  const showCancel =
    status === "pending_payment" ||
    status === "booked";

  const showPaymentForm =
    paymentStatus !== "paid" &&
    status !== "declined" &&
    status !== "cancelled";

  const showPaymentSummary =
    paymentStatus === "paid";

  return `
    <article class="card res" data-id="${r.id}">
      <div>
        <h2>${r.guest_name || "Guest"}</h2>

        <div class="meta">
          <strong>${r.property_name}</strong><br>
          ${formatDate(r.arrival_date)} – ${formatDate(r.departure_date)}<br>
          ${r.guest_email || ""}
          ${r.guest_phone ? ` · ${r.guest_phone}` : ""}<br>
          ${r.adults || 0} guest(s)
          ${r.dogs ? ` · ${r.dogs} dog(s)` : ""}
        </div>

        <span class="badge">
          ${status.replaceAll("_", " ")}
        </span>

        <span class="badge">
          payment: ${paymentStatus.replaceAll("_", " ")}
        </span>

        ${
          r.hold_expires_at
            ? `<div class="meta hold">
                Hold expires:
                ${new Date(r.hold_expires_at).toLocaleString()}
               </div>`
            : ""
        }

        ${
          showPaymentSummary
            ? `
              <div class="money">
                <strong>Payment received</strong>
                <div class="meta" style="margin-top:6px;">
                  ${formatMoney(r.amount_received)}
                  ${r.payment_method
                    ? ` · ${r.payment_method.replaceAll("_", " ")}`
                    : ""}
                  ${r.payment_received_at
                    ? `<br>${new Date(r.payment_received_at).toLocaleString()}`
                    : ""}
                </div>
              </div>
            `
            : ""
        }

        ${
          showPaymentForm
            ? `
              <div class="money">
                <strong>Log payment</strong>

                <div class="row payment-row">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    data-amount
                  >

                  <select data-method>
                    <option value="zelle">Zelle</option>
                    <option value="venmo">Venmo</option>
                    <option value="credit_card">Credit card</option>
                    <option value="check">Check</option>
                  </select>

                  <button data-action="paid">
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
            ? `<button class="primary" data-action="accept">
                Accept · 24h hold
               </button>`
            : ""
        }

        ${
          showDecline
            ? `<button data-action="decline">
                Decline
               </button>`
            : ""
        }

        ${
          showCancel
            ? `<button class="danger" data-action="cancel">
                Cancel reservation
               </button>`
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

    const rows = await loadReservations();

    reservationList.innerHTML = rows.length
      ? rows.map(reservationCard).join("")
      : `<div class="card">No reservation requests yet.</div>`;
  } catch (err) {
    message(portalMessage, err.message, true);
  }
}

function showPortal() {
  loginView.hidden = true;
  portalView.hidden = false;
  refresh();
}

function signOut() {
  token = "";
  sessionStorage.removeItem("dts_token");
  portalView.hidden = true;
  loginView.hidden = false;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const form = new FormData(loginForm);

  try {
    await login(
      form.get("email"),
      form.get("password")
    );

    showPortal();
  } catch (err) {
    message(loginMessage, err.message, true);
  }
});

logoutButton.addEventListener("click", signOut);

reservationList.addEventListener("click", async event => {
  const button = event.target.closest(
    "button[data-action]"
  );

  if (!button) return;

  const card = button.closest("[data-id]");
  const id = card.dataset.id;
  const action = button.dataset.action;

  try {
    button.disabled = true;

    if (action === "accept") {
      await updateReservation(id, {
        status: "pending_payment",
        hold_expires_at:
          new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString()
      });

      message(
        portalMessage,
        "Accepted. The 24-hour payment hold has started."
      );
    }

    if (action === "decline") {
      await updateReservation(id, {
        status: "declined",
        hold_expires_at: null
      });

      message(
        portalMessage,
        "Reservation request declined."
      );
    }

    if (action === "cancel") {
      const confirmed = window.confirm(
        "Cancel this reservation and reopen the dates?"
      );

      if (!confirmed) {
        button.disabled = false;
        return;
      }

      await updateReservation(id, {
        status: "cancelled",
        hold_expires_at: null
      });

      message(
        portalMessage,
        "Reservation cancelled. The dates can be made available again."
      );
    }

    if (action === "paid") {
      const amount =
        card.querySelector("[data-amount]").value;

      const method =
        card.querySelector("[data-method]").value;

      if (!amount || Number(amount) <= 0) {
        throw new Error(
          "Enter the payment amount first."
        );
      }

      await addPayment(id, amount, method);

      message(
        portalMessage,
        `Payment logged as ${method.replaceAll("_", " ")}.`
      );
    }

    await refresh();
  } catch (err) {
    message(portalMessage, err.message, true);
  } finally {
    button.disabled = false;
  }
});

if (token) {
  showPortal();
}
