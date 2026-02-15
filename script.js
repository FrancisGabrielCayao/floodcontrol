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

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function openTab(evt, tabName) {
    document.querySelectorAll(".tab-content").forEach(c => { 
        c.classList.remove("active"); 
    });
    document.querySelectorAll(".tab-btn").forEach(b => { 
        b.classList.remove("active"); 
    });
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: { 
            beginAtZero: true, 
            ticks: { color: '#94a3b8', font: { size: 10 } } 
        },
        x: { 
            ticks: { color: '#94a3b8', font: { size: 10 } } 
        }
    },
    plugins: { 
        legend: { display: false } 
    }
};

const waterChart = new Chart(document.getElementById('waterChart').getContext('2d'), {
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

function applyFilter(cat, type, label) {
    activeFilters[cat] = type;
    document.getElementById('lbl-' + cat).innerText = label;
    updateAllRows();
}

function updateAllRows() {
    document.querySelectorAll('#log-body tr').forEach(row => {
        const data = JSON.parse(row.getAttribute('data-full'));
        
        // Logical check for State
        const stateMatch = (activeFilters.state === 'all' || activeFilters.state === data.rawState);
        
        // Logical check for Sensor Column (Water/Rain)
        const sensorMatch = (activeFilters.sensor === 'all' || 
                           (activeFilters.sensor === 'water' && data.water.includes("LOW") || data.water.includes("ALERT")) || 
                           (activeFilters.sensor === 'rain' && !data.rain.includes("DRY")));

        if (stateMatch && sensorMatch) {
            row.style.display = "";
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
    
    let color = rawState === 'DANGER' ? 'var(--danger)' : rawState === 'ALERT' ? 'var(--warning)' : 'var(--accent)';
    
    row.innerHTML = `
        <td>${time}</td>
        <td>${w}</td>
        <td>${r}</td>
        <td>${p}</td>
        <td>${b}</td>
        <td style="color:${color}; font-weight:bold">${stateLabel}</td>
    `;
    
    const body = document.getElementById('log-body');
    body.prepend(row);
    
    if (body.children.length > 50) { 
        body.lastElementChild.remove(); 
    }
    
    updateAllRows();
}

setInterval(() => {
    const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isWater = Math.random() > 0.90;
    const rainVal = Math.floor(Math.random() * 100);

    const wStatus = document.getElementById('w-status');
    let wLog = isWater ? `<span style="color:var(--danger)">ALERT</span>` : `<span style="color:var(--accent)">LOW</span>`;
    wStatus.innerText = isWater ? "ALERT" : "LOW";
    wStatus.style.color = isWater ? "var(--danger)" : "var(--accent)";

    const rStatus = document.getElementById('r-status');
    let rText = rainVal > 75 ? "HEAVY" : rainVal > 25 ? "MODERATE" : "DRY";
    let rColor = rainVal > 75 ? "var(--danger)" : rainVal > 25 ? "var(--warning)" : "var(--accent)";
    rStatus.innerText = rText;
    rStatus.style.color = rColor;

    let fLabel = (isWater && rainVal > 75) ? "DANGER" : (isWater || rainVal > 25) ? "ALERT" : "SAFE";

    if (isWater) { stats.total++; stats.danger++; }
    if (rainVal > 25) { stats.rain++; }
    
    document.getElementById('q-total').innerText = stats.total;
    document.getElementById('q-rain').innerText = stats.rain;
    document.getElementById('q-danger').innerText = stats.danger;

    addLog(wLog, rText, document.getElementById('sw-pump').innerText, document.getElementById('sw-buzzer').innerText, fLabel, fLabel);
    
    // Update Charts
    waterChart.data.labels.push(timeStamp);
    waterChart.data.datasets[0].data.push(isWater ? 1 : 0);
    if(waterChart.data.labels.length > 15) { waterChart.data.labels.shift(); waterChart.data.datasets[0].data.shift(); }
    waterChart.update('none');

    rainChart.data.labels.push(timeStamp);
    rainChart.data.datasets[0].data.push(rainVal);
    if(rainChart.data.labels.length > 15) { rainChart.data.labels.shift(); rainChart.data.datasets[0].data.shift(); }
    rainChart.update('none');

}, 5000);

function handleSwitch(id) {
    const btn = document.getElementById('sw-' + id);
    const isOn = btn.classList.toggle('on');
    btn.innerText = isOn ? "ON" : "OFF";
    if (isOn) { 
        stats[id]++; 
    }
    document.getElementById('q-' + id).innerText = stats[id];
}
