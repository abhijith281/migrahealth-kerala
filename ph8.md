# SIH25083 — MigraHealth Kerala
## Phase 8: Deployment (Render + Vercel + MongoDB Atlas)

> **What you build in this phase:**
> Your project goes live on the internet with a real URL.
> Backend deployed to Render (free tier).
> Frontend deployed to Vercel (free tier).
> MongoDB Atlas already set up from Phase 1.
> A professional README.md that makes your resume link look serious.
> By the end: migrahealth.vercel.app is a real URL you put on your resume.

---

## Deployment Architecture

```
Browser (User)
      ↓
Vercel (Frontend — React)
  https://migrahealth-kerala.vercel.app
      ↓  API calls
Render (Backend — Node/Express)
  https://migrahealth-api.onrender.com
      ↓  DB queries
MongoDB Atlas (Database)
  cluster.mongodb.net
```

Everything is free tier. No credit card needed for Render or Vercel.

---

## Pre-Deployment Checklist

Before deploying, fix these in your code:

- [ ] All `localhost:5000` references in frontend replaced with env variable
- [ ] All `localhost:5173` references in backend CORS replaced with env variable
- [ ] `.env` is in `.gitignore` for both frontend and backend
- [ ] No hardcoded secrets anywhere in code

---

## PART A — Prepare the Code

---

## Step 1 — Backend: Make PORT and CORS Dynamic

Your `server.js` CORS is currently hardcoded to localhost. Fix it:

```js
// server.js — update CORS config
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL, // Add this
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

## Step 2 — Backend: Add `FRONTEND_URL` to `.env`

```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=migrahealth_super_secret_key_2025
JWT_EXPIRE=7d
NODE_ENV=development
GOOGLE_TRANSLATE_API_KEY=AIza...
FRONTEND_URL=http://localhost:5173
```

This will be overridden in production by Render's environment variables.

---

## Step 3 — Frontend: Create Environment Variable for API URL

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

Create `frontend/.env.production`:
```
VITE_API_URL=https://migrahealth-api.onrender.com/api
```

> `.env.production` is automatically used by Vite when running `npm run build`.
> Both files go in `.gitignore` — you'll set the production value in Vercel's dashboard.

Update `frontend/src/api/axios.js`:

```js
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

export default API;
```

---

## Step 4 — Backend: Add Production Cookie Settings

Update `sendTokenResponse` in `authController.js`:

```js
const cookieOptions = {
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  // sameSite: 'none' required when frontend and backend are on different domains
};
```

> This is critical. Without `sameSite: 'none'` + `secure: true`,
> cookies won't work cross-domain in production.
> Render uses HTTPS by default, so `secure: true` will work.

---

## Step 5 — Backend: Add `engines` to `package.json`

Render needs to know your Node version:

```json
{
  "name": "migrahealth-backend",
  "version": "1.0.0",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

---

## Step 6 — Frontend: Add `vercel.json`

Create `frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

> Without this, refreshing the page on any route like `/dashboard` or `/doctor`
> gives a 404 on Vercel. This tells Vercel to always serve `index.html`
> and let React Router handle routing.

---

## Step 7 — Push to GitHub

```bash
# From project root
git init
git add .
git commit -m "Initial commit — MigraHealth Kerala SIH25083"
```

Create a new repository on GitHub:
- Go to github.com → New repository
- Name it: `migrahealth-kerala`
- Keep it public (makes it easier to deploy)
- Do NOT initialize with README (you already have files)

```bash
git remote add origin https://github.com/YOUR_USERNAME/migrahealth-kerala.git
git branch -M main
git push -u origin main
```

---

## PART B — Deploy Backend to Render

---

## Step 8 — Create Render Account

1. Go to https://render.com
2. Sign up with GitHub account
3. Click **New → Web Service**
4. Connect your GitHub repository: `migrahealth-kerala`

---

## Step 9 — Configure Render Web Service

Fill in these settings:

| Field | Value |
|-------|-------|
| Name | `migrahealth-api` |
| Root Directory | `backend` |
| Environment | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | `Free` |

Click **Advanced** → Add Environment Variables:

| Key | Value |
|-----|-------|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | `migrahealth_super_secret_key_2025` |
| `JWT_EXPIRE` | `7d` |
| `NODE_ENV` | `production` |
| `GOOGLE_TRANSLATE_API_KEY` | Your Google API key |
| `FRONTEND_URL` | *(leave blank for now — add after Vercel deploy)* |

Click **Create Web Service**.

Render will build and deploy. Takes 2-3 minutes.
Your backend URL will be: `https://migrahealth-api.onrender.com`

---

## Step 10 — Test Backend on Render

Once deployed, test in Postman:

```
POST https://migrahealth-api.onrender.com/api/auth/login
Body: { "phone": "9876543210", "password": "test1234" }
```

Expected: 200 with user object.

If you get 500 — check Render logs (Logs tab in dashboard).
Most common issue: MONGO_URI environment variable missing or wrong.

---

## Step 11 — Update MongoDB Atlas Network Access

By default, MongoDB Atlas only allows your local IP.
For Render, you need to allow all IPs:

1. Go to MongoDB Atlas → Network Access
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0)
4. Click Confirm

