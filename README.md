# MigraHealth Kerala (SIH25083)

## Problem Statement
Migrant workers in Kerala often face challenges in accessing consistent healthcare due to language barriers, lack of standardized health records, and mobility across different states. This leads to fragmented medical histories, delayed treatments, and difficulties in tracking immunization status. MigraHealth Kerala aims to bridge this gap by providing a centralized, multilingual Digital Health Record Management System tailored for migrant workers.

## Features List

### Patient Features
- Multilingual interface (Hindi, Odia, Bengali, Malayalam, etc.)
- Secure registration and login using Phone Number
- View personal health records and upcoming appointments
- Access immunization tracking and history
- View assigned doctors and their instructions

### Doctor Features
- Dashboard to manage assigned patients
- Create and update health records (diagnoses, prescriptions, test results)
- Schedule appointments with patients
- Track patient immunization history
- Multilingual translation support for clear communication

### Admin Features
- Comprehensive dashboard with platform analytics
- Manage users, doctors, and patients
- Create and manage vaccine types
- Assign patients to specific doctors
- Monitor system usage and health record updates

## Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| Frontend | React + Vite | Fast, modern UI development |
| Backend | Node.js + Express | Scalable REST API |
| Database | MongoDB + Mongoose | NoSQL database for flexible health records |
| Authentication| JWT + HTTP-only Cookies| Secure, stateless authentication |
| Styling | Tailwind CSS / Custom CSS | Responsive and accessible design |

## Architecture Decisions
- **Stateless Authentication**: Chose JWT stored in HTTP-only cookies to prevent XSS attacks while allowing seamless scaling across multiple backend instances.
- **RESTful API Design**: Implemented a clear, resource-based API structure (`/api/patients`, `/api/records`) for maintainability.
- **Role-Based Access Control (RBAC)**: Enforced strict access policies at the middleware level to ensure data privacy between Patients, Doctors, and Admins.
- **Sparse Indexing in MongoDB**: Utilized sparse unique indexing for fields like email to allow optional inputs while maintaining uniqueness when provided.
- **Vite & React Ecosystem**: Decided to use Vite instead of Create React App for significantly faster hot module replacement (HMR) and optimized production builds.

## Database Schema Diagram

```text
+-------------------+       +--------------------+       +---------------------+
|       User        |       |    HealthRecord    |       |     Appointment     |
+-------------------+       +--------------------+       +---------------------+
| _id (ObjectId)    |<--+   | _id (ObjectId)     |       | _id (ObjectId)      |
| name (String)     |   |   | patient (ObjectId) |>--+   | patient (ObjectId)  |
| phone (String)    |   +---| doctor (ObjectId)  |   |   | doctor (ObjectId)   |
| password (Hash)   |       | diagnosis (String) |   +---| status (Enum)       |
| role (Enum)       |       | prescription(Array)|       | date (Date)         |
| language (String) |       | date (Date)        |       | notes (String)      |
+-------------------+       +--------------------+       +---------------------+
        ^                                                           |
        |                   +--------------------+                  |
        +-------------------|    Immunization    |                  |
                            +--------------------+                  |
                            | _id (ObjectId)     |                  |
                            | patient (ObjectId) |>-----------------+
                            | vaccine (ObjectId) |
                            | dateAdministered   |
                            | nextDueDate (Date) |
                            +--------------------+
```

## Local Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd migral-health-kerala
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update the .env file with your local MongoDB URI
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Ensure VITE_API_URL is set correctly
   npm run dev
   ```

## API Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/auth/register` | POST | Register a new user | Public |
| `/api/auth/login` | POST | Authenticate user & get token| Public |
| `/api/auth/me` | GET | Get current logged-in user | Private |
| `/api/patients` | GET | Get all patients | Admin/Doctor |
| `/api/records` | GET | Get health records | Private |
| `/api/appointments`| POST | Create an appointment | Private |
| `/api/vaccine-types`| GET | List all available vaccines | Public/Private |

## Demo Credentials

| Role | Phone Number | Password |
|------|--------------|----------|
| Admin | 9999999999 | 123456 |
| Doctor| 8888888888 | 123456 |
| Patient| 7777777777 | 123456 |

## Resume Bullet Points

- Developed a full-stack MERN (MongoDB, Express, React, Node.js) platform catering to migrant workers, solving critical healthcare accessibility issues.
- Implemented robust Role-Based Access Control (RBAC) supporting Patient, Doctor, and Admin workflows with tailored dashboards and functional capabilities.
- Engineered secure authentication utilizing JSON Web Tokens (JWT) and HTTP-only cookies, safeguarding sensitive medical data against XSS vulnerabilities.
- Integrated multilingual support (Hindi, Odia, Bengali, Malayalam) driving user adoption among non-native speakers.
- Architected a scalable RESTful backend API capable of managing complex relationships between users, health records, immunizations, and appointments.
