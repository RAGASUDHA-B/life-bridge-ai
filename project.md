# 🌉 LifeBridge AI: Project Documentation & Workflows

## 1. Project Overview
**LifeBridge AI** is an offline-first command center Progressive Web Application (PWA) designed to assist disaster response teams, emergency workers, and survivors during crises where central communication infrastructure (cellular networks, internet, power grids) has failed. 

By utilizing browser-native technologies such as Service Workers for offline loading, LocalStorage for persistent data storage, the Web Audio API for distress signaling, and QR codes for offline peer-to-peer data syncing, LifeBridge AI provides a resilient communication and coordination tool that runs directly on standard smartphones and tablets without any active network connection.

---

## 2. Key Modules & Technical Flow Diagrams

### Flow A: PWA Offline Lifecycle & Caching Flow
This diagram illustrates how the application boots and operates without network access, using a cache-first Service Worker intercept strategy.

```mermaid
graph TD
    classDef startEnd fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef logic fill:#1e293b,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef storage fill:#020617,stroke:#10b981,stroke-width:2px,color:#fff;

    Start([📱 User Opens App]):::startEnd
    SWCheck{Service Worker Installed?}:::logic
    SWRegister[Register sw.js & Cache Static Assets]:::logic
    Offline{Network Available?}:::logic
    CacheFetch[Fetch assets from Cache-First Storage]:::storage
    NetFetch[Fetch from Internet and update Cache]:::logic
    Render[Render Glassmorphic Dashboard UI]:::startEnd

    Start --> SWCheck
    SWCheck -- No --> SWRegister
    SWCheck -- Yes --> Offline
    SWRegister --> Offline
    Offline -- No (Offline Mode) --> CacheFetch
    Offline -- Yes (Online Mode) --> NetFetch
    CacheFetch --> Render
    NetFetch --> Render
```

---

### Flow B: S.T.A.R.T. Triage Protocol Flow
The *Simple Triage and Rapid Treatment* (S.T.A.R.T.) wizard guides emergency responders through classifying casualties during mass casualty incidents.

```mermaid
graph TD
    classDef green fill:#15803d,stroke:#22c55e,stroke-width:2px,color:#fff;
    classDef yellow fill:#a16207,stroke:#eab308,stroke-width:2px,color:#fff;
    classDef red fill:#b91c1c,stroke:#ef4444,stroke-width:2px,color:#fff;
    classDef black fill:#111,stroke:#4b5563,stroke-width:2px,color:#fff;
    classDef logic fill:#1e293b,stroke:#f59e0b,stroke-width:2px,color:#fff;

    Start([🩺 Begin Victim Assessment]) --> Walk{Can the victim walk?}:::logic
    Walk -- Yes --> Green[🟢 MINOR - Green Category]:::green
    Walk -- No --> Resp{Is the victim breathing?}:::logic

    Resp -- No --> OpenAirway[Open the Airway]:::logic
    OpenAirway --> Resp2{Breathing now?}:::logic
    Resp2 -- No --> Black[⚫ DECEASED - Black Category]:::black
    Resp2 -- Yes --> Red[🔴 IMMEDIATE - Red Category]:::red

    Resp -- Yes --> RespRate{Respiration Rate > 30/min?}:::logic
    RespRate -- Yes --> Red
    RespRate -- No --> Pulse{Radial Pulse Present?}:::logic

    Pulse -- No --> Red
    Pulse -- Yes --> Mental{Follows Simple Commands?}:::logic
    Mental -- No --> Red
    Mental -- Yes --> Yellow[🟡 DELAYED - Yellow Category]:::yellow
```

---

### Flow C: Peer-to-Peer (P2P) Database Synchronization Flow
When local databases (Ledgers, Registries, Hazards) need to be shared across responders without network access, they utilize a QR-based mesh synchronization system.

```mermaid
graph TD
    classDef action fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef scan fill:#020617,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef merge fill:#020617,stroke:#10b981,stroke-width:2px,color:#fff;

    A_Change[👤 Responder A adds reports offline]:::action --> A_Sync[Generate QR Differential Payload]:::action
    A_Sync --> A_Display[Display QR Code on screen]:::action
    A_Display --> B_Scan[📷 Responder B scans QR via Camera]:::scan
    B_Scan --> B_Decrypt[Decompress & Parse JSON payload]:::scan
    B_Decrypt --> B_Compare{Compare timestamps with local DB}:::merge
    B_Compare --> B_Merge[Merge records & resolve conflicts]:::merge
    B_Merge --> B_Save[Save to Responder B's LocalStorage]:::merge
    B_Save --> B_Success[🎉 Devices Sync Complete]:::merge
```

---

## 3. Technology Stack Breakdown
1. **Application Shell (HTML5 & CSS3)**:
   - Sleek dark-mode interface utilizing modern glassmorphism.
   - Designed for high-contrast viewing under outdoor conditions.
2. **Local Storage Database (localStorage)**:
   - Local storage acts as the single source of truth when offline.
   - Manages four distinct tables: SOS Signals, Hazards Registry, Resource Ledger, and Safety Registry.
3. **Web Audio API**:
   - Generates Morse code audio beacon signals dynamically in the browser client to conserve space and avoid loading heavy MP3/WAV assets.
4. **Leaflet.js Mapping Engine**:
   - Displays geospatial coordinates.
   - Switches automatically to a custom Canvas-based geometric fallback grid when map tile servers are unreachable.
