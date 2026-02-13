# 🎬 CinePass - Frontend

The premium, high-fidelity user interface for the CinePass movie booking platform.

## ✨ Features
- **Modern Cinematic UI**: Dark-themed design with smooth Framer Motion transitions and Tailwind CSS v4.
- **Interactive Theater Layout**: Real-time seat selection with dynamic pricing calculations.
- **WebSocket Notifications**: Instant push notifications for bookings and admin requests.
- **Responsive Admin Dashboard**: Full-featured management interface for movie catalogs and theater operations.
- **Digital Wallet**: Cinematic ticket view with image export capability.

## 🛠 Tech Stack
- **React 18**
- **Vite**
- **Tailwind CSS v4**
- **Framer Motion** (Animations)
- **Lucide React** (Icons)
- **Context API** (State Management)

## 🚀 Setup
1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   VITE_BACKEND_URL=http://localhost:5000
   VITE_WS_URL=ws://localhost:5000
   ```
3. **Development**:
   ```bash
   npm run dev
   ```

## 📁 Key Folders
- `/src/components`: UI components (Button, Modal, etc.)
- `/src/context`: Authentication and WebSocket providers.
- `/src/pages`: Main view components (Home, Booking, Profile).
- `/src/hooks`: Custom React hooks for API calls.
