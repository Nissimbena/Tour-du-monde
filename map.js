const STORAGE_KEY = "been-tracker-visited-v1";

const state = {
  visited: new Set(loadVisited()),
};

const visitedCountEl = document.getElementById("visitedCount");
const countryCountEl = document.getElementById("countryCount");
const progressFillEl = document.getElementById("progressFill");
const progressTextEl = document.getElementById("progressText");
const progressBarEl = document.getElementById("progressBar");
const clearVisitedEl = document.getElementById("clearVisited");

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

  renderStats();
  drawMap();

  window.addEventListener("resize", debounce(drawMap, 150));
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
