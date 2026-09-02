# VIBESCODING & CONTEXT ENGINEERING SPECIFICATION
## Project: Tamiya Digital Racing System (Cyberpunk / Neo-Racing UI)
## Target: AI Coding Assistants (Cursor Composer, Lovable, Bolt.new, v0, Replit Agent)

Dokumen ini dirancang secara khusus sebagai **Master Context & Prompt Recipe** untuk langsung Anda salin-tempel (*copy-paste*) ke dalam AI Coding Assistant pilihan Anda (seperti Cursor, Lovable, Bolt.new, atau v0). AI membutuhkan instruksi yang sangat presisi, deklaratif, terstruktur secara modular, serta dilengkapi dengan aturan styling Tailwind yang eksplisit untuk menghasilkan seluruh aplikasi tanpa mengalami kegagalan logika (*hallucination*).

---

## 1. SYSTEM PROMPT UTAMA (Salin bagian ini untuk mengawali sesi AI)

```text
You are an expert Senior Full-Stack Engineer and UI/UX Designer specializing in high-performance, real-time web applications with highly stylized visual themes.

Your task is to build a "Tamiya Digital Racing System" web application. This system manages a paperless digital tournament for 3-lane Tamiya mini 4WD racetracks without requiring physical RFID hardware, utilizing user self-scanning (QR-based) and centralized Race Director control.

TECH STACK TO USE:
- Frontend: React.js (Vite) / Next.js, Tailwind CSS, Lucide React (for icons)
- Database & Real-time: Supabase (PostgreSQL) with Realtime Subscriptions or WebSocket (Socket.io)
- Animation: Framer Motion (for smooth cyberpunk UI transitions and particle effects)
- State Management: React Context or Zustand for fast, lightweight in-memory state

DESIGN THEME: Cyberpunk / Neo-Racing
Follow these strict UI specifications to create an immersive, high-adrenaline HUD (Heads-Up Display) experience. Use sharp angular cuts (chamfered edges), high-contrast neon glowing shadows, and dark futuristic textures.

Strictly adhere to the state machines, database schemas, and workflows provided in the master specification below. Do not omit any edge cases, particularly regarding the centralized Race Director locking mechanism, haptic feedback triggers, and the dual-track registration flow.
```

---

## 2. PANDUAN GAYA TAILWIND & UI (CYBERPUNK / NEO-RACING)

Berikan potongan CSS dan konfigurasi ini kepada AI Anda agar tema visualnya konsisten:

```json
{
  "theme": {
    "extend": {
      "colors": {
        "midnight": "#0a0b10",
        "obsidian": "#0e1017",
        "neonPink": "#ff0055",
        "neonCyan": "#00f0ff",
        "neonGreen": "#39ff14",
        "neonAmber": "#ffaa00",
        "cyberSilver": "#cbd5e1"
      },
      "fontFamily": {
        "orbitron": ["Orbitron", "sans-serif"],
        "mono": ["Share Tech Mono", "JetBrains Mono", "monospace"]
      },
      "boxShadow": {
        "glowPink": "0 0 15px rgba(255, 0, 85, 0.5), inset 0 0 10px rgba(255, 0, 85, 0.2)",
        "glowCyan": "0 0 15px rgba(0, 240, 255, 0.5), inset 0 0 10px rgba(0, 240, 255, 0.2)",
        "glowGreen": "0 0 15px rgba(57, 255, 20, 0.5), inset 0 0 10px rgba(57, 255, 20, 0.2)",
        "glowAmber": "0 0 15px rgba(255, 170, 0, 0.5), inset 0 0 10px rgba(255, 170, 0, 0.2)"
      }
    }
  }
}
```

### Prompt Snippet untuk Styling Elemen:
```text
Apply these Cyberpunk styling rules to UI elements:
- Use angular bevels and 45-degree cuts instead of standard rounded corners. Example CSS class for button cuts: 'clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);'
- Main Background: Use gradient 'bg-gradient-to-br from-midnight via-obsidian to-black' with a subtle overlay grid 'bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]'.
- Glowing Borders: Use 'border-neonCyan shadow-glowCyan' for primary active blocks, 'border-neonPink shadow-glowPink' for Jalur A, 'border-neonCyan shadow-glowCyan' for Jalur B, and 'border-neonGreen shadow-glowGreen' for Jalur C.
- Typography: Titles, metrics, timers, and countdown numbers MUST use 'font-orbitron' or 'font-mono'. All numbers must look like a high-performance racing dashboard.
```

---