> This is fine for a portfolio/hackathon project.
> In production, you would whitelist Render's IP range.

---

## PART C — Deploy Frontend to Vercel

---

## Step 12 — Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub account
3. Click **Add New → Project**
4. Import your repository: `migrahealth-kerala`

---

## Step 13 — Configure Vercel Project

| Field | Value |
|-------|-------|
| Framework Preset | `Vite` |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Add Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://migrahealth-api.onrender.com/api` |

Click **Deploy**.

Vercel builds in ~1 minute.
Your frontend URL will be: `https://migrahealth-kerala.vercel.app`

---

## Step 14 — Add Frontend URL to Render

Now go back to Render → Your web service → Environment:

Update `FRONTEND_URL`:
```
FRONTEND_URL=https://migrahealth-kerala.vercel.app
```

Click **Save Changes**. Render will restart the service automatically.

---

## Step 15 — Test Full Deployed App

1. Open `https://migrahealth-kerala.vercel.app`
2. Register a new patient account
3. Open browser DevTools → Application → Cookies
4. Confirm `token` cookie is set with `Secure` and `SameSite=None`
5. Navigate to `/dashboard` — confirm you're logged in
6. Refresh the page — confirm you stay logged in (cookie persists)
7. Test language switcher — confirm UI changes to Malayalam

---

## PART D — MongoDB Atlas Seed in Production

---

## Step 16 — Seed Vaccines in Production

Your vaccine seed script needs to run once against the production database.
Update `backend/seed/vaccines.js` temporarily:

```js
// Temporarily hardcode your Atlas URI to seed production
// REMOVE THIS LINE after seeding
const MONGO_URI = 'mongodb+srv://YOUR_ACTUAL_URI';

mongoose.connect(MONGO_URI);
```

Run locally against production DB:
```bash
cd backend
node seed/vaccines.js
```

Expected: "Seeded 15 vaccine types"

Then remove the hardcoded URI from the file.

---

## PART E — README.md

---

## Step 17 — Create Project README

Create `README.md` in the root of your project:

```markdown
# MigraHealth Kerala

**SIH25083 — Smart India Hackathon 2025**
Digital Health Record Management System for Migrant Workers in Kerala

🔗 **Live Demo:** https://migrahealth-kerala.vercel.app
📁 **Backend API:** https://migrahealth-api.onrender.com

---

## Problem Statement

Kerala has over 3.5 million migrant workers from states like West Bengal, Bihar,
Odisha, and Uttar Pradesh. These workers face a critical gap in healthcare access —
their medical history doesn't travel with them, they speak different languages than
local doctors, and they lack persistent health records. MigraHealth Kerala solves this.

---

## Features

### For Patients
- Register with phone number (no email required)
- Store and view personal health records
- Book appointments with assigned doctor
- View immunization history and upcoming due vaccines
- Full UI in Malayalam, Hindi, Bengali, Tamil, or Odia
- Translate medical content (diagnosis, prescriptions) to their language

### For Doctors
- Dashboard with assigned patient list and quick stats
- Per-patient detail page with health records, immunizations, appointments
- Add verified health records and record immunizations
- Confirm, complete, or cancel appointments

### For Admin
- System-wide stats and analytics dashboard
- User management with role assignment
- Doctor-patient assignment system
- Health records per month bar chart

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| State Management | React Context API (AuthContext, LanguageContext) |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT in httpOnly cookies |
| Translation | Google Cloud Translation API |
| Deployment | Vercel (frontend), Render (backend) |

---

## Architecture Decisions

- **JWT in httpOnly cookies** — prevents XSS attacks compared to localStorage
- **Phone as primary login** — migrant workers may not have stable email
- **Two-layer i18n** — static JSON for UI labels (instant), Google Translate API for medical content (on-demand)
- **Role-based access control** — patient / doctor / admin with middleware-level enforcement
- **Soft delete for vaccine types** — preserves historical immunization records

---

## Database Schema

```
User ──────────────── PatientProfile
  |                        |
  |                   assignedDoctor
  |                        |
  └──── DoctorProfile ─────┘
              |
         patients[]

