import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import adRoutes from './routes/ad.routes';
import locationRoutes from './routes/location.routes';
import analyticsRoutes from './routes/analytics.routes';
import auditLogRoutes from './routes/auditLog.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic health check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'OK' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditLogRoutes);

export default app;
