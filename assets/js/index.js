// ================= API Links =================
// لو في الـ docs رابط proxy مختلف غيّر الروابط دي بس
const NASA_KEY = "DEMO_KEY"; // ممكن تعمل key مجاني من api.nasa.gov
const APOD_URL = "https://api.nasa.gov/planetary/apod?api_key=" + NASA_KEY;
const LAUNCHES_URL = "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=10";
const PLANETS_URL = "https://solar-system-opendata-proxy.vercel.app/api/planets";

// ================= Elements =================
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".app-section");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");

// APOD
const apodDateInput = document.getElementById("apod-date-input");
const apodDateWrapper = document.querySelector(".date-input-wrapper");
const apodLoading = document.getElementById("apod-loading");
const apodImage = document.getElementById("apod-image");
const apodImageContainer = document.getElementById("apod-image-container");

// Launches
const featuredLaunch = document.getElementById("featured-launch");
const launchesGrid = document.getElementById("launches-grid");

// Planets
const planetsGrid = document.getElementById("planets-grid");
const planetCards = document.querySelectorAll(".planet-card");

let planetsData = []; // هنخزن فيها الكواكب بعد ما تيجي من الـ API
let apodHdUrl = "";

// ================= Navigation =================
function showSection(id) {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].id === id) {
      sections[i].classList.remove("hidden");
    } else {
      sections[i].classList.add("hidden");
    }
  }

  for (let i = 0; i < navLinks.length; i++) {
    const link = navLinks[i];
    if (link.dataset.section === id) {
      link.className =
        "nav-link flex items-center space-x-3 px-3 py-2.5 bg-blue-500/10 text-blue-400 rounded-lg font-medium transition-colors";
    } else {
      link.className =
        "nav-link flex items-center space-x-3 px-3 py-2.5 text-slate-300 hover:bg-slate-800 rounded-lg font-medium transition-colors";
    }
  }
}

for (let i = 0; i < navLinks.length; i++) {
  navLinks[i].addEventListener("click", function (e) {
    e.preventDefault();
    showSection(navLinks[i].dataset.section);
    closeSidebar();
  });
}

// ===== sidebar في الموبايل =====
const overlay = document.createElement("div");
overlay.className = "sidebar-overlay hidden";
document.body.appendChild(overlay);

function openSidebar() {
  sidebar.classList.add("sidebar-open");
  overlay.classList.remove("hidden");
}
function closeSidebar() {
  sidebar.classList.remove("sidebar-open");
  overlay.classList.add("hidden");
}
sidebarToggle.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);

