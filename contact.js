const contactForm =
  document.querySelector("[data-contact-form]");

const contactResult =
  document.querySelector("[data-contact-result]");

const contactSubmit =
  document.querySelector("[data-contact-submit]");

const contactContext =
  document.querySelector("[data-contact-context]");

const contactParams =
  new URLSearchParams(window.location.search);

const requestedPropertyId =
  contactParams.get("property") || "";

const requestedProperty =
  window.SITE_DATA.properties.find(
    property => property.id === requestedPropertyId
  );

if (requestedProperty) {
  contactForm.elements.property.value =
    requestedProperty.name;

  contactContext.hidden = false;
  contactContext.textContent =
    `Your message is about ${requestedProperty.name}.`;
}

document.getElementById("footerYear").textContent =
  new Date().getFullYear();

contactForm.addEventListener("submit", async event => {
  event.preventDefault();

  contactResult.className = "contact-result";
  contactResult.textContent = "Sending…";
  contactSubmit.disabled = true;

  try {
    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        responseData.error ||
        "Your message could not be sent. Please try again."
      );
    }

    contactResult.className =
      "contact-result success";
    contactResult.textContent =
      "Sent. Janis will reply by email.";

    contactForm.reset();

    if (requestedProperty) {
      contactForm.elements.property.value =
        requestedProperty.name;
    }
  } catch (error) {
    contactResult.className =
      "contact-result error";
    contactResult.textContent = error.message;
  } finally {
    contactSubmit.disabled = false;
  }
});
