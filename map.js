const STORAGE_KEY = "been-tracker-visited-v1";

const ZOOM_LEVELS = [
  { label: "World",      region: "world" },
  { label: "Europe",     region: "150"   },
  { label: "Asia",       region: "142"   },
  { label: "Africa",     region: "002"   },
  { label: "N. America", region: "021"   },
  { label: "S. America", region: "005"   },
  { label: "Oceania",    region: "009"   },
];

const CONTINENT_TO_ZOOM = {
  Europe:         1,
  Asia:           2,
  Africa:         3,
  "North America": 4,
  "South America": 5,
  Oceania:        6,
};

const state = {
  visited: new Set(loadVisited()),
  zoomIndex: 0,
};

const visitedCountEl = document.getElementById("visitedCount");
const countryCountEl = document.getElementById("countryCount");
const progressFillEl = document.getElementById("progressFill");
const progressTextEl = document.getElementById("progressText");
const progressBarEl = document.getElementById("progressBar");
const clearVisitedEl = document.getElementById("clearVisited");
const zoomInEl  = document.getElementById("zoomIn");
const zoomOutEl = document.getElementById("zoomOut");
const zoomLabelEl = document.getElementById("zoomLabel");

const chartNameByCanonical = {
  Czechia: "Czech Republic",
};

const canonicalByChartName = {
  "Czech Republic": "Czechia",
  "Russian Federation": "Russia",
  "United States of America": "United States",
  "Korea, South": "South Korea",
  "Korea, North": "North Korea",
  "Macedonia (FYROM)": "North Macedonia",
  Palestine: "Israel",
};

google.charts.load("current", {
  packages: ["geochart"],
});
google.charts.setOnLoadCallback(init);

function init() {
  clearVisitedEl.addEventListener("click", () => {
    state.visited.clear();
    persistVisited();
    drawMap();
    renderStats();
  });

  zoomInEl.addEventListener("click", () => {
    if (state.zoomIndex < ZOOM_LEVELS.length - 1) {
      state.zoomIndex++;
      updateZoomUI();
      drawMap();
    }
  });

  zoomOutEl.addEventListener("click", () => {
    if (state.zoomIndex > 0) {
      state.zoomIndex--;
      updateZoomUI();
      drawMap();
    }
  });

  renderStats();
  drawMap();

  window.addEventListener("resize", debounce(drawMap, 150));
}

function updateZoomUI() {
  zoomLabelEl.textContent = ZOOM_LEVELS[state.zoomIndex].label;
  zoomOutEl.disabled = state.zoomIndex === 0;
  zoomInEl.disabled  = state.zoomIndex === ZOOM_LEVELS.length - 1;
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

function normalizeChartNameToCanonical(name) {
  if (canonicalByChartName[name]) {
    return canonicalByChartName[name];
  }

  return name;
}

function toChartCountryName(canonicalName) {
  return chartNameByCanonical[canonicalName] || canonicalName;
}

function buildDataTable() {
  const rows = COUNTRIES.map((country) => {
    const chartName = toChartCountryName(country.name);
    return [chartName, state.visited.has(country.name) ? 1 : 0];
  });

  const israelVisited = state.visited.has("Israel") ? 1 : 0;
  rows.push(["Palestine", israelVisited]);

  return google.visualization.arrayToDataTable([
    ["Country", "Visited"],
    ...rows,
  ]);
}

function drawMap() {
  const container = document.getElementById("worldMap");
  const chart = new google.visualization.GeoChart(container);
  const data = buildDataTable();

  const options = {
    legend: "none",
    backgroundColor: "transparent",
    region: ZOOM_LEVELS[state.zoomIndex].region,
    datalessRegionColor: "#f2ede2",
    defaultColor: "#f2ede2",
    colorAxis: {
      minValue: 0,
      maxValue: 1,
      colors: ["#f2ede2", "#19a760"],
    },
    tooltip: {
      textStyle: {
        color: "#1f241f",
        fontName: "Segoe UI",
      },
    },
    keepAspectRatio: true,
  };

  google.visualization.events.removeAllListeners(chart);
  google.visualization.events.addListener(chart, "select", () => {
    const selection = chart.getSelection();
    if (!selection.length) {
      return;
    }

    const row = selection[0].row;
    if (row == null) {
      return;
    }

    const clickedName = data.getValue(row, 0);
    const canonical = normalizeChartNameToCanonical(clickedName);

    if (!COUNTRIES.some((country) => country.name === canonical)) {
      return;
    }

    toggleVisited(canonical);

    const countryObj = COUNTRIES.find((c) => c.name === canonical);
    if (countryObj && state.zoomIndex === 0 && CONTINENT_TO_ZOOM[countryObj.continent] !== undefined) {
      state.zoomIndex = CONTINENT_TO_ZOOM[countryObj.continent];
      updateZoomUI();
    }

    drawMap();
    renderStats();
  });

  chart.draw(data, options);
}

function toggleVisited(countryName) {
  if (state.visited.has(countryName)) {
    state.visited.delete(countryName);
  } else {
    state.visited.add(countryName);
  }

  persistVisited();
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

function debounce(fn, delay) {
  let timerId = null;
  return function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
}
