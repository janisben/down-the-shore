const cfg = window.SITE_DATA.supabase;


const ownerPortalFixStyle =
  document.createElement("style");

ownerPortalFixStyle.textContent = `
  .payment-summary-grid {
    display:block !important;
  }

  .payment-summary-item {
    display:flex !important;
    align-items:center !important;
    justify-content:space-between !important;
    gap:18px !important;
    min-width:0 !important;
    overflow:visible !important;
    padding:10px 0 !important;
    border:0 !important;
    border-bottom:1px solid var(--line) !important;
    background:transparent !important;
  }

  .payment-summary-item:last-child {
    border-bottom:0 !important;
  }

  .payment-summary-label {
    min-width:0 !important;
    font-size:15px !important;
    line-height:1.25 !important;
  }

  .payment-summary-value {
    flex:0 0 auto !important;
    min-width:0 !important;
    font-size:20px !important;
    line-height:1.15 !important;
    white-space:nowrap !important;
    overflow:visible !important;
  }

  .payment-history-row {
    display:grid !important;
    grid-template-columns:
      max-content
      minmax(70px,1fr)
      minmax(120px,auto) !important;
    align-items:center !important;
    gap:12px !important;
  }

  .payment-schedule-summary {
    display:block !important;
  }

  .payment-schedule-summary .payment-summary-item {
    width:100% !important;
    box-sizing:border-box !important;
  }

  .payment-log-row {
    grid-template-columns:
      minmax(0,1fr)
      minmax(0,1fr)
      auto !important;
  }

  .payment-log-row input,
  .payment-log-row select {
    width:100% !important;
    min-width:0 !important;
    box-sizing:border-box !important;
  }

  .card.res,
  .card.res * {
    min-width:0;
  }

  .card.res .actions {
    position:relative;
    z-index:2;
  }

  .card.res button[data-action="create_lease"] {
    pointer-events:auto !important;
    cursor:pointer !important;
  }

  @media (max-width:700px) {
    .payment-history-row {
      grid-template-columns:1fr !important;
      gap:4px !important;
    }

    .payment-log-row {
      grid-template-columns:1fr !important;
    }
  }
`;

document.head.appendChild(
  ownerPortalFixStyle
);



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
let currentPayments = [];
let currentPaymentSchedule = [];
let currentPropertyPhotos = [];
let currentLeases = [];




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


const manualAmountDueInput =
  manualReservationForm
    ?.querySelector(
      '[name="amount_due"]'
    );

if (manualAmountDueInput) {
  manualAmountDueInput.type =
    "text";

  manualAmountDueInput.inputMode =
    "decimal";

  manualAmountDueInput.removeAttribute(
    "min"
  );

  manualAmountDueInput.removeAttribute(
    "step"
  );

  manualAmountDueInput.setAttribute(
    "autocomplete",
    "off"
  );
}


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


const photoProperty =
  document.getElementById("photoProperty");

const photoFiles =
  document.getElementById("photoFiles");

const uploadPhotosButton =
  document.getElementById("uploadPhotosButton");

const photoManagerMessage =
  document.getElementById("photoManagerMessage");

const photoGrid =
  document.getElementById("photoGrid");




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
      "?select=id,name,cleaning_fee,pet_fee,max_dogs,lease_defaults&order=name"
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


  if (photoProperty) {
    const existing =
      photoProperty.value;

    photoProperty.innerHTML =
      propertyOptions;

    if (existing) {
      photoProperty.value =
        existing;
    }
  }


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
        "?select=id,name,cleaning_fee,pet_fee,max_dogs,lease_defaults"
      )
    ]);


  currentProperties =
    properties;


  // Keep every property selector in sync with the latest property list.
  // This is especially important for the Photos view because refresh()
  // reloads properties as part of the reservation query.
  const refreshedPropertyOptions =
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

  if (photoProperty) {
    const selectedPhotoProperty =
      photoProperty.value;

    photoProperty.innerHTML =
      refreshedPropertyOptions;

    if (selectedPhotoProperty) {
      photoProperty.value =
        selectedPhotoProperty;
    }
  }


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






async function loadPropertyPhotos() {
  currentPropertyPhotos =
    await fetchTable(
      "property_photos",
      "?select=*&order=sort_order.asc,created_at.asc"
    );

  return currentPropertyPhotos;
}


function photosForProperty(propertyId) {
  return currentPropertyPhotos
    .filter(
      photo =>
        photo.property_id ===
          propertyId
    )
    .slice()
    .sort(
      (a, b) =>
        Number(a.sort_order || 0) -
          Number(b.sort_order || 0) ||
        new Date(a.created_at) -
          new Date(b.created_at)
    );
}


function selectedPhotoPropertyId() {
  return photoProperty
    ? photoProperty.value
    : "";
}


function renderPhotoManager() {
  if (!photoGrid || !photoProperty) {
    return;
  }

  const propertyId =
    selectedPhotoPropertyId();

  if (!propertyId) {
    photoGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        Choose a property to manage its photos.
      </div>
    `;
    return;
  }

  const photos =
    photosForProperty(propertyId);

  if (!photos.length) {
    photoGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        No uploaded photos yet. The website will continue using its current fallback photo until you upload one here.
      </div>
    `;
    return;
  }

  photoGrid.innerHTML =
    photos
      .map(
        (photo, index) => `
          <article
            class="photo-card"
            data-photo-id="${photo.id}"
          >
            <img
              class="photo-card-image"
              src="${photo.public_url}"
              alt="Property photo"
            >

            <div class="photo-card-body">
              ${
                photo.is_primary
                  ? `<span class="photo-card-primary">MAIN PHOTO</span>`
                  : ""
              }

              <div class="meta">
                Photo ${index + 1} of ${photos.length}
              </div>

              <div class="photo-card-actions">
                ${
                  !photo.is_primary
                    ? `<button type="button" class="primary" data-photo-action="primary">Make main</button>`
                    : ""
                }

                <button
                  type="button"
                  data-photo-action="up"
                  ${index === 0 ? "disabled" : ""}
                >
                  ↑ Earlier
                </button>

                <button
                  type="button"
                  data-photo-action="down"
                  ${index === photos.length - 1 ? "disabled" : ""}
                >
                  ↓ Later
                </button>

                <button
                  type="button"
                  class="danger"
                  data-photo-action="delete"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        `
      )
      .join("");
}


