# 🎬 CinePass - Premium Movie Booking Platform

CinePass is a high-fidelity, full-stack movie booking application featuring a cinematic design system, dynamic seat selection, and robust multi-service architecture (Kafka, Redis, PostgreSQL).

## 🚀 Key Features

- **Cinematic Experience**: Immersive dark-mode UI with glassmorphism and smooth animations.
- **Dynamic Seat Selection**: Interactive curved-screen theater layout with live pricing in **INR (₹)**.
- **Fail-Fast Booking Flow**: Atomic seat locking via Redis Lua scripts and prioritized availability checks to ensure extreme data integrity.
- **Real-time Notifications**: Instant system alerts and booking updates via **WebSockets** bridged with **Kafka** events.
- **Digital Wallet**: Secure balance management with per-service wallet splits (User, Owner, Platform).
- **Admin Dashboard**: Comprehensive control over the cinematic catalog with direct Cloudinary image uploads.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, Sequelize (TypeScript).
- **Infrastructure**: 
  - **PostgreSQL**: Primary relational storage.
  - **Redis**: Atomic seat locking and distributed state.
  - **Kafka**: Event-driven communication for bookings, emails, and analytics.
  - **Cloudinary**: Cloud-based media management.

---

## 🏃‍♂️ Getting Started

### 1. Prerequisites
- **Node.js**: v18+
- **PostgreSQL**: Installed and running.
- **Redis**: Running on `localhost:6379`.
- **Kafka**: 
  - Zookeeper running on `2181`.
  - Kafka Broker running on `9092`.

### 2. Backend Setup
1.  **Install dependencies**:
    ```bash
    cd backend && npm install
    ```
2.  **Environment Setup**:
    Copy `.env.example` to `.env` and fill in your credentials (DB, Email, Cloudinary, Kafka).
3.  **Launch**:
    ```bash
    npm run dev  # Handles DB sync, seeding, and auto-starts all consumers
    ```

### 3. Frontend Setup
1.  **Install dependencies**:
    ```bash
    cd frontend && npm install
    ```
2.  **Environment Setup**:
    Copy `.env.example` to `.env`.
3.  **Launch**:
    ```bash
    npm run dev
    ```

---

## 📁 Project Structure

```bash
├── backend/
│   ├── src/
│   │   ├── config/      # DB, Kafka, Passport initializations
│   │   ├── consumers/   # Kafka event handlers (Email, Analytics, etc.)
│   │   ├── controllers/ # Request logic (Auth, Booking, Wallet)
│   │   ├── models/      # Sequelize definitions
│   │   ├── services/    # WebSocket & Redis Lock logic
│   │   ├── types/       # Global Express/Custom type augmentations
│   │   └── server.ts    # Main entry point
├── frontend/
│   ├── src/
│   │   ├── context/     # Auth & WebSocket global providers
│   │   ├── pages/       # Cinematic UI Views
│   │   └── components/  # Atomic UI components
└── README.md
```

---

## 🛡️ Git Readiness
This repository uses a comprehensive `.gitignore` strategy. 
- **Sensitive Data**: All `.env` files are ignored.
- **Build Artifacts**: `dist/`, `build/`, and `node_modules/` are excluded.
- **Media**: `backend/uploads/` is ignored at the file level but preserved via `.gitkeep`.

## 📄 License
Educational purpose under ISC License.
