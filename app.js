const STORAGE_KEY = "been-tracker-visited-v1";
const DETAILS_STORAGE_KEY = "been-tracker-country-details-v1";
const HOME_STORAGE_KEY = "been-tracker-home-country-v1";
const STATUS_NONE = "none";
const STATUS_VISITED = "visited";
const STATUS_WISHLIST = "wishlist";

const state = {
  query: "",
  continent: "All",
  visited: new Set(loadVisited()),
  details: loadDetailsNormalized(),
  homeCountry: loadHomeCountry(),
};

const countryListEl = document.getElementById("countryList");
const searchInputEl = document.getElementById("searchInput");
const continentFiltersEl = document.getElementById("continentFilters");
const visitedCountEl = document.getElementById("visitedCount");
const countryCountEl = document.getElementById("countryCount");
const progressFillEl = document.getElementById("progressFill");
const progressTextEl = document.getElementById("progressText");
const progressBarEl = document.getElementById("progressBar");
const emptyStateEl = document.getElementById("emptyState");
const clearVisitedEl = document.getElementById("clearVisited");
const homeCountrySelectEl = document.getElementById("homeCountrySelect");

const continents = ["All", ...new Set(COUNTRIES.map((c) => c.continent))];

init();

function init() {
  renderHomeCountrySelect();
  renderContinentFilters();
  renderCountryList();
  renderStats();

  searchInputEl.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderCountryList();
  });

  clearVisitedEl.addEventListener("click", () => {
    state.visited.clear();
    persistVisited();
    renderCountryList();
    renderStats();
  });

  if (homeCountrySelectEl) {
    homeCountrySelectEl.addEventListener("change", (event) => {
      state.homeCountry = event.target.value || "";
      persistHomeCountry();
      renderCountryList();
    });
  }
}

function createEmptyDetails() {
  return {
    status: STATUS_NONE,
    trips: [],
    targetDate: "",
    photos: [],
  };
}

function normalizeDetailShape(raw) {
  const base = createEmptyDetails();
  if (!raw || typeof raw !== "object") {
    return base;
  }

  const detail = { ...base };
  detail.status = [STATUS_NONE, STATUS_VISITED, STATUS_WISHLIST].includes(raw.status)
    ? raw.status
    : STATUS_NONE;

  // Backward compatibility from old single `visitDate` model.
  if (raw.visitDate && !Array.isArray(raw.trips)) {
    detail.status = STATUS_VISITED;
    detail.trips = [{ startDate: raw.visitDate, endDate: raw.visitDate }];
  }

  if (Array.isArray(raw.trips)) {
    detail.trips = raw.trips
      .filter((trip) => trip && typeof trip === "object")
      .map((trip) => ({
        startDate: trip.startDate || "",
        endDate: trip.endDate || "",
      }));
  }

  detail.targetDate = typeof raw.targetDate === "string" ? raw.targetDate : "";
  detail.photos = Array.isArray(raw.photos) ? raw.photos : [];

  if (detail.status === STATUS_NONE) {
    if (detail.trips.length > 0) {
      detail.status = STATUS_VISITED;
    } else if (detail.targetDate) {
      detail.status = STATUS_WISHLIST;
    }
  }

  return detail;
}

function loadDetailsNormalized() {
  try {
    const raw = localStorage.getItem(DETAILS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const normalized = {};
    for (const country of COUNTRIES) {
      normalized[country.name] = normalizeDetailShape(parsed[country.name]);
    }

    return normalized;
  } catch {
    return {};
  }
}

function persistDetails() {
  localStorage.setItem(DETAILS_STORAGE_KEY, JSON.stringify(state.details));
}

function loadHomeCountry() {
  try {
    return localStorage.getItem(HOME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function persistHomeCountry() {
  localStorage.setItem(HOME_STORAGE_KEY, state.homeCountry);
}

function renderHomeCountrySelect() {
  if (!homeCountrySelectEl) {
    return;
  }

  const countries = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  for (const country of countries) {
    const option = document.createElement("option");
    option.value = country.name;
    option.textContent = country.name;
    homeCountrySelectEl.appendChild(option);
  }

  homeCountrySelectEl.value = state.homeCountry;
}

function loadVisited() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((name) =>
      COUNTRIES.some((country) => country.name === name),
    );
  } catch {
    return [];
  }
}

function persistVisited() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.visited)));
}

