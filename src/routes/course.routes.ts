import { Router } from 'express';
import { createCourse, getProfessorCourses } from '../controllers/course.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Route pour l'admin (Création)
router.post('/', authenticateToken, createCourse);

// Route pour le professeur (Consultation de son planning)
router.get('/my-schedule', authenticateToken, getProfessorCourses);

export default router;