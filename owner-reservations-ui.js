(() => {
  let selectedReservationId = null;
  let selectedPropertyId = null;
  let selectedStatus = "all";
  let searchText = "";
  let sortDirection = "asc";

  const style =
    document.createElement("style");

  style.textContent = `
    .dts-reservations-shell {
      display:grid;
      gap:18px;
      min-width:0;
    }

    .dts-property-tabs,
    .dts-status-tabs {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }

    .dts-property-tab,
    .dts-status-tab {
      border:1px solid #d9dee5;
      background:#fff;
      color:#172334;
      border-radius:8px;
      padding:9px 14px;
      font-weight:600;
      cursor:pointer;
    }

    .dts-property-tab.active,
    .dts-status-tab.active {
      background:#0d2b4d;
      border-color:#0d2b4d;
      color:#fff;
    }

    .dts-toolbar {
      display:flex;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      align-items:center;
      min-width:0;
    }

    .dts-toolbar input,
    .dts-toolbar select {
      border:1px solid #d9dee5;
      background:#fff;
      border-radius:8px;
      padding:10px 12px;
      box-sizing:border-box;
    }

    .dts-toolbar input {
      min-width:280px;
    }

    .dts-reservation-summary {
      display:grid;
      grid-template-columns:
        repeat(5,minmax(0,1fr));
      border:1px solid #e5e7eb;
      border-radius:12px;
      overflow:hidden;
      background:#fff;
      min-width:0;
    }

    .dts-summary-item {
      padding:15px;
      border-right:1px solid #e5e7eb;
      min-width:0;
    }

    .dts-summary-item:last-child {
      border-right:0;
    }

    .dts-summary-label {
      color:#6f7782;
      font-size:11px;
      margin-bottom:4px;
    }

    .dts-summary-value {
      color:#0d2b4d;
      font-weight:700;
      font-size:20px;
      overflow-wrap:anywhere;
    }

    .dts-reservation-layout {
      display:grid;
      grid-template-columns:
        minmax(0,1fr)
        minmax(320px,360px);
      gap:18px;
      align-items:start;
      min-width:0;
    }

    .dts-reservation-table-card,
    .dts-detail-panel {
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:14px;
      min-width:0;
    }

    .dts-reservation-table-card {
      overflow-x:auto;
      overflow-y:hidden;
    }

    .dts-detail-panel {
      overflow:hidden;
    }

    .dts-table-title {
      padding:16px 18px;
      border-bottom:1px solid #e5e7eb;
      color:#0d2b4d;
      font-weight:700;
      min-width:720px;
    }

    .dts-reservation-row {
      display:grid;
      grid-template-columns:
        minmax(145px,1.2fr)
        minmax(125px,.95fr)
        58px
        30px
        105px
        85px
        90px;
      gap:8px;
      align-items:center;
      padding:13px 14px;
      border-bottom:1px solid #edf0f3;
      font-size:13px;
      min-width:720px;
      box-sizing:border-box;
    }

    .dts-reservation-row:last-child {
      border-bottom:0;
    }

    .dts-reservation-head {
      background:#fafbfc;
      color:#707987;
      font-size:11px;
      font-weight:700;
    }

    .dts-guest-name {
      color:#172334;
      font-weight:700;
    }

    .dts-guest-email {
      color:#737b86;
      font-size:11px;
      margin-top:2px;
      word-break:break-word;
    }

    .dts-date-button {
      border:1px solid #d5dce5;
      background:#f4f7fa;
      color:#0d2b4d;
      border-radius:8px;
      padding:8px 10px;
      font-weight:700;
      text-align:left;
      width:100%;
      cursor:pointer;
    }

    .dts-date-button:hover {
      background:#eaf0f6;
      border-color:#aebccc;
    }

    .dts-status {
      display:inline-block;
      width:max-content;
      max-width:100%;
      padding:5px 8px;
      border-radius:6px;
      font-size:11px;
      font-weight:700;
      overflow-wrap:anywhere;
    }

    .dts-status.booked {
      background:#e4f0df;
      color:#35643e;
    }

    .dts-status.pending_payment,
    .dts-status.pending,
    .dts-status.requested,
    .dts-status.approved,
    .dts-status.held,
    .dts-status.hold {
      background:#fff0c9;
      color:#725600;
    }

    .dts-status.waitlisted {
      background:#eee8f8;
      color:#594878;
    }

    .dts-status.cancelled,
    .dts-status.declined {
      background:#f1f2f4;
      color:#777;
    }

    .dts-clean-icon {
      width:24px;
      height:24px;
      display:inline-grid;
      place-items:center;
      border-radius:50%;
      background:#e4f0df;
      color:#35643e;
      font-size:13px;
      font-weight:800;
    }

    .dts-money-paid {
      color:#35643e;
      font-size:11px;
      margin-top:2px;
    }

    .dts-money-due {
      color:#a23a31;
      font-size:11px;
      margin-top:2px;
    }

    .dts-detail-panel {
      position:sticky;
      top:24px;
      padding:18px;
      min-height:280px;
      box-sizing:border-box;
    }

    .dts-detail-empty {
      color:#7d8490;
      padding:40px 12px;
      text-align:center;
    }

    .dts-detail-panel h3 {
      margin:0 0 6px;
      color:#0d2b4d;
      font-size:20px;
      overflow-wrap:anywhere;
    }

    .dts-detail-meta {
      color:#6f7782;
      font-size:13px;
      line-height:1.6;
      overflow-wrap:anywhere;
    }

    .dts-detail-section {
      border-top:1px solid #e5e7eb;
      margin-top:16px;
      padding-top:16px;
    }

    .dts-detail-money {
      display:flex;
      justify-content:space-between;
      gap:15px;
      margin:7px 0;
      font-size:13px;
    }

    .dts-detail-money strong {
      color:#0d2b4d;
    }

    .dts-cancel-hold {
      width:100%;
      margin-top:14px;
      border:1px solid #c94b43;
      border-radius:8px;
      background:#fff;
      color:#a52f28;
      padding:11px 14px;
      font-weight:700;
      cursor:pointer;
    }

    .dts-cancel-hold:hover {
      background:#fff4f3;
    }

    .dts-cancel-hold:disabled {
      opacity:.6;
      cursor:wait;
    }

    .dts-lease-settings {
      border-top:1px solid #e5e7eb;
      margin-top:18px;
      padding-top:18px;
    }

    .dts-lease-settings h4 {
      margin:0 0 4px;
      color:#0d2b4d;
      font-size:18px;
    }

    .dts-lease-help {
      color:#6f7782;
      font-size:12px;
      line-height:1.45;
      margin-bottom:14px;
    }

    .dts-lease-fields {
      display:grid;
      gap:11px;
    }

    .dts-lease-fields label {
      display:flex;
      flex-direction:column;
      gap:5px;
      font-size:12px;
      font-weight:700;
      color:#303a47;
    }

    .dts-lease-fields input,
    .dts-lease-fields textarea,
    .dts-lease-fields select {
      width:100%;
      box-sizing:border-box;
      border:1px solid #cfd5dd;
      background:#fff;
      border-radius:7px;
      padding:9px 10px;
      font:inherit;
      font-weight:400;
      color:#172334;
    }

    .dts-lease-fields textarea {
      resize:vertical;
      min-height:72px;
    }

    .dts-lease-two {
      display:grid;
      grid-template-columns:
        1fr 1fr;
      gap:10px;
    }

    .dts-amenities {
      display:grid;
      grid-template-columns:
        1fr 1fr;
      gap:7px 10px;
      padding:10px;
      border:1px solid #e5e7eb;
      border-radius:8px;
      background:#fafbfc;
    }

    .dts-amenities label {
      display:flex;
      flex-direction:row;
      align-items:center;
      gap:7px;
      font-size:12px;
      font-weight:600;
    }

    .dts-amenities input {
      width:auto;
      margin:0;
    }

    .dts-create-lease {
      width:100%;
      margin-top:14px;
      border:0;
      border-radius:8px;
      background:#0d2b4d;
      color:#fff;
      padding:11px 14px;
      font-weight:700;
      cursor:pointer;
    }

    .dts-create-lease:disabled {
      opacity:.6;
      cursor:wait;
    }

    .dts-full-details {
      margin-top:14px;
    }

    .dts-full-details summary {
      cursor:pointer;
      color:#155aa8;
      font-weight:700;
    }

    .dts-full-details .card.res {
      margin:14px 0 0;
      padding:14px;
      grid-template-columns:1fr;
      min-width:0;
      overflow-wrap:anywhere;
    }

    .dts-full-details .actions {
      margin-top:10px;
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    }

    .dts-full-details .actions button,
    .dts-full-details .actions a {
      max-width:100%;
      box-sizing:border-box;
    }

    .dts-full-details
    button[data-action="create_lease"] {
      display:none !important;
    }

    .dts-full-details
    details:has([data-lease-rental-type]) {
      display:none !important;
    }

    .dts-empty-row {
      padding:28px;
      color:#7d8490;
      text-align:center;
      min-width:720px;
      box-sizing:border-box;
    }

    @media (max-width:1180px) {
      .dts-reservation-layout {
        grid-template-columns:1fr;
      }

      .dts-detail-panel {
        position:static;
      }

      .dts-reservation-summary {
        grid-template-columns:
          repeat(2,minmax(0,1fr));
      }
    }

    @media (max-width:820px) {
      .dts-reservation-table-card {
        overflow-x:visible;
      }

      .dts-table-title,
      .dts-reservation-row,
      .dts-empty-row {
        min-width:0;
      }

      .dts-reservation-row {
        grid-template-columns:1fr;
        gap:6px;
      }

      .dts-reservation-head {
        display:none;
      }

      .dts-toolbar input {
        min-width:100%;
      }

      .dts-reservation-summary {
        grid-template-columns:
          1fr 1fr;
      }

      .dts-lease-two,
      .dts-amenities {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(style);


  function dtsEsc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function dtsDate(value) {
    if (!value) {
      return "";
    }

    return new Date(
      `${value}T12:00:00`
    ).toLocaleDateString(
      "en-US",
      {
        month:"short",
        day:"numeric",
        year:"numeric"
      }
    );
  }


  function dtsMoney(value) {
    return Number(
      value || 0
    ).toLocaleString(
      "en-US",
      {
        style:"currency",
        currency:"USD"
      }
    );
  }


  function dtsIsActive(
    reservation
  ) {
    return ![
      "cancelled",
      "declined"
    ].includes(
      reservation.status
    );
  }


  function dtsCanCancelHold(
    reservation
  ) {
    return [
      "pending_payment",
      "pending",
      "requested",
      "approved",
      "held",
      "hold"
    ].includes(
      reservation.status
    );
  }


  function dtsIsPast(
    reservation
  ) {
    if (
      !reservation.departure_date
    ) {
      return false;
    }

    const departure =
      new Date(
        `${reservation.departure_date}T12:00:00`
      );

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

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
        reservation.amount_due ||
        0
      );

    const paid =
      currentPayments
        .filter(
          payment =>
            payment.reservation_id ===
            reservation.id
        )
        .reduce(
          (
            sum,
            payment
          ) =>
            sum +
            Number(
              payment.amount ||
              0
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


  function dtsPropertyForReservation(
    reservation
  ) {
    return (
      currentProperties ||
      []
    ).find(
      property =>
        property.id ===
        reservation.property_id
    ) || null;
  }


  function dtsObject(value) {
    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      ? value
      : {};
  }


  function dtsLeaseValues(
    reservation
  ) {
    const property =
      dtsPropertyForReservation(
        reservation
      );

    const defaults =
      dtsObject(
        property?.lease_defaults
      );

    const overrides =
      dtsObject(
        reservation.lease_overrides
      );

    return {
      ...defaults,
      ...overrides
    };
  }


  function dtsChecked(value) {
    return value
      ? "checked"
      : "";
  }


  function dtsPropertyTabs() {
    const properties =
      currentProperties || [];

    if (
      selectedPropertyId ===
        null &&
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
      <div
        class="dts-property-tabs"
      >
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
                  data-dts-property="${
                    property.id
                  }"
                >
                  ${
                    dtsEsc(
                      property.name
                    )
                  }
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
      [
        ...currentReservations
      ];

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

    if (
      searchText
    ) {
      const needle =
        searchText
          .toLowerCase();

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
                    .includes(
                      needle
                    )
              )
        );
    }

    items.sort(
      (
        a,
        b
      ) => {
        const aDate =
          a.arrival_date ||
          "";

        const bDate =
          b.arrival_date ||
          "";

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
      <div
        class="dts-reservation-summary"
      >
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
            selectedStatus === "all"
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
            selectedStatus === "upcoming"
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
            selectedStatus === "past"
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
            selectedStatus === "cancelled"
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
            selectedStatus === "waitlist"
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
          No reservations match
          these filters.
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
                    dtsEsc(
                      reservation.guest_name ||
                      "Guest"
                    )
                  }
                </div>

                <div class="dts-guest-email">
                  ${
                    dtsEsc(
                      reservation.guest_email ||
                      ""
                    )
                  }
                </div>
              </div>

              <div>
                <button
                  type="button"
                  class="dts-date-button"
                  data-dts-open="${
                    reservation.id
                  }"
                >
                  ${
                    dtsDate(
                      reservation.arrival_date
                    )
                  }
                  –
                  ${
                    dtsDate(
                      reservation.departure_date
                    )
                  }
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
                  class="dts-status ${
                    reservation.status ||
                    "pending"
                  }"
                >
                  ${
                    dtsEsc(
                      String(
                        reservation.status ||
                        "pending"
                      ).replaceAll(
                        "_",
                        " "
                      )
                    )
                  }
                </span>
              </div>

              <div>
                ${dtsMoney(totals.total)}
              </div>

              <div>
                <strong>
                  ${dtsMoney(totals.balance)}
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


  function dtsLeaseSettingsMarkup(
    reservation
  ) {
    const lease =
      typeof leaseForReservation ===
      "function"
        ? leaseForReservation(
            reservation.id
          )
        : null;

    if (
      lease ||
      [
        "cancelled",
        "declined"
      ].includes(
        reservation.status
      )
    ) {
      return "";
    }

    const values =
      dtsLeaseValues(
        reservation
      );

    const dogs =
      Number(
        reservation.dogs ||
        0
      );

    const property =
      dtsPropertyForReservation(
        reservation
      );

    return `
      <section
        class="dts-lease-settings"
        data-dts-lease-settings="${
          reservation.id
        }"
      >
        <h4>Lease settings</h4>

        <div class="dts-lease-help">
          Review these details for
          this reservation before
          creating the lease.
        </div>

        <div class="dts-lease-fields">

          <label>
            Lease type

            <select data-dts-rental-type>
              <option
                value="standard"
                selected
              >
                Regular summer
              </option>
            </select>
          </label>

          <div class="dts-lease-two">
            <label>
              Check-in

              <input
                type="text"
                value="${
                  dtsEsc(
                    values.check_in_time ||
                    "2:00 PM"
                  )
                }"
                data-dts-check-in
              >
            </label>

            <label>
              Checkout

              <input
                type="text"
                value="${
                  dtsEsc(
                    values.check_out_time ||
                    "10:00 AM"
                  )
                }"
                data-dts-check-out
              >
            </label>
          </div>

          <label>
            Security deposit

            <input
              type="number"
              min="0"
              step="0.01"
              value="${
                Number(
                  reservation.security_deposit ||
                  0
                )
              }"
              data-dts-security-deposit
            >
          </label>

          <div class="dts-lease-two">
            <label>
              Number of dogs

              <input
                type="number"
                min="0"
                step="1"
                value="${dogs}"
                data-dts-dogs
              >
            </label>

            <label>
              Dog name(s)

              <input
                type="text"
                value="${
                  dtsEsc(
                    reservation.dog_names ||
                    ""
                  )
                }"
                placeholder="Example: Lucy, Max"
                data-dts-dog-names
              >
            </label>
          </div>

          <label>
            Bed configuration

            <input
              type="text"
              value="${
                dtsEsc(
                  values.bed_configuration ||
                  ""
                )
              }"
              placeholder="Example: 1 king, 1 queen, 2 twins"
              data-dts-bed-configuration
            >
          </label>

          <label>
            Linens

            <textarea
              data-dts-linens
              placeholder="What guests need to bring"
            >${
              dtsEsc(
                values.linens_text ||
                "Guests are responsible for bringing their own sheets, towels, and other personal linens."
              )
            }</textarea>
          </label>

          <div class="dts-lease-two">
            <label>
              Beach chairs

              <input
                type="number"
                min="0"
                step="1"
                value="${
                  Number(
                    values.beach_chairs ||
                    0
                  )
                }"
                data-dts-beach-chairs
              >
            </label>

            <label>
              Beach tags

              <input
                type="number"
                min="0"
                step="1"
                value="${
                  Number(
                    values.beach_tags ||
                    0
                  )
                }"
                data-dts-beach-tags
              >
            </label>
          </div>

          <label>
            Lost beach tag charge

            <input
              type="number"
              min="0"
              step="0.01"
              value="${
                Number(
                  values.beach_tag_replacement_fee ??
                  50
                )
              }"
              data-dts-beach-tag-fee
            >
          </label>

          <div class="dts-amenities">
            <label>
              <input
                type="checkbox"
                data-dts-washer-dryer
                ${
                  dtsChecked(
                    values.washer_dryer
                  )
                }
              >
              Washer / dryer
            </label>

            <label>
              <input
                type="checkbox"
                data-dts-internet
                ${
                  dtsChecked(
                    values.internet
                  )
                }
              >
              Internet
            </label>

            <label>
              <input
                type="checkbox"
                data-dts-smart-tv
                ${
                  dtsChecked(
                    values.smart_tv
                  )
                }
              >
              Smart TV
            </label>

            <label>
              <input
                type="checkbox"
                data-dts-coffee-pot
                ${
                  dtsChecked(
                    values.coffee_pot
                  )
                }
              >
              Coffee pot
            </label>

            <label>
              <input
                type="checkbox"
                data-dts-stocked-kitchen
                ${
                  dtsChecked(
                    values.fully_stocked_kitchen
                  )
                }
              >
              Fully stocked kitchen
            </label>
          </div>

          <div class="dts-lease-help">
            Property:
            ${
              dtsEsc(
                property?.name ||
                reservation.property_name ||
                ""
              )
            }
          </div>

        </div>

        <button
          type="button"
          class="dts-create-lease"
          data-dts-create-lease="${
            reservation.id
          }"
        >
          Create & send lease
        </button>
      </section>
    `;
  }


  function dtsDetailPanel() {
    if (!selectedReservationId) {
      return `
        <aside class="dts-detail-panel">
          <div class="dts-detail-empty">
            Select a reservation
            by clicking its dates.
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
            dtsEsc(
              reservation.guest_name ||
              "Guest"
            )
          }
        </h3>

        <span
          class="dts-status ${
            reservation.status ||
            "pending"
          }"
        >
          ${
            dtsEsc(
              String(
                reservation.status ||
                "pending"
              ).replaceAll(
                "_",
                " "
              )
            )
          }
        </span>

        <div
          class="dts-detail-meta"
          style="margin-top:12px;"
        >
          ${
            dtsDate(
              reservation.arrival_date
            )
          }
          –
          ${
            dtsDate(
              reservation.departure_date
            )
          }

          <br>

          ${
            dtsEsc(
              reservation.property_name ||
              ""
            )
          }

          <br>

          ${reservation.adults || 0}
          guest(s)

          ${
            reservation.dogs
              ? `
                <br>
                ${reservation.dogs}
                dog(s)
                ${
                  reservation.dog_names
                    ? ` · ${dtsEsc(
                        reservation.dog_names
                      )}`
                    : ""
                }
              `
              : ""
          }

          ${
            reservation.guest_email
              ? `
                <br>
                ${
                  dtsEsc(
                    reservation.guest_email
                  )
                }
              `
              : ""
          }

          ${
            reservation.guest_phone
              ? `
                <br>
                ${
                  dtsEsc(
                    reservation.guest_phone
                  )
                }
              `
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

          ${
            dtsCanCancelHold(
              reservation
            )
              ? `
                <button
                  type="button"
                  class="dts-cancel-hold"
                  data-dts-cancel-hold="${
                    reservation.id
                  }"
                >
                  Cancel reservation / release hold
                </button>
              `
              : ""
          }
        </div>

        ${
          dtsLeaseSettingsMarkup(
            reservation
          )
        }

        <details class="dts-full-details">
          <summary>
            Payment & reservation
            controls
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
              min-width:0;
            "
          >
            <input
              type="search"
              placeholder="Search guest or email"
              value="${
                dtsEsc(
                  searchText
                )
              }"
              data-dts-search
            >

            <select data-dts-sort>
              <option
                value="asc"
                ${
                  sortDirection === "asc"
                    ? "selected"
                    : ""
                }
              >
                Arrival date — soonest
              </option>

              <option
                value="desc"
                ${
                  sortDirection === "desc"
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
          <section class="dts-reservation-table-card">
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

              <div
                title="Cleaning confirmed"
              >
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


  async function dtsCancelHold(
    button
  ) {
    const reservationId =
      button.dataset
        .dtsCancelHold;

    const reservation =
      currentReservations.find(
        item =>
          item.id ===
          reservationId
      );

    if (!reservation) {
      throw new Error(
        "Reservation could not be found."
      );
    }

    const guestName =
      reservation.guest_name ||
      "this guest";

    const confirmed =
      window.confirm(
        `Cancel the reservation for ${guestName} and release these dates?`
      );

    if (!confirmed) {
      return false;
    }

    button.disabled =
      true;

    button.textContent =
      "Cancelling…";

    await updateReservation(
      reservation.id,
      {
        status:
          "cancelled",

        hold_expires_at:
          null
      }
    );

    reservation.status =
      "cancelled";

    reservation.hold_expires_at =
      null;

    selectedReservationId =
      reservation.id;

    if (
      typeof refresh ===
      "function"
    ) {
      await refresh();
    }

    renderDtsReservations();

    return true;
  }


  async function dtsSaveAndCreateLease(
    button
  ) {
    const reservationId =
      button.dataset
        .dtsCreateLease;

    const reservation =
      currentReservations.find(
        item =>
          item.id ===
          reservationId
      );

    if (!reservation) {
      throw new Error(
        "Reservation could not be found."
      );
    }

    const panel =
      button.closest(
        "[data-dts-lease-settings]"
      );

    if (!panel) {
      throw new Error(
        "Lease settings could not be found."
      );
    }

    const dogs =
      Number(
        panel.querySelector(
          "[data-dts-dogs]"
        ).value ||
        0
      );

    const dogNames =
      panel.querySelector(
        "[data-dts-dog-names]"
      ).value.trim();

    if (
      dogs > 0 &&
      !dogNames
    ) {
      throw new Error(
        "Enter the dog name or names."
      );
    }

    const securityDeposit =
      Number(
        panel.querySelector(
          "[data-dts-security-deposit]"
        ).value ||
        0
      );

    const leaseOverrides = {
      check_in_time:
        panel.querySelector(
          "[data-dts-check-in]"
        ).value.trim() ||
        "2:00 PM",

      check_out_time:
        panel.querySelector(
          "[data-dts-check-out]"
        ).value.trim() ||
        "10:00 AM",

      bed_configuration:
        panel.querySelector(
          "[data-dts-bed-configuration]"
        ).value.trim(),

      linens_text:
        panel.querySelector(
          "[data-dts-linens]"
        ).value.trim(),

      beach_chairs:
        Number(
          panel.querySelector(
            "[data-dts-beach-chairs]"
          ).value ||
          0
        ),

      beach_tags:
        Number(
          panel.querySelector(
            "[data-dts-beach-tags]"
          ).value ||
          0
        ),

      beach_tag_replacement_fee:
        Number(
          panel.querySelector(
            "[data-dts-beach-tag-fee]"
          ).value ||
          50
        ),

      washer_dryer:
        panel.querySelector(
          "[data-dts-washer-dryer]"
        ).checked,

      internet:
        panel.querySelector(
          "[data-dts-internet]"
        ).checked,

      smart_tv:
        panel.querySelector(
          "[data-dts-smart-tv]"
        ).checked,

      coffee_pot:
        panel.querySelector(
          "[data-dts-coffee-pot]"
        ).checked,

      fully_stocked_kitchen:
        panel.querySelector(
          "[data-dts-stocked-kitchen]"
        ).checked
    };

    await updateReservation(
      reservation.id,
      {
        rental_type:
          "standard",

        security_deposit:
          securityDeposit,

        dogs,

        dog_names:
          dogs > 0
            ? dogNames
            : null,

        lease_overrides:
          leaseOverrides
      }
    );

    reservation.rental_type =
      "standard";

    reservation.security_deposit =
      securityDeposit;

    reservation.dogs =
      dogs;

    reservation.dog_names =
      dogs > 0
        ? dogNames
        : null;

    reservation.lease_overrides =
      leaseOverrides;

    const leaseResult =
      await createLeaseForReservation(
        reservation
      );

    return leaseResult;
  }


  document.addEventListener(
    "click",
    async event => {
      const cancelButton =
        event.target.closest(
          "[data-dts-cancel-hold]"
        );

      if (!cancelButton) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      try {
        const cancelled =
          await dtsCancelHold(
            cancelButton
          );

        if (cancelled) {
          window.alert(
            "Reservation cancelled. The hold has been released."
          );
        }
      } catch (error) {
        window.alert(
          `Cancellation error: ${
            error.message ||
            "Could not cancel the reservation."
          }`
        );

        cancelButton.disabled =
          false;

        cancelButton.textContent =
          "Cancel reservation / release hold";
      }
    },
    true
  );


  document.addEventListener(
    "click",
    async event => {
      const createButton =
        event.target.closest(
          "[data-dts-create-lease]"
        );

      if (!createButton) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const originalText =
        createButton.textContent;

      try {
        createButton.disabled =
          true;

        createButton.textContent =
          "Creating lease…";

        const result =
          await dtsSaveAndCreateLease(
            createButton
          );

        window.alert(
          result.email_sent
            ? "Lease created. The signing email was sent to the guest."
            : "Lease created, but the email was not confirmed as sent."
        );

        if (
          typeof refresh ===
          "function"
        ) {
          await refresh();
        }

        renderDtsReservations();

      } catch (error) {
        window.alert(
          `Lease error: ${
            error.message ||
            "Could not create lease."
          }`
        );

        createButton.disabled =
          false;

        createButton.textContent =
          originalText;
      }
    },
    true
  );


  document.addEventListener(
    "click",
    event => {
      const propertyButton =
        event.target.closest(
          "[data-dts-property]"
        );

      if (propertyButton) {
        selectedPropertyId =
          propertyButton.dataset
            .dtsProperty;

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
          statusButton.dataset
            .dtsStatus;

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
          openButton.dataset
            .dtsOpen;

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
        childList:true,
        subtree:false
      }
    );
  }


  window.setTimeout(
    renderDtsReservations,
    600
  );
})();