function renderContinentFilters() {
  continentFiltersEl.innerHTML = "";

  for (const continent of continents) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-btn${state.continent === continent ? " active" : ""}`;
    button.textContent = continent;

    button.addEventListener("click", () => {
      state.continent = continent;
      renderContinentFilters();
      renderCountryList();
    });

    continentFiltersEl.appendChild(button);
  }
}

function getVisibleCountries() {
  return COUNTRIES.filter((country) => {
    const matchContinent =
      state.continent === "All" || country.continent === state.continent;
    const matchQuery =
      !state.query || country.name.toLowerCase().includes(state.query);
    return matchContinent && matchQuery;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function renderCountryList() {
  const visible = getVisibleCountries();

  countryListEl.innerHTML = "";
  emptyStateEl.hidden = visible.length !== 0;

  for (const country of visible) {
    const item = document.createElement("li");
    item.className = "country-item";
    if (state.homeCountry === country.name) {
      item.classList.add("home-country");
    }

    const main = document.createElement("div");
    main.className = "country-main";

    const textWrap = document.createElement("div");

    const name = document.createElement("a");
    name.className = "country-name country-name-link";
    name.textContent = country.name;
    name.href = `country.html?country=${encodeURIComponent(country.name)}`;

    const meta = document.createElement("p");
    meta.className = "country-meta";
    meta.textContent = country.continent;

    const extra = document.createElement("div");
    extra.className = "country-extra";

    const detail = state.details[country.name] || createEmptyDetails();

    const statusSelect = document.createElement("select");
    statusSelect.className = "status-select";
    statusSelect.innerHTML = `
      <option value="${STATUS_NONE}">No status</option>
      <option value="${STATUS_VISITED}">Visited</option>
      <option value="${STATUS_WISHLIST}">Want to visit</option>
    `;
    statusSelect.value = detail.status;
    statusSelect.addEventListener("change", (event) => {
      const nextStatus = event.target.value;
      if (!state.details[country.name]) {
        state.details[country.name] = createEmptyDetails();
      }

      state.details[country.name].status = nextStatus;
      if (nextStatus === STATUS_VISITED) {
        state.visited.add(country.name);
      } else {
        state.visited.delete(country.name);
      }

      persistDetails();
      persistVisited();
      renderCountryList();
      renderStats();
    });

    extra.appendChild(statusSelect);

    if (detail.status === STATUS_VISITED) {
      const tripsWrap = document.createElement("div");
      tripsWrap.className = "trips-wrap";

      const trips = detail.trips.length > 0 ? detail.trips : [{ startDate: "", endDate: "" }];
      if (detail.trips.length === 0) {
        state.details[country.name] = {
          ...detail,
          status: STATUS_VISITED,
          trips,
        };
      }

      trips.forEach((trip, tripIndex) => {
        const row = document.createElement("div");
        row.className = "trip-row";

        const startInput = document.createElement("input");
        startInput.type = "date";
        startInput.className = "visit-date";
        startInput.value = trip.startDate || "";
        startInput.title = "Start date";
        startInput.addEventListener("change", (event) => {
          state.details[country.name].trips[tripIndex].startDate = event.target.value;
          persistDetails();
        });

        const endInput = document.createElement("input");
        endInput.type = "date";
        endInput.className = "visit-date";
        endInput.value = trip.endDate || "";
        endInput.title = "End date";
        endInput.addEventListener("change", (event) => {
          state.details[country.name].trips[tripIndex].endDate = event.target.value;
          persistDetails();
        });

        row.appendChild(startInput);
        row.appendChild(endInput);

        if (trips.length > 1) {
          const removeTripBtn = document.createElement("button");
          removeTripBtn.type = "button";
          removeTripBtn.className = "trip-btn";
          removeTripBtn.textContent = "Remove";
          removeTripBtn.addEventListener("click", () => {
            state.details[country.name].trips.splice(tripIndex, 1);
            persistDetails();
            renderCountryList();
          });
          row.appendChild(removeTripBtn);
        }

        tripsWrap.appendChild(row);
      });

      const addTripBtn = document.createElement("button");
      addTripBtn.type = "button";
      addTripBtn.className = "trip-btn";
      addTripBtn.textContent = "Add visit";
      addTripBtn.addEventListener("click", () => {
        state.details[country.name].trips.push({ startDate: "", endDate: "" });
        persistDetails();
        renderCountryList();
      });

      tripsWrap.appendChild(addTripBtn);
      extra.appendChild(tripsWrap);
    }

    if (detail.status === STATUS_WISHLIST) {
      const targetInput = document.createElement("input");
      targetInput.type = "date";
      targetInput.className = "visit-date";
      targetInput.title = "Target date";
      targetInput.value = detail.targetDate || "";
      targetInput.addEventListener("change", (event) => {
        state.details[country.name].targetDate = event.target.value;
        persistDetails();
      });
      extra.appendChild(targetInput);
    }

    const photoInput = document.createElement("input");
    photoInput.type = "file";
    photoInput.className = "photo-upload";
    photoInput.accept = "image/*";
    photoInput.multiple = true;
    photoInput.addEventListener("change", (event) => {
      if (!state.details[country.name]) {
        state.details[country.name] = createEmptyDetails();
      }

      const files = Array.from(event.target.files || []).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }));

      state.details[country.name].photos = files;
      persistDetails();
      renderCountryList();
    });

    const photoCount = document.createElement("span");
    photoCount.className = "photo-count";
    photoCount.textContent = `${detail.photos?.length || 0} photos`;

    extra.appendChild(photoInput);
    extra.appendChild(photoCount);

    textWrap.appendChild(name);
    textWrap.appendChild(meta);
    textWrap.appendChild(extra);
    main.appendChild(textWrap);

    const isVisited = detail.status === STATUS_VISITED;
    const actionWrap = document.createElement("div");
    actionWrap.className = "country-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `visit-btn${isVisited ? " visited" : ""}`;
    button.textContent = isVisited ? "Visited" : "Mark visited";

    button.addEventListener("click", () => {
      quickToggleVisited(country.name);
    });

    actionWrap.appendChild(button);

    item.appendChild(main);
    item.appendChild(actionWrap);
    countryListEl.appendChild(item);
  }
}

function quickToggleVisited(countryName) {
  if (!state.details[countryName]) {
    state.details[countryName] = createEmptyDetails();
  }

  const detail = state.details[countryName];
  const isVisited = detail.status === STATUS_VISITED;
  detail.status = isVisited ? STATUS_NONE : STATUS_VISITED;
  if (!isVisited && detail.trips.length === 0) {
    detail.trips.push({ startDate: "", endDate: "" });
  }

  if (detail.status === STATUS_VISITED) {
    state.visited.add(countryName);
  } else {
    state.visited.delete(countryName);
  }

  persistVisited();
  persistDetails();
  renderCountryList();
  renderStats();
}

function renderStats() {
  const visitedCount = state.visited.size;
  const countryCount = COUNTRIES.length;
  const progress =
    countryCount === 0 ? 0 : Math.round((visitedCount / countryCount) * 100);

  visitedCountEl.textContent = String(visitedCount);
  countryCountEl.textContent = String(countryCount);
  progressFillEl.style.width = `${progress}%`;
  progressTextEl.textContent = `${progress}%`;
  progressBarEl.setAttribute("aria-valuenow", String(progress));
}
