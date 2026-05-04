// src/routes/admin.routes.ts
//
// Routes Admin — protégées par authenticateToken + requireRole('ADMIN')
// Couvre : users · courses · reports · attendance reset
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole }       from '../middlewares/role.middleware.js';
import {
  getUsers, createUser, updateUser, toggleUserActive,
  getCourses, updateCourse, deleteCourse,
  getReports, exportReport,
  resetAttendance,
} from '../controllers/admin.controller.js';

const router = Router();

// Toutes les routes admin nécessitent un token + rôle ADMIN
router.use(authenticateToken, requireRole('ADMIN'));

// ── Utilisateurs ─────────────────────────────────────────────────────────────
router.get   ('/users',                 getUsers);
router.post  ('/users',                 createUser);
router.put   ('/users/:id',             updateUser);
router.patch ('/users/:id/toggle',      toggleUserActive);

// ── Cours (vue globale + modification) ───────────────────────────────────────
router.get   ('/courses',               getCourses);
router.put   ('/courses/:id',           updateCourse);
router.delete('/courses/:id',           deleteCourse);

// ── Rapports ─────────────────────────────────────────────────────────────────
router.get   ('/reports',               getReports);
router.get   ('/reports/export',        exportReport);

// ── Danger zone ──────────────────────────────────────────────────────────────
router.delete('/reset-attendance',      resetAttendance);

export default router;