const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Enable CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow array of origins, filter out undefined values
      const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').filter(url => url && url !== 'undefined')
        : ['http://localhost:5173'];
        
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Mount routers
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const recordRoutes = require('./routes/records');
const appointmentRoutes = require('./routes/appointments');
const vaccineTypeRoutes = require('./routes/vaccine-types');
const immunizationRoutes = require('./routes/immunizations');
const doctorRoutes = require('./routes/doctor');
const translateRoutes = require('./routes/translate');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/vaccine-types', vaccineTypeRoutes);
app.use('/api/immunizations', immunizationRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'MigraHealth Kerala API is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
