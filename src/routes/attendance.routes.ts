import { Router } from 'express';
import { validatePresence } from '../controllers/attendance.controller.js'; // .js obligatoire en ESM
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Seul un surveillant authentifié peut valider
router.post('/validate', authenticateToken, validatePresence);

export default router;