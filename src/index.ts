// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Importation des routes et middlewares
// Note : L'extension .js est obligatoire en mode ESM 
import authRoutes from './routes/auth.routes.js';
import courseRoutes from './routes/course.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import qrRoutes from './routes/qr.routes.js';

// Chargement des variables d'environnement (.env)
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 3000;

// --- CONFIGURATION DES MIDDLEWARES ---
app.use(cors());
app.use(express.json()); // Pour parser le JSON dans le body des requêtes [cite: 97, 174]

// --- ROUTES DE L'API ---

// 1. Route de Santé (Health Check)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Serveur Attendance opérationnel 🚀' });
});

// 2. Module d'Authentification (Login, changement de mot de passe)
// Gère les routes comme /api/auth/login [cite: 189, 214]
app.use('/api/auth', authRoutes);

// 3. Module Gestion Pédagogique (Création et consultation des cours)
// Gère les routes comme /api/courses/ et /api/courses/my-schedule [cite: 211, 214]
app.use('/api/courses', courseRoutes);

// 4. Module de Présence (Cœur du projet)
// Route sécurisée : seul un surveillant connecté peut valider [cite: 158, 174, 190]
app.use('/api/attendance', attendanceRoutes);

// GET /api/qr/:courseId  →  retourne le payload QR du professeur connecté
app.use('/api/qr', qrRoutes);

// --- DÉMARRAGE DU SERVEUR ---
app.listen(PORT, '0.0.0.0',() => {
  console.log(`-------------------------------------------`);
  console.log(`🚀 Serveur Attendance démarré avec succès !`);
  console.log(`🔗 URL : http://localhost:${PORT}`);
  console.log(`📡 Réseau : http:// 192.168.88.230:${PORT}`);
  console.log(`🛡️  Sécurité : JWT & Jeton Dynamique actifs`);
  console.log(`🛠️  Mode : ECMAScript Modules (ESM)`);
  console.log(`-------------------------------------------`);
});