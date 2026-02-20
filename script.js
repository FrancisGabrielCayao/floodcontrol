// --- 1. Global State & Config ---
const ESP32_IP = "192.168.1.10"; 
const startTime = Date.now();

let stats = { total: 0, rain: 0, danger: 0, pump: 0, buzzer: 0 };
let activeFilters = { sensor: 'all', actuator: 'all', state: 'all' };


// --- 2. Live Connection (ESP32) ---
const source = new EventSource(`http://${ESP32_IP}/events`);

source.addEventListener('battery_update', (e) => {
    updateBatteryChart(parseInt(e.data));
});

source.onerror = () => {
    document.getElementById('connection-status').style.color = "gray";
    console.log("ESP32 Offline - Waiting for connection...");
};


// --- 3. Sidebar & Tab Navigation ---
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


// --- 4. Chart Initializations ---

const waterCtx = document.getElementById('waterChart').getContext('2d');
const waterChart = new Chart(waterCtx, {
    type: 'line',
    data: { 
        labels: [], 
        datasets: [{ label: 'Water', data: [], borderColor: '#ef4444', stepped: true, fill: true, backgroundColor: 'rgba(239, 68, 68, 0.1)' }] 
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
        datasets: [{ data: [0, 100], backgroundColor: ['#10b981', '#1f2937'], borderWidth: 0 }] 
    },
    options: { cutout: '80%', responsive: true, maintainAspectRatio: false }
});


// --- 5. Battery & UI Logic ---

function updateBatteryChart(adcValue) {
    // Math: 12-bit ADC + 3.3V Ref + 2x Divider
    const pinVoltage = (adcValue / 4095.0) * 3.3;
    const batteryVoltage = pinVoltage * 2.0; 
    
    // Percent: 3.5V (Empty) to 4.2V (Full) for stability
    let percentage = Math.round(((batteryVoltage - 3.5) / (4.2 - 3.5)) * 100);
    percentage = Math.max(0, Math.min(100, percentage));

    batteryChart.data.datasets[0].data = [percentage, 100 - percentage];
    
    // Color logic
    batteryChart.data.datasets[0].backgroundColor[0] = 
        percentage < 20 ? '#ef4444' : percentage < 50 ? '#f59e0b' : '#10b981';
        
    batteryChart.update();
    console.log(`[Display Update] Battery: ${percentage}% (${batteryVoltage.toFixed(2)}V)`);
}

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
            row.children[1].innerHTML = (activeFilters.sensor === 'all' || activeFilters.sensor === 'water') ? data.water : "-";
            row.children[2].innerHTML = (activeFilters.sensor === 'all' || activeFilters.sensor === 'rain') ? data.rain : "-";
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
        <td></td><td></td><td></td><td></td>
        <td style="color:${stateColor}; font-weight:bold">${stateLabel}</td>
    `;
    
    const body = document.getElementById('log-body');
    body.prepend(row);
    if (body.children.length > 50) body.lastElementChild.remove();
    updateAllRows();
}


// --- 6. Main Simulation Loop ---
setInterval(() => {
    const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isWater = Math.random() > 0.90;
    const rainVal = Math.floor(Math.random() * 100);

    const wStatus = document.getElementById('w-status');
    let wLog;
    if (isWater) { 
        wStatus.innerText = "ALERT"; 
        wStatus.className = "blink-danger"; 
        stats.total++; 
        wLog = `<span style="color:var(--danger); font-weight:bold">ALERT</span>`;
    } else { 
        wStatus.innerText = "LOW"; 
        wStatus.className = ""; 
        wStatus.style.color = "var(--accent)"; 
        wLog = `<span style="color:var(--accent)">LOW</span>`;
    }

    const rStatus = document.getElementById('r-status');
    let rText, rHex, rColor;
    if (rainVal > 75) { 
        rText = "HEAVY RAIN"; rHex = "#ef4444"; rColor = "var(--danger)"; stats.rain++; 
    } else if (rainVal > 25) { 
        rText = "SLIGHT RAIN"; rHex = "#f59e0b"; rColor = "var(--warning)"; stats.rain++; 
    } else { 
        rText = "DRY"; rHex = "#10b981"; rColor = "var(--accent)"; 
    }
    rStatus.innerText = rText; rStatus.style.color = rColor;

    let fLabel, fRaw;
    if (isWater && rainVal > 75) { fLabel = "!!! DANGER !!!"; fRaw = "DANGER"; stats.danger++; }
    else if (isWater || rainVal > 25) { fLabel = "ALERT"; fRaw = "ALERT"; }
    else { fLabel = "SAFE"; fRaw = "SAFE"; }

    [waterChart, rainChart].forEach(chart => {
        if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
            if(chart === rainChart) chart.data.datasets[0].backgroundColor.shift();
        }
    });

    waterChart.data.labels.push(timeStamp);
    waterChart.data.datasets[0].data.push(isWater ? 1 : 0);
    waterChart.update();

    rainChart.data.labels.push(timeStamp);
    rainChart.data.datasets[0].data.push(rainVal);
    rainChart.data.datasets[0].backgroundColor.push(rHex);
    rainChart.update();

    ['total', 'rain', 'danger', 'pump', 'buzzer'].forEach(id => {
        document.getElementById('q-' + id).innerText = stats[id];
    });

    addLog(wLog, `<span style="color:${rColor}">${rText}</span>`, 
           document.getElementById('sw-pump').innerText, 
           document.getElementById('sw-buzzer').innerText, fLabel, fRaw);
}, 5000);


// --- 7. Controls & Uptime ---
function handleSwitch(id) {
    const btn = document.getElementById('sw-' + id);
    const isOn = btn.classList.toggle('on');
    btn.classList.toggle('off', !isOn);
    btn.innerText = isOn ? "ON" : "OFF";
    if (isOn) stats[id]++;
}

setInterval(() => {
    let s = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('uptime-display').innerText = new Date(s * 1000).toISOString().substr(11, 8);
}, 1000);
