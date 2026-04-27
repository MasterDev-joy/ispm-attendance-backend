// src/routes/auth.routes.ts
import { Router } from 'express';
import { login, changePassword } from '../controllers/auth.controller.js'; // .js obligatoire
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Route publique pour la connexion
router.post('/login', login);

// Route protégée : seul un utilisateur avec un token valide peut changer son mot de passe [cite: 188]
router.put('/change-password', authenticateToken, changePassword);

export default router;