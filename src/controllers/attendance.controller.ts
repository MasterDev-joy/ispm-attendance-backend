// src/controllers/attendance.controller.ts
import { Request, Response } from 'express';
import { Status } from '@prisma/client';
import prisma from '../config/prisma.js';
import { verifyDynamicToken } from '../utils/qrCode.util.js';

export const validatePresence = async (req: Request, res: Response) => {
  try {
    const { token, professorId, courseId } = req.body;
    const invigilatorId = (req as any).user.id;

    // 1. Validation des champs
    if (!token || !professorId || !courseId) {
      return res.status(400).json({ error: 'token, professorId et courseId sont requis.' });
    }

    // 2. Vérification temporelle du token (tolérance 30s)
    // ✅ Le token a pu être hexadécimal invalide — on protège le timingSafeEqual
    let isValidToken = false;
    try {
      isValidToken = verifyDynamicToken(token, professorId, courseId);
    } catch {
      return res.status(400).json({ error: 'Format de token invalide.' });
    }

    if (!isValidToken) {
      return res.status(400).json({ error: 'Le code QR a expiré ou est invalide.' });
    }

    // 3. Récupération des infos du professeur
    const professor = await prisma.user.findUnique({
      where: { id: professorId },
      select: { firstName: true, lastName: true, profilePicture: true }
    });

    if (!professor) {
      return res.status(404).json({ error: 'Professeur non trouvé.' });
    }

    // 4. Enregistrement de la présence
    // ✅ La contrainte @@unique([professorId, courseId]) dans Prisma empêche le double enregistrement
    const attendance = await prisma.attendance.create({
      data: {
        professorId,
        courseId,
        invigilatorId,
        status: Status.ON_TIME,
      },
    });

    return res.status(201).json({
      message: 'Présence validée avec succès',
      professor: `${professor.firstName} ${professor.lastName}`,
      profilePicture: professor.profilePicture,
      attendance,
    });

  } catch (error: any) {
    // ✅ P2002 = violation de contrainte unique Prisma (présence déjà enregistrée)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'La présence pour ce cours a déjà été enregistrée.' });
    }
    console.error('[validatePresence]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};
