// src/routes/stats.routes.ts
//
// Routes Statistiques — accessibles par PROFESSOR, INVIGILATOR et ADMIN.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { getStats } from '../controllers/stats.controller.js';

const router = Router();

// GET /api/stats?period=month|semester|all
// Retourne les stats adaptées au rôle de l'utilisateur connecté
router.get('/', authenticateToken, getStats);

export default router;