// ================= Helpers =================
function formatDate(dateString) {
  // "2024-03-14" -> "Mar 14, 2024"
  const d = new Date(dateString + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatNumber(n) {
  if (n === undefined || n === null || n === "") return "N/A";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ================= 1) Today in Space (APOD) =================
async function getApod(date) {
  apodLoading.classList.remove("hidden");
  apodImage.classList.add("hidden");

  let url = APOD_URL;
  if (date) {
    url += "&date=" + date;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Status " + response.status);
    }
    const data = await response.json();
    displayApod(data);
  } catch (error) {
    console.log("APOD error:", error);
    document.getElementById("apod-title").textContent = "Couldn't load the image";
    document.getElementById("apod-explanation").textContent =
      "Something went wrong, please try another date or try again later.";
  } finally {
    apodLoading.classList.add("hidden");
  }
}

function displayApod(data) {
  // لو النهارده فيديو مش صورة
  const oldFrame = document.getElementById("apod-video");
  if (oldFrame) oldFrame.remove();

  if (data.media_type === "image") {
    apodImage.src = data.url;
    apodImage.alt = data.title;
    apodImage.classList.remove("hidden");
  } else {
    const frame = document.createElement("iframe");
    frame.id = "apod-video";
    frame.src = data.url;
    frame.className = "w-full h-full";
    frame.allowFullscreen = true;
    apodImageContainer.prepend(frame);
  }

  apodHdUrl = data.hdurl || data.url;

  document.getElementById("apod-date").textContent =
    "Astronomy Picture of the Day - " + formatDate(data.date);
  document.getElementById("apod-title").textContent = data.title;
  document.getElementById("apod-date-detail").innerHTML =
    '<i class="far fa-calendar mr-2"></i>' + data.date;
  document.getElementById("apod-explanation").textContent = data.explanation;
  document.getElementById("apod-copyright").innerHTML = data.copyright
    ? "&copy; " + data.copyright.replace(/\n/g, " ")
    : "";
  document.getElementById("apod-date-info").textContent = data.date;
  document.getElementById("apod-media-type").textContent =
    data.media_type === "image" ? "Image" : "Video";

  apodDateInput.value = data.date;
  apodDateWrapper.dataset.date = formatDate(data.date);
}

// events
document.getElementById("load-date-btn").addEventListener("click", function () {
  if (apodDateInput.value) {
    getApod(apodDateInput.value);
  }
});
document.getElementById("today-apod-btn").addEventListener("click", function () {
  getApod();
});
apodDateInput.addEventListener("change", function () {
  apodDateWrapper.dataset.date = formatDate(apodDateInput.value);
});
// زرار View Full Resolution
apodImageContainer.querySelector("button").addEventListener("click", function () {
  if (apodHdUrl) window.open(apodHdUrl, "_blank");
});

apodDateInput.max = getToday();
apodDateWrapper.dataset.date = formatDate(getToday());

// ================= 2) Launches =================
function getStatusClass(abbrev) {
  if (abbrev === "Go") return "bg-green-500/90";
  if (abbrev === "TBC") return "bg-yellow-500/90";
  if (abbrev === "TBD") return "bg-blue-500/90";
  return "bg-slate-500/90";
}

function getLaunchInfo(launch) {
  // بجمع الداتا في object واحد عشان الكود يبقى أسهل
  const net = new Date(launch.net);
  const config = launch.rocket && launch.rocket.configuration;
  const location = launch.pad && launch.pad.location;

  let img = "";
  if (launch.image) {
    img = typeof launch.image === "string" ? launch.image : launch.image.image_url;
  }

  let country = "N/A";
  if (location && location.country) {
    country = location.country.name || location.country.alpha_3_code || location.country;
  } else if (location && location.country_code) {
    country = location.country_code;
  }

  return {
    name: launch.name,
    img: img,
    status: launch.status ? launch.status.abbrev : "N/A",
    statusName: launch.status ? launch.status.abbrev || launch.status.name : "N/A",
    provider: launch.launch_service_provider ? launch.launch_service_provider.name : "Unknown",
    rocket: config ? config.name : "Unknown",
    location: location ? location.name : "Unknown",
    country: country,
    description: launch.mission && launch.mission.description ? launch.mission.description : "No description available yet.",
    date: net.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: net.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC",
    daysLeft: Math.max(0, Math.ceil((net - new Date()) / (1000 * 60 * 60 * 24))),
  };
}

async function getLaunches() {
  try {
    const response = await fetch(LAUNCHES_URL);
    if (!response.ok) {
      throw new Error("Status " + response.status);
    }
    const data = await response.json();
    const launches = data.results;

    document.getElementById("launches-count").textContent = launches.length + " Launches";
    document.getElementById("launches-count-mobile").textContent = launches.length;

    displayFeatured(getLaunchInfo(launches[0]));
    displayLaunches(launches.slice(1));
  } catch (error) {
    console.log("Launches error:", error);
    featuredLaunch.innerHTML = '<p class="text-slate-400">Couldn\'t load launches, try again later.</p>';
    launchesGrid.innerHTML = "";
  }
}

function displayFeatured(l) {
  const image = l.img
    ? `<img src="${l.img}" alt="${l.name}" class="absolute inset-0 w-full h-full object-cover" />`
    : `<div class="flex items-center justify-center h-full min-h-[400px] bg-slate-800"><i class="fas fa-rocket text-9xl text-slate-700/50"></i></div>`;

  featuredLaunch.innerHTML = `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i> Featured Launch
              </span>
              <span class="px-4 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">${l.statusName}</span>
            </div>
            <h3 class="text-3xl font-bold mb-3 leading-tight">${l.name}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2"><i class="fas fa-building"></i><span>${l.provider}</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-rocket"></i><span>${l.rocket}</span></div>
            </div>
            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div>
                <p class="text-2xl font-bold text-blue-400">${l.daysLeft}</p>
                <p class="text-xs text-slate-400">Days Until Launch</p>
              </div>
            </div>
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i> Launch Date</p>
                <p class="font-semibold">${l.date}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i> Launch Time</p>
                <p class="font-semibold">${l.time}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> Location</p>
                <p class="font-semibold text-sm">${l.location}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-globe"></i> Country</p>
                <p class="font-semibold">${l.country}</p>
              </div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${l.description}</p>
          </div>
        </div>
        <div class="relative">
          <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
            ${image}
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function displayLaunches(launches) {
  let cartona = "";

  for (let i = 0; i < launches.length; i++) {
    const l = getLaunchInfo(launches[i]);

    const image = l.img
      ? `<img src="${l.img}" alt="${l.name}" class="w-full h-full object-cover" />`
      : `<i class="fas fa-rocket text-5xl text-slate-700"></i>`;

    cartona += `
      <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
        <div class="relative h-48 bg-slate-900/50 flex items-center justify-center overflow-hidden">
          ${image}
          <div class="absolute top-3 right-3">
            <span class="px-3 py-1 ${getStatusClass(l.status)} text-white backdrop-blur-sm rounded-full text-xs font-semibold">${l.statusName}</span>
          </div>
        </div>
        <div class="p-5">
          <div class="mb-3">
            <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${l.name}</h4>
            <p class="text-sm text-slate-400 flex items-center gap-2"><i class="fas fa-building text-xs"></i>${l.provider}</p>
          </div>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2 text-sm"><i class="fas fa-calendar text-slate-500 w-4"></i><span class="text-slate-300">${l.date}</span></div>
            <div class="flex items-center gap-2 text-sm"><i class="fas fa-clock text-slate-500 w-4"></i><span class="text-slate-300">${l.time}</span></div>
            <div class="flex items-center gap-2 text-sm"><i class="fas fa-rocket text-slate-500 w-4"></i><span class="text-slate-300">${l.rocket}</span></div>
            <div class="flex items-center gap-2 text-sm"><i class="fas fa-map-marker-alt text-slate-500 w-4"></i><span class="text-slate-300 line-clamp-1">${l.location}</span></div>
          </div>
          <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
            <button class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">Details</button>
            <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
          </div>
        </div>
      </div>
    `;
  }

  launchesGrid.innerHTML = cartona;
}

// ================= 3) Planets =================
const AU = 149597870.7; // km
const EARTH_MASS = 5.972e24; // kg

// بيانات مش موجودة في الـ API (وصف + نوع + لون)
const planetExtra = {
  mercury: { type: "Terrestrial", color: "#eab308", badge: "bg-orange-500/50 text-orange-200", desc: "Mercury is the smallest planet in the Solar System and the closest to the Sun. It has almost no atmosphere, so temperatures swing wildly between day and night." },
  venus: { type: "Terrestrial", color: "#f97316", badge: "bg-orange-500/50 text-orange-200", desc: "Venus is the hottest planet because of its thick carbon dioxide atmosphere. It spins backwards compared to most planets." },
  earth: { type: "Terrestrial", color: "#3b82f6", badge: "bg-blue-500/50 text-blue-200", desc: "Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 71% of its surface is covered with water." },
  mars: { type: "Terrestrial", color: "#ef4444", badge: "bg-red-500/50 text-red-200", desc: "Mars is the red planet, covered in iron oxide dust. It has the tallest volcano in the Solar System, Olympus Mons." },
  jupiter: { type: "Gas Giant", color: "#fb923c", badge: "bg-purple-500/50 text-purple-200", desc: "Jupiter is the largest planet in the Solar System. Its Great Red Spot is a giant storm that has been raging for hundreds of years." },
  saturn: { type: "Gas Giant", color: "#facc15", badge: "bg-yellow-500/50 text-yellow-200", desc: "Saturn is famous for its bright ring system made mostly of ice particles. It is so light that it would float in water." },
  uranus: { type: "Ice Giant", color: "#06b6d4", badge: "bg-cyan-500/50 text-cyan-200", desc: "Uranus is an ice giant that rotates on its side. Its blue-green color comes from methane in its atmosphere." },
  neptune: { type: "Ice Giant", color: "#2563eb", badge: "bg-blue-500/50 text-blue-200", desc: "Neptune is the farthest planet from the Sun, with supersonic winds and a deep blue color." },
};

async function getPlanets() {
  try {
    const response = await fetch(PLANETS_URL);
    if (!response.ok) {
      throw new Error("Status " + response.status);
    }
    const data = await response.json();

    // نرتب الكواكب من الأقرب للشمس
    // الـ response ممكن يبقى { bodies: [...] } أو array علطول
    const list = data.bodies || data.planets || data.data || data;
    console.log("Planets from API:", list);

    planetsData = list.sort(function (a, b) {
      return a.semimajorAxis - b.semimajorAxis;
    });

    displayComparison();
    showPlanet("earth");
  } catch (error) {
    console.log("Planets error:", error);
    document.getElementById("planet-detail-description").textContent =
      "Couldn't load planets data, try again later.";
  }
}

// أسماء الكواكب بالفرنسي (الـ API الأصلي بيستخدم دي في الـ id)
const frenchNames = {
  mercury: "mercure",
  venus: "venus",
  earth: "terre",
  mars: "mars",
  jupiter: "jupiter",
  saturn: "saturne",
  uranus: "uranus",
  neptune: "neptune",
};

function findPlanet(id) {
  for (let i = 0; i < planetsData.length; i++) {
    const p = planetsData[i];
    // بقارن بكذا حقل عشان لو الشكل اتغير
    const names = [p.englishName, p.name, p.id, p.nameEn];
    for (let j = 0; j < names.length; j++) {
      if (names[j] && String(names[j]).toLowerCase() === id) {
        return p;
      }
    }
    if (p.id && String(p.id).toLowerCase() === frenchNames[id]) {
      return p;
    }
  }
  return null;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function showPlanet(id) {
  const p = findPlanet(id);
  if (!p) {
    console.log("Planet not found:", id, "planetsData:", planetsData);
    setText("planet-detail-name", id.charAt(0).toUpperCase() + id.slice(1));
    setText("planet-detail-description", "Couldn't find data for this planet in the API response.");
    return;
  }
  const extra = planetExtra[id];

  document.getElementById("planet-detail-image").src = p.image || "./assets/images/" + id + ".png";
  document.getElementById("planet-detail-image").alt = p.englishName;
  setText("planet-detail-name", p.englishName);
  setText("planet-detail-description", p.description || extra.desc);

  setText("planet-distance", formatNumber(p.semimajorAxis / 1000000) + "M km");
  setText("planet-radius", formatNumber(p.meanRadius) + " km");
  setText("planet-mass", p.mass ? p.mass.massValue + " × 10^" + p.mass.massExponent + " kg" : "N/A");
  setText("planet-density", p.density + " g/cm³");
  setText("planet-orbital-period", formatNumber(p.sideralOrbit) + " days");
  setText("planet-rotation", formatNumber(p.sideralRotation) + " hours");
  setText("planet-moons", p.moons ? p.moons.length : 0);
  setText("planet-gravity", p.gravity + " m/s²");

  setText("planet-discoverer", p.discoveredBy ? p.discoveredBy : "Known since antiquity");
  setText("planet-discovery-date", p.discoveryDate ? p.discoveryDate : "Ancient");
  setText("planet-body-type", p.bodyType || "Planet");
  setText("planet-volume", p.vol ? p.vol.volValue + " × 10^" + p.vol.volExponent + " km³" : "N/A");

  setText("planet-perihelion", formatNumber(p.perihelion / 1000000) + "M km");
  setText("planet-aphelion", formatNumber(p.aphelion / 1000000) + "M km");
  setText("planet-eccentricity", p.eccentricity);
  setText("planet-inclination", p.inclination + "°");
  setText("planet-axial-tilt", p.axialTilt + "°");
  setText("planet-temp", p.avgTemp ? Math.round(p.avgTemp - 273.15) + "°C" : "N/A");
  setText("planet-escape", formatNumber(p.escape / 1000) + " km/s");

  // Quick facts (بنعملها من الداتا نفسها)
  const facts = [
    "Type: " + (p.type || extra.type),
    "Average temperature: " + (p.avgTemp ? Math.round(p.avgTemp - 273.15) + "°C" : "N/A"),
    "Number of moons: " + (p.moons ? p.moons.length : 0),
    "A year lasts " + formatNumber(p.sideralOrbit) + " Earth days",
  ];
  let factsHtml = "";
  for (let i = 0; i < facts.length; i++) {
    factsHtml += `<li class="flex items-start"><i class="fas fa-check text-green-400 mt-1 mr-2"></i><span class="text-slate-300">${facts[i]}</span></li>`;
  }
  document.getElementById("planet-facts").innerHTML = factsHtml;

  // نعلم الكارت المختار
  for (let i = 0; i < planetCards.length; i++) {
    if (planetCards[i].dataset.planetId === id) {
      planetCards[i].classList.add("bg-blue-500/5");
    } else {
      planetCards[i].classList.remove("bg-blue-500/5");
    }
  }
}

function displayComparison() {
  let cartona = "";
  const td = 'class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap"';

  for (let i = 0; i < planetsData.length; i++) {
    const p = planetsData[i];
    const extra = planetExtra[p.englishName.toLowerCase()];
    if (!extra) continue;

    const massEarth = p.mass ? (p.mass.massValue * Math.pow(10, p.mass.massExponent)) / EARTH_MASS : 0;
    const period = p.sideralOrbit > 700 ? (p.sideralOrbit / 365.25).toFixed(1) + " years" : formatNumber(p.sideralOrbit) + " days";

    cartona += `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
          <div class="flex items-center space-x-2 md:space-x-3">
            <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${extra.color}"></div>
            <span class="font-semibold text-sm md:text-base whitespace-nowrap">${p.englishName}</span>
          </div>
        </td>
        <td ${td}>${(p.semimajorAxis / AU).toFixed(2)}</td>
        <td ${td}>${formatNumber(p.meanRadius * 2)}</td>
        <td ${td}>${massEarth.toFixed(3)}</td>
        <td ${td}>${period}</td>
        <td ${td}>${p.moons ? p.moons.length : 0}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
          <span class="px-2 py-1 rounded text-xs ${extra.badge}">${p.type || extra.type}</span>
        </td>
      </tr>
    `;
  }

  document.getElementById("planet-comparison-tbody").innerHTML = cartona;
}

// لما أدوس على كوكب
planetsGrid.addEventListener("click", function (e) {
  const card = e.target.closest(".planet-card");
  if (card) {
    showPlanet(card.dataset.planetId);
  }
});

// ================= Start =================
showSection("today-in-space");
getApod();
getLaunches();
getPlanets();