async function patchPhoto(id, changes) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/property_photos?id=eq.${id}`,
      {
        method: "PATCH",
        headers:
          headers({
            Prefer: "return=minimal"
          }),
        body: JSON.stringify({
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


async function insertPhoto(data) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/property_photos`,
      {
        method: "POST",
        headers:
          headers({
            Prefer: "return=minimal"
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


async function removePhotoRow(id) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/property_photos?id=eq.${id}`,
      {
        method: "DELETE",
        headers:
          headers({
            Prefer: "return=minimal"
          })
      }
    );

  if (!res.ok) {
    throw new Error(
      await res.text()
    );
  }
}


function safePhotoFilename(name) {
  const ext =
    (name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") ||
    "jpg";

  const base =
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    "photo";

  return `${base}.${ext}`;
}


async function uploadPhotoFile(
  propertyId,
  file,
  sortOrder,
  isPrimary
) {
  const filename =
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safePhotoFilename(file.name)}`;

  const storagePath =
    `${propertyId}/${filename}`;

  const upload =
    await fetch(
      `${cfg.url}/storage/v1/object/property-photos/${storagePath}`,
      {
        method: "POST",
        headers: {
          apikey: cfg.publishableKey,
          Authorization: `Bearer ${token}`,
          "Content-Type":
            file.type ||
            "application/octet-stream",
          "x-upsert": "false"
        },
        body: file
      }
    );

  if (!upload.ok) {
    throw new Error(
      `Photo upload failed: ${await upload.text()}`
    );
  }

  const publicUrl =
    `${cfg.url}/storage/v1/object/public/property-photos/${storagePath}`;

  await insertPhoto({
    property_id: propertyId,
    storage_path: storagePath,
    public_url: publicUrl,
    sort_order: sortOrder,
    is_primary: isPrimary
  });
}


async function deleteStoredPhoto(photo) {
  try {
    await fetch(
      `${cfg.url}/storage/v1/object/property-photos/${photo.storage_path}`,
      {
        method: "DELETE",
        headers: {
          apikey: cfg.publishableKey,
          Authorization: `Bearer ${token}`
        }
      }
    );
  } catch (_) {}

  await removePhotoRow(photo.id);
}


async function setPrimaryPhoto(photo) {
  const propertyPhotos =
    photosForProperty(
      photo.property_id
    );

  for (const item of propertyPhotos) {
    if (
      item.is_primary &&
      item.id !== photo.id
    ) {
      await patchPhoto(
        item.id,
        { is_primary: false }
      );
    }
  }

  await patchPhoto(
    photo.id,
    { is_primary: true }
  );
}


async function movePhoto(photo, direction) {
  const photos =
    photosForProperty(
      photo.property_id
    );

  const index =
    photos.findIndex(
      item => item.id === photo.id
    );

  const swapIndex =
    direction === "up"
      ? index - 1
      : index + 1;

  if (
    index < 0 ||
    swapIndex < 0 ||
    swapIndex >= photos.length
  ) {
    return;
  }

  const other =
    photos[swapIndex];

  await patchPhoto(
    photo.id,
    { sort_order: swapIndex }
  );

  await patchPhoto(
    other.id,
    { sort_order: index }
  );
}



async function loadLeases() {
  currentLeases =
    await fetchTable(
      "leases",
      "?select=*&order=created_at.desc"
    );

  return currentLeases;
}


function leaseForReservation(
  reservationId
) {
  return currentLeases.find(
    lease =>
      lease.reservation_id ===
      reservationId
  ) || null;
}


async function createLeaseForReservation(
  reservation
) {
  const existing =
    leaseForReservation(
      reservation.id
    );

  if (existing) {
    throw new Error(
      "A lease already exists for this reservation."
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      15000
    );

  let response;

  try {
    response =
      await fetch(
        "/api/create-lease",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`
          },
          body:
            JSON.stringify({
              reservation_id:
                reservation.id
            }),
          signal:
            controller.signal
        }
      );
  } catch (error) {
    if (
      error.name ===
      "AbortError"
    ) {
      throw new Error(
        "The lease request timed out. The server did not respond."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  let body = {};

  try {
    body =
      await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      body.error ||
      body.message ||
      `Lease server error (${response.status}).`
    );
  }

  return body;
}


async function prepareOwnerLeaseSignature(
  reservation,
  lease
) {
  if (!reservation || !lease) {
    throw new Error(
      "Reservation or lease could not be found."
    );
  }

  const response =
    await fetch(
      "/api/owner-lease-ready",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${token}`
        },
        body:
          JSON.stringify({
            reservation_id:
              reservation.id,
            lease_id:
              lease.id
          })
      }
    );

  let body = {};

  try {
    body =
      await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      body.error ||
      body.message ||
      `Owner signing error (${response.status}).`
    );
  }

  return body;
}


async function loadPayments() {
  currentPayments =
    await fetchTable(
      "payments",
      "?select=*&order=received_at.asc"
    );


  return currentPayments;
}




async function loadPaymentSchedule() {
  currentPaymentSchedule =
    await fetchTable(
      "payment_schedule",
      "?select=*&order=due_date.asc"
    );


  return currentPaymentSchedule;
}




async function createPaymentScheduleItem(
  data
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/payment_schedule`,
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




async function updatePaymentScheduleItem(
  id,
  changes
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/payment_schedule?id=eq.${id}`,
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




async function deletePaymentScheduleItem(
  id
) {
  const res =
    await fetch(
      `${cfg.url}/rest/v1/payment_schedule?id=eq.${id}`,
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




function wholeDollarRate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid whole-dollar rental rate.");
  }

  return Math.round(amount);
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







async function sendCleaningAssignmentEmailForReservation(
  reservationId
) {
  const reservation =
    currentReservations.find(
      item =>
        String(item.id) ===
        String(reservationId)
    );

  if (!reservation) {
    throw new Error(
      "Reservation could not be found for the cleaning email."
    );
  }

  let cleaning = null;

  for (
    let attempt = 0;
    attempt < 10;
    attempt++
  ) {
    const cleanings =
      await fetchTable(
        "cleaning_assignments",
        `?reservation_id=eq.${encodeURIComponent(
          reservationId
        )}&select=*&limit=1`
      );

    cleaning =
      cleanings[0] || null;

    if (
      cleaning &&
      cleaning.cleaner_email &&
      cleaning.confirmation_token
    ) {
      break;
    }

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          500
        )
    );
  }

  if (!cleaning) {
    throw new Error(
      "No cleaning assignment was found for this reservation."
    );
  }

  if (!cleaning.cleaner_email) {
    throw new Error(
      "The cleaning assignment does not have a cleaner email."
    );
  }

  if (!cleaning.confirmation_token) {
    throw new Error(
      "The cleaning assignment does not have a confirmation token."
    );
  }

  const property =
    currentProperties.find(
      item =>
        String(item.id) ===
        String(reservation.property_id)
    );

  const response =
    await fetch(
      "/api/cleaning-assigned",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            to:
              cleaning.cleaner_email,

            cleanerName:
              cleaning.cleaner_name ||
              "Melissa",

            propertyName:
              property?.name ||
              reservation.property_name ||
              "Down the Shore rental",

            guestName:
              reservation.guest_name ||
              "Guest",

            checkoutDate:
              cleaning.checkout_date ||
              reservation.departure_date,

            confirmationToken:
              cleaning.confirmation_token
          })
      }
    );

  let body = {};

  try {
    body =
      await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      body.error ||
      "The cleaner confirmation email could not be sent."
    );
  }

  return body;
}


