// ===============================
// 1) Global State & Config
// ===============================
const ESP32_IP = "192.168.1.10"; // <-- REPLACE with the IP printed in Serial Monitor
const startTime = Date.now();

let stats = { total: 0, rain: 0, danger: 0, pump: 0, buzzer: 0 };
let activeFilters = { sensor: "all", actuator: "all", state: "all" };


// ===============================
// 2) Live Connection (ESP32) with Auto-Reconnect
// ===============================
let source;

function setConnectionStatus(connected) {
  const el = document.getElementById("connection-status");
  if (!el) return;
  el.style.color = connected ? "#10b981" : "gray"; // green when connected, gray when disconnected
}

function connectESP32() {
  try {
    if (source) source.close();
  } catch (e) {}

  setConnectionStatus(false);

  source = new EventSource(`http://${ESP32_IP}/events`);

  // When connection opens
  source.onopen = () => {
    console.log("ESP32 SSE connected.");
    setConnectionStatus(true);
  };

  // ✅ NEW: battery percentage event from ESP32
  source.addEventListener("battery_pct", (e) => {
    const pct = parseInt(e.data, 10);
    if (!Number.isNaN(pct)) {
      updateBatteryChartFromPct(pct);
      console.log(`[Battery Sync] Received: ${pct}%`);
    }
  });

  // Optional voltage event (for debug / display if you want)
  source.addEventListener("battery_v", (e) => {
    console.log(`[Battery Sync] Voltage: ${e.data}V`);
    // If you have an element for voltage display, uncomment:
    // const vEl = document.getElementById("battery-voltage");
    // if (vEl) vEl.innerText = `${parseFloat(e.data).toFixed(2)}V`;
  });

  // If you still have the old event name from previous firmware,
  // we keep it as a fallback so your UI won't break:
  source.addEventListener("battery_update", (e) => {
    // This fallback expects ADC. If your ESP32 now sends percent, you can remove this.
    console.warn("[Battery Sync] Received battery_update (legacy). Data:", e.data);
  });

  source.onerror = () => {
    setConnectionStatus(false);
    console.log("ESP32 Connection lost. Retrying in 5 seconds...");
    try {
      source.close();
    } catch (e) {}
    setTimeout(connectESP32, 5000);
  };
}

connectESP32();


// ===============================
// 3) Sidebar & Tab Navigation
// ===============================
function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("active");
  document.getElementById("overlay")?.classList.toggle("active");
}

function openTab(evt, tabName) {
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));

  document.getElementById(tabName)?.classList.add("active");
  evt.currentTarget.classList.add("active");
}


// ===============================
// 4) Chart Initializations
// ===============================

// Water Line Chart
const waterCanvas = document.getElementById("waterChart");
const waterCtx = waterCanvas ? waterCanvas.getContext("2d") : null;
const waterChart = waterCtx
  ? new Chart(waterCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Water",
            data: [],
            borderColor: "#ef4444",
            stepped: true,
            fill: true,
            backgroundColor: "rgba(239, 68, 68, 0.1)",
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    })
  : null;

// Rain Bar Chart
const rainCanvas = document.getElementById("rainChart");
const rainCtx = rainCanvas ? rainCanvas.getContext("2d") : null;
const rainChart = rainCtx
  ? new Chart(rainCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [{ data: [], backgroundColor: [], borderRadius: 5 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    })
  : null;

// Battery Doughnut Chart
const batteryCanvas = document.getElementById("batteryChart");
const batteryCtx = batteryCanvas ? batteryCanvas.getContext("2d") : null;
const batteryChart = batteryCtx
  ? new Chart(batteryCtx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [0, 100],
            backgroundColor: ["#10b981", "#1f2937"],
            borderWidth: 0,
          },
        ],
      },
      options: { cutout: "80%", responsive: true, maintainAspectRatio: false },
    })
  : null;


// ===============================
// 5) Battery & UI Logic
// ===============================

// ✅ NEW: Update battery chart using percentage directly
function updateBatteryChartFromPct(percentage) {
  if (!batteryChart) return;

  percentage = Math.max(0, Math.min(100, Number(percentage)));

  batteryChart.data.datasets[0].data = [percentage, 100 - percentage];

  // color by threshold
  batteryChart.data.datasets[0].backgroundColor[0] =
    percentage < 20 ? "#ef4444" : percentage < 50 ? "#f59e0b" : "#10b981";

  batteryChart.update();

  // Optional: if you have a text label like <span id="battery-pct"></span>
  const pctEl = document.getElementById("battery-pct");
  if (pctEl) pctEl.innerText = `${percentage}%`;
}

function applyFilter(cat, type, label) {
  activeFilters[cat] = type;
  const lbl = document.getElementById("lbl-" + cat);
  if (lbl) lbl.innerText = label;
  updateAllRows();
}

