// --- Global Data & State ---
let stats = { total: 0, rain: 0, danger: 0, pump: 0, buzzer: 0 };
let activeFilters = { sensor: 'all', actuator: 'all', state: 'all' };
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
const waterChart = new Chart(document.getElementById('waterChart').getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Water', data: [], borderColor: '#ef4444', stepped: true, fill: true, backgroundColor: 'rgba(239, 68, 68, 0.1)' }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 1.1 }, x: { ticks: { color: '#94a3b8', font: { size: 10 } } } } }
});

const rainChart = new Chart(document.getElementById('rainChart').getContext('2d'), {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 }, x: { ticks: { color: '#94a3b8', font: { size: 10 } } } } }
});

// --- UI Logic & Filtering ---
function applyFilter(cat, type, label) {
    activeFilters[cat] = type;
    document.getElementById('lbl-'+cat).innerText = label;
    updateAllRows();
}

function updateAllRows() {
    document.querySelectorAll('#log-body tr').forEach(row => {
        const data = JSON.parse(row.getAttribute('data-full'));
        const showRow = (activeFilters.state === 'all' || activeFilters.state === data.rawState);
        row.style.display = showRow ? "" : "none";
        if(showRow) {
            row.children[1].innerHTML = (activeFilters.sensor === 'all' || activeFilters.sensor === 'water') ? data.water : "-";
            row.children[2].innerHTML = (activeFilters.sensor === 'all' || activeFilters.sensor === 'rain') ? data.rain : "-";
            row.children[3].innerHTML = (activeFilters.actuator === 'all' || activeFilters.actuator === 'pump') ? data.pump : "-";
            row.children[4].innerHTML = (activeFilters.actuator === 'all' || activeFilters.actuator === 'buzzer') ? data.buzzer : "-";
        }
    });
}

function addLog(w, r, p, b, stateLabel, rawState) {
    const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const row = document.createElement('tr');
    row.setAttribute('data-full', JSON.stringify({ water:w, rain:r, pump:p, buzzer:b, rawState:rawState }));
    
    let stateColor = rawState === 'DANGER' ? 'var(--danger)' : rawState === 'ALERT' ? 'var(--warning)' : 'var(--accent)';
    row.innerHTML = `<td>${time}</td><td></td><td></td><td></td><td></td><td style="color:${stateColor}; font-weight:bold">${stateLabel}</td>`;
    
    const body = document.getElementById('log-body');
    body.prepend(row);
    if(body.children.length > 50) body.lastElementChild.remove();
    updateAllRows();
}

// --- Simulation Loop ---
setInterval(() => {
    const timeStamp = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const isWater = Math.random() > 0.90;
    const rainVal = Math.floor(Math.random() * 100);

    // Water Status
    const wStatus = document.getElementById('w-status');
    let wLog;
    if(isWater) { 
        wStatus.innerText = "ALERT"; wStatus.className = "blink-danger"; 
        stats.total++; stats.danger++;
        wLog = `<span style="color:var(--danger); font-weight:bold">ALERT</span>`;
    } else { 
        wStatus.innerText = "LOW"; wStatus.className = ""; wStatus.style.color = "var(--accent)"; 
        wLog = `<span style="color:var(--accent)">LOW</span>`;
    }

    // Rain Status
    const rStatus = document.getElementById('r-status');
    let rText, rHex, rColor;
    if(rainVal > 75) { rText = "HEAVY RAIN"; rHex = "#ef4444"; rColor = "var(--danger)"; stats.rain++; }
    else if(rainVal > 25) { rText = "SLIGHT RAIN"; rHex = "#f59e0b"; rColor = "var(--warning)"; stats.rain++; }
    else { rText = "DRY"; rHex = "#10b981"; rColor = "var(--accent)"; }
    rStatus.innerText = rText; rStatus.style.color = rColor;

    // Overall State Logic
    let fLabel, fRaw;
    if(isWater && rainVal > 75) { fLabel = "!!! DANGER !!!"; fRaw = "DANGER"; }
    else if(isWater || rainVal > 25) { fLabel = "ALERT"; fRaw = "ALERT"; }
    else { fLabel = "SAFE"; fRaw = "SAFE"; }

    // Chart Updates
    if(waterChart.data.labels.length > 10) { waterChart.data.labels.shift(); waterChart.data.datasets[0].data.shift(); }
    waterChart.data.labels.push(timeStamp);
    waterChart.data.datasets[0].data.push(isWater ? 1 : 0);
    waterChart.update();

    if(rainChart.data.labels.length > 10) { 
        rainChart.data.labels.shift(); 
        rainChart.data.datasets[0].data.shift();
        rainChart.data.datasets[0].backgroundColor.shift();
    }
    rainChart.data.labels.push(timeStamp);
    rainChart.data.datasets[0].data.push(rainVal);
    rainChart.data.datasets[0].backgroundColor.push(rHex);
    rainChart.update();

    // Stats Sync
    document.getElementById('q-total').innerText = stats.total;
    document.getElementById('q-rain').innerText = stats.rain;
    document.getElementById('q-danger').innerText = stats.danger;
    document.getElementById('q-pump').innerText = stats.pump;
    document.getElementById('q-buzzer').innerText = stats.buzzer;

    addLog(wLog, `<span style="color:${rColor}">${rText}</span>`, document.getElementById('sw-pump').innerText, document.getElementById('sw-buzzer').innerText, fLabel, fRaw);
}, 5000);

// --- Actuator Control ---
function handleSwitch(id) {
    const btn = document.getElementById('sw-'+id);
    const isOn = btn.classList.toggle('on');
    btn.innerText = isOn ? "ON" : "OFF";
    if(isOn) stats[id]++;
    addLog("-", "-", btn.innerText, "-", "MANUAL", "SAFE");
}

// --- Battery & Uptime ---
setInterval(() => {
    let s = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('uptime-display').innerText = new Date(s * 1000).toISOString().substr(11, 8);
}, 1000);

new Chart(document.getElementById('batteryChart').getContext('2d'), {
    type: 'doughnut',
    data: { datasets: [{ data: [94, 6], backgroundColor: ['#10b981', '#1f2937'], borderWidth: 0 }] },
    options: { cutout: '80%', responsive: true, maintainAspectRatio: false }
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW failed', err));
  });
}