async function addPayment(
  id,
  amount,
  method
) {
  const now =
    new Date().toISOString();


  const reservation =
    currentReservations.find(
      item => item.id === id
    );


  if (!reservation) {
    throw new Error(
      "Reservation not found."
    );
  }


  const numericAmount =
    Number(amount);


  const alreadyPaid =
    paymentsForReservation(id)
      .reduce(
        (
          total,
          payment
        ) =>
          total +
          Number(
            payment.amount ||
            0
          ),
        0
      );


  const totalDue =
    Number(
      reservation.amount_due ||
      0
    );


  const balanceBefore =
    Math.max(
      0,
      totalDue -
      alreadyPaid
    );


  if (
    numericAmount >
    balanceBefore &&
    balanceBefore > 0
  ) {
    throw new Error(
      `That payment is larger than the remaining balance of ${formatMoney(balanceBefore)}.`
    );
  }


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
            reservation_id:
              id,
            amount:
              numericAmount,
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


  const paidAfter =
    alreadyPaid +
    numericAmount;


  const balanceAfter =
    Math.max(
      0,
      totalDue -
      paidAfter
    );


  await updateReservation(
    id,
    {
      payment_status:
        balanceAfter <= 0
          ? "paid"
          : "partial",
      payment_method:
        method,
      amount_received:
        paidAfter,
      payment_received_at:
        now,
      hold_expires_at:
        paidAfter > 0
          ? null
          : reservation.hold_expires_at,
      status:
        paidAfter > 0
          ? "booked"
          : reservation.status
    }
  );

  const lease =
    leaseForReservation(id);

  if (
    paidAfter > 0 &&
    lease &&
    (
      lease.status ===
        "awaiting_payment" ||
      lease.status ===
        "awaiting_owner_signature"
    )
  ) {
    try {
      await prepareOwnerLeaseSignature(
        reservation,
        lease
      );
    } catch (error) {
      console.warn(
        "Owner signature notification could not be prepared:",
        error
      );
    }
  }
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






function paymentDueItemsForDay(
  propertyId,
  dateString
) {
  const reservationMap =
    Object.fromEntries(
      currentReservations.map(
        reservation => [
          reservation.id,
          reservation
        ]
      )
    );


  return currentPaymentSchedule
    .filter(
      item => {
        const reservation =
          reservationMap[
            item.reservation_id
          ];


        if (
          !reservation ||
          reservation.property_id !==
            propertyId ||
          !activeReservation(
            reservation
          ) ||
          item.due_date !==
            dateString
        ) {
          return false;
        }


        const allocation =
          scheduleAllocations(
            reservation
          ).find(
            scheduled =>
              scheduled.id ===
              item.id
          );


        return (
          allocation &&
          allocation.remaining > 0
        );
      }
    )
    .map(
      item => ({
        schedule:
          item,
        reservation:
          reservationMap[
            item.reservation_id
          ]
      })
    );
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


    const paymentItems =
      paymentDueItemsForDay(
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
        .join("") +


      paymentItems
        .map(
          item => `
            <span
              class="owner-calendar-item payment_due"
              title="${item.reservation.guest_name || "Guest"} · ${item.schedule.label || "Payment"}"
            >
              💵 ${item.reservation.guest_name || "Guest"}
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
            step="1"
            value="${period.weekly_price ?? ""}"
            data-rate-weekly
          >
        </label>


        <label>
          Nightly price
          <input
            type="number"
            min="0"
            step="1"
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
  const leaseDefaults =
    property.lease_defaults &&
    typeof property.lease_defaults === "object" &&
    !Array.isArray(property.lease_defaults)
      ? property.lease_defaults
      : {};

  const checked = value =>
    value ? "checked" : "";

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

        <label>
          Check-in time
          <input
            type="text"
            value="${leaseDefaults.check_in_time ?? "2:00 PM"}"
            data-property-check-in
          >
        </label>

        <label>
          Checkout time
          <input
            type="text"
            value="${leaseDefaults.check_out_time ?? "10:00 AM"}"
            data-property-check-out
          >
        </label>

        <label>
          Beach tags
          <input
            type="number"
            min="0"
            step="1"
            value="${leaseDefaults.beach_tags ?? 0}"
            data-property-beach-tags
          >
        </label>

        <label>
          Beach chairs
          <input
            type="number"
            min="0"
            step="1"
            value="${leaseDefaults.beach_chairs ?? 0}"
            data-property-beach-chairs
          >
        </label>

        <label>
          Lost beach tag charge
          <input
            type="number"
            min="0"
            step="0.01"
            value="${leaseDefaults.beach_tag_replacement_fee ?? 50}"
            data-property-beach-tag-fee
          >
        </label>

        <label class="full">
          Bed configuration
          <input
            type="text"
            value="${leaseDefaults.bed_configuration ?? ""}"
            placeholder="Example: 1 queen, 2 twins"
            data-property-bed-configuration
          >
        </label>

        <label class="full">
          Linens
          <textarea
            rows="3"
            data-property-linens
          >${leaseDefaults.linens_text ?? ""}</textarea>
        </label>

        <label class="rate-blocked-row">
          <input
            type="checkbox"
            data-property-washer-dryer
            ${checked(leaseDefaults.washer_dryer)}
          >
          Washer / dryer
        </label>

        <label class="rate-blocked-row">
          <input
            type="checkbox"
            data-property-internet
            ${checked(leaseDefaults.internet)}
          >
          Internet
        </label>

        <label class="rate-blocked-row">
          <input
            type="checkbox"
            data-property-smart-tv
            ${checked(leaseDefaults.smart_tv)}
          >
          Smart TV
        </label>

        <label class="rate-blocked-row">
          <input
            type="checkbox"
            data-property-coffee-pot
            ${checked(leaseDefaults.coffee_pot)}
          >
          Coffee pot
        </label>

        <label class="rate-blocked-row">
          <input
            type="checkbox"
            data-property-stocked-kitchen
            ${checked(leaseDefaults.fully_stocked_kitchen)}
          >
          Fully stocked kitchen
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
          Save property settings
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






function paymentsForReservation(
  reservationId
) {
  return currentPayments.filter(
    payment =>
      payment.reservation_id ===
      reservationId
  );
}




function scheduleForReservation(
  reservationId
) {
  return currentPaymentSchedule
    .filter(
      item =>
        item.reservation_id ===
        reservationId
    )
    .sort(
      (a, b) =>
        parseDate(a.due_date) -
        parseDate(b.due_date)
    );
}




function paymentTotals(
  reservation
) {
  const totalDue =
    Number(
      reservation.amount_due ||
      0
    );


  const paid =
    paymentsForReservation(
      reservation.id
    )
      .reduce(
        (
          total,
          payment
        ) =>
          total +
          Number(
            payment.amount ||
            0
          ),
        0
      );


  const roundedTotal =
    Math.round(
      totalDue * 100
    ) / 100;

  const roundedPaid =
    Math.round(
      paid * 100
    ) / 100;

  const roundedBalance =
    Math.max(
      0,
      Math.round(
        (
          roundedTotal -
          roundedPaid
        ) *
        100
      ) /
      100
    );

  return {
    totalDue:
      roundedTotal,
    paid:
      roundedPaid,
    balance:
      roundedBalance
  };
}




function scheduleAllocations(
  reservation
) {
  let remainingPaid =
    paymentTotals(
      reservation
    ).paid;


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  return scheduleForReservation(
    reservation.id
  ).map(
    item => {
      const due =
        Number(
          item.amount_due ||
          0
        );


      const applied =
        Math.min(
          remainingPaid,
          due
        );


      remainingPaid =
        Math.max(
          0,
          remainingPaid -
          applied
        );


      const remaining =
        Math.max(
          0,
          due -
          applied
        );


      let status =
        "upcoming";


      if (remaining <= 0) {
        status =
          "paid";
      } else if (applied > 0) {
        status =
          "partial";
      } else if (
        parseDate(
          item.due_date
        ) <= today
      ) {
        status =
          "due";
      }


      return {
        ...item,
        applied,
        remaining,
        status
      };
    }
  );
}






function scheduledTotal(
  reservationId
) {
  return scheduleForReservation(
    reservationId
  ).reduce(
    (
      total,
      item
    ) =>
      total +
      Number(
        item.amount_due ||
        0
      ),
    0
  );
}




function unscheduledAmount(
  reservation
) {
  return Math.max(
    0,
    Number(
      reservation.amount_due ||
      0
    ) -
    scheduledTotal(
      reservation.id
    )
  );
}




function visibleScheduledTotal(
  card
) {
  return Array.from(
    card.querySelectorAll(
      "[data-payment-due-amount]"
    )
  ).reduce(
    (
      total,
      input
    ) =>
      total +
      Number(
        input.value ||
        0
      ),
    0
  );
}




function refreshScheduleArithmetic(
  card
) {
  if (!card) {
    return;
  }


  const reservationId =
    card.dataset.id;


  const reservation =
    currentReservations.find(
      item =>
        item.id ===
        reservationId
    );


  if (!reservation) {
    return;
  }


  const totalDue =
    Number(
      reservation.amount_due ||
      0
    );


  const scheduled =
    visibleScheduledTotal(
      card
    );


  const remaining =
    totalDue -
    scheduled;


  const scheduledEl =
    card.querySelector(
      "[data-scheduled-total]"
    );


  const unscheduledEl =
    card.querySelector(
      "[data-unscheduled-total]"
    );


  const warningEl =
    card.querySelector(
      "[data-schedule-warning]"
    );


  if (scheduledEl) {
    scheduledEl.textContent =
      formatMoney(
        scheduled
      );
  }


  if (unscheduledEl) {
    unscheduledEl.textContent =
      formatMoney(
        Math.max(
          0,
          remaining
        )
      );
  }


  if (warningEl) {
    if (remaining < 0) {
      warningEl.textContent =
        `Scheduled payments exceed the reservation total by ${formatMoney(Math.abs(remaining))}.`;
    } else if (remaining === 0) {
      warningEl.textContent =
        "Payment schedule matches the reservation total.";
    } else {
      warningEl.textContent =
        `${formatMoney(remaining)} still needs to be scheduled.`;
    }
  }


  const useRemaining =
    card.querySelector(
      "[data-use-remaining]"
    );


  if (useRemaining) {
    useRemaining.disabled =
      remaining <= 0;
  }
}




function paymentScheduleMarkup(
  reservation
) {
  const schedule =
    scheduleAllocations(
      reservation
    );


  const history =
    paymentsForReservation(
      reservation.id
    )
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b.received_at
          ) -
          new Date(
            a.received_at
          )
      );


  const scheduled =
    scheduledTotal(
      reservation.id
    );


  const totals =
    paymentTotals(
      reservation
    );


  const unscheduled =
    totals.balance <= 0
      ? 0
      : Math.max(
          0,
          totals.balance -
          scheduled
        );


  if (
    totals.balance <= 0
  ) {
    return `
      <div
        class="payment-history"
        style="margin-top:14px;"
      >
        <h3>
          Payment history
        </h3>

        <div class="payment-history-list">
          ${
            history.length
              ? history
                  .map(
                    payment => `
                      <div class="payment-history-row">
                        <strong>
                          ${formatMoney(payment.amount)}
                        </strong>

                        <span>
                          ${(payment.payment_method || "").replaceAll("_", " ")}
                        </span>

                        <span class="meta">
                          ${
                            payment.received_at
                              ? new Date(
                                  payment.received_at
                                ).toLocaleString()
                              : ""
                          }
                        </span>
                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="meta">
                  No payments logged yet.
                </div>
              `
          }
        </div>
      </div>
    `;
  }


  return `
    <div class="payment-schedule">
      <h3>
        Payment schedule
      </h3>


      <div class="payment-schedule-summary">
        <div class="payment-summary-item">
          <div class="payment-summary-label">
            Scheduled total
          </div>
          <div
            class="payment-summary-value"
            data-scheduled-total
          >
            ${formatMoney(scheduled)}
          </div>
        </div>


        <div class="payment-summary-item">
          <div class="payment-summary-label">
            Still unscheduled
          </div>
          <div
            class="payment-summary-value"
            data-unscheduled-total
          >
            ${formatMoney(unscheduled)}
          </div>
        </div>
      </div>


      <div
        class="payment-schedule-warning"
        data-schedule-warning
      >
        ${
          unscheduled > 0
            ? `${formatMoney(unscheduled)} still needs to be scheduled.`
            : "Payment schedule matches the reservation total."
        }
      </div>


      <div class="payment-schedule-list">
        ${
          schedule.length
            ? schedule
                .map(
                  item => `
                    <div
                      class="payment-schedule-row"
                      data-payment-schedule-id="${item.id}"
                    >
                      <input
                        type="text"
                        value="${item.label || "Payment"}"
                        data-payment-label
                      >


                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value="${Number(item.amount_due || 0)}"
                        data-payment-due-amount
                      >


                      <input
                        type="date"
                        value="${item.due_date}"
                        data-payment-due-date
                      >


                      <div>
                        <span
                          class="payment-installment-status ${item.status}"
                        >
                          ${
                            item.status === "paid"
                              ? "Paid"
                              : item.status === "partial"
                                ? `${formatMoney(item.remaining)} left`
                                : item.status === "due"
                                  ? "Due"
                                  : "Upcoming"
                          }
                        </span>


                        <div
                          class="row"
                          style="margin-top:6px;"
                        >
                          <button
                            type="button"
                            data-payment-schedule-action="save"
                          >
                            Save
                          </button>


                          <button
                            type="button"
                            class="danger"
                            data-payment-schedule-action="delete"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  `
                )
                .join("")
            : `
              <div class="meta">
                No payment installments scheduled yet.
              </div>
            `
        }
      </div>


      <div class="payment-add-schedule">
        <div class="row">
          <label>
            Label
            <input
              type="text"
              placeholder="Deposit, final balance…"
              data-new-payment-label
            >
          </label>


          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              data-new-payment-amount
            >
          </label>


          <label>
            Due date
            <input
              type="date"
              data-new-payment-date
            >
          </label>


          <button
            type="button"
            class="use-remaining-btn"
            data-use-remaining
            ${unscheduled <= 0 ? "disabled" : ""}
          >
            Use remaining balance
          </button>


          <button
            type="button"
            data-action="add-payment-schedule"
          >
            Add due date
          </button>
        </div>
      </div>
    </div>


    <div
      class="payment-history"
      style="margin-top:14px;"
    >
      <h3>
        Payment history
      </h3>


      <div class="payment-history-list">
        ${
          history.length
            ? history
                .map(
                  payment => `
                    <div class="payment-history-row">
                      <strong>
                        ${formatMoney(payment.amount)}
                      </strong>


                      <span>
                        ${(payment.payment_method || "").replaceAll("_", " ")}
                      </span>


                      <span class="meta">
                        ${
                          payment.received_at
                            ? new Date(
                                payment.received_at
                              ).toLocaleString()
                            : ""
                        }
                      </span>
                    </div>
                  `
                )
                .join("")
            : `
              <div class="meta">
                No payments logged yet.
              </div>
            `
        }
      </div>
    </div>
  `;
}




function reservationCard(r) {
  const lease =
    leaseForReservation(
      r.id
    );

  const status =
    r.status ||
    "pending";


  const totals =
    paymentTotals(
      r
    );


  let paymentStatus =
    r.payment_status ||
    "waiting";


  if (
    totals.totalDue > 0
  ) {
    if (
      totals.balance <= 0
    ) {
      paymentStatus =
        "paid";
    } else if (
      totals.paid > 0
    ) {
      paymentStatus =
        "partial";
    } else {
      paymentStatus =
        "waiting";
    }
  }


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


  const canTakePayment =
    status !==
      "declined" &&
    status !==
      "cancelled" &&
    status !==
      "waitlisted" &&
    totals.balance > 0;


  const ownerSignatureReady =
    Boolean(
      lease &&
      totals.paid > 0 &&
      (
        lease.status ===
          "awaiting_payment" ||
        lease.status ===
          "awaiting_owner_signature"
      )
    );


  const displayLeaseStatus =
    ownerSignatureReady
      ? "owner_signature_required"
      : lease?.status || "";


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


          ${formatDate(r.arrival_date)}
          –
          ${formatDate(r.departure_date)}


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
          lease
            ? `
              <span class="badge">
                lease:
                ${displayLeaseStatus.replaceAll("_", " ")}
              </span>
            `
            : ""
        }


        ${
          r.hold_expires_at &&
          status ===
            "pending_payment"
            ? `
              <div class="meta hold">
                Hold expires:
                ${new Date(r.hold_expires_at).toLocaleString()}
              </div>
            `
            : ""
        }

        ${
          !lease
            ? `
              <details
                style="margin-top:14px;"
                open
              >
                <summary
                  style="cursor:pointer;font-weight:700;color:#0d2b4d;"
                >
                  Lease settings
                </summary>

                <div
                  class="form-grid"
                  style="margin-top:12px;"
                >
                  <label>
                    Rental type
                    <select data-lease-rental-type>
                      <option
                        value="standard"
                        ${
                          (r.rental_type || "standard") === "standard"
                            ? "selected"
                            : ""
                        }
                      >
                        Regular summer
                      </option>

                      <option
                        value="senior_week"
                        ${
                          r.rental_type === "senior_week"
                            ? "selected"
                            : ""
                        }
                      >
                        Senior Week
                      </option>

                      <option
                        value="winter"
                        ${
                          r.rental_type === "winter"
                            ? "selected"
                            : ""
                        }
                      >
                        Winter rental
                      </option>
                    </select>
                  </label>

                  <label>
                    Security deposit
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value="${r.security_deposit ?? 0}"
                      data-lease-security-deposit
                    >
                  </label>

                  <label class="full">
                    Linens override
                    <textarea
                      rows="2"
                      placeholder="Leave blank to use property default"
                      data-lease-linens
                    >${r.lease_overrides?.linens_text ?? ""}</textarea>
                  </label>

                  <label class="full">
                    Bed configuration override
                    <input
                      type="text"
                      placeholder="Leave blank to use property default"
                      value="${r.lease_overrides?.bed_configuration ?? ""}"
                      data-lease-beds
                    >
                  </label>

                  <label>
                    Beach tags override
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Property default"
                      value="${r.lease_overrides?.beach_tags ?? ""}"
                      data-lease-beach-tags
                    >
                  </label>

                  <label>
                    Beach chairs override
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Property default"
                      value="${r.lease_overrides?.beach_chairs ?? ""}"
                      data-lease-beach-chairs
                    >
                  </label>

                  ${[
                    ["washer_dryer", "Washer / dryer"],
                    ["internet", "Internet"],
                    ["smart_tv", "Smart TV"],
                    ["coffee_pot", "Coffee pot"],
                    ["fully_stocked_kitchen", "Fully stocked kitchen"]
                  ].map(([key,label]) => `
                    <label>
                      ${label}
                      <select data-lease-boolean="${key}">
                        <option value="">Property default</option>
                        <option
                          value="true"
                          ${r.lease_overrides?.[key] === true ? "selected" : ""}
                        >
                          Yes
                        </option>
                        <option
                          value="false"
                          ${r.lease_overrides?.[key] === false ? "selected" : ""}
                        >
                          No
                        </option>
                      </select>
                    </label>
                  `).join("")}
                </div>

                <div
                  class="row"
                  style="margin-top:10px;"
                >
                  <button
                    type="button"
                    data-action="save_lease_settings"
                  >
                    Save lease settings
                  </button>
                </div>
              </details>
            `
            : ""
        }


        <div class="payment-summary">
          <div class="payment-summary-grid">
            <div class="payment-summary-item">
              <div class="payment-summary-label">
                Total due
              </div>
              <div class="payment-summary-value">
                ${formatMoney(totals.totalDue)}
              </div>
            </div>


            <div class="payment-summary-item">
              <div class="payment-summary-label">
                Paid so far
              </div>
              <div class="payment-summary-value">
                ${formatMoney(totals.paid)}
              </div>
            </div>


            <div class="payment-summary-item">
              <div class="payment-summary-label">
                Balance
              </div>
              <div class="payment-summary-value">
                ${formatMoney(totals.balance)}
              </div>
            </div>
          </div>


          ${
            canTakePayment
              ? `
                <div class="payment-log-row">
                  <label>
                    Payment amount
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="${totals.balance}"
                      placeholder="Amount"
                      data-amount
                    >
                  </label>


                  <label>
                    Method
                    <select data-method>
                      <option value="zelle">Zelle</option>
                      <option value="venmo">Venmo</option>
                      <option value="credit_card">Credit card</option>
                      <option value="check">Check</option>
                    </select>
                  </label>


                  <button
                    type="button"
                    data-action="paid"
                  >
                    Log payment
                  </button>
                </div>
              `
              : totals.totalDue > 0
                ? `
                  <div class="notice">
                    Paid in full
                  </div>
                `
                : ""
          }


          ${paymentScheduleMarkup(r)}
        </div>
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
          !lease &&
          (
            status === "pending_payment" ||
            status === "booked"
          )
            ? `
              <button
                class="primary"
                data-action="create_lease"
              >
                Create lease
              </button>
            `
            : ""
        }

        ${
          ownerSignatureReady
            ? `
              <button
                class="primary"
                data-action="owner_sign"
              >
                Review & sign lease
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


          const paymentItems =
            paymentDueItemsForDay(
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
                [
                  ...items.map(
                    item => ({
                      label:
                        item.reservation.guest_name ||
                        "Guest",
                      status:
                        item.status
                    })
                  ),
                  ...paymentItems.map(
                    item => ({
                      label:
                        `💵 ${item.reservation.guest_name || "Guest"}`,
                      status:
                        "pending_payment"
                    })
                  )
                ]
                  .slice(0, 2)
                  .map(
                    item => `
                      <span
                        class="dashboard-mini-item ${item.status}"
                      >
                        ${item.label}
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


        scheduleAllocations(
          reservation
        )
          .filter(
            item =>
              item.remaining > 0 &&
              parseDate(
                item.due_date
              ) >= today
          )
          .forEach(
            item => {
              events.push({
                type:
                  "payment",
                date:
                  item.due_date,
                property:
                  reservation.property_name,
                guest:
                  reservation.guest_name ||
                  "Guest",
                time:
                  item.label ||
                  "Payment due",
                amount:
                  item.remaining
              });
            }
          );
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


        const order = {
          checkout: 1,
          payment: 2,
          checkin: 3
        };


        return (
          order[a.type] -
          order[b.type]
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
                        : event.type ===
                            "checkout"
                          ? "CHECK-OUT"
                          : "PAYMENT DUE"
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
                    ${
                      event.type ===
                        "payment"
                        ? `${event.time} · ${formatMoney(event.amount)}`
                        : event.time
                    }
                  </div>
                </article>
              `;
            }
          )
          .join("")
      : `
        <div class="empty-state">
          No upcoming events.
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
    photos: [
      "Photos",
      "Upload, reorder, and choose the main photo for each property."
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
    await loadPropertyPhotos();
    await loadLeases();
    await loadPayments();
    await loadPaymentSchedule();


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
    renderPhotoManager();
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

        const params =
          new URLSearchParams(
            window.location.search
          );

        const requestedSection =
          params.get("section");

        const reservationId =
          params.get("reservation");

        if (
          requestedSection ===
          "pending"
        ) {
          showOwnerView(
            "pending"
          );

          if (reservationId) {
            window.setTimeout(
              () => {
                const card =
                  pendingReservationList
                    .querySelector(
                      `[data-id="${reservationId}"]`
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

          return;
        }

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


        try {
          await sendCleaningAssignmentEmailForReservation(
            id
          );

          message(
            portalMessage,
            "Accepted. The 24-hour payment hold has started and Melissa's cleaning confirmation email was sent."
          );
        } catch (cleaningError) {
          console.error(
            "Cleaner assignment email error:",
            cleaningError
          );

          message(
            portalMessage,
            `Accepted. The 24-hour payment hold has started, but the cleaner email could not be sent: ${cleaningError.message}`,
            true
          );
        }


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
        "save_lease_settings"
      ) {
        const reservation =
          currentReservations.find(
            item =>
              item.id === id
          );

        if (!reservation) {
          throw new Error(
            "Reservation could not be found."
          );
        }

        const rentalType =
          card.querySelector(
            "[data-lease-rental-type]"
          ).value;

        const securityDeposit =
          Number(
            card.querySelector(
              "[data-lease-security-deposit]"
            ).value || 0
          );

        const overrides = {};

        const linens =
          card.querySelector(
            "[data-lease-linens]"
          ).value.trim();

        const beds =
          card.querySelector(
            "[data-lease-beds]"
          ).value.trim();

        const beachTags =
          card.querySelector(
            "[data-lease-beach-tags]"
          ).value;

        const beachChairs =
          card.querySelector(
            "[data-lease-beach-chairs]"
          ).value;

        if (linens) {
          overrides.linens_text =
            linens;
        }

        if (beds) {
          overrides.bed_configuration =
            beds;
        }

        if (beachTags !== "") {
          overrides.beach_tags =
            Number(beachTags);
        }

        if (beachChairs !== "") {
          overrides.beach_chairs =
            Number(beachChairs);
        }

        card
          .querySelectorAll(
            "[data-lease-boolean]"
          )
          .forEach(select => {
            if (select.value === "") {
              return;
            }

            overrides[
              select.dataset.leaseBoolean
            ] =
              select.value === "true";
          });

        await updateReservation(
          id,
          {
            rental_type:
              rentalType,

            security_deposit:
              securityDeposit,

            lease_overrides:
              overrides
          }
        );

        message(
          portalMessage,
          "Lease settings saved."
        );
      }


      if (
        action ===
        "create_lease"
      ) {
        const reservation =
          currentReservations.find(
            item =>
              item.id === id
          );

        if (!reservation) {
          throw new Error(
            "Reservation could not be found."
          );
        }

        const originalText =
          button.textContent;

        button.textContent =
          "Creating lease…";

        message(
          portalMessage,
          "Creating lease and sending the guest signing email…"
        );

        try {
          const leaseResult =
            await createLeaseForReservation(
              reservation
            );

          message(
            portalMessage,
            "Lease created and signing email sent to the guest."
          );

          window.alert(
            leaseResult.email_sent
              ? "Lease created. The signing email was sent to the guest."
              : "Lease created, but the email was not confirmed as sent."
          );
        } catch (leaseError) {
          window.alert(
            `Lease error: ${leaseError.message}`
          );

          throw leaseError;
        } finally {
          button.textContent =
            originalText;
        }
      }


      if (
        action ===
        "owner_sign"
      ) {
        const reservation =
          currentReservations.find(
            item =>
              item.id === id
          );

        const lease =
          leaseForReservation(id);

        if (
          !reservation ||
          !lease
        ) {
          throw new Error(
            "Reservation or lease could not be found."
          );
        }

        const originalText =
          button.textContent;

        button.textContent =
          "Opening lease…";

        try {
          const result =
            await prepareOwnerLeaseSignature(
              reservation,
              lease
            );

          if (!result.signing_url) {
            throw new Error(
              "Owner signing link was not returned."
            );
          }

          window.location.href =
            result.signing_url;
        } finally {
          button.textContent =
            originalText;
        }
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

const reservation =
  currentReservations.find(
    item =>
      item.id === id
  );

if (!reservation) {
  throw new Error(
    "Reservation could not be found."
  );
}

const existingLease =
  leaseForReservation(id);

let leaseCreated =
  false;

if (!existingLease) {
  await createLeaseForReservation(
    reservation
  );

  leaseCreated =
    true;
}

message(
  portalMessage,
  leaseCreated
    ? `Payment recorded as ${method.replaceAll("_", " ")}. Lease created and signing email sent to the guest.`
    : `Payment recorded as ${method.replaceAll("_", " ")}.`
);




      await refresh();




      }  
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


        try {
          await sendCleaningAssignmentEmailForReservation(
            id
          );

          message(
            portalMessage,
            "Accepted. The 24-hour payment hold has started and Melissa's cleaning confirmation email was sent."
          );
        } catch (cleaningError) {
          console.error(
            "Cleaner assignment email error:",
            cleaningError
          );

          message(
            portalMessage,
            `Accepted. The 24-hour payment hold has started, but the cleaner email could not be sent: ${cleaningError.message}`,
            true
          );
        }
try {
  const reservation =
    currentReservations.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (
    reservation &&
    reservation.agent_email
  ) {
    const property =
      currentProperties.find(
        item =>
          String(item.id) ===
          String(reservation.property_id)
      );

    const agentResponse =
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
                reservation.agent_email,
              subject:
                `Reservation accepted — ${reservation.guest_name || "Guest"}`,
              html:
                `<p>Hi ${reservation.agent_name || "there"},</p>
                 <p>The reservation for <strong>${reservation.guest_name || "Guest"}</strong> has been accepted.</p>
                 <p><strong>${property?.name || reservation.property_name || "Down the Shore"}</strong><br>
                 ${reservation.arrival_date} through ${reservation.departure_date}</p>
                 <p>The 24-hour payment hold has started.</p>
                 <p>Thank you,<br>Down the Shore</p>`
            })
        }
      );

    if (!agentResponse.ok) {
      throw new Error(
        "Agent email could not be sent."
      );
    }
  }
} catch (agentError) {
  console.error(
    "Agent email error:",
    agentError
  );
}
        await refresh();


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
        "create_lease"
      ) {
        const reservation =
          currentReservations.find(
            item =>
              item.id === id
          );

        if (!reservation) {
          throw new Error(
            "Reservation could not be found."
          );
        }

        const originalText =
          button.textContent;

        button.textContent =
          "Creating lease…";

        message(
          portalMessage,
          "Creating lease and sending the guest signing email…"
        );

        try {
          const leaseResult =
            await createLeaseForReservation(
              reservation
            );

          message(
            portalMessage,
            "Lease created and signing email sent to the guest."
          );

          window.alert(
            leaseResult.email_sent
              ? "Lease created. The signing email was sent to the guest."
              : "Lease created, but the email was not confirmed as sent."
          );
        } catch (leaseError) {
          window.alert(
            `Lease error: ${leaseError.message}`
          );

          throw leaseError;
        } finally {
          button.textContent =
            originalText;
        }
      }


      if (
        action ===
        "owner_sign"
      ) {
        const reservation =
          currentReservations.find(
            item =>
              item.id === id
          );

        const lease =
          leaseForReservation(id);

        if (
          !reservation ||
          !lease
        ) {
          throw new Error(
            "Reservation or lease could not be found."
          );
        }

        const originalText =
          button.textContent;

        button.textContent =
          "Opening lease…";

        try {
          const result =
            await prepareOwnerLeaseSignature(
              reservation,
              lease
            );

          if (!result.signing_url) {
            throw new Error(
              "Owner signing link was not returned."
            );
          }

          window.location.href =
            result.signing_url;
        } finally {
          button.textContent =
            originalText;
        }
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

  try {
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

    const reservation =
      currentReservations.find(
        item =>
          item.id === id
      );

    if (!reservation) {
      throw new Error(
        "Reservation could not be found."
      );
    }

    const existingLease =
      leaseForReservation(id);

    let leaseCreated =
      false;

    if (!existingLease) {
      await createLeaseForReservation(
        reservation
      );

      leaseCreated =
        true;
    }

    message(
      portalMessage,
      leaseCreated
        ? `Payment recorded as ${method.replaceAll("_", " ")}. Lease created and signing email sent to the guest.`
        : `Payment recorded as ${method.replaceAll("_", " ")}.`
    );

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
      
    } catch (err) {
      message(
        portalMessage,
        err.message,
        true
      );
    } finally {
      button.disabled = false;
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

    const beachTags =
      card.querySelector(
        "[data-property-beach-tags]"
      ).value;

    const beachChairs =
      card.querySelector(
        "[data-property-beach-chairs]"
      ).value;

    const beachTagFee =
      card.querySelector(
        "[data-property-beach-tag-fee]"
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

      if (
        beachTags === "" ||
        Number(beachTags) < 0
      ) {
        throw new Error(
          "Enter a valid number of beach tags."
        );
      }

      if (
        beachChairs === "" ||
        Number(beachChairs) < 0
      ) {
        throw new Error(
          "Enter a valid number of beach chairs."
        );
      }

      if (
        beachTagFee === "" ||
        Number(beachTagFee) < 0
      ) {
        throw new Error(
          "Enter a valid lost beach tag charge."
        );
      }

      const leaseDefaults = {
        check_in_time:
          card.querySelector(
            "[data-property-check-in]"
          ).value.trim() || "2:00 PM",

        check_out_time:
          card.querySelector(
            "[data-property-check-out]"
          ).value.trim() || "10:00 AM",

        linens_text:
          card.querySelector(
            "[data-property-linens]"
          ).value.trim(),

        bed_configuration:
          card.querySelector(
            "[data-property-bed-configuration]"
          ).value.trim(),

        beach_tags:
          Number(beachTags),

        beach_chairs:
          Number(beachChairs),

        beach_tag_replacement_fee:
          Number(beachTagFee),

        washer_dryer:
          card.querySelector(
            "[data-property-washer-dryer]"
          ).checked,

        internet:
          card.querySelector(
            "[data-property-internet]"
          ).checked,

        smart_tv:
          card.querySelector(
            "[data-property-smart-tv]"
          ).checked,

        coffee_pot:
          card.querySelector(
            "[data-property-coffee-pot]"
          ).checked,

        fully_stocked_kitchen:
          card.querySelector(
            "[data-property-stocked-kitchen]"
          ).checked
      };

      await updateProperty(
        id,
        {
          cleaning_fee:
            Number(cleaningFee),

          pet_fee:
            Number(petFee),

          max_dogs:
            Number(maxDogs),

          lease_defaults:
            leaseDefaults
        }
      );

      message(
        propertySettingsMessage,
        "Property settings saved."
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



document.addEventListener(
  "wheel",
  event => {
    if (
      document.activeElement === event.target &&
      event.target.matches(
        '[data-rate-weekly], [data-rate-nightly], [name="weekly_price"], [name="nightly_price"]'
      )
    ) {
      event.target.blur();
    }
  },
  { passive: true }
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
          wholeDollarRate(weekly),
        nightly_price:
          wholeDollarRate(nightly),
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
              wholeDollarRate(weekly),
            nightly_price:
              wholeDollarRate(nightly),
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
  "input",
  event => {
    if (
      event.target.matches(
        "[data-payment-due-amount]"
      )
    ) {
      refreshScheduleArithmetic(
        event.target.closest(
          "[data-id]"
        )
      );
    }
  }
);




document.addEventListener(
  "click",
  event => {
    const useRemaining =
      event.target.closest(
        "[data-use-remaining]"
      );


    if (!useRemaining) {
      return;
    }


    const card =
      useRemaining.closest(
        "[data-id]"
      );


    const reservationId =
      card.dataset.id;


    const reservation =
      currentReservations.find(
        item =>
          item.id ===
          reservationId
      );


    if (!reservation) {
      return;
    }


    const visibleScheduled =
      visibleScheduledTotal(
        card
      );


    const remaining =
      Math.max(
        0,
        Number(
          reservation.amount_due ||
          0
        ) -
        visibleScheduled
      );


    const amountInput =
      card.querySelector(
        "[data-new-payment-amount]"
      );


    if (amountInput) {
      amountInput.value =
        remaining.toFixed(2);


      amountInput.focus();
    }
  }
);




document.addEventListener(
  "click",
  async event => {
    const scheduleAction =
      event.target.closest(
        "[data-payment-schedule-action]"
      );


    if (scheduleAction) {
      const row =
        scheduleAction.closest(
          "[data-payment-schedule-id]"
        );


      const id =
        row.dataset.paymentScheduleId;


      try {
        scheduleAction.disabled =
          true;


        if (
          scheduleAction.dataset.paymentScheduleAction ===
          "delete"
        ) {
          if (
            !window.confirm(
              "Delete this scheduled payment?"
            )
          ) {
            scheduleAction.disabled =
              false;
            return;
          }


          await deletePaymentScheduleItem(
            id
          );
        } else {
          const label =
            row.querySelector(
              "[data-payment-label]"
            ).value.trim();


          const amount =
            Number(
              row.querySelector(
                "[data-payment-due-amount]"
              ).value
            );


          const dueDate =
            row.querySelector(
              "[data-payment-due-date]"
            ).value;


          if (
            !label ||
            !amount ||
            amount <= 0 ||
            !dueDate
          ) {
            throw new Error(
              "Enter a label, amount, and due date."
            );
          }


          const card =
            row.closest(
              "[data-id]"
            );


          const reservationId =
            card.dataset.id;


          const reservation =
            currentReservations.find(
              item =>
                item.id ===
                reservationId
            );


          const otherScheduled =
            scheduleForReservation(
              reservationId
            )
              .filter(
                item =>
                  item.id !== id
              )
              .reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  Number(
                    item.amount_due ||
                    0
                  ),
                0
              );


          const maxAllowed =
            Math.max(
              0,
              Number(
                reservation.amount_due ||
                0
              ) -
              otherScheduled
            );


          if (
            amount >
            maxAllowed
          ) {
            throw new Error(
              `That installment is too large. The maximum for this installment is ${formatMoney(maxAllowed)}.`
            );
          }


          await updatePaymentScheduleItem(
            id,
            {
              label,
              amount_due:
                amount,
              due_date:
                dueDate
            }
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
        scheduleAction.disabled =
          false;
      }


      return;
    }


    const addSchedule =
      event.target.closest(
        'button[data-action="add-payment-schedule"]'
      );


    if (addSchedule) {
      const card =
        addSchedule.closest(
          "[data-id]"
        );


      const reservationId =
        card.dataset.id;


      const label =
        card.querySelector(
          "[data-new-payment-label]"
        ).value.trim();


      const amount =
        Number(
          card.querySelector(
            "[data-new-payment-amount]"
          ).value
        );


      const dueDate =
        card.querySelector(
          "[data-new-payment-date]"
        ).value;


      try {
        addSchedule.disabled =
          true;


        if (
          !label ||
          !amount ||
          amount <= 0 ||
          !dueDate
        ) {
          throw new Error(
            "Enter a label, amount, and due date."
          );
        }


        const reservation =
          currentReservations.find(
            item =>
              item.id ===
              reservationId
          );


        const remaining =
          unscheduledAmount(
            reservation
          );


        if (
          amount >
          remaining
        ) {
          throw new Error(
            `That installment is larger than the remaining unscheduled amount of ${formatMoney(remaining)}.`
          );
        }


        await createPaymentScheduleItem({
          reservation_id:
            reservationId,
          label,
          amount_due:
            amount,
          due_date:
            dueDate,
          reminder_days_before:
            3
        });


        await refresh();


      } catch (err) {
        message(
          portalMessage,
          err.message,
          true
        );
      } finally {
        addSchedule.disabled =
          false;
      }


      return;
    }
  }
);




if (photoProperty) {
  photoProperty.addEventListener(
    "change",
    () => {
      photoManagerMessage.className = "";
      photoManagerMessage.textContent = "";
      renderPhotoManager();
    }
  );
}


if (uploadPhotosButton) {
  uploadPhotosButton.addEventListener(
    "click",
    async () => {
      const propertyId =
        selectedPhotoPropertyId();

      const files =
        Array.from(
          photoFiles?.files || []
        );

      if (!propertyId) {
        message(
          photoManagerMessage,
          "Choose a property first.",
          true
        );
        return;
      }

      if (!files.length) {
        message(
          photoManagerMessage,
          "Choose at least one photo to upload.",
          true
        );
        return;
      }

      try {
        uploadPhotosButton.disabled = true;
        uploadPhotosButton.textContent =
          "Uploading…";

        const existing =
          photosForProperty(propertyId);

        let nextOrder =
          existing.length;

        let needsPrimary =
          !existing.some(
            photo => photo.is_primary
          );

        for (const file of files) {
          await uploadPhotoFile(
            propertyId,
            file,
            nextOrder,
            needsPrimary
          );

          nextOrder += 1;
          needsPrimary = false;
        }

        if (photoFiles) {
          photoFiles.value = "";
        }

        await loadPropertyPhotos();
        renderPhotoManager();

        message(
          photoManagerMessage,
          `${files.length} photo${files.length === 1 ? "" : "s"} uploaded.`
        );

      } catch (err) {
        message(
          photoManagerMessage,
          err.message,
          true
        );
      } finally {
        uploadPhotosButton.disabled = false;
        uploadPhotosButton.textContent =
          "Upload selected photos";
      }
    }
  );
}


if (photoGrid) {
  photoGrid.addEventListener(
    "click",
    async event => {
      const button =
        event.target.closest(
          "button[data-photo-action]"
        );

      if (!button) {
        return;
      }

      const card =
        button.closest(
          "[data-photo-id]"
        );

      const photo =
        currentPropertyPhotos.find(
          item =>
            item.id ===
              card?.dataset.photoId
        );

      if (!photo) {
        return;
      }

      const action =
        button.dataset.photoAction;

      try {
        button.disabled = true;

        if (action === "primary") {
          await setPrimaryPhoto(photo);
        }

        if (
          action === "up" ||
          action === "down"
        ) {
          await movePhoto(
            photo,
            action
          );
        }

        if (action === "delete") {
          if (
            !window.confirm(
              "Delete this photo?"
            )
          ) {
            button.disabled = false;
            return;
          }

          const wasPrimary =
            photo.is_primary;

          await deleteStoredPhoto(photo);
          await loadPropertyPhotos();

          if (wasPrimary) {
            const remaining =
              photosForProperty(
                photo.property_id
              );

            if (remaining.length) {
              await setPrimaryPhoto(
                remaining[0]
              );
            }
          }
        }

        await loadPropertyPhotos();
        renderPhotoManager();

      } catch (err) {
        message(
          photoManagerMessage,
          err.message,
          true
        );
      }
    }
  );
}


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
