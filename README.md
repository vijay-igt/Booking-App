# 🎬 CinePass - Premium Movie Booking Platform

CinePass is a high-fidelity, full-stack movie booking application featuring a cinematic design system, dynamic seat selection, and robust admin management.

## 🚀 Key Features

- **Cinematic Experience**: Immersive dark-mode UI with glassmorphism and smooth animations.
- **Dynamic Seat Selection**: Interactive curved-screen theater layout with live pricing in **INR (₹)**.
- **Admin Dashboard**: Full control over movies, theaters, screens, and showtimes with **direct image upload** for posters.
- **Robust Security**: JWT-based authentication with persistent login and secure logout.
- **Digital Wallet**: Realistic perforated ticket designs with **Save as Image** and **Share** functionality.
- **Real-time Notifications**: In-app notification center for booking confirmations and system alerts with unread badges and history management.
- **SPA Optimized**: Handles page reloads seamlessly on Render using `404.html` and `_redirects` fallbacks.

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
    Create a `.env` file:
    ```env
    PORT=5000
    DATABASE_URL=postgres://user:pass@host:port/db
    JWT_SECRET=your_secure_secret
    FRONTEND_URL=http://localhost:5173
    ```
4.  Initialize the Database:
    ```bash
    npm run dev  # Automates seeding and sync
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

## 🌐 Deployment (Render)

### Frontend (Static Site)
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `frontend/dist`
- **SPA Handling**: The project includes `404.html` and `_redirects` in the `public` folder to ensure client-side routing works on page refresh.

### Backend (Web Service)
- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `node backend/dist/server.js`

---

## 📁 Project Structure

```bash
├── backend/
│   ├── src/
│   │   ├── controllers/ # Request logic
│   │   ├── models/      # Sequelize definitions
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Security & Auth
│   │   └── server.ts    # Entry point
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── pages/       # React page components
│   │   ├── context/     # Auth & global state
│   │   └── components/  # Reusable UI parts
│   └── public/          # Static assets & routing fallbacks
└── README.md
```

---

## 🛡️ Security Note
The `.env` file is ignored by git. Ensure you provide a secure `JWT_SECRET` in your local environment.

## 📄 License
This project is for educational purposes under the ISC License.
