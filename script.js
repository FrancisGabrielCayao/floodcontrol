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

// Navigation
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

// Charts
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: { beginAtZero: true, ticks: { color: '#94a3b8' } },
        x: { ticks: { color: '#94a3b8' } }
    },
    plugins: { legend: { display: false } }
};

const waterChart = new Chart(document.getElementById('waterChart').getContext('2d'), {
    type: 'line',
    data: { 
        labels: [], 
        datasets: [{ 
            data: [], 
            borderColor: '#ef4444', 
            stepped: true, 
            fill: true, 
            backgroundColor: 'rgba(239, 68, 68, 0.1)' 
        }] 
    },
    options: chartOptions
});

const rainChart = new Chart(document.getElementById('rainChart').getContext('2d'), {
    type: 'bar',
    data: { 
        labels: [], 
        datasets: [{ data: [], backgroundColor: [] }] 
    },
    options: chartOptions
});

// Filtering Logic - FIXED THE "-" ISSUE
function applyFilter(cat, type, label) {
    activeFilters[cat] = type;
    document.getElementById('lbl-' + cat).innerText = label;
    updateAllRows();
}

function updateAllRows() {
    document.querySelectorAll('#log-body tr').forEach(row => {
        const data = JSON.parse(row.getAttribute('data-full'));
        
        const stateMatch = (activeFilters.state === 'all' || activeFilters.state === data.rawState);
        
        if (stateMatch) {
            row.style.display = "";
            // Update cells based on Sensor/Actuator filters
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
    
    row.setAttribute('data-full', JSON.stringify({ 
        water: w, 
        rain: r, 
        pump: p, 
        buzzer: b, 
        rawState: rawState 
    }));
    
    row.innerHTML = `<td>${time}</td><td></td><td></td><td></td><td></td><td></td>`;
    
    const body = document.getElementById('log-body');
    body.prepend(row);
    if (body.children.length > 50) body.lastElementChild.remove();
    
    updateAllRows();
}

// Loop - FIXED CHART COLORS
setInterval(() => {
    const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isWater = Math.random() > 0.90;
    const rainVal = Math.floor(Math.random() * 100);

    // Rain logic
    let rText = rainVal > 75 ? "HEAVY" : rainVal > 25 ? "MODERATE" : "DRY";
    let rHex = rainVal > 75 ? "#ef4444" : rainVal > 25 ? "#f59e0b" : "#10b981";

    // Chart Updates
    waterChart.data.labels.push(timeStamp);
    waterChart.data.datasets[0].data.push(isWater ? 1 : 0);
    if(waterChart.data.labels.length > 10) { 
        waterChart.data.labels.shift(); 
        waterChart.data.datasets[0].data.shift(); 
    }
    waterChart.update();

    rainChart.data.labels.push(timeStamp);
    rainChart.data.datasets[0].data.push(rainVal);
    rainChart.data.datasets[0].backgroundColor.push(rHex); // FIXED COLOR PUSH
    if(rainChart.data.labels.length > 10) { 
        rainChart.data.labels.shift(); 
        rainChart.data.datasets[0].data.shift(); 
        rainChart.data.datasets[0].backgroundColor.shift(); 
    }
    rainChart.update();

    // UI Updates
    document.getElementById('w-status').innerText = isWater ? "ALERT" : "LOW";
    document.getElementById('w-status').style.color = isWater ? "var(--danger)" : "var(--accent)";
    
    document.getElementById('r-status').innerText = rText;
    document.getElementById('r-status').style.color = rHex;

    const fState = isWater ? "ALERT" : "SAFE";
    
    addLog(isWater ? "ALERT" : "LOW", rText, "OFF", "OFF", fState, fState);
}, 5000);
