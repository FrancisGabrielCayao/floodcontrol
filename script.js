let stats = { total: 0, rain: 0, danger: 0, pump: 0, buzzer: 0 };
let activeFilters = { sensor: 'all', actuator: 'all', state: 'all' };


// --- Sidebar & Tab Logic ---

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}


function openTab(evt, tabName) {
    // Mobile fix: ensure all content is hidden first
    document.querySelectorAll(".tab-content").forEach(c => {
        c.style.display = "none";
        c.classList.remove("active");
    });
    
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    
    const target = document.getElementById(tabName);
    target.style.display = "block";
    target.classList.add("active");
    evt.currentTarget.classList.add("active");
}


// --- Manual Switch Handler (Fixes the "-" issue) ---

function handleSwitch(id) {
    const btn = document.getElementById('sw-' + id);
    const isOn = btn.classList.toggle('on');
    btn.classList.toggle('off', !isOn);
    btn.innerText = isOn ? "ON" : "OFF";

    if (isOn) stats[id]++;
    document.getElementById('q-' + id).innerText = stats[id];

    // Get current sensor values so we don't show "-"
    const currentWater = document.getElementById('w-status').innerText;
    const currentRain = document.getElementById('r-status').innerText;
    const pumpStatus = document.getElementById('sw-pump').innerText;
    const buzzerStatus = document.getElementById('sw-buzzer').innerText;

    addLog(currentWater, currentRain, pumpStatus, buzzerStatus, "MANUAL", "MANUAL");
}


// --- Updated addLog (Fixes "-" visibility) ---

function addLog(w, r, p, b, stateLabel, rawState) {
    const time = new Date().toLocaleTimeString([], { hour12: true });
    const row = document.createElement('tr');
    
    // Store full data for filtering
    row.setAttribute('data-full', JSON.stringify({ 
        water: w, 
        rain: r, 
        pump: p, 
        buzzer: b, 
        rawState: rawState 
    }));

    let stateColor = rawState === 'DANGER' ? 'var(--danger)' : (rawState === 'SAFE' ? 'var(--accent)' : 'var(--warning)');
    if(rawState === 'MANUAL') stateColor = '#60a5fa'; // Blue for manual actions

    row.innerHTML = `
        <td>${time}</td>
        <td>${w}</td>
        <td>${r}</td>
        <td>${p}</td>
        <td>${b}</td>
        <td style="color:${stateColor}; font-weight:bold">${stateLabel}</td>
    `;

    const body = document.getElementById('log-body');
    body.prepend(row);
    
    if (body.children.length > 40) body.lastElementChild.remove();
    updateAllRows();
}


// --- Filtering Logic ---

function updateAllRows() {
    document.querySelectorAll('#log-body tr').forEach(row => {
        const data = JSON.parse(row.getAttribute('data-full'));
        const stateMatch = (activeFilters.state === 'all' || activeFilters.state === data.rawState);
        
        if (stateMatch) {
            row.style.display = "";
            // If sensor filter is active, only hide specific text, not the whole row
            row.children[1].innerText = (activeFilters.sensor === 'all' || activeFilters.sensor === 'water') ? data.water : "-";
            row.children[2].innerText = (activeFilters.sensor === 'all' || activeFilters.sensor === 'rain') ? data.rain : "-";
        } else {
            row.style.display = "none";
        }
    });
}
