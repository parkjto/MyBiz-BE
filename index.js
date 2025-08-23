import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { assertRequiredEnv } from './utils/checkEnv.js';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/authRoutes.js';
import scraperRoutes from './routes/scraperRoutes.js';
import reviewAnalysisRoutes from './routes/reviewAnalysisRoutes.js';
import storesRoutes from './routes/storesRoutes.js';
import naverLocalRoutes from './routes/naverLocalRoutes.js';
import salesRoutes from './routes/salesRoutes.js';

import { errorHandler } from './middlewares/errorHandler.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import swaggerSpec from './swagger/swagger.js';
import { logger } from './utils/logger.js';

dotenv.config();
assertRequiredEnv();

const app = express();

// Security & CORS
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Rate Limiter
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/reviews/analysis', reviewAnalysisRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/naver', naverLocalRoutes);
app.use('/api/sales', salesRoutes);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
export default app;

