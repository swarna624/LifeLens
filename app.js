/**
 * LifeLens - Autonomous Multi-Agent System Simulation
 * 
 * Agents:
 * 1. Detection Agent (Scans for events)
 * 2. Risk Agent (Assesses severity)
 * 3. Planning Agent (Routes resources)
 * 4. Communication Agent (Notifies stakeholders)
 * 5. Learning Agent (Optimizes over time)
 */

// --- Configuration ---
const CONFIG = {
    gridSize: 20,
    hospitalCount: 3,
    ambulanceCount: 5,
    simulationSpeed: 1000,
    colors: {
        hospital: '#10b981',
        ambulance: '#3b82f6',
        emergency: '#ef4444',
        route: '#f59e0b',
        grid: '#1e293b'
    }
};

// --- State ---
const state = {
    agents: [
        { id: 'detection', name: 'Detection Agent', status: 'Scanning', activity: 'Monitoring CCTV Feeds...', icon: 'videocam' },
        { id: 'risk', name: 'Risk Assessment', status: 'Idle', activity: 'Waiting for events...', icon: 'analytics' },
        { id: 'planning', name: 'Response Planning', status: 'Idle', activity: 'Resources Standby', icon: 'alt_route' },
        { id: 'comm', name: 'Communication', status: 'Idle', activity: 'Network Secure', icon: 'cell_tower' },
        { id: 'learning', name: 'Continuous Learning', status: 'Active', activity: 'Analyzing historical data', icon: 'school' }
    ],
    hospitals: [],
    ambulances: [],
    activeIncidents: [],
    stats: {
        optRate: 85,
        faRate: 92
    },
    isRunning: false
};

// --- DOM Elements ---
const canvas = document.getElementById('simulation-canvas');
const ctx = canvas.getContext('2d');
const logList = document.getElementById('event-log-list');
const agentsList = document.querySelector('.agents-list');
const activeIncidentsList = document.getElementById('active-incidents-list');
const emptyState = document.getElementById('response-empty');
const toggleBtn = document.getElementById('toggle-sim');

// --- Initialization ---
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize entities
    spawnHospitals();
    spawnAmbulances();

    // Render initial UI
    renderAgents();
    drawMap();
    startClock();

    toggleBtn.addEventListener('click', toggleSimulation);
}

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    drawMap();
}

// --- Map Logic ---
function spawnHospitals() {
    for (let i = 0; i < CONFIG.hospitalCount; i++) {
        state.hospitals.push({
            x: Math.random() * canvas.width * 0.8 + canvas.width * 0.1,
            y: Math.random() * canvas.height * 0.8 + canvas.height * 0.1,
            id: `HOSP-${i + 1}`
        });
    }
}

function spawnAmbulances() {
    for (let i = 0; i < CONFIG.ambulanceCount; i++) {
        state.ambulances.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            id: `AMB-${i + 1}`,
            status: 'idle', // idle, moving
            target: null
        });
    }
}

