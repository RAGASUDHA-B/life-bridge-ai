// LifeBridge AI Emergency Assistant - Application Logic

// Local State
let state = {
  isOffline: false,
  activeTab: 'panel-map',
  coords: { lat: 13.0827, lng: 80.2707 }, // Default: Chennai, India (disaster prone zone)
  hazards: [],
  registry: [],
  supplies: [],
  volunteers: [],
  triageCases: [],
  chatLanguage: 'en'
};

// Mock Shelters & Hospitals (Initial Data)
const initialShelters = [
  { id: 's1', name: 'Chennai Central High School Shelter', lat: 13.0850, lng: 80.2680, capacity: '120/150 (80% Full)', phone: '044-25360771' },
  { id: 's2', name: 'Ripon Palace Relief Camp', lat: 13.0881, lng: 80.2730, capacity: '45/200 (22% Full)', phone: '044-25381330' },
  { id: 's3', name: 'Mylapore Community Center Shelter', lat: 13.0247, lng: 80.2694, capacity: '95/100 (95% Full)', phone: '044-24641010' }
];

const initialHospitals = [
  { id: 'h1', name: 'Rajiv Gandhi General Hospital', lat: 13.0818, lng: 80.2735, waitTime: '20 mins', phone: '044-25305000' },
  { id: 'h2', name: 'Mylapore Government Hospital', lat: 13.0298, lng: 80.2635, waitTime: '45 mins', phone: '044-24935471' }
];

// Leaflet Map Variables
let map = null;
let tileLayer = null;
let mapMarkers = [];
let routeLine = null;

// Audio Context for Morse SOS Beacon
let audioCtx = null;
let sirenIntervalId = null;
let isSirenActive = false;

// Triage Questionnaire State Machine
let currentTriageData = {};
let triageStepAnswers = {};

// Intent matching corpus for Chatbot
const chatbotCorpus = {
  en: [
    { keywords: ['shelter', 'refuge', 'stay', 'camp'], response: 'Nearest Shelter: Chennai Central High School Shelter (80% full, Call 044-25360771) or Ripon Palace Relief Camp (22% full). You can check the map dashboard for live occupancy!' },
    { keywords: ['cpr', 'chest compression', 'heart attack'], response: 'CPR Instructions: Lay patient flat on back. Place hands on center of chest. Push hard and fast (100-120 compressions/min, 2 inches deep). Give 2 breaths every 30 compressions. Repeat until rescue arrives.' },
    { keywords: ['flood', 'water', 'submerge', 'rain'], response: 'Flood Survival: 1. Move immediately to higher floors or high ground. 2. Turn off the main electrical breaker. 3. Avoid walking or driving in rushing water. 4. Drink boiled/bottled water only.' },
    { keywords: ['earthquake', 'quake', 'shake', 'tremor'], response: 'Earthquake Guide: Drop down to your hands/knees. Cover your head and neck under sturdy furniture. Hold on until shaking stops. If outdoors, move to clear open fields away from power lines/walls.' },
    { keywords: ['cyclone', 'storm', 'wind', 'hurricane'], response: 'Cyclone Safety: Board up/tape windows. Stay indoors in an inner room away from glass. Keep emergency supplies in a waterproof bag. Do not leave shelter if the eye of the storm passes, as heavy reverse winds will follow.' },
    { keywords: ['hello', 'hi', 'hey', 'start'], response: 'Hello! I am your LifeBridge Disaster Assistant. I can operate fully offline to answer first aid, shelter, or crisis guidelines. How can I help you today?' },
    { keywords: ['burn', 'fire'], response: 'Burn Treatment: Cool the burn immediately with cool running tap water for 10-20 minutes. Do not use ice, toothpaste, or oil. Cover with loose sterile cling wrap and seek medical care.' }
  ],
  hi: [
    { keywords: ['शेल्टर', 'शरण', 'रहने की जगह', 'कैंप'], response: 'नजदीकी शेल्टर: चेन्नई सेंट्रल हाई स्कूल शेल्टर (80% भरा, कॉल 044-25360771) या रिपन पैलेस रिलीफ कैंप (22% भरा)। आप लाइव उपलब्धता के लिए मैप डैशबोर्ड देख सकते हैं!' },
    { keywords: ['सीपीआर', 'दिल का दौरा', 'छाती'], response: 'सीपीआर गाइड: मरीज को पीठ के बल लिटाएं। छाती के बीच में दोनों हाथ रखकर जोर-जोर से दबाएं (100-120 बार प्रति मिनट)। हर 30 बार दबाने के बाद 2 बार मुंह से सांस दें। मदद आने तक जारी रखें।' },
    { keywords: ['बाढ़', 'पानी', 'बारिश'], response: 'बाढ़ में बचाव: 1. तुरंत ऊंचे स्थान या ऊपरी मंजिल पर जाएं। 2. घर का मेन बिजली स्विच (MCB) बंद करें। 3. बहते पानी में न चलें। 4. केवल उबला हुआ या सुरक्षित बोतल का पानी पिएं।' },
    { keywords: ['भूकंप', 'कंपन'], response: 'भूकंप मार्गदर्शिका: जमीन पर झुकें (Drop), किसी मजबूत टेबल के नीचे सिर ढकें (Cover) और उसे पकड़ कर रखें (Hold On)। बिजली के खंभों और इमारतों से दूर खुले मैदान में जाएं।' },
    { keywords: ['तूफान', 'चक्रवात', 'हवा'], response: 'चक्रवात सुरक्षा: खिड़कियों को बोर्ड या टेप से ढकें। शीशे से दूर किसी अंदरूनी कमरे में रहें। पानी प्रतिरोधी बैग में आवश्यक सामान रखें। तूफान का केंद्र गुजरते समय बाहर न निकलें।' },
    { keywords: ['नमस्ते', 'हैलो'], response: 'नमस्ते! मैं आपका लाइफब्रिज डिजास्टर असिस्टेंट हूं। मैं प्राथमिक चिकित्सा, शेल्टर या संकट के दिशा-निर्देशों का जवाब देने के लिए पूरी तरह से ऑफलाइन काम कर सकता हूं। मैं आपकी क्या मदद कर सकता हूं?' }
  ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  // Register Service Worker for PWA offline-first functionality
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered successfully:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  }

  loadState();
  initMap();
  initNavigation();
  initClock();
  initTriageWizard();
  initLedger();
  initRegistry();
  initGuides();
  initChatbot();
  initSyncModal();
  updateDashboardStats();
  
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// Load / Save Local State
function loadState() {
  const savedState = localStorage.getItem('lifebridge_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      state.hazards = parsed.hazards || [];
      state.registry = parsed.registry || [];
      state.supplies = parsed.supplies || [];
      state.volunteers = parsed.volunteers || [];
      state.triageCases = parsed.triageCases || [];
    } catch (e) {
      console.error('Error parsing local state, using empty state', e);
    }
  }
}

