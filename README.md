# MigraHealth Kerala


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


