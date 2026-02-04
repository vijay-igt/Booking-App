# 🚀 Deploying CinePass to Render

Follow these steps to deploy your full-stack application on Render.

## 1. Create a PostgreSQL Database
1.  Log in to [Render](https://dashboard.render.com/).
2.  Click **New +** -> **Database**.
3.  **Name**: `cinepass-db`
4.  **Database**: `movie_booking_db`
5.  **User**: `admin`
6.  Click **Create Database**.
7.  Once created, copy the **Internal Database URL** (for backend) and **External Database URL** (for local testing if needed).

---

## 2. Deploy the Backend
1.  Click **New +** -> **Web Service**.
2.  Connect your GitHub repository.
3.  **Name**: `cinepass-backend`
4.  **Root Directory**: `backend`
5.  **Runtime**: `Node`
6.  **Build Command**: `npm install && npm run build`
7.  **Start Command**: `npm start`
8.  Click **Advanced** -> **Add Environment Variable**:
    - `NODE_ENV`: `production`
    - `DATABASE_URL`: (Paste your **Internal Database URL** from Step 1)
    - `JWT_SECRET`: (Your secret key)
    - `FRONTEND_URL`: (Leave blank for now, update later with your frontend URL)
9.  Click **Create Web Service**.

---

## 3. Deploy the Frontend
1.  Click **New +** -> **Static Site**.
2.  Connect your GitHub repository.
3.  **Name**: `cinepass-frontend`
4.  **Root Directory**: `frontend`
5.  **Build Command**: `npm install && npm run build`
6.  **Publish Directory**: `dist`
7.  Click **Advanced** -> **Add Environment Variable**:
    - `VITE_API_URL`: `https://your-backend-url.onrender.com` (The app adds /api automatically)
8.  Click **Create Static Site**.

---

## 4. Final Updates
1.  Once your frontend is deployed (e.g., `https://cinepass-ui.onrender.com`), go back to your **Backend settings**.
2.  Update the `FRONTEND_URL` environment variable to your frontend URL.
3.  Wait for the backend to redeploy.

---

## 🛠 Troubleshooting
- **CORS Errors**: Ensure `FRONTEND_URL` in the backend exactly matches your deployed frontend URL (without a trailing slash).
- **Database Connection**: Ensure `DATABASE_URL` is using the **Internal** link if both services are on Render.
