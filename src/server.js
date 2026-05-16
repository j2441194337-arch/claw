import app from './app.js';
import { env } from './utils/env.js';

if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`openclaw-delivery listening on port ${env.port}`);
  });
}

export default app;