function saveState() {
  localStorage.setItem('lifebridge_state', JSON.stringify({
    hazards: state.hazards,
    registry: state.registry,
    supplies: state.supplies,
    volunteers: state.volunteers,
    triageCases: state.triageCases
  }));
  updateDashboardStats();
}

// Update clock and simulate GPS
function initClock() {
  const updateTime = () => {
    const timeEl = document.getElementById('live-clock');
    if (timeEl) {
      const d = new Date();
      timeEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };
  setInterval(updateTime, 1000);
  updateTime();

  // Network offline detector
  window.addEventListener('online', () => setOnlineState(true));
  window.addEventListener('offline', () => setOnlineState(false));

  const simulateBtn = document.getElementById('toggle-network-btn');
  simulateBtn.addEventListener('click', () => {
    state.isOffline = !state.isOffline;
    setOnlineState(!state.isOffline);
  });
}

function setOnlineState(online) {
  const statusEl = document.getElementById('network-status');
  const simulateBtn = document.getElementById('toggle-network-btn');
  const modeBadge = document.getElementById('map-mode-badge');
  const leafletDiv = document.getElementById('map');
  const fallbackDiv = document.getElementById('offline-map-fallback');

  if (online) {
    statusEl.className = "status-indicator online";
    statusEl.querySelector('.status-text').textContent = "ONLINE";
    simulateBtn.innerHTML = '<i data-lucide="wifi-off"></i> Simulate Offline';
    modeBadge.className = "badge map-badge-online";
    modeBadge.textContent = "Live Tiles";
    
    // Show live map
    leafletDiv.classList.remove('hidden');
    fallbackDiv.classList.add('hidden');
    
    if (map) {
      map.invalidateSize();
    }
  } else {
    statusEl.className = "status-indicator offline";
    statusEl.querySelector('.status-text').textContent = "OFFLINE";
    simulateBtn.innerHTML = '<i data-lucide="wifi"></i> Go Online';
    modeBadge.className = "badge map-badge-offline";
    modeBadge.textContent = "Offline Grid";
    
    // Hide live map tiles, show canvas
    leafletDiv.classList.add('hidden');
    fallbackDiv.classList.remove('hidden');
    drawOfflineCanvas();
  }
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Navigation Tabs
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const target = tab.dataset.target;
      state.activeTab = target;
      
      const panels = document.querySelectorAll('.tab-panel');
      panels.forEach(p => p.classList.remove('active'));
      
      const targetPanel = document.getElementById(target);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
      
      // Recenter or redraw map when switching back to Map Dashboard
      if (target === 'panel-map') {
        if (!state.isOffline && map) {
          setTimeout(() => map.invalidateSize(), 150);
        } else if (state.isOffline) {
          drawOfflineCanvas();
        }
      }
    });
  });
}

// Dashboard statistics
function updateDashboardStats() {
  document.getElementById('count-sos').textContent = state.hazards.filter(h => h.type === 'Medical Emergency').length + state.triageCases.filter(t => t.status === 'RED').length;
  document.getElementById('count-hazards').textContent = state.hazards.length;
  document.getElementById('count-safe').textContent = state.registry.filter(r => r.status === 'Safe' || r.status === 'Evacuated').length;
  
  // Render shelter list
  const shelterList = document.getElementById('shelter-list');
  if (shelterList) {
    shelterList.innerHTML = '';
    initialShelters.forEach(s => {
      const item = document.createElement('div');
      item.className = 'list-card-item';
      item.innerHTML = `
        <div class="list-card-header">
          <strong>🏠 ${s.name}</strong>
          <span class="badge track-badge">${s.capacity}</span>
        </div>
        <div class="list-card-footer">
          <span>📍 Lat: ${s.lat.toFixed(4)}, Lng: ${s.lng.toFixed(4)}</span>
          <span>📞 ${s.phone}</span>
        </div>
      `;
      shelterList.appendChild(item);
    });
  }
}

// Interactive Map Engine (Leaflet + Offline Fallback)
function initMap() {
  // Check if map container exists
  if (!document.getElementById('map')) return;

  // Initialize Leaflet Map
  map = L.map('map').setView([state.coords.lat, state.coords.lng], 13);

  // Dark Map Voyager tiles
  tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Click on map to select coordinates for hazard pin or triage details
  map.on('click', (e) => {
    updateSelectedCoordinates(e.latlng.lat, e.latlng.lng);
  });

  // Recenter controls
  document.getElementById('btn-recenter').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        updateSelectedCoordinates(lat, lng);
        if (map && !state.isOffline) {
          map.setView([lat, lng], 14);
        }
      }, () => {
        // Fallback to default Chennai coordinates if GPS blocked
        updateSelectedCoordinates(state.coords.lat, state.coords.lng);
        if (map && !state.isOffline) {
          map.setView([state.coords.lat, state.coords.lng], 13);
        }
      });
    }
  });

  // Map retry button offline
  document.getElementById('btn-retry-tiles').addEventListener('click', () => {
    state.isOffline = false;
    setOnlineState(true);
  });

  // Load initial markers
  renderMapMarkers();
}

