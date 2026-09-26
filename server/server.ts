import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabaseSchema } from './db/schema.js';
import { seedInitialDataIfEmpty, resetDatabaseToClean } from './db/seed.js';
import { createDatabaseBackup } from './db/backup.js';
import { authenticate, requireRole } from './middleware/auth.js';

// Route imports
import profileRoutes from './routes/profile.js';
import statsRoutes from './routes/stats.js';
import callLogsRoutes from './routes/callLogs.js';
import clientsRoutes from './routes/clients.js';
import attendanceRoutes from './routes/attendance.js';
import leavesRoutes from './routes/leaves.js';
import payslipsRoutes from './routes/payslips.js';
import teamMembersRoutes from './routes/teamMembers.js';
import teamGroupsRoutes from './routes/teamGroups.js';
import teamTasksRoutes from './routes/teamTasks.js';
import teamMeetingsRoutes from './routes/teamMeetings.js';
import interviewsRoutes from './routes/interviews.js';
import onboardingRoutes from './routes/onboarding.js';
import exitEmployeesRoutes from './routes/exitEmployees.js';
import assignedLeadsRoutes from './routes/assignedLeads.js';
import leadBatchesRoutes from './routes/leadBatches.js';
import biometricsRoutes from './routes/biometrics.js';
import offerLettersRoutes from './routes/offerLetters.js';
import paymentsRoutes from './routes/payments.js';
import employeeDocumentsRoutes from './routes/employeeDocuments.js';
import authRoutes from './routes/auth.js';
import calendarRoutes from './routes/calendar.js';
import mediaRoutes from './routes/media.js';

// Preserve backup before any startup schema checks or queries
createDatabaseBackup('startup');

// Initialize SQLite DB
initializeDatabaseSchema();
seedInitialDataIfEmpty();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request log so it is obvious which screens are hitting the API
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(
      `${new Date().toLocaleTimeString('en-GB')}  ${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });
  next();
});

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Trade Nexus SQLite Backend',
    timestamp: new Date().toISOString()
  });
});

// Admin Reset to Clean Database (Secured: Admin JWT only)
app.post('/api/admin/reset-to-clean', authenticate, requireRole('admin'), (req, res) => {
  const result = resetDatabaseToClean();
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});

// Public Auth Routes (login)
app.use('/api/auth', authRoutes);

// Protected Business Routes
app.use('/api/profile', authenticate, profileRoutes);
app.use('/api/stats', authenticate, statsRoutes);
app.use('/api/call-logs', authenticate, callLogsRoutes);
app.use('/api/clients', authenticate, clientsRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/leaves', authenticate, leavesRoutes);
app.use('/api/payslips', authenticate, payslipsRoutes);
app.use('/api/team-members', authenticate, teamMembersRoutes);
app.use('/api/team-groups', authenticate, teamGroupsRoutes);
app.use('/api/team-tasks', authenticate, teamTasksRoutes);
app.use('/api/team-meetings', authenticate, teamMeetingsRoutes);
app.use('/api/interviews', authenticate, interviewsRoutes);
app.use('/api/onboarding', authenticate, onboardingRoutes);
app.use('/api/exit-employees', authenticate, exitEmployeesRoutes);
app.use('/api/assigned-leads', authenticate, assignedLeadsRoutes);
app.use('/api/lead-batches', authenticate, leadBatchesRoutes);
app.use('/api/biometrics', authenticate, biometricsRoutes);
app.use('/api/offer-letters', authenticate, offerLettersRoutes);
app.use('/api/payments', authenticate, paymentsRoutes);
app.use('/api/employee-documents', authenticate, employeeDocumentsRoutes);
app.use('/api/calendar', authenticate, calendarRoutes);
app.use('/api/media', mediaRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Trade Nexus SQLite Server running on http://localhost:${PORT}`);
    console.log(`📊 Connected to SQLite local database.`);
    console.log(`==================================================\n`);
  });
}

export default app;
