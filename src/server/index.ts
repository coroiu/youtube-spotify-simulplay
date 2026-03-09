import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { authRouter } from './auth';

const app = express();
const PORT = process.env.PORT ?? 3000;

const https_key = process.env.HTTPS_KEY;
const https_cert = process.env.HTTPS_CERT;
const useHttps = Boolean(https_key && https_cert);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  cookieSession({
    name: 'session',
    secret: process.env.SESSION_SECRET ?? 'dev-secret',
    maxAge: 24 * 60 * 60 * 1000,
    secure: useHttps,
    sameSite: 'lax',
  })
);

app.use('/auth', authRouter);

const publicDir = path.join(__dirname, '../../public');
app.use(express.static(publicDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

if (useHttps) {
  const tlsOptions = {
    key: fs.readFileSync(https_key!),
    cert: fs.readFileSync(https_cert!),
  };
  https.createServer(tlsOptions, app).listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
