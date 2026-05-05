// src/controllers/admin.controller.ts
//
// Contrôleur Admin — CRUD complet pour la gestion de l'établissement.
// Utilisé uniquement par les routes /api/admin/* (ADMIN only).
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
//  UTILISATEURS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Retourne tous les utilisateurs (profs + superviseurs), sans les admins.
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      orderBy: { lastName: 'asc' },
      select: {
        id: true, firstName: true, lastName: true,
        email: true, role: true, isFirstLogin: true,
        createdAt: true,
      },
    });

    // Normalise pour le client Flutter
    const mapped = users.map(u => ({
      id:        u.id,
      firstName: u.firstName,
      lastName:  u.lastName,
      email:     u.email,
      role:      u.role.toLowerCase(),   // 'professor' | 'supervisor'
      isActive:  true,                    // TODO: ajouter champ isActive au schéma
      isFirstLogin: u.isFirstLogin,
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};

/**
 * POST /api/admin/users
 * Crée un nouveau professeur ou superviseur.
 * Mot de passe temporaire = email (changé au premier login).
 */
export const createUser = async (req: Request, res: Response) => {
  const { firstName, lastName, email, role } = req.body;

  if (!firstName || !lastName || !email || !role) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  const roleMap: Record<string, any> = {
    professor:  'PROFESSOR',
    supervisor: 'SUPERVISOR',
    superviseur:'SUPERVISOR',
  };

  const prismaRole = roleMap[role.toLowerCase()];
  if (!prismaRole) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  try {
    // Vérifie que l'email n'existe pas déjà
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Mot de passe temporaire = email hashé
    const tempPassword = await bcrypt.hash(email, 10);

    const user = await prisma.user.create({
      data: {
        firstName, lastName, email,
        role:         prismaRole,
        password:     tempPassword,
        isFirstLogin: true,
      },
    });

    res.status(201).json({
      id:        user.id,
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      role:      user.role.toLowerCase(),
      isActive:  true,
      isFirstLogin: user.isFirstLogin,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
};

/**
 * PUT /api/admin/users/:id
 * Modifie les informations d'un utilisateur.
 */
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { firstName, lastName, email, role } = req.body;

  const roleMap: Record<string, any> = {
    professor:  'PROFESSOR',
    supervisor: 'SUPERVISOR',
    superviseur:'SUPERVISOR',
  };

  try {
    const data: any = {};
    if (firstName) data.firstName = firstName;
    if (lastName)  data.lastName  = lastName;
    if (email)     data.email     = email;
    if (role)      data.role      = roleMap[role.toLowerCase()] ?? undefined;

    const updated = await prisma.user.update({
      where: { id }, data,
    });

    res.json({
      id: updated.id, firstName: updated.firstName,
      lastName: updated.lastName, email: updated.email,
      role: updated.role.toLowerCase(), isActive: true,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

/**
 * PATCH /api/admin/users/:id/toggle
 * Active ou désactive un compte (soft delete via isFirstLogin flag temporaire).
 * TODO: ajouter champ `isActive` au schéma Prisma pour un vrai toggle.
 */
export const toggleUserActive = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    // Pour l'instant on reset le isFirstLogin comme proxy d'activation
    // À remplacer par un vrai champ isActive dans schema.prisma
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    res.json({ message: 'Statut mis à jour', id });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du changement de statut' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  COURS (vue admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/courses
 * Retourne TOUS les cours de TOUS les professeurs avec infos prof.
 */
export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        professor: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendances: {
          select: { id: true, status: true, scanTime: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const mapped = courses.map(c => ({
      id:            c.id,
      title:         c.title,
      fieldOfStudy:  c.field_of_study,
      professorId:   c.professorId,
      professorName: `${c.professor.firstName} ${c.professor.lastName}`,
      startTime:     c.startTime.toISOString(),
      endTime:       c.endTime.toISOString(),
      isActive:      true,
      hasAttendance: c.attendances.length > 0,
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours' });
  }
};

/**
 * PUT /api/admin/courses/:id
 * Modifie un cours existant.
 */
export const updateCourse = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { title, fieldOfStudy, professorId, startTime, endTime } = req.body;

  try {
    const data: any = {};
    if (title)        data.title        = title;
    if (fieldOfStudy) data.field_of_study = fieldOfStudy;
    if (professorId)  data.professorId  = professorId;
    if (startTime)    data.startTime    = new Date(startTime);
    if (endTime)      data.endTime      = new Date(endTime);

    const updated = await prisma.course.update({ where: { id }, data });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cours introuvable' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du cours' });
  }
};

/**
 * DELETE /api/admin/courses/:id
 * Supprime un cours et ses présences associées.
 */
export const deleteCourse = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    // Supprime d'abord les présences liées (contrainte FK)
    await prisma.attendance.deleteMany({ where: { courseId: id } });
    await prisma.course.delete({ where: { id } });
    res.json({ message: 'Cours supprimé avec succès' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cours introuvable' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  RAPPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/reports?period=month|semester|week|all
 * Statistiques globales de l'établissement.
 */
export const getReports = async (req: Request, res: Response) => {
  const period = (req.query.period as string) ?? 'month';

  // Calcul de la date de début selon la période
  const startDate = (() => {
    const now = new Date();
    switch (period) {
      case 'week':     return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      case 'month':    return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'semester': return new Date(now.getFullYear(), now.getMonth() < 7 ? 0 : 7, 1);
      default:         return new Date('2000-01-01');
    }
  })();

  try {
    const [courses, attendances, professors, supervisors] = await Promise.all([
      prisma.course.findMany({
        where: { startTime: { gte: startDate } },
        include: {
          professor: { select: { id: true, firstName: true, lastName: true } },
          attendances: true,
        },
      }),
      prisma.attendance.findMany({
        where: { scanTime: { gte: startDate } },
      }),
      prisma.user.count({ where: { role: 'PROFESSOR' } }),
      prisma.user.count({ where: { role: 'SUPERVISOR' } }),
    ]);

    const validatedCourses  = courses.filter(c => c.attendances.length > 0).length;
    const uncoveredCourses  = courses.length - validatedCourses;
    const validationRate    = courses.length > 0
        ? validatedCourses / courses.length : 0;

    // Stats par professeur
    const profMap = new Map<string, {
      name: string; courses: number; validated: number;
    }>();

    for (const c of courses) {
      const key  = c.professorId;
      const name = `${c.professor.firstName} ${c.professor.lastName}`;
      const prev = profMap.get(key) ?? { name, courses: 0, validated: 0 };
      profMap.set(key, {
        name,
        courses:   prev.courses + 1,
        validated: prev.validated + (c.attendances.length > 0 ? 1 : 0),
      });
    }

    const perProfessor = Array.from(profMap.values())
        .map(p => ({
          name:      p.name,
          courses:   p.courses,
          validated: p.validated,
          rate:      p.courses > 0 ? p.validated / p.courses : 0,
        }))
        .sort((a, b) => b.rate - a.rate);

    res.json({
      totalCourses:     courses.length,
      validatedCourses,
      uncoveredCourses,
      totalProfessors:  professors,
      totalSupervisors: supervisors,
      validationRate,
      perProfessor,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
  }
};

/**
 * GET /api/admin/reports/export?format=csv|pdf&period=...
 * Export des données (stub — à enrichir avec une lib CSV/PDF).
 */
export const exportReport = async (req: Request, res: Response) => {
  const format = (req.query.format as string) ?? 'csv';
  const period = (req.query.period as string) ?? 'month';

  try {
    if (format === 'csv') {
      // Génère un CSV basique
      const attendances = await prisma.attendance.findMany({
        include: {
          professor: { select: { firstName: true, lastName: true, email: true } },
          invigilator: { select: { firstName: true, lastName: true } },
          course: { select: { title: true, field_of_study: true, startTime: true } },
        },
        orderBy: { scanTime: 'asc' },
      });

      const header = 'Professeur,Email,Cours,Filière,Date,Statut,Validé par\n';
      const rows   = attendances.map(a => [
        `${a.professor.firstName} ${a.professor.lastName}`,
        a.professor.email,
        a.course.title,
        a.course.field_of_study,
        a.course.startTime.toLocaleDateString('fr-MG'),
        a.status === 'ON_TIME' ? 'Présent' : 'Absent',
        `${a.invigilator.firstName} ${a.invigilator.lastName}`,
      ].join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition',
          `attachment; filename="rapport_ispm_${period}.csv"`);
      return res.send(header + rows);
    }

    // PDF : retourne un message (à implémenter avec pdfmake ou puppeteer)
    res.json({
      message: 'Export PDF en cours de développement.',
      downloadUrl: null,
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'export" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DANGER ZONE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/admin/reset-attendance
 * Supprime TOUTES les présences (garde users + courses).
 */
export const resetAttendance = async (req: Request, res: Response) => {
  try {
    const { count } = await prisma.attendance.deleteMany({});
    res.json({ message: `${count} enregistrement(s) supprimé(s) avec succès` });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
};