## 3. MASTER PROMPT UTK DATABASE SCHEMA & REAL-TIME EVENT ENGINE

Salin draf SQL ini agar AI mengerti bagaimana menyusun tabel relasional dan relasi pendaftaran balap:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Support Google OAuth Sign-In & Virtual Accounts)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE, -- Stores Google Account email
    google_sub_id VARCHAR(255), -- Stores Google OAuth Subject ID
    team_name VARCHAR(10) DEFAULT NULL, -- Short nickname (e.g., ANDI [RRT])
    role VARCHAR(50) DEFAULT 'participant', -- 'admin' (Race Director), 'scrutineer', 'participant'
    is_virtual BOOLEAN DEFAULT FALSE, -- TRUE for kids/guest users registered by Cashier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Coupons Table (Qualifying Round Balance)
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Races Table (Active Heat Management)
CREATE TABLE races (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    race_number INT UNIQUE NOT NULL, -- Incrementing race number (e.g., Heat 15)
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pre-start', 'locked', 'completed'
    winner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Race Registrations (Lane assignments, scan status, and times)
CREATE TABLE race_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    race_id UUID REFERENCES races(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lane CHAR(1) CHECK (lane IN ('A', 'B', 'C')),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending' (scanned QR), 'ready' (clicked Siap Balap)
    finish_time DECIMAL(6, 3) DEFAULT NULL, -- Track time (e.g., 11.450 seconds)
    scrutineer_status VARCHAR(50) DEFAULT NULL, -- 'pending', 'pass', 'disqualified'
    UNIQUE(race_id, lane) -- Prevent duplicate entries on the same lane
);

-- 5. Bracket Matches Table (Round 2 Single Elimination)
CREATE TABLE bracket_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_number INT UNIQUE NOT NULL,
    round_number INT NOT NULL, -- e.g., 1 (Round of 16), 2 (Quarterfinals)
    user_id_1 UUID REFERENCES users(id),
    user_id_2 UUID REFERENCES users(id),
    user_id_3 UUID REFERENCES users(id), -- Nullable if 2-lane match
    winner_id UUID REFERENCES users(id),
    parent_match_id UUID REFERENCES bracket_matches(id), -- For bracket tree progression
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. URUTAN PROMPT PEMBUATAN MODUL (STEP-BY-STEP PROMPT RECIPES)

Gunakan resep petunjuk langkah demi langkah berikut secara berurutan agar AI Anda membuat aplikasinya secara logis dan tidak melompati fitur:

### **Langkah 1: Modul Registrasi & Autentikasi Dual-Track**
```text
PROMPT INSTRUCTION:
Build the User Registration and Authentication Module. 
1. Implement Google OAuth Sign-In (using Firebase Auth or Supabase Auth) for the 'Self-Service' track. 
2. Upon successful Google login, redirect the user to a profile setup page where they MUST input a short Team Name/Racer Tag (Max 10 chars, e.g., 'ANDI [RRT]') and then route them to their Dashboard.
3. For the 'Assisted' track, create an Admin Cashier Dashboard interface where the Admin can click a button "Tambah Peserta Baru (Manual/Tamu)". This inputs a Racer Name and Team Tag, automatically generates a virtual email (e.g., 'guest102@tamiya.local' with is_virtual=true), and assigns them an initial coupon balance.
4. On the Admin Cashier Dashboard, implement a fast search list. Clicking on a user opens a modal with a giant '+10 Coupons', '+50 Coupons', or '+100 Coupons' button with an instant numeric input to top up the 'coupons.balance' table.
Make the layout ultra-clean, cyberpunk obsidian with neon borders.
```

### **Langkah 2: Modul Antrean & Scan QR Jalur (Babak Pertama)**
```text
PROMPT INSTRUCTION:
Build the QR Lane Scanning and Queue Management for the Qualifying Round (Babak 1).
1. Create a "Participant Dashboard Screen". It must display: Active Race Number, Lane Assignment status, Current Coupon Balance, and a giant camera QR Scanner element.
2. In the sirkuit, physical desks have stencils for QR Codes representing 'LINE A', 'LINE B', and 'LINE C'.
3. When the user scans 'LINE A' QR code:
   - Check if their coupons.balance >= 1. If not, play error sound and show "Saldo Kupon Habis!".
   - Insert their user_id into the active race_registrations table with lane='A' and status='pending'.
   - Implement database transactions (with ACID locking / Optimistic Concurrency) to ensure if two users scan JALUR A simultaneously, the first scan gets locked and the second is safely pushed to the next available Race Number with a glowing amber notification: "Jalur Terisi, Anda masuk ke Race [X]".
4. Once registered on a lane, display a giant glowing Green button: "SIAP BALAP" (occupies 30% of screen). Clicking this updates their race_registrations.status to 'ready' and triggers a short phone haptic vibration (using 'navigator.vibrate([100])').
5. Below the button, provide a giant Red button: "BATAL / SALAH JALUR". If clicked (and the race.status is still 'draft'), revert coupons.balance (+1), delete the registration slot, and update the TV main display via real-time WebSocket.
```

### **Langkah 3: Dasbor Komando Pusat (Race Director / Admin Utama)**
```text
PROMPT INSTRUCTION:
Build the Central command dashboard for the Race Director (Admin Utama / RD). The RD is the digital conductor of the entire track.
1. The screen should display: Active Race Number, Status of Lanes A, B, C (Grey = Empty, Yellow = Pending Scan, Green = Ready with Racer Name).
2. Marshall in the box start has NO GADGETS. The RD controls the digital locks.
3. Once the RD sees Lane A, B, and C statuses are all "Green / Ready" (or only 2 lanes if the track is empty), the RD clicks a giant neon-cyan button: "KUNCI BALAPAN".
4. Clicking "KUNCI BALAPAN" triggers:
   - Updates races.status to 'pre-start'.
   - Instantly disables/hides the "Batal" button on the HP of all participants in that race via WebSocket.
   - Updates the Public TV Screen to flash: "RACE READY - LINTASAN SIAP!".
   - Deducts 1 coupon balance permanently from coupons.balance of all competitors in that race.
5. Create an "Admin Override" control panel. If a racer's phone dies, allow the RD to manually click on a lane slot, search for a racer name (including guest accounts), manually assign them to the lane, force-ready them, or "Kick / Reset" the slot to refund coupons in one tap. No keyboard typing allowed on this dashboard during operation; use tap cards.
```

### **Langkah 4: Modul Juri Finish (Input Waktu Skenario B & BTO Board)**
```text
PROMPT INSTRUCTION:
Build the Finish Judging & Best Time Overall (BTO) core logic (Scenario B).
1. The track timer is offline standalone. The Juri Finish/RD reads the time from the physical track LED display.
2. On the RD Dashboard, once the race is completed physically, provide a "Finish Input Panel".
3. Display the 3 lanes with the mapped racers' names (already locked from QR scan) and adjacent numeric input fields.
4. The RD/Juri Finish simply taps the input field and enters the time (e.g., '11.450') for each lane.
5. Once submitted:
   - Save finish times to race_registrations.finish_time.
   - Send the winner's data (lowest time) with 'pending_scrutineering' status directly to the Scrutineer Table via real-time WebSocket.
   - Display a status: "Menunggu Pemeriksaan Meja Scrutineer" on both the TV screen and the participant's phone.
```

### **Langkah 5: Modul Pemeriksaan Fisik "Tanya Nama" (Scrutineering)**
```text
PROMPT INSTRUCTION:
Build the Scrutineer Dashboard for the physical car inspection desk.
1. Keep it zero-keyboard. The tablet screen displays card blocks representing the active winners waiting for inspection.
2. When a participant brings their car, the Scrutineer asks: "Nama siapa, Mas?" -> Participant answers: "Andi".
3. The Scrutineer screen displays a card list that defaults ONLY to the 1-3 winners of the recently completed races. The Scrutineer taps the card labeled "ANDI".
4. The card expands to show:
   - Button A (Green): "LOLOS" (Passes regulations).
     - Action: Updates scrutineer_status = 'pass', and sets status of the race = 'completed'.
     - System Action: Instantly progresses Andi into the Round 2 Bracket Match (bracket_matches table) via real-time bracket auto-placement. Andi is now locked in the Next Round and needs NO MORE COUPONS or QR SCANS.
   - Button B (Red): "DISKUALIFIKASI (DQ)".
     - Action: Updates scrutineer_status = 'disqualified'.
     - System Action: Excludes Andi from the BTO board and leaves his bracket slot empty or passes the runner-up.
5. Integration with BTO Board:
   - If 'pass' AND the finish_time is the fastest of the day, trigger a real-time full-screen TV take-over animation: "NEW RECORD BTO! [Name] - [Time]s!" with golden cyberpunk confetti effects and sound sirens.
   - If 'disqualified' but was previously a potential BTO, remove their record from the leaderboard and restore the previous valid record.
```

### **Langkah 6: Layar TV Publik Sirkuit (Neo-Racing HUD Display)**
```text
PROMPT INSTRUCTION:
Build the Public TV Screen HUD (16:9 widescreen layout) using Tailwind CSS.
1. Design: Cyberpunk cockpit HUD aesthetic. Black carbon-fiber texture background, scanlines overlay, glowing border shadows, neon pink (Lane A), electric cyan (Lane B), acid neon green (Lane C).
2. Header: Logo, Tournament Name, and dynamically changing Status Bar:
   - "MENUNGGU ANTRIAN" (Neon Orange)
   - "READY - LINTASAN SIAP!" (Neon Green flashing)
   - "BALAPAN BERLANGSUNG" (Neon Red)
   - "VERIFIKASI MEJA" (Neon Cyan)
3. Main Left Column (60% width): Displays giant blocks for Line A, Line B, and Line C showing:
   - Active status (Ready/Pending/Empty)
   - Mapped racer name and team tag
   - Real-time time display with 3-digit precision (flashing once entered).
4. Main Right Column (40% width): Displays the Top 5 Leaderboard "BEST TIME OVERALL (BTO)" with glowing medals and ranking numbers.
5. Footer: A marquee scrolling ticker (Teks Berjalan) displaying the next race queue: "Antrean Selanjutnya: Race 16 - Doni (A), Eko (B), Fandi (C)".
```

### **Langkah 7: Sistem Countdown Babak Kedua (Hitungan Mundur Suara Manusia)**
```text
PROMPT INSTRUCTION:
Build the interactive Countdown system for Round 2 Bracket Elimination.
1. On the RD Dashboard, add a "Timer Kontrol Babak Kedua" widget with three buttons:
   - "MULAI COUNTDOWN" (Starts a 10s countdown).
   - "RESET/COUNTDOWN KE-2" (Resets timer to 10s. Limit to max 2x countdowns).
   - "SIAP / STOP SEKARANG" (Instantly cuts off the countdown).
2. When "MULAI COUNTDOWN" is clicked:
   - WebSocket broadcast triggers TV screen to display numbers '10' down to '1' in a giant blinking red HUD popup overlay.
   - Play a synchronized audio file of a human voice counting down: "Sepuluh... Sembilan... Delapan... Tujuh... Enam... Lima... Empat... Tiga... Dua... Satu!". No buzzer at the end; purely verbal.
   - Send periodic haptic vibrations to the phones of the active racers (synchronized with each second tick).
3. If the racers are ready early (e.g., at second 5), the RD clicks "SIAP / STOP SEKARANG". 
   - Instantly stop and mute the human audio countdown.
   - Change the TV display overlay to a solid flashing green banner: "RACE READY - LEPAS!" and stop the haptic vibration. The Marshall then manually taps the offline physical timer button and releases the cars.
```

---

## 5. REKOMENDASI DEVELOPMENT & ARCHITECTURE (ANTIGRAVITY BLUEPRINT)

Berikan ini kepada AI Code Generator untuk membantu menyusun struktur file dan alur sinkronisasi real-time:

### **Struktur Folder React/Vite yang Direkomendasikan:**
```text
src/
├── assets/            # Audio files (voice countdown), images, fonts
├── components/
│   ├── ui/            # Cyberpunk buttons, HUD cards (Beveled borders)
│   ├── RealtimeTV.jsx # Main TV Display Component
│   └── QRScanner.jsx  # HTML5 QR Scanner integration
├── context/
│   └── RaceContext.jsx# React Context for socket connection & active race state
├── hooks/
│   └── useHaptic.js   # Custom hook for navigator.vibrate
├── screens/
│   ├── ParticipantDashboard.jsx
│   ├── RaceDirectorDashboard.jsx
│   └── ScrutineerDashboard.jsx
└── App.jsx
```

### **Logika Sinkronisasi Real-Time (WebSocket/Supabase Events):**
AI Anda harus memprogram sinkronisasi status balapan dengan pola berikut:
1.  **DRAFT**: Peserta bebas masuk/batal. HP menampilkan UI `DRAFT` dan tombol `Batal` aktif.
2.  **PRE-START**: Begitu RD klik "Kunci Balapan". Server memancarkan event `RACE_LOCKED`. HP peserta langsung mengubah *state* lokal, menyembunyikan tombol batal, dan memicu getaran konfirmasi.
3.  **LOCKED**: Balapan berjalan. Layar TV berubah status menjadi Merah.
4.  **COMPLETED**: Hasil dikirim oleh RD, tabel `race_registrations` diperbarui, dan UI peserta berubah menampilkan tombol "Menunggu Scrutineer".