HealthRecord → patient (User), doctor (User)
Immunization → patient (User), vaccineType (VaccineType)
Appointment  → patient (User), doctor (User)
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google Cloud account (for Translation API)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, GOOGLE_TRANSLATE_API_KEY
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm run dev
```

### Seed Database
```bash
cd backend
node seed/vaccines.js
```

---

## API Endpoints

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | /api/auth/register | Public | Register new user |
| POST | /api/auth/login | Public | Login |
| GET | /api/auth/me | Auth | Get current user |
| GET | /api/patients/profile | Patient | Get own profile |
| PUT | /api/patients/profile | Patient | Update profile |
| POST | /api/records | Patient/Doctor | Create health record |
| GET | /api/records | Auth | Get records (role-filtered) |
| POST | /api/appointments | Patient | Book appointment |
| PATCH | /api/appointments/:id/status | Auth | Update appointment status |
| POST | /api/immunizations | Doctor | Record immunization |
| GET | /api/immunizations/upcoming | Auth | Upcoming due vaccines |
| POST | /api/translate | Auth | Translate text |
| GET | /api/admin/stats | Admin | System statistics |
| PATCH | /api/admin/patients/:id/assign-doctor | Admin | Assign doctor to patient |

---

## Demo Credentials

| Role | Phone | Password |
|------|-------|----------|
| Patient | 9876543210 | demo1234 |
| Doctor | 9876543211 | demo1234 |
| Admin | 9876543212 | demo1234 |

---

## License

Built for Smart India Hackathon 2025 — SIH25083
```

---

## PART F — .env.example Files

---

## Step 18 — Create `.env.example` Files

These go in the repo so anyone cloning knows what variables to set.

### `backend/.env.example`
```
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
NODE_ENV=development
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key
FRONTEND_URL=http://localhost:5173
```

### `frontend/.env.example`
```
VITE_API_URL=http://localhost:5000/api
```

---

## Step 19 — Final `.gitignore` Check

Make sure `backend/.gitignore` has:
```
node_modules
.env
```

And `frontend/.gitignore` has:
```
node_modules
.env
.env.production
dist
```

---

## Step 20 — Create Demo Users in Production

After deployment, create 3 demo accounts via Postman against your live API:

```
POST https://migrahealth-api.onrender.com/api/auth/register
Body: { "name": "Raju Das", "phone": "9876543210", "password": "demo1234", "language": "bn", "homeState": "West Bengal" }

POST https://migrahealth-api.onrender.com/api/auth/register
Body: { "name": "Dr. Anitha Kumar", "phone": "9876543211", "password": "demo1234", "language": "ml" }

POST https://migrahealth-api.onrender.com/api/auth/register
Body: { "name": "Admin User", "phone": "9876543212", "password": "demo1234" }
```

Then in MongoDB Atlas:
- Set Dr. Anitha's role to `doctor`
- Set Admin's role to `admin`
- Create DoctorProfile for Dr. Anitha
- Assign Raju Das to Dr. Anitha

Add some demo health records and one appointment for the demo patient.

---

## Phase 8 Checklist

- [ ] `sameSite: 'none'` + `secure: true` set for production cookies
- [ ] `vercel.json` added with rewrite rule for React Router
- [ ] `engines.node` added to backend `package.json`
- [ ] Axios baseURL uses `import.meta.env.VITE_API_URL`
- [ ] CORS reads `FRONTEND_URL` from environment variable
- [ ] Code pushed to GitHub
- [ ] Backend deployed on Render — health check returns 200
- [ ] All 6 environment variables set in Render dashboard
- [ ] MongoDB Atlas Network Access set to allow 0.0.0.0/0
- [ ] Frontend deployed on Vercel — `VITE_API_URL` environment variable set
- [ ] `FRONTEND_URL` updated in Render after getting Vercel URL
- [ ] Vaccine seed script run against production database
- [ ] Login works on live URL — cookie set correctly
- [ ] Page refresh on `/dashboard` stays logged in (cookie persists)
- [ ] Language switcher works on production
- [ ] Translation API works on production (test with Malayalam)
- [ ] README.md has live demo links
- [ ] 3 demo accounts created with data
- [ ] `.env.example` files committed to repo

