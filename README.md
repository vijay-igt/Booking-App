# 🎬 CinePass - Premium Movie Booking Platform

CinePass is a high-fidelity, full-stack movie booking application featuring a cinematic design system, dynamic seat selection, and robust admin management.

## 🚀 Key Features

- **Cinematic Experience**: Immersive dark-mode UI with glassmorphism and smooth animations.
- **Dynamic Seat Selection**: Interactive curved-screen theater layout with live pricing.
- **Admin Dashboard**: Full control over movies, theaters, screens, and showtimes.
- **Robust Security**: JWT-based authentication and database-level double-booking prevention.
- **Digital Wallet**: Realistic perforated ticket designs with QR codes.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, Sequelize (TypeScript).
- **Database**: PostgreSQL.

---

## 🏃‍♂️ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running.

### 2. Backend Setup
1.  Navigate to `backend/` folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up Environment Variables:
    - Create a `.env` file (refer to `.env.example`):
    ```env
    PORT=5000
    DB_NAME=movie_booking_db
    DB_USER=your_postgres_user
    DB_PASSWORD=your_password
    DB_HOST=localhost
    DB_PORT=5432
    JWT_SECRET=your_secure_secret
    ```
4.  Initialize the Database:
    ```bash
    npm run db:init
    ```
5.  Start the server:
    ```bash
    npm run dev
    ```

### 3. Frontend Setup
1.  Navigate to `frontend/` folder:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

---

## 📁 Project Structure

```bash
├── backend/
│   ├── src/
│   │   ├── controllers/ # Request logic
│   │   ├── models/      # Sequelize definitions
│   │   ├── routes/       # API endpoints
│   │   └── server.ts     # Entry point
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── pages/       # React page components
│   │   ├── context/     # Auth & global state
│   │   └── components/  # Reusable UI parts
│   └── tailwind.config.js
└── README.md
```

---

## 🛡️ Security Note
The `.env` file is ignored by git. Ensure you provide a secure `JWT_SECRET` in your local environment.

## 📄 License
This project is for educational purposes under the ISC License.
