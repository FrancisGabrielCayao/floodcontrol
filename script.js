let stats = { total: 0, rain: 0, danger: 0, pump: 0, buzzer: 0 };
let activeFilters = { sensor: 'all', actuator: 'all', state: 'all' };


// --- Sidebar Controls ---

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


// --- Chart Setup (Fixed Colors) ---

const waterChart = new Chart(document.getElementById('waterChart').getContext('2d'), {
    type: 'line',
    data: { 
        labels: [], 
        datasets: [{ 
            data: [], 
            borderColor: '#ef4444', 
            stepped: true, 
            fill: true, 
            backgroundColor: 'rgba(239, 68, 68, 0.2)' 
        }] 
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
});


const rainChart = new Chart(document.getElementById('rainChart').getContext('2d'), {
    type: 'bar',
    data: { 
        labels: [], 
        datasets: [{ data: [], backgroundColor: [] }] 
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
});


// --- Filtering & Table Updates ---

function applyFilter(cat, type, label) {
    activeFilters[cat] = type;
    document.getElementById('lbl-' + cat).innerText = label;
    updateAllRows();
}


function updateAllRows() {
    const rows = document.querySelectorAll('#log-body tr');
    rows.forEach(row => {
        const data = JSON.parse(row.getAttribute('data-full'));
        const stateMatch = (activeFilters.state === 'all' || activeFilters.state === data.rawState);
        
        if (stateMatch) {
            row.style.display = "";
            row.children[1].innerHTML = (activeFilters.sensor === 'all' || activeFilters.sensor === 'water') ? data.water : "-";
            row.children[2].innerHTML = (activeFilters.sensor === 'all' || activeFilters.sensor === 'rain') ? data.rain : "-";
            row.children[3].innerHTML = (activeFilters.actuator === 'all' || activeFilters.actuator === 'pump') ? data.pump : "-";
            row.children[4].innerHTML = (activeFilters.actuator === 'all' || activeFilters.actuator === 'buzzer') ? data.buzzer : "-";
        } else {
            row.style.display = "none";
        }
    });
}


function addLog(w, r, p, b, stateLabel, rawState) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const row = document.createElement('tr');
    row.setAttribute('data-full', JSON.stringify({ water: w, rain: r, pump: p, buzzer: b, rawState: rawState }));
    
    let color = rawState === 'DANGER' ? 'var(--danger)' : (rawState === 'ALERT' ? 'var(--warning)' : 'var(--accent)');
    row.innerHTML = `<td>${time}</td><td></td><td></td><td></td><td></td><td style="color:${color};font-weight:bold">${stateLabel}</td>`;
    
    const body = document.getElementById('log-body');
    body.prepend(row);
    if (body.children.length > 30) body.lastElementChild.remove(); // Capped at 30 for mobile speed
    updateAllRows();
}


// --- Main Loop ---

setInterval(() => {
    const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isWater = Math.random() > 0.90;
    const rainVal = Math.floor(Math.random() * 100);


    let rColor = rainVal > 75 ? "#ef4444" : (rainVal > 25 ? "#f59e0b" : "#10b981");
    let rText = rainVal > 75 ? "HEAVY" : (rainVal > 25 ? "MODERATE" : "DRY");


    // Update Rain Chart
    rainChart.data.labels.push(timeStamp);
    rainChart.data.datasets[0].data.push(rainVal);
    rainChart.data.datasets[0].backgroundColor.push(rColor);
    if (rainChart.data.labels.length > 8) {
        rainChart.data.labels.shift();
        rainChart.data.datasets[0].data.shift();
        rainChart.data.datasets[0].backgroundColor.shift();
    }
    rainChart.update('none');


    // Update Water Chart
    waterChart.data.labels.push(timeStamp);
    waterChart.data.datasets[0].data.push(isWater ? 1 : 0);
    if (waterChart.data.labels.length > 8) {
        waterChart.data.labels.shift();
        waterChart.data.datasets[0].data.shift();
    }
    waterChart.update('none');


    addLog(isWater ? "ALERT" : "LOW", rText, "OFF", "OFF", isWater ? "ALERT" : "SAFE", isWater ? "ALERT" : "SAFE");
}, 5000);


function handleSwitch(id) {
    const btn = document.getElementById('sw-' + id);
    const isOn = btn.classList.toggle('on');
    btn.classList.toggle('off', !isOn);
    btn.innerText = isOn ? "ON" : "OFF";
}