function updateSelectedCoordinates(lat, lng) {
  state.coords.lat = lat;
  state.coords.lng = lng;
  
  document.getElementById('val-lat').textContent = lat.toFixed(5);
  document.getElementById('val-lng').textContent = lng.toFixed(5);
  
  // Update SOS Form inputs
  const latInput = document.getElementById('hazard-lat');
  const lngInput = document.getElementById('hazard-lng');
  if (latInput && lngInput) {
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
  }
  
  // If offline draw canvas again
  if (state.isOffline) {
    drawOfflineCanvas();
  }
}

// Render dynamic elements on Map
function renderMapMarkers() {
  if (!map) return;

  // Clear existing markers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }

  // Define custom marker icons
  const createCustomIcon = (type) => {
    const typeClass = type.toLowerCase().replace(/[^a-z]/g, '');
    return L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-inner ${typeClass}"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Add shelters
  initialShelters.forEach(s => {
    const marker = L.marker([s.lat, s.lng], { icon: createCustomIcon('shelter') })
      .bindPopup(`<b>🏠 Shelter: ${s.name}</b><br>Capacity: ${s.capacity}<br>Phone: ${s.phone}`)
      .addTo(map);
    mapMarkers.push(marker);
  });

  // Add hospitals
  initialHospitals.forEach(h => {
    const marker = L.marker([h.lat, h.lng], { icon: createCustomIcon('hospital') })
      .bindPopup(`<b>🏥 Hospital: ${h.name}</b><br>Wait Time: ${h.waitTime}<br>Phone: ${h.phone}`)
      .addTo(map);
    mapMarkers.push(marker);
  });

  // Add hazards
  state.hazards.forEach(h => {
    const marker = L.marker([h.lat, h.lng], { icon: createCustomIcon(h.type) })
      .bindPopup(`<b>🚨 Hazard: ${h.type}</b><br>${h.desc}<br><small>Reported by Mesh Node</small>`)
      .addTo(map);
    mapMarkers.push(marker);
  });

  // Add triage cases
  state.triageCases.forEach(t => {
    if (t.lat && t.lng) {
      const marker = L.marker([t.lat, t.lng], { icon: createCustomIcon('medical') })
        .bindPopup(`<b>🩺 Triage Patient: ${t.name}</b><br>Priority: <span class="tag-badge ${t.status}">${t.status}</span><br>Loc: ${t.location}`)
        .addTo(map);
      mapMarkers.push(marker);
    }
  });

  // Auto-fit bounds if we have markers and map is visible
  if (mapMarkers.length > 0 && !state.isOffline) {
    const group = new L.featureGroup(mapMarkers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// Draw Offline Fallback Grid on Canvas
function drawOfflineCanvas() {
  const canvas = document.getElementById('fallback-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Set dimensions based on viewport container size
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;

  // Clear Canvas
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Grid Lines (simulated latitude/longitude)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  const gridSize = 40;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw Radar concentric circles representing GPS locate center
  ctx.strokeStyle = 'rgba(10, 132, 255, 0.15)';
  ctx.lineWidth = 2;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, 2 * Math.PI);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(cx, cy, 100, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, 2 * Math.PI);
  ctx.stroke();

  // Draw target cursor
  ctx.fillStyle = '#0a84ff';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(10, 132, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
  ctx.fill();

  // Draw offline hazard indicators
  ctx.fillStyle = 'rgba(255, 69, 58, 0.8)';
  
  // Render points
  const drawVectorMarker = (lat, lng, name, color) => {
    // Math scaling: Chennai lat/lng relative offset
    const dx = (lng - state.coords.lng) * 800 + cx;
    const dy = -(lat - state.coords.lat) * 800 + cy;

    if (dx >= 0 && dx <= canvas.width && dy >= 0 && dy <= canvas.height) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dx, dy, 7, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label text
      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px Outfit';
      ctx.fillText(name, dx + 10, dy + 3);
    }
  };

  // Plot shelters
  initialShelters.forEach(s => drawVectorMarker(s.lat, s.lng, '🏠 ' + s.name.substring(0, 12), '#a2845e'));
  // Plot hospitals
  initialHospitals.forEach(h => drawVectorMarker(h.lat, h.lng, '🏥 ' + h.name.substring(0, 12), '#34c759'));
  // Plot custom hazards
  state.hazards.forEach(h => {
    let color = '#ff9f0a';
    if (h.type === 'Medical Emergency') color = '#ff453a';
    drawVectorMarker(h.lat, h.lng, '⚠️ ' + h.type, color);
  });
  
  // Plot triage patients
  state.triageCases.forEach(t => {
    if (t.lat && t.lng) {
      drawVectorMarker(t.lat, t.lng, '🩺 ' + t.name.substring(0, 10), '#ff453a');
    }
  });
}

// Morse Code SOS Audio Beacon
function initSirenBeacon() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playMorseSOS() {
  if (!audioCtx) return;
  
  // Standard Morse SOS timings in seconds
  // Dit = 0.1s, Dah = 0.3s, intra-letter gap = 0.1s, inter-letter gap = 0.3s
  const dit = 0.1;
  const dah = 0.3;
  const frequency = 880; // High pitch 880Hz alert tone

  const sequence = [
    { type: 'sound', dur: dit }, // S
    { type: 'gap', dur: dit },
    { type: 'sound', dur: dit },
    { type: 'gap', dur: dit },
    { type: 'sound', dur: dit },
    
    { type: 'gap', dur: dah }, // gap S-O
    
    { type: 'sound', dur: dah }, // O
    { type: 'gap', dur: dit },
    { type: 'sound', dur: dah },
    { type: 'gap', dur: dit },
    { type: 'sound', dur: dah },
    
    { type: 'gap', dur: dah }, // gap O-S
    
    { type: 'sound', dur: dit }, // S
    { type: 'gap', dur: dit },
    { type: 'sound', dur: dit },
    { type: 'gap', dur: dit },
    { type: 'sound', dur: dit },

    { type: 'gap', dur: 1.0 } // Cycle gap
  ];

  let timeOffset = audioCtx.currentTime;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  
  gainNode.gain.setValueAtTime(0, timeOffset);

  sequence.forEach(step => {
    if (step.type === 'sound') {
      gainNode.gain.setValueAtTime(1, timeOffset);
      timeOffset += step.dur;
      gainNode.gain.setValueAtTime(0, timeOffset);
    } else {
      timeOffset += step.dur;
    }
  });

  oscillator.start();
  oscillator.stop(timeOffset);
  
  // Flash Screen Border during sound play
  triggerVisualFlash(timeOffset - audioCtx.currentTime);
}

function triggerVisualFlash(durationSeconds) {
  const flashEl = document.getElementById('siren-flash-screen');
  if (flashEl) {
    flashEl.className = 'flash-screen-active';
    setTimeout(() => {
      flashEl.className = 'hidden-flash';
    }, durationSeconds * 1000);
  }
}

// SOS Siren toggle button click
const sirenBtn = document.getElementById('btn-siren-toggle');
if (sirenBtn) {
  sirenBtn.addEventListener('click', () => {
    initSirenBeacon();
    
    if (isSirenActive) {
      clearInterval(sirenIntervalId);
      isSirenActive = false;
      sirenBtn.className = "btn btn-danger btn-large w-full";
      sirenBtn.innerHTML = '<span class="siren-pulse-icon"><i data-lucide="radio"></i></span> Activate Morse Siren';
    } else {
      isSirenActive = true;
      sirenBtn.className = "btn btn-dark btn-large w-full active-siren";
      sirenBtn.innerHTML = '<span class="siren-pulse-icon"><i data-lucide="square"></i></span> DEACTIVATE BEACON';
      
      // Play Morse SOS immediately
      playMorseSOS();
      
      // Loop every 3.2 seconds (total duration of Morse sequence + cycle gap)
      sirenIntervalId = setInterval(() => {
        playMorseSOS();
      }, 3200);
    }
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });
}

// SOS Form submission (Drop marker)
const hazardForm = document.getElementById('form-hazard-pin');
if (hazardForm) {
  hazardForm.submitHandler = hazardForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const hType = document.getElementById('hazard-type').value;
    const hDesc = document.getElementById('hazard-description').value;
    const hLat = parseFloat(document.getElementById('hazard-lat').value) || state.coords.lat;
    const hLng = parseFloat(document.getElementById('hazard-lng').value) || state.coords.lng;
    
    const newHazard = {
      id: 'haz_' + Date.now(),
      type: hType,
      desc: hDesc,
      lat: hLat,
      lng: hLng,
      timestamp: new Date().toLocaleTimeString()
    };
    
    state.hazards.push(newHazard);
    saveState();
    renderMapMarkers();
    
    // Clear description fields
    document.getElementById('hazard-description').value = '';
    
    // Auto switch back to map dashboard
    document.querySelector('[data-target="panel-map"]').click();
  });
}

// S.T.A.R.T. Triage Diagnostic Wizard
function initTriageWizard() {
  document.getElementById('triage-start-btn').addEventListener('click', () => {
    const nameVal = document.getElementById('triage-name').value;
    const locVal = document.getElementById('triage-location').value;
    
    if (!nameVal) {
      alert('Please fill out patient name or description.');
      return;
    }
    
    currentTriageData = {
      name: nameVal,
      location: locVal || 'Unspecified location',
      lat: state.coords.lat + (Math.random() - 0.5) * 0.005, // simulated offset near center
      lng: state.coords.lng + (Math.random() - 0.5) * 0.005
    };
    triageStepAnswers = {};
    
    // Proceed to Step 1
    showTriageStep(1);
  });

  document.getElementById('triage-save-btn').addEventListener('click', () => {
    const newCase = {
      id: 'tri_' + Date.now(),
      name: currentTriageData.name,
      location: currentTriageData.location,
      lat: currentTriageData.lat,
      lng: currentTriageData.lng,
      status: currentTriageData.result,
      timestamp: new Date().toLocaleTimeString()
    };
    
    state.triageCases.push(newCase);
    
    // Also push to citizens safety directory as injured or deceased/safe based on status
    let safetyStatus = 'Injured';
    if (newCase.status === 'BLACK') safetyStatus = 'Missing';
    if (newCase.status === 'GREEN') safetyStatus = 'Safe';
    
    state.registry.push({
      id: 'reg_' + Date.now(),
      name: newCase.name,
      phone: 'Field Logged',
      status: safetyStatus,
      details: `Triaged: ${newCase.status} priority. Loc: ${newCase.location}`,
      avatar: 'none'
    });
    
    saveState();
    renderMapMarkers();
    renderTriageLogs();
    renderRegistry();
    
    // Reset wizard
    document.getElementById('triage-name').value = '';
    document.getElementById('triage-location').value = '';
    showTriageStep(0);
  });

  document.getElementById('triage-reset-btn').addEventListener('click', () => {
    showTriageStep(0);
  });
  
  renderTriageLogs();
}

function showTriageStep(stepNum) {
  const steps = document.querySelectorAll('.triage-step');
  steps.forEach(step => {
    step.style.display = 'none';
  });
  
  let targetStep = null;
  if (stepNum === 'result') {
    targetStep = document.getElementById('triage-step-result');
  } else {
    targetStep = document.getElementById(`triage-step-${stepNum}`);
  }
  
  if (targetStep) {
    targetStep.style.display = 'flex';
  }
}

window.setTriageAnswer = function(question, answer) {
  triageStepAnswers[question] = answer;
  
  if (question === 'walk') {
    if (answer === true) {
      // Walk Yes -> Green (Minor)
      evaluateTriageResult('GREEN');
    } else {
      // Walk No -> Check Breathing
      showTriageStep(2);
    }
  } 
  
  else if (question === 'breathing') {
    if (answer === 'yes') {
      // Breathing Yes -> Check Respiratory Rate
      showTriageStep(3);
    } else {
      // Breathing No -> Reposition Airway
      showTriageStep('2b');
    }
  } 
  
  else if (question === 'airway_breathing') {
    if (answer === true) {
      // Resumes -> Red (Immediate)
      evaluateTriageResult('RED');
    } else {
      // Still No -> Black (Expectant / Deceased)
      evaluateTriageResult('BLACK');
    }
  } 
  
  else if (question === 'rate') {
    if (answer === 'over_30') {
      // > 30 bpm -> Red (Immediate)
      evaluateTriageResult('RED');
    } else {
      // < 30 bpm -> Check Perfusion
      showTriageStep(4);
    }
  } 
  
  else if (question === 'perfusion') {
    if (answer === 'failed') {
      // Failed Perfusion -> Red (Immediate)
      evaluateTriageResult('RED');
    } else {
      // Normal Perfusion -> Check Mental Status
      showTriageStep(5);
    }
  } 
  
  else if (question === 'mental') {
    if (answer === 'failed') {
      // Cannot follow commands -> Red (Immediate)
      evaluateTriageResult('RED');
    } else {
      // Can follow commands -> Yellow (Delayed)
      evaluateTriageResult('YELLOW');
    }
  }
};

function evaluateTriageResult(status) {
  currentTriageData.result = status;
  
  const titleEl = document.getElementById('triage-class-title');
  const barEl = document.getElementById('triage-class-color-bar');
  const descEl = document.getElementById('triage-class-description');
  
  titleEl.textContent = status;
  barEl.className = 'color-bar ' + status.toLowerCase();
  
  if (status === 'GREEN') {
    descEl.textContent = 'MINOR (Priority 3). Walking wounded. Safe to delay clinical care for several hours.';
  } else if (status === 'YELLOW') {
    descEl.textContent = 'DELAYED (Priority 2). Significant injuries but stable breathing, pulse, and mental state. Delay treatment up to 1-2 hours.';
  } else if (status === 'RED') {
    descEl.textContent = 'IMMEDIATE (Priority 1). Life-threatening conditions (respiration, perfusion, or mental awareness failure). Immediate trauma response required.';
  } else if (status === 'BLACK') {
    descEl.textContent = 'DECEASED / EXPECTANT (Priority 0). Unresponsive, no pulse/breathing. Airway clearance unsuccessful. No further resources to be spent.';
  }
  
  showTriageStep('result');
}

function renderTriageLogs() {
  const logList = document.getElementById('triage-log-list');
  if (!logList) return;
  
  logList.innerHTML = '';
  if (state.triageCases.length === 0) {
    logList.innerHTML = '<p class="text-muted text-center text-small">No field triage cases logged yet.</p>';
    return;
  }
  
  state.triageCases.slice().reverse().forEach(tc => {
    const item = document.createElement('div');
    item.className = 'list-card-item';
    item.innerHTML = `
      <div class="list-card-header">
        <strong>${tc.name}</strong>
        <span class="tag-badge ${tc.status}">${tc.status}</span>
      </div>
      <div class="list-card-body">
        <span>📍 ${tc.location}</span>
      </div>
      <div class="list-card-footer">
        <span>${tc.timestamp}</span>
        <span class="text-muted">Chennai Grid</span>
      </div>
    `;
    logList.appendChild(item);
  });
}

// Resource & Volunteer Ledger with Auto-Matching
function initLedger() {
  // Inner Tab switching
  const innerTabs = document.querySelectorAll('[data-ledger-tab]');
  innerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      innerTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const panels = document.querySelectorAll('.ledger-tab-panel');
      panels.forEach(p => p.style.display = 'none');
      
      document.getElementById(tab.dataset.ledger-tab).style.display = 'block';
      
      if (tab.dataset.ledger-tab === 'ledger-matchmaker') {
        runResourceMatchmaker();
      }
    });
  });

  // Supply submit
  const supplyForm = document.getElementById('form-supply');
  if (supplyForm) {
    supplyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const sType = document.getElementById('supply-type').value;
      const sItem = document.getElementById('supply-item').value;
      const sQty = document.getElementById('supply-qty').value;
      const sContact = document.getElementById('supply-contact').value;
      const sDetails = document.getElementById('supply-details').value;
      
      state.supplies.push({
        id: 'sup_' + Date.now(),
        type: sType,
        item: sItem,
        qty: sQty,
        contact: sContact,
        details: sDetails,
        timestamp: new Date().toLocaleTimeString()
      });
      
      saveState();
      renderSuppliesList();
      
      // Clear fields
      document.getElementById('supply-qty').value = '';
      document.getElementById('supply-contact').value = '';
      document.getElementById('supply-details').value = '';
    });
  }

  // Volunteer submit
  const volForm = document.getElementById('form-volunteer');
  if (volForm) {
    volForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const vName = document.getElementById('vol-name').value;
      const vPhone = document.getElementById('vol-phone').value;
      const vSkill = document.getElementById('vol-skill').value;
      const vStatus = document.getElementById('vol-status').value;
      
      state.volunteers.push({
        id: 'vol_' + Date.now(),
        name: vName,
        phone: vPhone,
        skill: vSkill,
        status: vStatus,
        timestamp: new Date().toLocaleTimeString()
      });
      
      saveState();
      renderVolunteersList();
      
      document.getElementById('vol-name').value = '';
      document.getElementById('vol-phone').value = '';
    });
  }

  renderSuppliesList();
  renderVolunteersList();
}

