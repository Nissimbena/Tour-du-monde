const COUNTRY_PAGES_KEY = "been-tracker-country-pages-v1";

const titleEl = document.getElementById("countryTitle");
const flagEl = document.getElementById("countryFlag");
const photoUploaderEl = document.getElementById("photoUploader");
const clearPhotosEl = document.getElementById("clearPhotos");
const photoGalleryEl = document.getElementById("photoGallery");
const sleepListEl = document.getElementById("sleepList");
const funListEl = document.getElementById("funList");
const flightListEl = document.getElementById("flightList");
const addSleepLinkEl = document.getElementById("addSleepLink");
const addFunLinkEl = document.getElementById("addFunLink");
const addFlightEl = document.getElementById("addFlight");

const params = new URLSearchParams(window.location.search);
const countryParam = params.get("country") || "";
const countryName = COUNTRIES.find((c) => c.name === countryParam)?.name || "";

if (!countryName) {
  titleEl.textContent = "Country not found";
  flagEl.textContent = "";
} else {
  initCountryPage(countryName);
}

function initCountryPage(country) {
  titleEl.textContent = country;
  loadFlag(country);

  let pagesData = loadPagesData();
  if (!pagesData[country]) {
    pagesData[country] = {
      photos: [],
      sleepLinks: [],
      funLinks: [],
      flights: [],
    };
    savePagesData(pagesData);
  }

  render(country, pagesData[country]);

  photoUploaderEl.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    pagesData = loadPagesData();
    const existing = pagesData[country] || {
      photos: [],
      sleepLinks: [],
      funLinks: [],
      flights: [],
    };

    for (const file of files.slice(0, 8)) {
      const dataUrl = await fileToDataUrl(file);
      existing.photos.push({
        name: file.name,
        dataUrl,
      });
    }

    pagesData[country] = existing;
    savePagesData(pagesData);
    render(country, existing);
    photoUploaderEl.value = "";
  });

  clearPhotosEl.addEventListener("click", () => {
    pagesData = loadPagesData();
    pagesData[country].photos = [];
    savePagesData(pagesData);
    render(country, pagesData[country]);
  });

  addSleepLinkEl.addEventListener("click", () => {
    pagesData = loadPagesData();
    pagesData[country].sleepLinks.push({ title: "", url: "" });
    savePagesData(pagesData);
    render(country, pagesData[country]);
  });

  addFunLinkEl.addEventListener("click", () => {
    pagesData = loadPagesData();
    pagesData[country].funLinks.push({ title: "", url: "" });
    savePagesData(pagesData);
    render(country, pagesData[country]);
  });

  addFlightEl.addEventListener("click", () => {
    pagesData = loadPagesData();
    if (!pagesData[country].flights) {
      pagesData[country].flights = [];
    }
    pagesData[country].flights.push({ airline: "", price: "", currency: "USD", note: "" });
    savePagesData(pagesData);
    render(country, pagesData[country]);
  });
}

function render(country, details) {
  renderPhotos(details.photos || []);
  renderLinks(country, "sleepLinks", details.sleepLinks || [], sleepListEl);
  renderLinks(country, "funLinks", details.funLinks || [], funListEl);
  renderFlights(country, details.flights || []);
}