function updateAllRows() {
  document.querySelectorAll("#log-body tr").forEach((row) => {
    const data = JSON.parse(row.getAttribute("data-full"));
    const stateMatch = activeFilters.state === "all" || activeFilters.state === data.rawState;

    row.style.display = stateMatch ? "" : "none";

    if (stateMatch) {
      row.children[1].innerHTML = activeFilters.sensor === "all" || activeFilters.sensor === "water" ? data.water : "-";
      row.children[2].innerHTML = activeFilters.sensor === "all" || activeFilters.sensor === "rain" ? data.rain : "-";
      row.children[3].innerHTML =
        activeFilters.actuator === "all" || activeFilters.actuator === "pump" ? data.pump : "-";
      row.children[4].innerHTML =
        activeFilters.actuator === "all" || activeFilters.actuator === "buzzer" ? data.buzzer : "-";
    }
  });
}

function addLog(w, r, p, b, stateLabel, rawState) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const row = document.createElement("tr");

  row.setAttribute("data-full", JSON.stringify({ water: w, rain: r, pump: p, buzzer: b, rawState: rawState }));

  const stateColor = rawState === "DANGER" ? "var(--danger)" : rawState === "ALERT" ? "var(--warning)" : "var(--accent)";

  row.innerHTML = `
      <td>${time}</td>
      <td></td><td></td><td></td><td></td>
      <td style="color:${stateColor}; font-weight:bold">${stateLabel}</td>
  `;

  const body = document.getElementById("log-body");
  if (!body) return;

  body.prepend(row);
  if (body.children.length > 50) body.lastElementChild.remove();

  updateAllRows();
}


// ===============================
// 6) Main Simulation Loop (Every 5s)
// ===============================
setInterval(() => {
  const timeStamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isWater = Math.random() > 0.9;
  const rainVal = Math.floor(Math.random() * 100);

  // Water UI Updates
  const wStatus = document.getElementById("w-status");
  const wLog = isWater
    ? `<span style="color:var(--danger); font-weight:bold">ALERT</span>`
    : `<span style="color:var(--accent)">LOW</span>`;

  if (wStatus) {
    wStatus.innerText = isWater ? "ALERT" : "LOW";
    wStatus.className = isWater ? "blink-danger" : "";
  }
  if (isWater) stats.total++;

  // Rain UI Updates
  const rStatus = document.getElementById("r-status");
  const rText = rainVal > 75 ? "HEAVY RAIN" : rainVal > 25 ? "SLIGHT RAIN" : "DRY";
  const rColor = rainVal > 75 ? "var(--danger)" : rainVal > 25 ? "var(--warning)" : "var(--accent)";
  const rHex = rainVal > 75 ? "#ef4444" : rainVal > 25 ? "#f59e0b" : "#10b981";

  if (rStatus) {
    rStatus.innerText = rText;
    rStatus.style.color = rColor;
  }
  if (rainVal > 25) stats.rain++;

  // Overall State Logic
  const fLabel = isWater && rainVal > 75 ? "!!! DANGER !!!" : isWater || rainVal > 25 ? "ALERT" : "SAFE";
  const fRaw = isWater && rainVal > 75 ? "DANGER" : isWater || rainVal > 25 ? "ALERT" : "SAFE";
  if (fRaw === "DANGER") stats.danger++;

  // Chart Data Handling (keep only last 10 points)
  if (waterChart) {
    if (waterChart.data.labels.length > 10) {
      waterChart.data.labels.shift();
      waterChart.data.datasets[0].data.shift();
    }
    waterChart.data.labels.push(timeStamp);
    waterChart.data.datasets[0].data.push(isWater ? 1 : 0);
    waterChart.update();
  }

  if (rainChart) {
    if (rainChart.data.labels.length > 10) {
      rainChart.data.labels.shift();
      rainChart.data.datasets[0].data.shift();
      rainChart.data.datasets[0].backgroundColor.shift();
    }
    rainChart.data.labels.push(timeStamp);
    rainChart.data.datasets[0].data.push(rainVal);
    rainChart.data.datasets[0].backgroundColor.push(rHex);
    rainChart.update();
  }

  // Sync Stats Counter
  ["total", "rain", "danger", "pump", "buzzer"].forEach((id) => {
    const el = document.getElementById("q-" + id);
    if (el) el.innerText = stats[id];
  });

  addLog(
    wLog,
    `<span style="color:${rColor}">${rText}</span>`,
    document.getElementById("sw-pump")?.innerText ?? "OFF",
    document.getElementById("sw-buzzer")?.innerText ?? "OFF",
    fLabel,
    fRaw
  );
}, 5000);


// ===============================
// 7) Controls & Uptime
// ===============================
function handleSwitch(id) {
  const btn = document.getElementById("sw-" + id);
  if (!btn) return;

  const isOn = btn.classList.toggle("on");
  btn.classList.toggle("off", !isOn);
  btn.innerText = isOn ? "ON" : "OFF";

  if (isOn && stats[id] !== undefined) stats[id]++;
}

setInterval(() => {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const uptimeEl = document.getElementById("uptime-display");
  if (uptimeEl) uptimeEl.innerText = new Date(s * 1000).toISOString().substr(11, 8);
}, 1000);
