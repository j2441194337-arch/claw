import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import openAiRoutes from './routes/openai.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));

app.get('/', (req, res) => {
  res.json({
    name: 'ai-api-proxy',
    status: 'running',
    docs: ['/v1/chat/completions', '/v1/embeddings', '/v1/models', '/health']
  });
});

app.use('/v1', openAiRoutes);
app.use('/', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found' } });
});

export default app;