function renderFlights(country, flights) {
  flightListEl.innerHTML = "";

  flights.forEach((flight, index) => {
    const row = document.createElement("div");
    row.className = "link-row";

    const airlineInput = document.createElement("input");
    airlineInput.type = "text";
    airlineInput.placeholder = "Airline (e.g. El Al)";
    airlineInput.value = flight.airline || "";
    airlineInput.className = "link-input";
    airlineInput.addEventListener("change", (event) => {
      updateFlight(country, index, "airline", event.target.value);
    });

    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.placeholder = "Ticket price";
    priceInput.value = flight.price || "";
    priceInput.className = "link-input link-input-small";
    priceInput.addEventListener("change", (event) => {
      updateFlight(country, index, "price", event.target.value);
    });

    const currencyInput = document.createElement("input");
    currencyInput.type = "text";
    currencyInput.placeholder = "Currency (USD/ILS/EUR)";
    currencyInput.value = flight.currency || "";
    currencyInput.className = "link-input link-input-small";
    currencyInput.addEventListener("change", (event) => {
      updateFlight(country, index, "currency", event.target.value.toUpperCase());
    });

    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.placeholder = "Note (optional)";
    noteInput.value = flight.note || "";
    noteInput.className = "link-input";
    noteInput.addEventListener("change", (event) => {
      updateFlight(country, index, "note", event.target.value);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "trip-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      const data = loadPagesData();
      data[country].flights.splice(index, 1);
      savePagesData(data);
      render(country, data[country]);
    });

    row.appendChild(airlineInput);
    row.appendChild(priceInput);
    row.appendChild(currencyInput);
    row.appendChild(noteInput);
    row.appendChild(removeBtn);
    flightListEl.appendChild(row);
  });
}

function updateFlight(country, index, field, value) {
  const data = loadPagesData();
  if (!data[country] || !data[country].flights || !data[country].flights[index]) {
    return;
  }

  data[country].flights[index][field] = value;
  savePagesData(data);
}

function renderPhotos(photos) {
  photoGalleryEl.innerHTML = "";
  for (const photo of photos) {
    const img = document.createElement("img");
    img.src = photo.dataUrl;
    img.alt = photo.name;
    img.className = "country-photo";
    photoGalleryEl.appendChild(img);
  }
}

function renderLinks(country, key, links, parentEl) {
  parentEl.innerHTML = "";

  links.forEach((link, index) => {
    const row = document.createElement("div");
    row.className = "link-row";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.placeholder = "Label (e.g. Airbnb in center)";
    titleInput.value = link.title || "";
    titleInput.className = "link-input";
    titleInput.addEventListener("change", (event) => {
      updateLink(country, key, index, "title", event.target.value);
    });

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "https://...";
    urlInput.value = link.url || "";
    urlInput.className = "link-input";
    urlInput.addEventListener("change", (event) => {
      updateLink(country, key, index, "url", event.target.value);
    });

    const openLink = document.createElement("a");
    openLink.className = "trip-btn";
    openLink.textContent = "Open";
    openLink.target = "_blank";
    openLink.rel = "noreferrer";
    openLink.href = link.url || "#";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "trip-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      const data = loadPagesData();
      data[country][key].splice(index, 1);
      savePagesData(data);
      render(country, data[country]);
    });

    row.appendChild(titleInput);
    row.appendChild(urlInput);
    row.appendChild(openLink);
    row.appendChild(removeBtn);
    parentEl.appendChild(row);
  });
}

function updateLink(country, key, index, field, value) {
  const data = loadPagesData();
  if (!data[country] || !data[country][key] || !data[country][key][index]) {
    return;
  }

  data[country][key][index][field] = value;
  savePagesData(data);
}

function loadPagesData() {
  try {
    const raw = localStorage.getItem(COUNTRY_PAGES_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePagesData(data) {
  localStorage.setItem(COUNTRY_PAGES_KEY, JSON.stringify(data));
}

async function loadFlag(country) {
  const aliases = {
    Czechia: "Czech Republic",
    "Ivory Coast": "Cote d'Ivoire",
    "Democratic Republic of the Congo": "Congo (Democratic Republic of the)",
    "Republic of the Congo": "Congo",
  };

  const query = encodeURIComponent(aliases[country] || country);

  try {
    const response = await fetch(`https://restcountries.com/v3.1/name/${query}?fullText=true`);
    if (!response.ok) {
      throw new Error("Flag fetch failed");
    }

    const result = await response.json();
    flagEl.textContent = result[0]?.flag || "🏳️";
  } catch {
    flagEl.textContent = "🏳️";
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
