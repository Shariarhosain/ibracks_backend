import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import AppError from './utils/error.js';
import cronHelper from './utils/cronHelper.js';

dotenv.config();

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Routers
import userRouter from './routes/userRoute.js';
import songRouter from './routes/songRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import licenseRouter from './routes/licenseRoutes.js';


const app = express();
const PORT = process.env.PORT || 3000;

// --- CRITICAL CONFIGURATION CHECKS ---
let criticalConfigMissing = false;

//allow all origins for CORS
app.use(cors({
  origin: '*', // Be cautious with '*' in production
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
  credentials: true,
}));

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Static file serving for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api/users', userRouter);
app.use('/api/songs', songRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/licenses', licenseRouter);


// if other mean which i not declare then say hi hackers
app.use((req, res) => {
 res.send('Hi Hackers, you are not allowed to access this API');
});

// --- Global Error Handling Middleware ---
// Must have 4 arguments for Express to recognize it as error handler
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500; // Default to 500 Internal Server Error
    err.status = err.status || 'error';

    console.error('ERROR 💥:', err); // Log the full error stack

    // Send response
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        // Optionally include stack trace in development
        // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        error: err // Include the error object itself can sometimes be useful (or strip it in prod)
    });
});

// Initialize cron jobs when server starts
try {
  cronHelper.init();
  console.log('✅ Cron jobs initialized - Songs will auto-publish when scheduled!');
} catch (cronError) {
  console.error('❌ Failed to initialize cron jobs:', cronError.message);
}

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n📡 Received ${signal} signal`);
  console.log('🔄 Shutting down cron jobs...');
  
  // Stop cron jobs
  cronHelper.shutdown();
  
  process.exit(0);
};

// Start the server only if all critical checks passed
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`🎵 Song auto-publishing: ACTIVE - Every minute check for scheduled songs`);
  
  // You might also want to establish and check your database connection here
  // and potentially exit if it fails, or implement a retry mechanism.
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;