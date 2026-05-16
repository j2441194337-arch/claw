import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import commerceRoutes from './routes/commerce.js';
import statusRoutes from './routes/status.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use('/', statusRoutes);
app.use('/', commerceRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found', code: 'not_found' } });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  res.status(error.statusCode || 500).json({
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'internal_error'
    }
  });
});

export default app;
