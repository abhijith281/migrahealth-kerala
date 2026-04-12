# SIH25083 — MigraHealth Kerala
## Phase 1: Project Setup + Authentication

> **What you build in this phase:**
> Full project skeleton, backend auth API (register/login/logout), JWT tokens,
> protected routes, and a basic React login screen.
> By the end, a user can register and log in. Nothing more — nothing less.

---

## The 3 User Roles (Understand this before coding)

| Role | What they can do |
|------|-----------------|
| `patient` | Register, view own records, book appointments |
| `doctor` | View assigned patients, add prescriptions & notes |
| `admin` | Manage all users, view reports, assign doctors |

Every route you build will check this role. Auth is the foundation — get it right first.

---

## Folder Structure

Create this exact structure before writing any code:

```
migrahealth-kerala/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── .env
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js
    │   ├── components/
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   └── Register.jsx
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## Step 1 — Backend Setup

```bash
mkdir migrahealth-kerala && cd migrahealth-kerala
mkdir backend && cd backend
npm init -y
npm install express mongoose dotenv bcryptjs jsonwebtoken cors cookie-parser
npm install --save-dev nodemon
```

Edit `package.json` scripts:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

---

## Step 2 — Environment Variables (`backend/.env`)

```
PORT=5000
MONGO_URI=mongodb+srv://<your_cluster_url>
JWT_SECRET=migrahealth_super_secret_key_2025
JWT_EXPIRE=7d
NODE_ENV=development
```

> **Never commit this file.** Add `.env` to `.gitignore` immediately.

---

## Step 3 — Database Connection (`config/db.js`)

```js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## Step 4 — User Model (`models/User.js`)

This is your most important schema decision. Read the comments carefully.

```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      // Phone is the primary ID — migrant workers often lack email
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // sparse allows multiple null values (email is optional)
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
    },
    language: {
      type: String,
      enum: ['ml', 'hi', 'bn', 'ta', 'or', 'en'], // Malayalam, Hindi, Bengali, Tamil, Odia, English
      default: 'en',
    },
    homeState: {
      type: String, // e.g. "West Bengal", "Bihar", "Odisha"
    },
    aadhaarLast4: {
      type: String,
      maxlength: 4,
      // Only last 4 digits — never store full Aadhaar
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### Why these decisions? (Interview Answer)
- **Phone as primary login** — migrant workers in Kerala are more reliably reachable by phone than email
- **`select: false` on password** — prevents accidental password exposure in API responses
- **`sparse: true` on email** — standard MongoDB technique to allow unique index with optional fields
- **Language field** — drives the multilingual feature in Phase 6
- **Only last 4 digits of Aadhaar** — data minimization principle; full Aadhaar storage requires special compliance

---

## Step 5 — Auth Controller (`controllers/authController.js`)

```js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true, // JS cannot access — prevents XSS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        language: user.language,
      },
    });
};

// @route POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, phone, password, language, homeState } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    const user = await User.create({ name, phone, password, language, homeState });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone and password' });
    }

    const user = await User.findOne({ phone }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/auth/logout
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: 'Logged out' });
};

// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, user });
};
```

---

## Step 6 — Auth Middleware (`middleware/authMiddleware.js`)

```js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  // Read from httpOnly cookie (preferred) or Authorization header
  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Role-based access control
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};
```

---

## Step 7 — Routes (`routes/authRoutes.js`)

```js
const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
```

---

## Step 8 — Server Entry Point (`server.js`)

```js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true, // Allow cookies cross-origin
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Health check
app.get('/', (req, res) => res.json({ message: 'MigraHealth API running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## Step 9 — Frontend Setup

```bash
# From root of project
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install axios react-router-dom
```

---

## Step 10 — Axios Instance (`frontend/src/api/axios.js`)

```js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Sends cookies with every request
});

export default API;
```

---

## Step 11 — Auth Context (`frontend/src/context/AuthContext.jsx`)

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await API.get('/auth/me');
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (phone, password) => {
    const { data } = await API.post('/auth/login', { phone, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await API.get('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

---

## Step 12 — Protected Route (`components/ProtectedRoute.jsx`)

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children;
};

export default ProtectedRoute;
```

---

## Step 13 — App Router (`frontend/src/App.jsx`)

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard coming in Phase 2</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

## Step 14 — Login Page (`pages/Login.jsx`)

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form.phone, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h2>MigraHealth — Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Phone Number"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          required
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          required
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        <button type="submit" style={{ width: '100%', padding: 10 }}>Login</button>
      </form>
      <p>No account? <a href="/register">Register</a></p>
    </div>
  );
}
```

---

## Test Your Phase 1

Start both servers:

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Test with Postman or Thunder Client:

```
POST http://localhost:5000/api/auth/register
Body (JSON):
{
  "name": "Raju Das",
  "phone": "9876543210",
  "password": "test1234",
  "language": "bn",
  "homeState": "West Bengal"
}
```

Expected: `201` response with user object (no password in response).

```
POST http://localhost:5000/api/auth/login
Body: { "phone": "9876543210", "password": "test1234" }
```

Expected: `200` with user object + `token` cookie set.

```
GET http://localhost:5000/api/auth/me
(Cookie must be present)
```

Expected: Current user data returned.

---

## Phase 1 Checklist

- [ ] Backend runs on port 5000 with no errors
- [ ] MongoDB Atlas connected (check terminal log)
- [ ] Register API returns user without password field
- [ ] Login API sets `token` cookie (check in browser DevTools > Application > Cookies)
- [ ] `/api/auth/me` returns user when logged in, 401 when not
- [ ] Frontend login form works and redirects to `/dashboard`
- [ ] `.env` is in `.gitignore`

---

## What's Next — Phase 2

You will build:
- Patient profile schema (health records, blood group, allergies)
- Doctor schema with assigned patients
- CRUD APIs for health records
- Admin panel foundation

---

## Key Decisions to Remember for Interview

| Decision | Why |
|----------|-----|
| JWT stored in httpOnly cookie, not localStorage | localStorage is vulnerable to XSS attacks. httpOnly cookies cannot be accessed by JavaScript. |
| `select: false` on password field | Prevents accidental password leakage in any query that doesn't explicitly request it |
| Phone as login identifier | Migrant workers in Kerala may not have stable email — phone is universal |
| `sparse: true` on email index | Allows email to be optional while still maintaining uniqueness for users who do provide it |
| Role-based middleware (`authorize`) | Separates authentication (who are you) from authorization (what can you do) — standard security principle |