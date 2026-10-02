const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '/'))); // Serve static files from current dir

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// --- Backend Configuration ---
// Defined a logical map size. The frontend will scale this to the canvas.
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

const CONFIG = {
    hospitalCount: 3,
    ambulanceCount: 5,
    simulationSpeed: 2000 // Tick rate in ms
};

// --- System State ---
let state = {
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

// --- Initialization ---
function initWorld() {
    state.hospitals = [];
    state.ambulances = [];
    state.activeIncidents = [];

    // Spawn Hospitals
    for (let i = 0; i < CONFIG.hospitalCount; i++) {
        state.hospitals.push({
            x: Math.random() * MAP_WIDTH * 0.8 + MAP_WIDTH * 0.1,
            y: Math.random() * MAP_HEIGHT * 0.8 + MAP_HEIGHT * 0.1,
            id: `HOSP-${i + 1}`
        });
    }

    // Spawn Ambulances
    for (let i = 0; i < CONFIG.ambulanceCount; i++) {
        state.ambulances.push({
            x: Math.random() * MAP_WIDTH,
            y: Math.random() * MAP_HEIGHT,
            id: `AMB-${i + 1}`,
            status: 'idle',
            target: null
        });
    }
}

initWorld();

// --- Simulation Loop ---
let simInterval;

function startGameLoop() {
    if (simInterval) clearInterval(simInterval);
    state.isRunning = true;
    console.log('Simulation started.');

    // Ticks every 2 seconds for major logic (generation), but we can have faster updates for movement
    simInterval = setInterval(() => {
        gameLogicTurn();
    }, CONFIG.simulationSpeed);

    // Faster interval for movement updates (30fps equivalent roughly)
    movementInterval = setInterval(() => {
        moveAmbulances();
        // Emit state to all clients
        io.emit('stateUpdate', state);
    }, 50); // 50ms = 20 update per second
}

function stopGameLoop() {
    state.isRunning = false;
    clearInterval(simInterval);
    if (movementInterval) clearInterval(movementInterval);
    console.log('Simulation paused.');
    io.emit('stateUpdate', state); // Send final paused state
}

let movementInterval;

function gameLogicTurn() {
    if (!state.isRunning) return;

    // 1. Randomly trigger Detection
    if (Math.random() > 0.6 && state.activeIncidents.length === 0) {
        triggerDetection();
    }
}

async function triggerDetection() {
    const types = ['Cardiac Arrest', 'Traffic Accident', 'Building Fire', 'Gas Leak'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * (MAP_WIDTH - 50) + 25;
    const y = Math.random() * (MAP_HEIGHT - 50) + 25;

    // 1. Detection Phase
    updateAgent('detection', 'Active', `Detected: ${type}`);
    io.emit('logEvent', { source: 'Detection Agent', message: `Anomaly detected at Grid [${Math.floor(x)}, ${Math.floor(y)}]` });

    await wait(800);

    // 2. Risk Assessment Phase
    updateAgent('risk', 'Analyzing', 'Evaluating severity...');
    const riskScore = Math.floor(Math.random() * 30) + 70; // High risk

    await wait(800);
    updateAgent('risk', 'Idle', `Risk Score: ${riskScore}/100 - HIGH`);
    io.emit('logEvent', { source: 'Risk Agent', message: `Severity assessed: ${riskScore} (CRITICAL). Immediate dispatch required.` });

    const incident = { id: Date.now(), type, x, y, risk: riskScore };
    state.activeIncidents.push(incident);

    // 3. Planning Phase
    updateAgent('planning', 'Calculating', 'Finding optimal route...');

    const nearestAmb = findNearestAmbulance(x, y);
    const nearestHosp = findNearestHospital(x, y);

    await wait(1000);

    if (nearestAmb) {
        nearestAmb.target = { x, y, type: 'pickup' };
        nearestAmb.hospitalOne = nearestHosp;

        updateAgent('planning', 'Active', `Assigned Amb-${nearestAmb.id.split('-')[1]} to ${type}`);
        io.emit('logEvent', { source: 'Planning Agent', message: `Route generated. ETA: 4m. Traffic rerouting via API.` });

        io.emit('showIncident', { incident, hospital: nearestHosp });
    }

    // 4. Communication Phase
    updateAgent('comm', 'Broadcasting', 'Alerting hospitals & police');
    await wait(600);
    io.emit('logEvent', { source: 'Comm. Agent', message: `Alert sent to ${nearestHosp.id}. Police notified.` });
    updateAgent('comm', 'Idle', 'Network Secure');

    // Reset agents
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
                // Determine speed (pixels per 50ms tick)
                const speed = 8;
                a.x += (dx / dist) * speed;
                a.y += (dy / dist) * speed;
            } else {
                // Arrived at target
                if (a.target.type === 'pickup') {
                    // Switch to dropoff at hospital
                    a.target = { x: a.hospitalOne.x, y: a.hospitalOne.y, type: 'dropoff' };
                } else {
                    // Trip complete
                    a.target = null;
                    state.activeIncidents.shift(); // Remove incident
                    io.emit('hideIncident');

                    // 5. Learning Phase
                    updateAgent('learning', 'Updating', 'Optimizing response model');
                    io.emit('logEvent', { source: 'Learning Agent', message: 'Incident resolved. Response data archived.' });

                    state.stats.optRate = Math.min(99, state.stats.optRate + 0.1);

                    setTimeout(() => {
                        updateAgent('learning', 'Active', 'Analyzing historical data');
                    }, 1000);
                }
            }
        }
    });
}

// --- Helpers ---
function updateAgent(id, status, activity) {
    const agent = state.agents.find(a => a.id === id);
    if (agent) {
        agent.status = status;
        agent.activity = activity;
    }
}

function findNearestAmbulance(x, y) {
    return state.ambulances.find(a => !a.target) || state.ambulances[0];
}

function findNearestHospital(x, y) {
    let nearest = state.hospitals[0];
    let minDst = Infinity;
    state.hospitals.forEach(h => {
        const dst = Math.sqrt(Math.pow(x - h.x, 2) + Math.pow(y - h.y, 2));
        if (dst < minDst) {
            minDst = dst;
            nearest = h;
        }
    });
    return nearest;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Socket.IO Handling ---
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Send initial state immediately
    socket.emit('stateUpdate', state);

    socket.on('toggleSimulation', (payload) => {
        if (state.isRunning) {
            stopGameLoop();
        } else {
            startGameLoop();
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`LifeLens Backend Server running on http://localhost:${PORT}`);
});
