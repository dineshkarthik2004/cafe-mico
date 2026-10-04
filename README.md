# Cafe Mico — QR Dine-In Ordering System

A complete, production-ready, premium QR-based dine-in ordering web application built for **Cafe Mico, Dilsukhnagar**.

## Project Overview

This platform allows customers to scan a QR code at their table, browse a premium digital menu, place orders, and seamlessly add items to their active session. 
All orders tied to the same table session are aggregated into a single, consolidated bill.

**Core Architecture Principle:** `ONE TABLE = ONE ACTIVE DINING SESSION = ONE CONSOLIDATED BILL`

## Features

*   **Customer Experience:** Mobile-first, elegant UI with smooth animations. No app installation required (web-based PWA).
*   **Table Sessions:** Smart session management automatically identifies tables via QR token. Multiple friends at the same table can order from the same QR, and all items aggregate into the same bill.
*   **Kitchen Display System (KDS):** Tablet-optimized, real-time dashboard for chefs to accept, prepare, and serve orders.
*   **Real-time Updates:** Powered by Socket.IO, customers see order status updates instantly without refreshing.
*   **Admin Dashboard:** Comprehensive control panel for menu editing, table generation, QR code downloading, analytics, and billing.
*   **Secure:** JWT-based authentication, role-based access control, server-side price validation, hashed passwords.

## Tech Stack

*   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Zustand, React Query, Lucide React
*   **Backend:** Node.js, Express, TypeScript, Socket.IO
*   **Database:** PostgreSQL 15
*   **ORM:** Prisma

---

## Installation & Environment Setup

### Prerequisites
- Node.js (v18 or higher)
- Docker Desktop (for PostgreSQL)

### 1. Clone & Install
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd apps/api
npm install

# Install frontend dependencies
cd ../web
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` in the root directory.
```bash
cp .env.example .env
```
Ensure the `DATABASE_URL` is set to the correct local PostgreSQL URI.

---

## Database Setup

### 1. Start PostgreSQL (Docker)
Ensure Docker is running, then run:
```bash
npm run docker:up
```

### 2. Run Migrations & Seed Database
In a new terminal:
```bash
cd apps/api
npx prisma db push
npx prisma db seed
```
*This will seed the database with Cafe Mico's menu, generate 20 tables with QR tokens, and create demo users.*

---

## Running the Application

### Start Both Frontend & Backend
From the root directory:
```bash
npm run dev
```

- **Frontend Customer App:** `http://localhost:5173/menu`
- **Frontend Kitchen App:** `http://localhost:5173/kitchen`
- **Frontend Admin App:** `http://localhost:5173/admin`
- **Backend API:** `http://localhost:3001`

---

## Demo Accounts (Created by Seed)

| Role    | Email                  | Password   |
|---------|------------------------|------------|
| Admin   | `admin@cafemico.com`   | `admin123` |
| Kitchen | `kitchen@cafemico.com` | `kitchen123`|

> **WARNING:** Please change these credentials in the Admin Dashboard before production deployment.

---

## How to Test the Flow

1. Go to `http://localhost:5173/admin/login` and log in as Admin.
2. Navigate to **Tables & QR** and click **View QR** on Table 01.
3. Click the link (or copy the URL) to simulate scanning the QR as a customer.
4. Browse the menu, add items, and place an order.
5. Go to `http://localhost:5173/kitchen/login` in another tab. Log in as Kitchen.
6. See the new order pop up in real-time. Change its status to "Accepted" -> "Preparing" -> "Ready".
7. Observe the real-time status change on the customer's device.
8. As the customer, order *more* items. They will seamlessly be added to the same session.
9. As a customer, request the bill.
10. In the Admin panel, go to **Orders & Bills** to finalize the bill and close the table session.

---

## Deployment Instructions

This project is built to be deployed seamlessly with **Vercel** (Frontend) and **Railway** (Backend & Database).

### 1. Backend & Database (Railway)
1. Go to [Railway.app](https://railway.app/) and create a new project.
2. Provision a **PostgreSQL** database.
3. Deploy your GitHub repository.
4. Go to the service settings for the repository:
   - **Root Directory:** `/apps/api`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
5. In the **Variables** tab, add:
   - `DATABASE_URL`: *(Reference your Railway Postgres DB url)*
   - `JWT_SECRET`: *(A random secure string)*
   - `CLIENT_URL`: *(Your future Vercel frontend URL, e.g., https://cafemico.vercel.app)*
6. After it builds, Railway will provide a public URL (e.g., `https://api-cafemico.up.railway.app`). Copy this URL.

### 2. Frontend (Vercel)
1. Go to [Vercel.com](https://vercel.com/) and import your GitHub repository.
2. Configure the project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `apps/web`
3. In the **Environment Variables** section, add:
   - `VITE_API_URL`: *(The Railway backend URL you copied, e.g., https://api-cafemico.up.railway.app/api)*
4. Click **Deploy**. Vercel will automatically handle building and routing the React application.

### 3. Final Step: Database Seeding
Once the backend is live on Railway, you need to seed the production database with your menu and table data.
In the Railway project, open the backend service terminal/console and run:
```bash
npx prisma db push
npx prisma db seed
```
Your Cafe Mico ordering system is now fully live!

