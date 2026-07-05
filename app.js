const STORAGE_KEY = "been-tracker-visited-v1";
const DETAILS_STORAGE_KEY = "been-tracker-country-details-v1";
const HOME_STORAGE_KEY = "been-tracker-home-country-v1";

const state = {
  query: "",
  continent: "All",
  visited: new Set(loadVisited()),
  details: loadDetails(),
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

function loadDetails() {
  try {
    const raw = localStorage.getItem(DETAILS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
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

    const name = document.createElement("p");
    name.className = "country-name";
    name.textContent = country.name;

    const meta = document.createElement("p");
    meta.className = "country-meta";
    meta.textContent = country.continent;

    const extra = document.createElement("div");
    extra.className = "country-extra";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "visit-date";
    dateInput.title = "Visit date";
    dateInput.value = state.details[country.name]?.visitDate || "";
    dateInput.addEventListener("change", (event) => {
      if (!state.details[country.name]) {
        state.details[country.name] = { visitDate: "", photos: [] };
      }
      state.details[country.name].visitDate = event.target.value;
      persistDetails();
    });

    const photoInput = document.createElement("input");
    photoInput.type = "file";
    photoInput.className = "photo-upload";
    photoInput.accept = "image/*";
    photoInput.multiple = true;
    photoInput.addEventListener("change", (event) => {
      if (!state.details[country.name]) {
        state.details[country.name] = { visitDate: "", photos: [] };
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
    photoCount.textContent = `${state.details[country.name]?.photos?.length || 0} photos`;

    extra.appendChild(dateInput);
    extra.appendChild(photoInput);
    extra.appendChild(photoCount);

    textWrap.appendChild(name);
    textWrap.appendChild(meta);
    textWrap.appendChild(extra);
    main.appendChild(textWrap);

    const isVisited = state.visited.has(country.name);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `visit-btn${isVisited ? " visited" : ""}`;
    button.textContent = isVisited ? "Visited" : "Mark";

    button.addEventListener("click", () => {
      toggleVisited(country.name);
    });

    item.appendChild(main);
    item.appendChild(button);
    countryListEl.appendChild(item);
  }
}

function toggleVisited(countryName) {
  if (state.visited.has(countryName)) {
    state.visited.delete(countryName);
  } else {
    state.visited.add(countryName);
  }

  persistVisited();
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