function renderSuppliesList() {
  const container = document.getElementById('supply-list-items');
  if (!container) return;
  
  container.innerHTML = '';
  if (state.supplies.length === 0) {
    container.innerHTML = '<p class="text-muted text-center text-small">No supplies logged.</p>';
    return;
  }
  
  state.supplies.slice().reverse().forEach(s => {
    const item = document.createElement('div');
    item.className = 'list-card-item';
    const isOffer = s.type === 'offer';
    item.innerHTML = `
      <div class="list-card-header">
        <strong>${s.item}</strong>
        <span class="badge ${isOffer ? 'track-badge' : 'badge-danger'}" style="background: ${isOffer ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)'}; color: ${isOffer ? 'var(--accent-clinical)' : 'var(--accent-emergency)'}; border: 1px solid ${isOffer ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}">
          ${s.type.toUpperCase()}
        </span>
      </div>
      <div class="list-card-body">
        Qty: <strong>${s.qty}</strong><br>
        Location: ${s.details}
      </div>
      <div class="list-card-footer">
        <span>👤 Contact: ${s.contact}</span>
        <span>${s.timestamp}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderVolunteersList() {
  const container = document.getElementById('vol-list-items');
  if (!container) return;
  
  container.innerHTML = '';
  if (state.volunteers.length === 0) {
    container.innerHTML = '<p class="text-muted text-center text-small">No volunteers registered.</p>';
    return;
  }
  
  state.volunteers.slice().reverse().forEach(v => {
    const item = document.createElement('div');
    item.className = 'list-card-item';
    item.innerHTML = `
      <div class="list-card-header">
        <strong>${v.name}</strong>
        <span class="tag-badge ${v.status === 'active' ? 'GREEN' : 'YELLOW'}">${v.status.toUpperCase()}</span>
      </div>
      <div class="list-card-body">
        Skillset: <b>${v.skill}</b>
      </div>
      <div class="list-card-footer">
        <span>📞 Phone: ${v.phone}</span>
        <span>Registered</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// Auto-matchmaking logic
function runResourceMatchmaker() {
  const container = document.getElementById('matchmaker-results');
  if (!container) return;
  
  container.innerHTML = '';
  
  const requests = state.supplies.filter(s => s.type === 'request');
  const offers = state.supplies.filter(s => s.type === 'offer');
  
  let matchesCount = 0;
  
  requests.forEach(req => {
    // Find compatible offer
    const compatible = offers.find(off => off.item === req.item);
    if (compatible) {
      matchesCount++;
      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      matchCard.innerHTML = `
        <strong>Resource: ${req.item}</strong>
        <div class="match-line mt-1">
          <span>🚨 Request Qty: ${req.qty} (${req.contact})</span>
          <span class="match-arrow">➡️</span>
          <span>📦 Offer Qty: ${compatible.qty} (${compatible.contact})</span>
        </div>
        <div class="text-small text-muted mt-1">
          <b>Locality match:</b> "${req.details}" matching with "${compatible.details}"
        </div>
        <div class="mt-2">
          <button class="btn btn-primary btn-small" onclick="triggerP2PRoute('${req.id}', '${compatible.id}')">Establish Mesh Routing Line</button>
        </div>
      `;
      container.appendChild(matchCard);
    }
  });

  if (matchesCount === 0) {
    container.innerHTML = `
      <p class="text-center text-muted mt-4 text-small">
        No active matches found. Ledger requires both requested needs and offered supplies of matching item types.
      </p>
    `;
  }
}

// Visual routing line on map
window.triggerP2PRoute = function(reqId, offId) {
  const req = state.supplies.find(s => s.id === reqId);
  const off = state.supplies.find(s => s.id === offId);
  
  if (!req || !off) return;
  
  // Create virtual locations for matching (simulated offsets from Chennai center)
  const reqLat = state.coords.lat - 0.005;
  const reqLng = state.coords.lng + 0.005;
  
  const offLat = state.coords.lat + 0.008;
  const offLng = state.coords.lng - 0.004;

  if (map && !state.isOffline) {
    // Draw Leaflet polyline
    if (routeLine) {
      map.removeLayer(routeLine);
    }
    
    routeLine = L.polyline([[reqLat, reqLng], [offLat, offLng]], {
      color: '#30d158',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8',
      lineCap: 'round'
    }).addTo(map);
    
    map.setView([state.coords.lat, state.coords.lng], 13);
    
    // Switch to Map panel
    document.querySelector('[data-target="panel-map"]').click();
  } else if (state.isOffline) {
    // Offline Canvas route drawing fallback
    alert(`Mesh route established offline! Routing supplies between nodes ${req.contact} and ${off.contact}.`);
  }
};

// Safety Registry & Missing Persons Board
function initRegistry() {
  const searchInput = document.getElementById('registry-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderRegistry(searchInput.value);
    });
  }

  const regForm = document.getElementById('form-registry');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const rName = document.getElementById('reg-name').value;
      const rPhone = document.getElementById('reg-phone').value;
      const rStatus = document.getElementById('reg-status').value;
      const rPhoto = document.getElementById('reg-photo').value;
      const rDetails = document.getElementById('reg-details').value;
      
      state.registry.push({
        id: 'reg_' + Date.now(),
        name: rName,
        phone: rPhone || 'None given',
        status: rStatus,
        details: rDetails,
        avatar: rPhoto
      });
      
      saveState();
      renderRegistry();
      
      // Clear inputs
      document.getElementById('reg-name').value = '';
      document.getElementById('reg-phone').value = '';
      document.getElementById('reg-details').value = '';
    });
  }
  
  renderRegistry();
}

