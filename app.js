const STORAGE_KEY = "been-tracker-visited-v1";

const state = {
  query: "",
  continent: "All",
  visited: new Set(loadVisited()),
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

const continents = ["All", ...new Set(COUNTRIES.map((c) => c.continent))];

init();

function init() {
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

    const main = document.createElement("div");
    main.className = "country-main";

    const textWrap = document.createElement("div");

    const name = document.createElement("p");
    name.className = "country-name";
    name.textContent = country.name;

    const meta = document.createElement("p");
    meta.className = "country-meta";
    meta.textContent = country.continent;

    textWrap.appendChild(name);
    textWrap.appendChild(meta);
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
