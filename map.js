const STORAGE_KEY = "been-tracker-visited-v1";
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_LABELS = ["Far", "World", "Continent", "Country", "City"];

const state = {
  visited: new Set(loadVisited()),
};

const visitedCountEl = document.getElementById("visitedCount");
const countryCountEl = document.getElementById("countryCount");
const progressFillEl = document.getElementById("progressFill");
const progressTextEl = document.getElementById("progressText");
const progressBarEl = document.getElementById("progressBar");
const clearVisitedEl = document.getElementById("clearVisited");
const zoomInEl = document.getElementById("zoomIn");
const zoomOutEl = document.getElementById("zoomOut");
const zoomLabelEl = document.getElementById("zoomLabel");

let map = null;
let selectedCountryName = null;
const countryLayersByName = new Map();

init();

function init() {
  map = L.map("worldMap", {
    center: [25, 15],
    zoom: 2,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    worldCopyJump: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  map.on("zoomend", updateZoomUI);

  clearVisitedEl.addEventListener("click", () => {
    state.visited.clear();
    persistVisited();
    refreshCountryStyles();
    renderStats();
  });

  zoomInEl.addEventListener("click", () => {
    map.zoomIn();
  });

  zoomOutEl.addEventListener("click", () => {
    map.zoomOut();
  });

  updateZoomUI();
  renderStats();
  loadCountriesLayer();
}

async function loadCountriesLayer() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
    );
    if (!response.ok) {
      throw new Error(`GeoJSON load failed: ${response.status}`);
    }

    const geojson = await response.json();
    const israelFeatures = [];
    const regularFeatures = [];

    for (const feature of geojson.features) {
      const canonicalName = normalizeMapCountryName(feature.properties.name);
      if (canonicalName === "Israel") {
        israelFeatures.push(feature);
      } else {
        regularFeatures.push(feature);
      }
    }

    L.geoJSON({ type: "FeatureCollection", features: regularFeatures }, {
      style: () => ({
        color: "#c6bead",
        weight: 0.7,
        fillColor: "#efe8d8",
        fillOpacity: 0.55,
      }),
      onEachFeature,
    }).addTo(map);

    if (israelFeatures.length > 0) {
      const mergedIsrael = mergeFeaturesToMultiPolygon(israelFeatures);

      L.geoJSON(mergedIsrael, {
        style: () => ({
          color: "transparent",
          weight: 0,
          stroke: false,
          fillColor: "#efe8d8",
          fillOpacity: 0.55,
        }),
        onEachFeature: (_feature, layer) => onEachFeatureWithName("Israel", layer),
      }).addTo(map);
    }
  } catch (error) {
    console.error(error);
  }
}

function mergeFeaturesToMultiPolygon(features) {
  const coordinates = [];

  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry || !geometry.type || !geometry.coordinates) {
      continue;
    }

    if (geometry.type === "Polygon") {
      coordinates.push(geometry.coordinates);
      continue;
    }

    if (geometry.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates) {
        coordinates.push(polygon);
      }
    }
  }

  return {
    type: "Feature",
    properties: { name: "Israel" },
    geometry: {
      type: "MultiPolygon",
      coordinates,
    },
  };
}

function onEachFeature(feature, layer) {
  const canonicalName = normalizeMapCountryName(feature.properties.name);
  if (!canonicalName) {
    return;
  }

  onEachFeatureWithName(canonicalName, layer);
}

function onEachFeatureWithName(canonicalName, layer) {

  if (!countryLayersByName.has(canonicalName)) {
    countryLayersByName.set(canonicalName, []);
  }
  countryLayersByName.get(canonicalName).push(layer);
  applyCountryStyle(canonicalName, layer);

  layer.on("mouseover", () => {
    if (selectedCountryName !== canonicalName && canonicalName !== "Israel") {
      layer.setStyle({ weight: 1.2, fillOpacity: 0.65 });
    }
  });

  layer.on("mouseout", () => {
    applyCountryStyle(canonicalName, layer);
  });

  layer.on("click", () => {
    toggleVisited(canonicalName);
    selectedCountryName = canonicalName;
    applyCountryStyle(canonicalName, layer);
    renderStats();

    if (map.getZoom() < 3) {
      map.fitBounds(layer.getBounds().pad(0.55));
    }
  });

  layer.bindTooltip(canonicalName, {
    sticky: true,
    direction: "auto",
  });
}

function applyCountryStyle(countryName, layer) {
  const isVisited = state.visited.has(countryName);
  const isSelected = selectedCountryName === countryName;
  const isIsrael = countryName === "Israel";

  layer.setStyle({
    color: isIsrael ? "transparent" : isSelected ? "#0b6c8d" : "#c6bead",
    weight: isIsrael ? 0 : isSelected ? 1.6 : 0.7,
    stroke: !isIsrael,
    fillColor: isVisited ? "#24a164" : "#efe8d8",
    fillOpacity: isVisited ? 0.8 : 0.55,
  });
}

function refreshCountryStyles() {
  for (const [name, layers] of countryLayersByName.entries()) {
    for (const layer of layers) {
      applyCountryStyle(name, layer);
    }
  }
}

function normalizeMapCountryName(rawName) {
  const alias = {
    "United States of America": "United States",
    "Russian Federation": "Russia",
    "Korea, Republic of": "South Korea",
    "Korea, Democratic People's Republic of": "North Korea",
    Czechia: "Czechia",
    Palestine: "Israel",
    "State of Palestine": "Israel",
    "West Bank": "Israel",
    "Gaza Strip": "Israel",
  };

  const mappedName = alias[rawName] || rawName;
  if (COUNTRIES.some((country) => country.name === mappedName)) {
    return mappedName;
  }

  return null;
}

function toggleVisited(countryName) {
  if (state.visited.has(countryName)) {
    state.visited.delete(countryName);
  } else {
    state.visited.add(countryName);
  }

  persistVisited();
  refreshCountryStyles();
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

function updateZoomUI() {
  const zoom = map.getZoom();
  const labelIndex = Math.min(Math.max(zoom - 1, 0), ZOOM_LABELS.length - 1);

  zoomLabelEl.textContent = ZOOM_LABELS[labelIndex];
  zoomOutEl.disabled = zoom <= MIN_ZOOM;
  zoomInEl.disabled = zoom >= MAX_ZOOM;
}