---

## Troubleshooting Common Issues

### Cookie not being set in production
Check: `sameSite: 'none'` and `secure: true` in authController.
Check: `credentials: true` in both axios and CORS config.
Check: HTTPS is being used (Render and Vercel both use HTTPS by default).

### CORS error in production
Check: `FRONTEND_URL` env variable is set correctly in Render.
Check: No trailing slash in the URL — `https://app.vercel.app` not `https://app.vercel.app/`

### Render service sleeping
Free tier Render services sleep after 15 minutes of inactivity.
First request after sleep takes ~30 seconds (cold start).
For demo: warn your interviewer, or use UptimeRobot to ping every 14 minutes.

### 404 on page refresh in Vercel
Check: `vercel.json` exists in frontend folder with the rewrite rule.

### Translation not working in production
Check: `GOOGLE_TRANSLATE_API_KEY` is set in Render environment variables.
Check: Cloud Translation API is enabled in Google Cloud Console.
Check: API key has no HTTP referrer restrictions (or whitelist your Render domain).

### MongoDB connection error on Render
Check: Network Access in Atlas allows 0.0.0.0/0.
Check: MONGO_URI has correct username, password, and database name.
Check: Password has no special characters that need URL encoding.

---

## Your Resume Line

Add this to your resume under Projects:

```
MigraHealth Kerala | MERN Stack, Google Translate API | [Live Link] | [GitHub]
  • Built a digital health record system for Kerala's 3.5M migrant workers as part
    of Smart India Hackathon 2025 (SIH25083)
  • Implemented JWT authentication with httpOnly cookies, role-based access
    control (patient/doctor/admin), and appointment booking with slot conflict detection
  • Integrated Google Cloud Translation API for 6-language support (Malayalam,
    Hindi, Bengali, Tamil, Odia) — enabling migrant patients to read medical
    records in their native language
  • Deployed backend on Render, frontend on Vercel, database on MongoDB Atlas
```

---

## Interview Prep Summary

After all 8 phases, here are the questions you should be fully ready to answer:

### "Walk me through your project."
MigraHealth Kerala is a health record management system for migrant workers in Kerala,
built for Smart India Hackathon 2025 (SIH25083). It has three roles — patient, doctor,
and admin. Patients can store health records, book appointments, and track vaccinations.
Doctors have a portal to manage their assigned patients. The standout feature is
multilingual support using Google Translate API — a Bengali migrant worker can switch
the UI to Bengali and translate any medical diagnosis with one click.

### "Why did you use httpOnly cookies instead of localStorage?"
localStorage is accessible to JavaScript, which means any XSS vulnerability on the
page can steal the token. httpOnly cookies cannot be read by JavaScript at all — only
sent automatically with requests. This is the industry standard for storing auth tokens
in web apps.

### "Explain your database schema."
There are 6 models. User handles authentication. PatientProfile and DoctorProfile are
separate from User — they hold medical/professional data. I separated them because auth
data and medical data have different lifecycles; you might delete medical data without
deleting the account. HealthRecord, Immunization, and Appointment all reference User
by ObjectId. I used a compound index on HealthRecord's patient+visitDate because the
most common query is "get all records for this patient sorted by date."

### "How does the multilingual feature work?"
Two layers. Static UI labels — buttons, headings, navigation — are stored in local
JSON translation files, one per language. These switch instantly with no API call.
Dynamic medical content — diagnoses, descriptions — uses Google Translate API on
demand when the user clicks Translate. I made it opt-in because auto-translating
medical text without consent is risky — a mistranslation in healthcare could be
dangerous.

### "How did you handle the appointment slot conflict?"
Before creating an appointment, I query the database for any existing appointment
with the same doctor, same date, same time slot, and status pending or confirmed.
If one exists, I return 400 with a clear message. This check happens in the backend,
not just the frontend — because frontend validation alone can be bypassed.

### "What is the isVerified flag on health records?"
It distinguishes between self-reported records (patient adds their own history —
unverified) and doctor-created records (automatically set to verified). In a medical
context, the trustworthiness of a record matters. A doctor viewing records needs to
know which ones were confirmed by a medical professional versus entered by the patient
themselves.

### "Why did you use sparse: true on the email index?"
Email is optional in our system — migrant workers often don't have one. A normal
unique index would treat all null values as duplicates, meaning only one user could
have no email. Sparse indexes ignore documents where the field is missing entirely,
so the uniqueness only applies to users who actually provide an email.