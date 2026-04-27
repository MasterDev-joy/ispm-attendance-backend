// src/routes/qr.routes.ts
import { Router } from 'express';
import { getQrToken } from '../controllers/qr.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

/**
 * GET /api/qr/:courseId
 * ✅ Accessible uniquement par un PROFESSOR authentifié.
 * Retourne un payload QR valide pendant ~15 secondes.
 */
router.get('/:courseId', authenticateToken, requireRole('PROFESSOR'), getQrToken);

export default router;