function renderRegistry(query = '') {
  const container = document.getElementById('registry-list-items');
  if (!container) return;
  
  container.innerHTML = '';
  
  let filtered = state.registry;
  if (query.trim() !== '') {
    const q = query.toLowerCase();
    filtered = state.registry.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.status.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.details.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted text-center text-small">No registry entries match search.</p>';
    return;
  }

  filtered.slice().reverse().forEach(r => {
    const item = document.createElement('div');
    item.className = 'list-card-item';
    
    // Choose status badge colors
    let badgeClass = 'GREEN';
    if (r.status === 'Missing') badgeClass = 'RED';
    if (r.status === 'Injured') badgeClass = 'YELLOW';
    if (r.status === 'Evacuated') badgeClass = 'BLACK';

    // Avatar map
    let avatarSymbol = '👤';
    if (r.avatar === 'avatar1') avatarSymbol = '👨';
    if (r.avatar === 'avatar2') avatarSymbol = '👩';
    if (r.avatar === 'avatar3') avatarSymbol = '👦';

    item.innerHTML = `
      <div class="citizen-profile-row">
        <div class="citizen-avatar">${avatarSymbol}</div>
        <div class="citizen-details">
          <div class="list-card-header">
            <strong>${r.name}</strong>
            <span class="tag-badge ${badgeClass}">${r.status}</span>
          </div>
          <div class="list-card-body mt-1">
            📞 Phone: ${r.phone}<br>
            📍 Location: ${r.details}
          </div>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Survival Guide Swiper
function initGuides() {
  const guideBtns = document.querySelectorAll('.btn-guide-nav');
  guideBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      guideBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const contents = document.querySelectorAll('.guide-content');
      contents.forEach(c => c.style.display = 'none');
      
      document.getElementById(btn.dataset.guide).style.display = 'block';
    });
  });
}

// Bilingual Offline Chatbot
function initChatbot() {
  const header = document.getElementById('chatbot-header-toggle');
  const wrapper = document.getElementById('chatbot-container');
  const chevron = document.getElementById('chatbot-chevron');
  
  if (header && wrapper) {
    header.addEventListener('click', () => {
      wrapper.classList.toggle('collapsed');
      if (wrapper.classList.contains('collapsed')) {
        chevron.setAttribute('data-lucide', 'chevron-up');
      } else {
        chevron.setAttribute('data-lucide', 'chevron-down');
      }
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  }

  // Suggestion chips handler
  const chips = document.querySelectorAll('.chip-item');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query;
      document.getElementById('chat-input').value = q;
      document.getElementById('chat-form').dispatchEvent(new Event('submit'));
    });
  });

  // Lang switchers
  const btnEn = document.getElementById('btn-lang-en');
  const btnHi = document.getElementById('btn-lang-hi');
  const inputEl = document.getElementById('chat-input');
  
  if (btnEn && btnHi) {
    btnEn.addEventListener('click', () => {
      btnEn.classList.add('active');
      btnHi.classList.remove('active');
      state.chatLanguage = 'en';
      inputEl.placeholder = "Type emergency query here...";
      toggleSuggestionChips('en');
    });

    btnHi.addEventListener('click', () => {
      btnHi.classList.add('active');
      btnEn.classList.remove('active');
      state.chatLanguage = 'hi';
      inputEl.placeholder = "आपातकालीन प्रश्न यहाँ टाइप करें...";
      toggleSuggestionChips('hi');
    });
  }

  const form = document.getElementById('chat-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const input = document.getElementById('chat-input');
      const query = input.value.trim();
      if (query === '') return;
      
      // Append user msg
      appendChatMessage(query, 'user');
      input.value = '';
      
      // Local processing delay (feels natural)
      setTimeout(() => {
        const response = matchLocalIntent(query, state.chatLanguage);
        appendChatMessage(response, 'bot');
      }, 500);
    });
  }
}

function toggleSuggestionChips(lang) {
  const chips = document.querySelectorAll('.chip-item');
  chips.forEach(c => {
    const isHindi = c.classList.contains('hindi-chip');
    if (lang === 'hi') {
      if (isHindi) c.classList.remove('hidden');
      else c.classList.add('hidden');
    } else {
      if (isHindi) c.classList.add('hidden');
      else c.classList.remove('hidden');
    }
  });
}

function appendChatMessage(text, sender) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${sender}`;
  msgEl.innerHTML = `<p>${text}</p>`;
  
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function matchLocalIntent(query, lang) {
  const cleanQ = query.toLowerCase();
  const corpus = chatbotCorpus[lang] || chatbotCorpus['en'];
  
  // Find match
  const matched = corpus.find(item => {
    return item.keywords.some(k => cleanQ.includes(k));
  });
  
  if (matched) {
    return matched.response;
  }
  
  if (lang === 'hi') {
    return 'क्षमा करें, मैं आपका प्रश्न समझ नहीं पाया। कृपया "शेल्टर", "बाढ़", "सीपीआर", "भूकंप" जैसे शब्दों का उपयोग करें।';
  } else {
    return 'I could not find exact info offline. Try terms like: "shelter", "flood", "cpr", "earthquake", "cyclone", or "burn".';
  }
}

// QR Code P2P Sync Hub
let qrObject = null;
function initSyncModal() {
  const modal = document.getElementById('sync-modal');
  const triggerBtn = document.getElementById('trigger-sync-btn');
  const closeBtn = document.getElementById('btn-close-modal');
  
  if (triggerBtn && modal && closeBtn) {
    triggerBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      generateSyncQR();
    });
    
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // QR sub tabs
  const tabGen = document.getElementById('tab-qr-generate');
  const tabScan = document.getElementById('tab-qr-scan');
  
  if (tabGen && tabScan) {
    tabGen.addEventListener('click', () => {
      tabGen.classList.add('active');
      tabScan.classList.remove('active');
      document.getElementById('qr-generate-section').classList.remove('hidden');
      document.getElementById('qr-scan-section').classList.add('hidden');
    });

    tabScan.addEventListener('click', () => {
      tabScan.classList.add('active');
      tabGen.classList.remove('active');
      document.getElementById('qr-scan-section').classList.remove('hidden');
      document.getElementById('qr-generate-section').classList.add('hidden');
    });
  }

  // Refresh QR
  document.getElementById('btn-refresh-qr').addEventListener('click', () => {
    generateSyncQR();
  });

  // Simulated scan import
  document.getElementById('btn-simulate-scan').addEventListener('click', () => {
    simulateQRImport();
  });
  
  // File upload sync package
  const fileInput = document.getElementById('qr-file-input');
  document.getElementById('btn-upload-qr').addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const mergedData = JSON.parse(event.target.result);
        mergeSyncState(mergedData);
        alert('Data package synced successfully from JSON upload!');
        modal.classList.add('hidden');
      } catch (err) {
        alert('Invalid file format. Must be a JSON sync package.');
      }
    };
    reader.readAsText(file);
  });
}

