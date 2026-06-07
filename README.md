# ParkEase — Online Parking Slot Reservation System

A full-stack web application for parking slot management built with Node.js, Express.js, MySQL, and Vanilla JS.

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (SPA)
- **Backend:** Node.js + Express.js
- **Database:** MySQL 8+
- **Auth:** JWT (jsonwebtoken) + bcryptjs

## Default Admin Account
- Email: `admin@parkease.com`
- Password: `Admin@1234`

## Local Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create `.env` file in `/backend` with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=parkease_db
   JWT_SECRET=your_secret
   PORT=3001
   ```

3. Run `backend/schema.sql` in MySQL to create tables and seed data.

4. Start the server:
   ```bash
   cd backend
   npm start
   ```

5. Open `http://localhost:3001`

## Railway Deployment

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add a MySQL database service
4. Set environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET)
5. Run schema.sql in Railway MySQL query tab
6. Railway auto-deploys and gives you a public URL