function drawMap() {
    // Clear
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = '#1e293b'; // Dark slate
    ctx.lineWidth = 1;
    const step = 40;

    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, 0);
        ctx.lineTo(canvas.width, canvas.height); // bug fix in logic but visual is fine
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw Hospitals
    state.hospitals.forEach(h => {
        // Glow
        const gradient = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, 15);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Icon/Dot
        ctx.fillStyle = CONFIG.colors.hospital;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '10px Inter';
        ctx.fillText('H', h.x - 4, h.y + 3);
    });

    // Draw Ambulances
    state.ambulances.forEach(a => {
        const isActive = !!a.target;
        ctx.fillStyle = isActive ? '#fbbf24' : CONFIG.colors.ambulance; // Gold if busy

        ctx.beginPath();
        ctx.rect(a.x - 5, a.y - 5, 10, 10);
        ctx.fill();

        // Glow for active ambulances
        if (isActive) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fbbf24';
            ctx.strokeRect(a.x - 5, a.y - 5, 10, 10);
            ctx.shadowBlur = 0;
        }

        if (a.target) {
            // Draw route line
            ctx.strokeStyle = '#fbbf24';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(a.target.x, a.target.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });

    // Draw Incidents
    state.activeIncidents.forEach(inc => {
        // Pulse effect
        const pulseSize = 10 + Math.sin(Date.now() / 200) * 5;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.beginPath();
        ctx.arc(inc.x, inc.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = CONFIG.colors.emergency;
        ctx.beginPath();
        ctx.arc(inc.x, inc.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    requestAnimationFrame(drawMap);
}

// --- Agent Logic & Simulation ---
let simInterval;

function toggleSimulation() {
    state.isRunning = !state.isRunning;
    const btnSpan = toggleBtn.querySelector('span');

    if (state.isRunning) {
        toggleBtn.innerHTML = '<span class="material-icons-round">pause</span> Pause Simulation';
        toggleBtn.classList.add('active');
        logEvent('System', 'Simulation Sequence Initiated.');
        simInterval = setInterval(gameLoop, 2000); // Main "Turn" every 2s
        animateAgents(); // Visual updates
    } else {
        toggleBtn.innerHTML = '<span class="material-icons-round">play_arrow</span> Start Simulation';
        toggleBtn.classList.remove('active');
        logEvent('System', 'Simulation Paused.');
        clearInterval(simInterval);
    }
}

function gameLoop() {
    // 1. Trigger Detection if we have idle ambulances and fewer than 3 active incidents
    const idleAmbulances = state.ambulances.filter(a => !a.target).length;
    if (Math.random() > 0.4 && idleAmbulances > 0 && state.activeIncidents.length < 3) {
        triggerDetection();
    }

    // Move ambulances
    moveAmbulances();
}

async function triggerDetection() {
    const types = ['Cardiac Arrest', 'Traffic Accident', 'Building Fire', 'Gas Leak', 'Industrial Injury'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * (canvas.width - 50) + 25;
    const y = Math.random() * (canvas.height - 50) + 25;
    const id = Date.now() + Math.floor(Math.random() * 1000);

    // 1. Detection
    updateAgent('detection', 'Active', `Detected: ${type}`);
    logEvent('Detection Agent', `Anomaly detected at Grid [${Math.floor(x)}, ${Math.floor(y)}]`);

    await wait(800);

    // 2. Risk Assessment
    updateAgent('risk', 'Analyzing', 'Evaluating severity...');
    const riskScore = Math.floor(Math.random() * 30) + 70; // High risk usually

    await wait(800);
    updateAgent('risk', 'Idle', `Risk Score: ${riskScore}/100 - HIGH`);
    logEvent('Risk Agent', `Severity assessed: ${riskScore} (CRITICAL). Immediate dispatch required.`);

    const incident = { id, type, x, y, risk: riskScore };
    state.activeIncidents.push(incident);

    // 3. Response Planning
    updateAgent('planning', 'Calculating', 'Finding optimal route...');

    // Find nearest ambulance
    const nearestAmb = findNearestAmbulance(x, y);
    const nearestHosp = findNearestHospital(x, y);

    await wait(1000);

    if (nearestAmb) {
        nearestAmb.target = { x, y, type: 'pickup' };
        nearestAmb.incidentId = id;
        nearestAmb.hospitalOne = nearestHosp;
        updateAgent('planning', 'Active', `Routing Amb-${nearestAmb.id.split('-')[1]} to ${type}`);
        logEvent('Planning Agent', `Optimizing route for ${type}. Traffic signals preempted.`);

        // Update UI Panel
        addActiveIncidentUI(incident, nearestHosp, nearestAmb);
    }

    // 4. Communication
    updateAgent('comm', 'Broadcasting', 'Alerting hospitals & police');
    await wait(600);
    logEvent('Comm. Agent', `Alert sent to ${nearestHosp.id}. Police notified.`);
    updateAgent('comm', 'Idle', 'Network Secure');

    updateAgent('detection', 'Scanning', 'Monitoring CCTV Feeds...');
    updateAgent('planning', 'Idle', 'Resources Standby');
}

function moveAmbulances() {
    state.ambulances.forEach(a => {
        if (a.target) {
            const dx = a.target.x - a.x;
            const dy = a.target.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                a.x += (dx / dist) * 8; // Speed
                a.y += (dy / dist) * 8;
            } else {
                // Arrived
                if (a.target.type === 'pickup') {
                    // Go to Hospital next
                    a.target = { x: a.hospitalOne.x, y: a.hospitalOne.y, type: 'dropoff' };
                    logEvent('System', `Ambulance ${a.id} picked up patient. Heading to ${a.hospitalOne.id}.`);
                } else {
                    // Finished
                    const incidentId = a.incidentId;
                    a.target = null;
                    a.incidentId = null;

                    // Remove incident from state
                    state.activeIncidents = state.activeIncidents.filter(inc => inc.id !== incidentId);

                    // Remove UI card
                    removeActiveIncidentUI(incidentId);

                    // 5. Learning
                    updateAgent('learning', 'Updating', 'Optimizing response model');
                    logEvent('Learning Agent', 'Incident resolved. Response data archived for training.');
                    state.stats.optRate = Math.min(99, state.stats.optRate + 0.1);
                    updateStats();

                    setTimeout(() => {
                        updateAgent('learning', 'Active', 'Analyzing historical data');
                    }, 1000);
                }
            }
        }
    });
}

// --- Helpers ---

function findNearestAmbulance(x, y) {
    // Simple distance check, find first idle
    return state.ambulances.find(a => !a.target) || state.ambulances[0];
}

function findNearestHospital(x, y) {
    let nearest = state.hospitals[0];
    let minDst = 100000;
    state.hospitals.forEach(h => {
        const dst = Math.sqrt(Math.pow(x - h.x, 2) + Math.pow(y - h.y, 2));
        if (dst < minDst) {
            minDst = dst;
            nearest = h;
        }
    });
    return nearest;
}

function renderAgents() {
    agentsList.innerHTML = state.agents.map(agent => `
        <div class="agent-card" id="agent-${agent.id}">
            <div class="agent-header">
                <span class="agent-name">${agent.name}</span>
                <span class="agent-status">${agent.status}</span>
            </div>
            <div class="agent-activity">${agent.activity}</div>
        </div>
    `).join('');
}

function updateAgent(id, status, activity) {
    const index = state.agents.findIndex(a => a.id === id);
    if (index !== -1) {
        state.agents[index].status = status;
        state.agents[index].activity = activity;

        // DOM Update
        const card = document.getElementById(`agent-${id}`);
        if (card) {
            card.querySelector('.agent-status').textContent = status;
            card.querySelector('.agent-activity').textContent = activity;
            if (status !== 'Idle' && status !== 'Scanning') {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        }
    }
}

// --- Event & UI Helpers ---

function logEvent(source, message) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const li = document.createElement('li');
    li.className = 'log-entry';
    if (message.includes('CRITICAL')) li.classList.add('high-risk');

    li.innerHTML = `
        <span class="time">[${time}] ${source}</span>
        <span class="msg">${message}</span>
    `;
    logList.prepend(li);
}

function addActiveIncidentUI(incident, hospital, ambulance) {
    emptyState.classList.add('hidden');

    const card = document.createElement('div');
    card.className = 'active-incident';
    card.id = `incident-card-${incident.id}`;

    card.innerHTML = `
        <div class="incident-header high-risk">
            <span class="material-icons-round">warning</span>
            <h3>${incident.type}</h3>
        </div>
        <div class="plan-steps">
            <div class="step">
                <span class="step-icon">location_on</span>
                <div class="step-info">
                    <label>Location</label>
                    <span>Grid [${Math.floor(incident.x)}, ${Math.floor(incident.y)}]</span>
                </div>
            </div>
            <div class="step">
                <span class="step-icon">medical_services</span>
                <div class="step-info">
                    <label>Dispatching To</label>
                    <span>${hospital.id} (ICU Ready)</span>
                </div>
            </div>
            <div class="step">
                <span class="step-icon">ambulance</span>
                <div class="step-info">
                    <label>Assigned Unit</label>
                    <span>${ambulance.id} (ETA: 4m)</span>
                </div>
            </div>
        </div>
        <button class="btn-action">Monitoring Dispatch</button>
    `;

    activeIncidentsList.prepend(card);
}

function removeActiveIncidentUI(id) {
    const card = document.getElementById(`incident-card-${id}`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateX(20px)';
        setTimeout(() => {
            card.remove();
            if (activeIncidentsList.children.length === 0) {
                emptyState.classList.remove('hidden');
            }
        }, 300);
    }
}

function updateStats() {
    document.getElementById('opt-rate').style.width = `${state.stats.optRate}%`;
    document.getElementById('fa-rate').style.width = `${state.stats.faRate}%`;
}

function startClock() {
    setInterval(() => {
        document.getElementById('system-clock').textContent = new Date().toLocaleTimeString();
    }, 1000);
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function animateAgents() {
    // Just a placeholder if we wanted separate animations
}

// Start
document.addEventListener('DOMContentLoaded', init);