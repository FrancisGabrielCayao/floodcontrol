// --- Global Data & State ---
let stats = { 
    total: 0, 
    rain: 0, 
    danger: 0, 
    pump: 0, 
    buzzer: 0 
};

let activeFilters = { 
    sensor: 'all', 
    actuator: 'all', 
    state: 'all' 
};

const startTime = Date.now();

// --- Sidebar & Navigation ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function openTab(evt, tabName) {
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// --- Chart Initializations ---
const waterCtx = document.getElementById('waterChart').getContext('2d');
const waterChart = new Chart(waterCtx, {
    type: 'line',
    data: { 
        labels: [], 
        datasets: [{ 
            label: 'Water', 
            data: [], 
            borderColor: '#ef4444', 
            stepped: true, 
            fill: true, 
            backgroundColor: 'rgba(239, 68, 68, 0.1)' 
        }] 
    },
    options: { responsive: true, maintainAspectRatio: false }
});

const rainCtx = document.getElementById('rainChart').getContext('2d');
const rainChart = new Chart(rainCtx, {
    type: 'bar',
    data: { 
        labels: [], 
        datasets: [{ data: [], backgroundColor: [], borderRadius: 5 }] 
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
});

const batteryChart = new Chart(document.getElementById('batteryChart').getContext('2d'), {
    type: 'doughnut',
    data: { 
        datasets: [{ 
            data: [100, 0], 
            backgroundColor: ['#10b981', '#1f2937'], 
            borderWidth: 0 
        }] 
    },
    options: { cutout: '80%', responsive: true, maintainAspectRatio: false }
});

// --- UI Logic & Filtering ---
function applyFilter(cat, type, label) {
    activeFilters[cat] = type;
    document.getElementById('lbl-' + cat).innerText = label;
    updateAllRows();
}

function updateAllRows() {
    document.querySelectorAll('#log-body tr').forEach(row => {
        const data = JSON.parse(row.getAttribute('data-full'));
        const stateMatch = (activeFilters.state === 'all' || activeFilters.state === data.rawState);
        
        row.style.display = stateMatch ? "" : "none";
        
        if (stateMatch) {
            // Sensor logic: show "-" if the specific sensor is filtered out
            row.children[1].innerHTML = (activeFilters.sensor === 'all' || activeFilters.sensor === 'water') ? data.water : "-";
            row.children[2].innerHTML = (activeFilters.sensor === 'all' || activeFilters.sensor === 'rain') ? data.rain : "-";
            
            // Actuator logic: show "-" if the specific actuator is filtered out
            row.children[3].innerHTML = (activeFilters.actuator === 'all' || activeFilters.actuator === 'pump') ? data.pump : "-";
            row.children[4].innerHTML = (activeFilters.actuator === 'all' || activeFilters.actuator === 'buzzer') ? data.buzzer : "-";
        }
    });
}

function addLog(w, r, p, b, stateLabel, rawState) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const row = document.createElement('tr');
    
    row.setAttribute('data-full', JSON.stringify({ water: w, rain: r, pump: p, buzzer: b, rawState: rawState }));
    
    let stateColor = rawState === 'DANGER' ? 'var(--danger)' : rawState === 'ALERT' ? 'var(--warning)' : 'var(--accent)';
    
    row.innerHTML = `
        <td>${time}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td style="color:${stateColor}; font-weight:bold">${stateLabel}</td>
    `;
    
    const body = document.getElementById('log-body');
    body.prepend(row);
    if (body.children.length > 50) body.lastElementChild.remove();
    updateAllRows();
}

// --- Simulation & Update Loop ---
setInterval(() => {
    const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isWater = Math.random() > 0.90;
    const rainVal = Math.floor(Math.random() * 100);

    const wStatus = document.getElementById('w-status');
    let wLog = isWater ? `<span style="color:var(--danger); font-weight:bold">ALERT</span>` : `<span style="color:var(--accent)">LOW</span>`;
    
    wStatus.innerText = isWater ? "ALERT" : "LOW";
    wStatus.className = isWater ? "blink-danger" : "";
    if (isWater) stats.total++;

    const rStatus = document.getElementById('r-status');
    let rText = rainVal > 75 ? "HEAVY RAIN" : (rainVal > 25 ? "SLIGHT RAIN" : "DRY");
    let rColor = rainVal > 75 ? "var(--danger)" : (rainVal > 25 ? "var(--warning)" : "var(--accent)");
    let rHex = rainVal > 75 ? "#ef4444" : (rainVal > 25 ? "#f59e0b" : "#10b981");
    
    rStatus.innerText = rText; 
    rStatus.style.color = rColor;
    if (rainVal > 25) stats.rain++;

    // Overall State and Danger Tracking
    let fRaw = (isWater && rainVal > 75) ? "DANGER" : ((isWater || rainVal > 25) ? "ALERT" : "SAFE");
    let fLabel = fRaw === "DANGER" ? "!!! DANGER !!!" : fRaw;
    
    if (fRaw === "DANGER") stats.danger++;

    // Chart Updates
    if (waterChart.data.labels.length > 10) { 
        waterChart.data.labels.shift(); 
        waterChart.data.datasets[0].data.shift(); 
    }
    waterChart.data.labels.push(timeStamp);
    waterChart.data.datasets[0].data.push(isWater ? 1 : 0);
    waterChart.update();

    if (rainChart.data.labels.length > 10) { 
        rainChart.data.labels.shift(); 
        rainChart.data.datasets[0].data.shift();
        rainChart.data.datasets[0].backgroundColor.shift();
    }
    rainChart.data.labels.push(timeStamp);
    rainChart.data.datasets[0].data.push(rainVal);
    rainChart.data.datasets[0].backgroundColor.push(rHex);
    rainChart.update();

    // Sync Stats
    document.getElementById('q-total').innerText = stats.total;
    document.getElementById('q-rain').innerText = stats.rain;
    document.getElementById('q-danger').innerText = stats.danger;

    addLog(
        wLog, 
        `<span style="color:${rColor}">${rText}</span>`, 
        document.getElementById('sw-pump').innerText, 
        document.getElementById('sw-buzzer').innerText, 
        fLabel, 
        fRaw
    );
}, 5000);

// --- Actuators & Battery Listener ---
function handleSwitch(id) {
    const btn = document.getElementById('sw-' + id);
    const isOn = btn.classList.toggle('on');
    btn.classList.toggle('off', !isOn);
    btn.innerText = isOn ? "ON" : "OFF";
    if (isOn) stats[id]++;
}

function updateBatteryFromESP(adcValue) {
    // Math for Pin 33 with 1:1 divider (200k total resistance)
    const batteryVoltage = (adcValue / 4095.0) * 3.3 * 2.0; 
    let percentage = Math.max(0, Math.min(100, Math.round(((batteryVoltage - 3.2) / (4.2 - 3.2)) * 100)));
    
    batteryChart.data.datasets[0].data = [percentage, 100 - percentage];
    batteryChart.update();
}

// Connect to ESP32 stream
const source = new EventSource('/events');
source.addEventListener('battery_update', (e) => updateBatteryFromESP(parseInt(e.data)));

// --- System Uptime ---
setInterval(() => {
    let s = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('uptime-display').innerText = new Date(s * 1000).toISOString().substr(11, 8);
}, 1000);
