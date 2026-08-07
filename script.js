const data = window.SITE_DATA;

function propertyImage(property) {
  if (property.image) {
    return `
      <div class="property-image">
        <img src="${property.image}" alt="${property.name}" style="object-position:${property.imagePosition || "center"}">
      </div>`;
  }
  return `<div class="placeholder-image">${property.placeholderLabel || "New photography coming soon"}</div>`;
}

function renderHome() {
  const brand = data.brand;
  document.title = `${brand.name} | Ocean City, NJ Vacation Homes`;
  document.querySelectorAll("[data-brand]").forEach(el => (el.textContent = brand.name));
  document.querySelector("[data-eyebrow]").textContent = brand.eyebrow;
  document.querySelector("[data-headline]").textContent = brand.headline;
  document.querySelector("[data-intro]").textContent = brand.intro;
  document.querySelector("[data-domain]").textContent = brand.domain;

  const contact = document.querySelector("[data-contact]");
  if (brand.contactEmail) {
    contact.href = `mailto:${brand.contactEmail}`;
  } else {
    contact.removeAttribute("href");
    contact.textContent = "Contact information coming soon";
  }

  const grid = document.querySelector("[data-property-grid]");
  grid.innerHTML = data.properties.map(property => `
    <article class="property-card">
      <a href="property.html?id=${property.id}" aria-label="View ${property.name}">
        ${propertyImage(property)}
      </a>
      <div class="property-copy">
        <div class="property-meta">${property.location} · ${property.bedrooms} BR · Sleeps ${property.sleeps}</div>
        <h3><a href="property.html?id=${property.id}">${property.name}</a></h3>
        <p>${property.tagline}</p>
        <a class="text-link" href="property.html?id=${property.id}">View home & book</a>
      </div>
    </article>
  `).join("");
}

function supabaseHeaders(prefer = "") {
  const headers = {
    "apikey": data.supabase.publishableKey,
    "Authorization": `Bearer ${data.supabase.publishableKey}`,
    "Content-Type": "application/json"
  };
  if (prefer) headers["Prefer"] = prefer;
  return headers;
}

async function getPropertyUuid(databaseName) {
  const url = `${data.supabase.url}/rest/v1/properties?select=id&name=eq.${encodeURIComponent(databaseName)}&limit=1`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Could not find the property record. ${details}`);
  }
  const records = await response.json();
  if (!records.length) {
    throw new Error(`No Supabase property matches "${databaseName}".`);
  }
  return records[0].id;
}

async function submitReservation(property, formData) {
  const arrival = formData.get("arrival");
  const departure = formData.get("departure");
  if (new Date(departure) <= new Date(arrival)) {
    throw new Error("Departure must be after arrival.");
  }

  const propertyId = await getPropertyUuid(property.databaseName);
  const payload = {
    property_id: propertyId,
    guest_name: formData.get("name").trim(),
    guest_email: formData.get("email").trim(),
    guest_phone: formData.get("phone").trim() || null,
    arrival_date: arrival,
    departure_date: departure,
    adults: Number(formData.get("guests")),
    children: 0,
    dogs: Number(formData.get("dogs") || 0),
    dog_names: formData.get("dog_names").trim() || null,
    status: "pending"
  };

  const response = await fetch(`${data.supabase.url}/rest/v1/reservations`, {
    method: "POST",
    headers: supabaseHeaders("return=representation"),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`The request could not be saved. ${details}`);
  }

  return response.json();
}

function renderProperty() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const property = data.properties.find(item => item.id === id) || data.properties[0];
  const owner = data.owners[property.owner];

  document.title = `${property.name} | ${data.brand.name}`;
  document.querySelectorAll("[data-brand]").forEach(el => (el.textContent = data.brand.name));

  const hero = document.querySelector("[data-page-hero]");
  hero.style.backgroundImage = property.image
    ? `linear-gradient(rgba(20,20,18,.18), rgba(20,20,18,.52)), url('${property.image}')`
    : `linear-gradient(135deg, #aaa295, #6f6b63)`;
  hero.style.backgroundPosition = property.imagePosition || "center";

  document.querySelector("[data-property-name]").textContent = property.name;
  document.querySelector("[data-property-tagline]").textContent = property.tagline;
  document.querySelector("[data-property-status]").textContent = property.status;
  document.querySelector("[data-property-summary]").textContent = property.summary;
  document.querySelector("[data-property-description]").textContent = property.description;
  document.querySelector("[data-rates-note]").textContent = property.ratesNote;
  document.querySelector("[data-facts]").innerHTML = `
    <span class="fact">${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"}</span>
    <span class="fact">${property.bathrooms} bathroom${property.bathrooms === 1 ? "" : "s"}</span>
    <span class="fact">Sleeps ${property.sleeps}</span>
    <span class="fact">${property.location}</span>`;
  document.querySelector("[data-amenities]").innerHTML = property.amenities.map(item => `<li>${item}</li>`).join("");
  document.querySelector("[data-owner-name]").textContent = owner.name;

  const form = document.querySelector("[data-booking-form]");
  const result = document.querySelector("[data-booking-result]");
  const submitButton = document.querySelector("[data-submit-button]");
  const dogCountField = document.querySelector("[data-dog-count-field]");
  const dogNamesField = document.querySelector("[data-dog-names-field]");
  const dogSelect = form.elements.dogs;

  if (!property.dogFriendly) {
    dogCountField.style.display = "none";
    dogNamesField.style.display = "none";
    dogSelect.value = "0";
  } else {
    dogSelect.addEventListener("change", () => {
      dogNamesField.style.display = dogSelect.value === "0" ? "none" : "block";
    });
  }

  form.elements.guests.max = String(property.sleeps);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    result.className = "booking-result";
    result.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "Saving request…";

    try {
      const formData = new FormData(form);
      await submitReservation(property, formData);
      result.className = "booking-result success";
      result.innerHTML = `<strong>Your dates have been received.</strong><br>Your request is pending until Janis confirms the dates, lease, and payment details.`;
      form.reset();
      dogNamesField.style.display = "none";
    } catch (error) {
      console.error(error);
      result.className = "booking-result error";
      result.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send booking request";
    }
  });
}
