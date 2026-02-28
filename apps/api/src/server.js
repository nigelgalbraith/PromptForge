import express from 'express';

import { generateRouter } from './routes/generate.js';
import { profilesRouter } from './routes/profiles.js';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(express.json({ limit: '1mb' }));
app.use('/api', generateRouter);
app.use('/api', profilesRouter);

/** Handles root health check requests. */


function handleRoot(_req, res) {
  return res.json({ status: 'ok' });
}


/** Starts the API server. */


function startServer() {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

app.get('/', handleRoot);
startServer();
