(() => {
  let selectedReservationId = null;
  let selectedPropertyId = null;
  let selectedStatus = "all";
  let searchText = "";
  let sortDirection = "asc";

  const style = document.createElement("style");

  style.textContent = `
    .dts-reservations-shell {
      display: grid;
      gap: 18px;
    }

    .dts-property-tabs,
    .dts-status-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .dts-property-tab,
    .dts-status-tab {
      border: 1px solid #d9dee5;
      background: #fff;
      color: #172334;
      border-radius: 8px;
      padding: 9px 14px;
      font-weight: 600;
    }

    .dts-property-tab.active,
    .dts-status-tab.active {
      background: #0d2b4d;
      border-color: #0d2b4d;
      color: #fff;
    }

    .dts-toolbar {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }

    .dts-toolbar input,
    .dts-toolbar select {
      border: 1px solid #d9dee5;
      background: #fff;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .dts-toolbar input {
      min-width: 280px;
    }

    .dts-reservation-summary {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
    }

    .dts-summary-item {
      padding: 15px;
      border-right: 1px solid #e5e7eb;
    }

    .dts-summary-item:last-child {
      border-right: 0;
    }

    .dts-summary-label {
      color: #6f7782;
      font-size: 11px;
      margin-bottom: 4px;
    }

    .dts-summary-value {
      color: #0d2b4d;
      font-weight: 700;
      font-size: 20px;
    }

    .dts-reservation-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: 18px;
      align-items: start;
    }

    .dts-reservation-table-card,
    .dts-detail-panel {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      overflow: hidden;
    }

    .dts-table-title {
      padding: 16px 18px;
      border-bottom: 1px solid #e5e7eb;
      color: #0d2b4d;
      font-weight: 700;
    }

    .dts-reservation-row {
      display: grid;
      grid-template-columns:
        minmax(170px, 1.2fr)
        minmax(145px, .95fr)
        75px
        38px
        120px
        100px
        100px;
      gap: 10px;
      align-items: center;
      padding: 13px 18px;
      border-bottom: 1px solid #edf0f3;
      font-size: 13px;
    }

    .dts-reservation-row:last-child {
      border-bottom: 0;
    }

    .dts-reservation-head {
      background: #fafbfc;
      color: #707987;
      font-size: 11px;
      font-weight: 700;
    }

    .dts-guest-name {
      color: #172334;
      font-weight: 700;
    }

    .dts-guest-email {
      color: #737b86;
      font-size: 11px;
      margin-top: 2px;
      word-break: break-word;
    }

    .dts-date-button {
      border: 1px solid #d5dce5;
      background: #f4f7fa;
      color: #0d2b4d;
      border-radius: 8px;
      padding: 8px 10px;
      font-weight: 700;
      text-align: left;
      width: 100%;
    }

    .dts-date-button:hover {
      background: #eaf0f6;
      border-color: #aebccc;
    }

    .dts-status {
      display: inline-block;
      width: max-content;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }

    .dts-status.booked {
      background: #e4f0df;
      color: #35643e;
    }

    .dts-status.pending_payment,
    .dts-status.pending,
    .dts-status.requested {
      background: #fff0c9;
      color: #725600;
    }

    .dts-status.waitlisted {
      background: #eee8f8;
      color: #594878;
    }

    .dts-status.cancelled,
    .dts-status.declined {
      background: #f1f2f4;
      color: #777;
    }

    .dts-clean-icon {
      width: 24px;
      height: 24px;
      display: inline-grid;
      place-items: center;
      border-radius: 50%;
      background: #e4f0df;
      color: #35643e;
      font-size: 13px;
      font-weight: 800;
    }

    .dts-money-paid {
      color: #35643e;
      font-size: 11px;
      margin-top: 2px;
    }

    .dts-money-due {
      color: #a23a31;
      font-size: 11px;
      margin-top: 2px;
    }

    .dts-detail-panel {
      position: sticky;
      top: 24px;
      padding: 18px;
      min-height: 280px;
    }

    .dts-detail-empty {
      color: #7d8490;
      padding: 40px 12px;
      text-align: center;
    }

    .dts-detail-panel h3 {
      margin: 0 0 6px;
      color: #0d2b4d;
      font-size: 20px;
    }

    .dts-detail-meta {
      color: #6f7782;
      font-size: 13px;
      line-height: 1.6;
    }

    .dts-detail-section {
      border-top: 1px solid #e5e7eb;
      margin-top: 16px;
      padding-top: 16px;
    }

    .dts-detail-money {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      margin: 7px 0;
      font-size: 13px;
    }

    .dts-detail-money strong {
      color: #0d2b4d;
    }

    .dts-detail-actions {
      display: grid;
      gap: 8px;
      margin-top: 16px;
    }

    .dts-detail-actions button {
      border: 1px solid #cfd5dd;
      border-radius: 8px;
      background: #fff;
      padding: 9px 12px;
      font-weight: 600;
    }

    .dts-detail-actions .danger {
      color: #8a2c24;
    }

    .dts-full-details {
      margin-top: 14px;
    }

    .dts-full-details summary {
      cursor: pointer;
      color: #155aa8;
      font-weight: 700;
    }

    .dts-full-details .card.res {
      margin: 14px 0 0;
      padding: 14px;
      grid-template-columns: 1fr;
    }

    .dts-full-details .actions {
      margin-top: 10px;
    }

    .dts-empty-row {
      padding: 28px;
      color: #7d8490;
      text-align: center;
    }

    @media (max-width: 1180px) {
      .dts-reservation-layout {
        grid-template-columns: 1fr;
      }

      .dts-detail-panel {
        position: static;
      }

      .dts-reservation-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .dts-reservation-row {
        grid-template-columns:
          minmax(150px, 1.1fr)
          minmax(130px, .9fr)
          60px
          34px
          110px
          90px
          90px;
        padding: 12px;
      }
    }

    @media (max-width: 820px) {
      .dts-reservation-row {
        grid-template-columns: 1fr;
        gap: 6px;
      }

      .dts-reservation-head {
        display: none;
      }

      .dts-toolbar input {
        min-width: 100%;
      }

      .dts-reservation-summary {
        grid-template-columns: 1fr 1fr;
      }
    }
  `;

  document.head.appendChild(style);

  function dtsDate(value) {
    if (!value) return "";

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

  function dtsMoney(value) {
    return Number(value || 0).toLocaleString(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    );
  }

  function dtsIsActive(reservation) {
    return ![
      "cancelled",
      "declined"
    ].includes(
      reservation.status
    );
  }

  function dtsIsPast(reservation) {
    if (!reservation.departure_date) {
      return false;
    }

    const departure =
      new Date(
        `${reservation.departure_date}T12:00:00`
      );

    const today =
      new Date();

    today.setHours(0, 0, 0, 0);

    return departure < today;
  }

  function dtsCleaningConfirmed(
    reservation
  ) {
    return currentCleanings.some(
      cleaning =>
        cleaning.reservation_id ===
          reservation.id &&
        [
          "confirmed",
          "completed"
        ].includes(
          cleaning.status
        )
    );
  }

  function dtsTotals(
    reservation
  ) {
    const total =
      Number(
        reservation.amount_due || 0
      );

    const paid =
      currentPayments
        .filter(
          payment =>
            payment.reservation_id ===
            reservation.id
        )
        .reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        );

    return {
      total,
      paid,
      balance:
        Math.max(
          0,
          total - paid
        )
    };
  }

  function dtsPropertyTabs() {
    const properties =
      currentProperties || [];

    if (
      selectedPropertyId === null &&
      properties.length
    ) {
      const cottage =
        properties.find(
          property =>
            property.name ===
            "Little Yellow Cottage"
        );

      selectedPropertyId =
        cottage
          ? cottage.id
          : properties[0].id;
    }

    return `
      <div class="dts-property-tabs">
        ${
          properties
            .map(
              property => `
                <button
                  type="button"
                  class="dts-property-tab ${
                    selectedPropertyId ===
                    property.id
                      ? "active"
                      : ""
                  }"
                  data-dts-property="${property.id}"
                >
                  ${property.name}
                </button>
              `
            )
            .join("")
        }

        <button
          type="button"
          class="dts-property-tab ${
            selectedPropertyId ===
            "all"
              ? "active"
              : ""
          }"
          data-dts-property="all"
        >
          All Properties
        </button>
      </div>
    `;
  }

  function dtsFilteredReservations() {
    let items =
      [...currentReservations];

    if (
      selectedPropertyId &&
      selectedPropertyId !==
        "all"
    ) {
      items =
        items.filter(
          reservation =>
            reservation.property_id ===
            selectedPropertyId
        );
    }

    if (
      selectedStatus ===
      "upcoming"
    ) {
      items =
        items.filter(
          reservation =>
            dtsIsActive(
              reservation
            ) &&
            !dtsIsPast(
              reservation
            ) &&
            reservation.status !==
              "waitlisted"
        );
    }

    if (
      selectedStatus ===
      "past"
    ) {
      items =
        items.filter(
          reservation =>
            dtsIsActive(
              reservation
            ) &&
            dtsIsPast(
              reservation
            )
        );
    }

    if (
      selectedStatus ===
      "cancelled"
    ) {
      items =
        items.filter(
          reservation =>
            [
              "cancelled",
              "declined"
            ].includes(
              reservation.status
            )
        );
    }

    if (
      selectedStatus ===
      "waitlist"
    ) {
      items =
        items.filter(
          reservation =>
            reservation.status ===
            "waitlisted"
        );
    }

    if (searchText) {
      const needle =
        searchText.toLowerCase();

      items =
        items.filter(
          reservation =>
            [
              reservation.guest_name,
              reservation.guest_email,
              reservation.guest_phone,
              reservation.property_name
            ]
              .filter(Boolean)
              .some(
                value =>
                  String(value)
                    .toLowerCase()
                    .includes(needle)
              )
        );
    }

    items.sort(
      (a, b) => {
        const aDate =
          a.arrival_date || "";

        const bDate =
          b.arrival_date || "";

        return sortDirection ===
          "asc"
          ? aDate.localeCompare(
              bDate
            )
          : bDate.localeCompare(
              aDate
            );
      }
    );

    return items;
  }

  function dtsCounts() {
    let source =
      currentReservations;

    if (
      selectedPropertyId &&
      selectedPropertyId !==
        "all"
    ) {
      source =
        source.filter(
          reservation =>
            reservation.property_id ===
            selectedPropertyId
        );
    }

    const upcoming =
      source.filter(
        reservation =>
          dtsIsActive(
            reservation
          ) &&
          !dtsIsPast(
            reservation
          ) &&
          reservation.status !==
            "waitlisted"
      ).length;

    const past =
      source.filter(
        reservation =>
          dtsIsActive(
            reservation
          ) &&
          dtsIsPast(
            reservation
          )
      ).length;

    const waitlist =
      source.filter(
        reservation =>
          reservation.status ===
          "waitlisted"
      ).length;

    const cancelled =
      source.filter(
        reservation =>
          [
            "cancelled",
            "declined"
          ].includes(
            reservation.status
          )
      ).length;

    return {
      upcoming,
      past,
      waitlist,
      cancelled
    };
  }

  function dtsSummary() {
    const source =
      dtsFilteredReservations();

    let balance = 0;
    let revenue = 0;

    source.forEach(
      reservation => {
        const totals =
          dtsTotals(
            reservation
          );

        balance +=
          totals.balance;

        revenue +=
          totals.paid;
      }
    );

    const counts =
      dtsCounts();

    return `
      <div class="dts-reservation-summary">
        <div class="dts-summary-item">
          <div class="dts-summary-label">
            Upcoming stays
          </div>
          <div class="dts-summary-value">
            ${counts.upcoming}
          </div>
        </div>

        <div class="dts-summary-item">
          <div class="dts-summary-label">
            Past stays
          </div>
          <div class="dts-summary-value">
            ${counts.past}
          </div>
        </div>

        <div class="dts-summary-item">
          <div class="dts-summary-label">
            Waitlisted
          </div>
          <div class="dts-summary-value">
            ${counts.waitlist}
          </div>
        </div>

        <div class="dts-summary-item">
          <div class="dts-summary-label">
            Balance due
          </div>
          <div class="dts-summary-value">
            ${dtsMoney(balance)}
          </div>
        </div>

        <div class="dts-summary-item">
          <div class="dts-summary-label">
            Payments logged
          </div>
          <div class="dts-summary-value">
            ${dtsMoney(revenue)}
          </div>
        </div>
      </div>
    `;
  }

  function dtsStatusTabs() {
    const counts =
      dtsCounts();

    return `
      <div class="dts-status-tabs">
        <button
          type="button"
          class="dts-status-tab ${
            selectedStatus ===
            "all"
              ? "active"
              : ""
          }"
          data-dts-status="all"
        >
          All
        </button>

        <button
          type="button"
          class="dts-status-tab ${
            selectedStatus ===
            "upcoming"
              ? "active"
              : ""
          }"
          data-dts-status="upcoming"
        >
          Upcoming ${counts.upcoming}
        </button>

        <button
          type="button"
          class="dts-status-tab ${
            selectedStatus ===
            "past"
              ? "active"
              : ""
          }"
          data-dts-status="past"
        >
          Past ${counts.past}
        </button>

        <button
          type="button"
          class="dts-status-tab ${
            selectedStatus ===
            "cancelled"
              ? "active"
              : ""
          }"
          data-dts-status="cancelled"
        >
          Cancelled ${counts.cancelled}
        </button>

        <button
          type="button"
          class="dts-status-tab ${
            selectedStatus ===
            "waitlist"
              ? "active"
              : ""
          }"
          data-dts-status="waitlist"
        >
          Waitlist ${counts.waitlist}
        </button>
      </div>
    `;
  }

  function dtsReservationRows() {
    const items =
      dtsFilteredReservations();

    if (!items.length) {
      return `
        <div class="dts-empty-row">
          No reservations match these filters.
        </div>
      `;
    }

    return items
      .map(
        reservation => {
          const totals =
            dtsTotals(
              reservation
            );

          const cleaning =
            dtsCleaningConfirmed(
              reservation
            );

          return `
            <div class="dts-reservation-row">
              <div>
                <div class="dts-guest-name">
                  ${
                    reservation.guest_name ||
                    "Guest"
                  }
                </div>

                <div class="dts-guest-email">
                  ${
                    reservation.guest_email ||
                    ""
                  }
                </div>
              </div>

              <div>
                <button
                  type="button"
                  class="dts-date-button"
                  data-dts-open="${reservation.id}"
                >
                  ${dtsDate(reservation.arrival_date)}
                  –
                  ${dtsDate(reservation.departure_date)}
                </button>
              </div>

              <div>
                ${reservation.adults || 0}
              </div>

              <div>
                ${
                  cleaning
                    ? `
                      <span
                        class="dts-clean-icon"
                        title="Cleaning confirmed"
                        aria-label="Cleaning confirmed"
                      >
                        ✓
                      </span>
                    `
                    : ""
                }
              </div>

              <div>
                <span
                  class="dts-status ${reservation.status || "pending"}"
                >
                  ${String(
                    reservation.status ||
                    "pending"
                  ).replaceAll(
                    "_",
                    " "
                  )}
                </span>
              </div>

              <div>
                ${dtsMoney(
                  totals.total
                )}
              </div>

              <div>
                <strong>
                  ${dtsMoney(
                    totals.balance
                  )}
                </strong>

                ${
                  totals.balance <= 0 &&
                  totals.total > 0
                    ? `
                      <div class="dts-money-paid">
                        Paid in full
                      </div>
                    `
                    : totals.balance > 0
                      ? `
                        <div class="dts-money-due">
                          Balance due
                        </div>
                      `
                      : ""
                }
              </div>
            </div>
          `;
        }
      )
      .join("");
  }

  function dtsDetailPanel() {
    if (!selectedReservationId) {
      return `
        <aside class="dts-detail-panel">
          <div class="dts-detail-empty">
            Select a reservation by clicking its dates.
          </div>
        </aside>
      `;
    }

    const reservation =
      currentReservations.find(
        item =>
          item.id ===
          selectedReservationId
      );

    if (!reservation) {
      selectedReservationId =
        null;

      return dtsDetailPanel();
    }

    const totals =
      dtsTotals(
        reservation
      );

    return `
      <aside class="dts-detail-panel">
        <h3>
          ${
            reservation.guest_name ||
            "Guest"
          }
        </h3>

        <span
          class="dts-status ${reservation.status || "pending"}"
        >
          ${String(
            reservation.status ||
            "pending"
          ).replaceAll(
            "_",
            " "
          )}
        </span>

        <div
          class="dts-detail-meta"
          style="margin-top:12px;"
        >
          ${dtsDate(reservation.arrival_date)}
          –
          ${dtsDate(reservation.departure_date)}

          <br>

          ${reservation.property_name}

          <br>

          ${reservation.adults || 0}
          guest(s)

          ${
            reservation.dogs
              ? `<br>${reservation.dogs} dog(s)`
              : ""
          }

          ${
            reservation.guest_email
              ? `<br>${reservation.guest_email}`
              : ""
          }

          ${
            reservation.guest_phone
              ? `<br>${reservation.guest_phone}`
              : ""
          }
        </div>

        <div class="dts-detail-section">
          <strong>
            Payment summary
          </strong>

          <div class="dts-detail-money">
            <span>Total</span>
            <strong>
              ${dtsMoney(totals.total)}
            </strong>
          </div>

          <div class="dts-detail-money">
            <span>Paid</span>
            <strong>
              ${dtsMoney(totals.paid)}
            </strong>
          </div>

          <div class="dts-detail-money">
            <span>Balance</span>
            <strong>
              ${dtsMoney(totals.balance)}
            </strong>
          </div>
        </div>

        <details class="dts-full-details">
          <summary>
            Payment & reservation controls
          </summary>

          ${
            typeof reservationCard ===
            "function"
              ? reservationCard(
                  reservation
                )
              : ""
          }
        </details>
      </aside>
    `;
  }

  function renderDtsReservations() {
    const mount =
      document.getElementById(
        "reservationList"
      );

    if (!mount) {
      return;
    }

    mount.innerHTML = `
      <div class="dts-reservations-shell">

        ${dtsPropertyTabs()}

        <div class="dts-toolbar">
          ${dtsStatusTabs()}

          <div
            style="
              display:flex;
              gap:8px;
              flex-wrap:wrap;
            "
          >
            <input
              type="search"
              placeholder="Search guest or email"
              value="${searchText}"
              data-dts-search
            >

            <select data-dts-sort>
              <option
                value="asc"
                ${
                  sortDirection ===
                  "asc"
                    ? "selected"
                    : ""
                }
              >
                Arrival date — soonest
              </option>

              <option
                value="desc"
                ${
                  sortDirection ===
                  "desc"
                    ? "selected"
                    : ""
                }
              >
                Arrival date — latest
              </option>
            </select>
          </div>
        </div>

        ${dtsSummary()}

        <div class="dts-reservation-layout">
          <section
            class="dts-reservation-table-card"
          >
            <div class="dts-table-title">
              Reservations
            </div>

            <div
              class="
                dts-reservation-row
                dts-reservation-head
              "
            >
              <div>Guest</div>
              <div>Dates</div>
              <div>Guests</div>
              <div title="Cleaning confirmed">
                🧹
              </div>
              <div>Status</div>
              <div>Total</div>
              <div>Balance</div>
            </div>

            ${dtsReservationRows()}
          </section>

          ${dtsDetailPanel()}
        </div>
      </div>
    `;
  }

  document.addEventListener(
    "click",
    event => {
      const propertyButton =
        event.target.closest(
          "[data-dts-property]"
        );

      if (propertyButton) {
        selectedPropertyId =
          propertyButton.dataset.dtsProperty;

        selectedReservationId =
          null;

        renderDtsReservations();
        return;
      }

      const statusButton =
        event.target.closest(
          "[data-dts-status]"
        );

      if (statusButton) {
        selectedStatus =
          statusButton.dataset.dtsStatus;

        selectedReservationId =
          null;

        renderDtsReservations();
        return;
      }

      const openButton =
        event.target.closest(
          "[data-dts-open]"
        );

      if (openButton) {
        selectedReservationId =
          openButton.dataset.dtsOpen;

        renderDtsReservations();
      }
    }
  );

  document.addEventListener(
    "input",
    event => {
      if (
        event.target.matches(
          "[data-dts-search]"
        )
      ) {
        searchText =
          event.target.value;

        renderDtsReservations();

        const input =
          document.querySelector(
            "[data-dts-search]"
          );

        if (input) {
          input.focus();

          input.setSelectionRange(
            input.value.length,
            input.value.length
          );
        }
      }
    }
  );

  document.addEventListener(
    "change",
    event => {
      if (
        event.target.matches(
          "[data-dts-sort]"
        )
      ) {
        sortDirection =
          event.target.value;

        renderDtsReservations();
      }
    }
  );

  const mount =
    document.getElementById(
      "reservationList"
    );

  if (mount) {
    const observer =
      new MutationObserver(
        () => {
          if (
            !mount.querySelector(
              ".dts-reservations-shell"
            )
          ) {
            window.setTimeout(
              renderDtsReservations,
              20
            );
          }
        }
      );

    observer.observe(
      mount,
      {
        childList: true,
        subtree: false
      }
    );
  }

  window.setTimeout(
    renderDtsReservations,
    600
  );
})();
