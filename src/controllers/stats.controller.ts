// src/controllers/stats.controller.ts
//
// Contrôleur Statistiques — adapté au rôle de l'utilisateur connecté.
//   • PROFESSOR  → ses cours + taux de présence de chaque cours
//   • INVIGILATOR → ses scans effectués + taux de couverture
//   • ADMIN      → vue globale (délégué à admin.controller)
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// ── Helper : calcul de la date de début selon la période ─────────────────────

function periodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'week':     return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    case 'month':    return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'semester': return new Date(now.getFullYear(), now.getMonth() < 7 ? 0 : 7, 1);
    default:         return new Date('2000-01-01');
  }
}

// ── Contrôleur principal ─────────────────────────────────────────────────────

export const getStats = async (req: Request, res: Response) => {
  const userId = (req as any).user.id   as string;
  const role   = (req as any).user.role as string; // 'PROFESSOR' | 'INVIGILATOR' | 'ADMIN'
  const period = (req.query.period as string) ?? 'month';
  const start  = periodStart(period);

  try {
    switch (role) {
      case 'PROFESSOR':  return await _professorStats(res, userId, start, period);
      case 'INVIGILATOR':return await _supervisorStats(res, userId, start, period);
      case 'ADMIN':      return await _adminStats(res, start, period);
      default:           return res.status(403).json({ error: 'Accès refusé' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
};

// ── Stats Professeur ─────────────────────────────────────────────────────────

async function _professorStats(
  res: Response, professorId: string, start: Date, period: string
) {
  const courses = await prisma.course.findMany({
    where: {
      professorId,
      startTime: { gte: start, lte: new Date() }, // Cours passés uniquement
    },
    include: { attendances: true },
    orderBy: { startTime: 'asc' },
  });

  const perCourse = courses.map(c => {
    const present = c.attendances.filter(a => a.status === 'ON_TIME').length;
    const absent  = c.attendances.filter(a => a.status === 'ABSENT').length;
    const total   = c.attendances.length;
    const rate    = total > 0 ? present / total : 0;

    return {
      courseId:     c.id,
      courseTitle:  c.title,
      fieldOfStudy: c.field_of_study,
      presenceRate: rate,
      presentCount: present,
      absentCount:  absent,
      totalSessions:total,
      risk:         rate >= 0.80 ? 'good' : rate >= 0.60 ? 'warning' : 'critical',
    };
  });

  const totalPresent = perCourse.reduce((s, c) => s + c.presentCount, 0);
  const totalAbsent  = perCourse.reduce((s, c) => s + c.absentCount, 0);
  const totalSess    = perCourse.reduce((s, c) => s + c.totalSessions, 0);
  const globalRate   = totalSess > 0 ? totalPresent / totalSess : 0;

  // Cours les plus manqués
  const mostMissed = [...perCourse]
    .filter(c => c.absentCount > 0)
    .sort((a, b) => (b.absentCount / b.totalSessions) - (a.absentCount / a.totalSessions))
    .slice(0, 5)
    .map(c => ({
      courseTitle:  c.courseTitle,
      fieldOfStudy: c.fieldOfStudy,
      absenceCount: c.absentCount,
      absenceRate:  c.totalSessions > 0 ? c.absentCount / c.totalSessions : 0,
    }));

  res.json({
    role:   'professor',
    period,
    globalPresenceRate: globalRate,
    presentCount:  totalPresent,
    absentCount:   totalAbsent,
    totalSessions: totalSess,
    perCourse,
    mostMissed,
  });
}

// ── Stats Superviseur ─────────────────────────────────────────────────────────

async function _supervisorStats(
  res: Response, invigilatorId: string, start: Date, period: string
) {
  const scans = await prisma.attendance.findMany({
    where: {
      invigilatorId,
      scanTime: { gte: start },
    },
    include: {
      course: {
        select: { id: true, title: true, field_of_study: true },
      },
    },
    orderBy: { scanTime: 'asc' },
  });

  // Tous les cours de la période (pour calculer le taux de couverture)
  const allCourses = await prisma.course.findMany({
    where: { endTime: { gte: start, lte: new Date() } },
    select: { id: true },
  });

  const coveredIds = new Set(scans.map(s => s.courseId));
  const covered    = allCourses.filter(c => coveredIds.has(c.id)).length;
  const total      = allCourses.length;
  const rate       = total > 0 ? covered / total : 0;

  // Regrouper par cours
  const courseMap = new Map<string, {
    courseTitle: string; fieldOfStudy: string;
    presenceRate: number; presentCount: number;
    absentCount: number; totalSessions: number;
    risk: string;
  }>();

  for (const s of scans) {
    const key  = s.courseId;
    const prev = courseMap.get(key) ?? {
      courseTitle:   s.course.title,
      fieldOfStudy:  s.course.field_of_study,
      presenceRate:  0, presentCount: 0,
      absentCount:   0, totalSessions: 0, risk: 'good',
    };
    const isPresent = s.status === 'ON_TIME';
    const updated   = {
      ...prev,
      presentCount:  prev.presentCount  + (isPresent ? 1 : 0),
      absentCount:   prev.absentCount   + (isPresent ? 0 : 1),
      totalSessions: prev.totalSessions + 1,
    };
    updated.presenceRate = updated.presentCount / updated.totalSessions;
    updated.risk = updated.presenceRate >= 0.80 ? 'good'
        : updated.presenceRate >= 0.60 ? 'warning' : 'critical';
    courseMap.set(key, updated);
  }

  const perCourse = Array.from(courseMap.values());

  res.json({
    role:   'supervisor',
    period,
    globalPresenceRate: rate,
    presentCount:  covered,
    absentCount:   total - covered,
    totalSessions: total,
    perCourse,
    mostMissed: [],
  });
}

// ── Stats Admin (globales) ────────────────────────────────────────────────────

async function _adminStats(res: Response, start: Date, period: string) {
  const [courses, attendances] = await Promise.all([
    prisma.course.findMany({
      where: { endTime: { gte: start, lte: new Date() } },
      include: { attendances: true, professor: {
        select: { firstName: true, lastName: true },
      }},
    }),
    prisma.attendance.findMany({
      where: { scanTime: { gte: start } },
    }),
  ]);

  const validated = courses.filter(c => c.attendances.length > 0).length;
  const rate      = courses.length > 0 ? validated / courses.length : 0;

  const perCourse = courses.map(c => {
    const present = c.attendances.filter(a => a.status === 'ON_TIME').length;
    const absent  = c.attendances.filter(a => a.status === 'ABSENT').length;
    const total   = c.attendances.length;
    const r       = total > 0 ? present / total : 0;
    return {
      courseId:      c.id,
      courseTitle:   c.title,
      fieldOfStudy:  c.field_of_study,
      presenceRate:  r,
      presentCount:  present,
      absentCount:   absent,
      totalSessions: total,
      risk: r >= 0.80 ? 'good' : r >= 0.60 ? 'warning' : 'critical',
    };
  });

  res.json({
    role:   'admin',
    period,
    globalPresenceRate: rate,
    presentCount:  validated,
    absentCount:   courses.length - validated,
    totalSessions: courses.length,
    perCourse,
    mostMissed: [],
  });
}