function generateSyncQR() {
  const syncPayload = {
    hazards: state.hazards,
    registry: state.registry,
    supplies: state.supplies,
    volunteers: state.volunteers,
    triageCases: state.triageCases
  };
  
  // Convert payload to compact JSON string
  const serialized = JSON.stringify(syncPayload);
  
  const container = document.getElementById('qrcode-container');
  if (container) {
    container.innerHTML = '';
    // Instantiate QRCode.js
    try {
      new QRCode(container, {
        text: serialized.substring(0, 1500), // Clamp length for QR capacity limits
        width: 140,
        height: 140,
        colorDark : "#080c15",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
      });
    } catch (e) {
      // Fallback message if string exceeds size
      container.innerHTML = '<div class="text-small text-muted p-4">Sync payload compiled! Ready for Satellite Sync.</div>';
    }
  }
}

function simulateQRImport() {
  // Pre-configured mock data representing another responder's node logs
  const mockSyncData = {
    hazards: [
      { id: 'haz_mock_1', type: 'Flooding', desc: 'Water levels rising to 4ft in Mylapore Subway', lat: 13.028, lng: 80.264, timestamp: '11:15 AM' },
      { id: 'haz_mock_2', type: 'Live Wire', desc: 'Sparks observed on overhead cables near Mylapore St', lat: 13.023, lng: 80.261, timestamp: '11:25 AM' }
    ],
    registry: [
      { id: 'reg_mock_1', name: 'Ritu Varma', phone: '9444102930', status: 'Safe', details: 'Ripon relief camp shelter', avatar: 'avatar2' },
      { id: 'reg_mock_2', name: 'Rahul Krishnan', phone: '9003882772', status: 'Missing', details: 'Last seen near central park', avatar: 'avatar3' }
    ],
    supplies: [
      { id: 'sup_mock_1', type: 'offer', item: 'Drinking Water', qty: '100 litres', contact: 'Karan / 9840212399', details: 'Stored at Ripon relief camp', timestamp: '11:20 AM' },
      { id: 'sup_mock_2', type: 'request', item: 'First Aid Kits', qty: '10 kits', contact: 'Mylapore Shelter B', details: 'Urgent medical shortage', timestamp: '11:30 AM' }
    ],
    volunteers: [
      { id: 'vol_mock_1', name: 'Srinivasan Rao', phone: '9841022883', skill: 'Rescue / Swimming', status: 'active', timestamp: '11:10 AM' }
    ],
    triageCases: [
      { id: 'tri_mock_1', name: 'Female, early 40s', location: 'Mylapore cross', lat: 13.025, lng: 80.267, status: 'YELLOW', timestamp: '11:28 AM' }
    ]
  };

  mergeSyncState(mockSyncData);
  alert('Simulated QR Code sync success! 6 records merged from mesh node 402.');
  document.getElementById('sync-modal').classList.add('hidden');
}

function mergeSyncState(incoming) {
  // Merge items based on IDs preventing duplicates
  const mergeLists = (existing, incomingList) => {
    if (!incomingList) return existing;
    const existingIds = new Set(existing.map(item => item.id));
    const merged = [...existing];
    incomingList.forEach(item => {
      if (!existingIds.has(item.id)) {
        merged.push(item);
      }
    });
    return merged;
  };

  state.hazards = mergeLists(state.hazards, incoming.hazards);
  state.registry = mergeLists(state.registry, incoming.registry);
  state.supplies = mergeLists(state.supplies, incoming.supplies);
  state.volunteers = mergeLists(state.volunteers, incoming.volunteers);
  state.triageCases = mergeLists(state.triageCases, incoming.triageCases);

  saveState();
  renderMapMarkers();
  renderTriageLogs();
  renderSuppliesList();
  renderVolunteersList();
  renderRegistry();
  if (state.isOffline) {
    drawOfflineCanvas();
  }
}
