// src/controllers/qr.controller.ts
import { Request, Response } from 'express';
import { generateDynamicToken } from '../utils/qrCode.util.js';
import prisma from '../config/prisma.js';

/**
 * ✅ NOUVEAU : Le token QR est généré UNIQUEMENT côté backend.
 * Le client Flutter appelle cette route toutes les 15 secondes.
 * Le secret HMAC ne quitte jamais le serveur.
 *
 * Sécurité : seul un professeur authentifié (JWT) peut appeler cette route.
 */
export const getQrToken = async (req: Request, res: Response) => {
  const professorId = (req as any).user.id;
  const courseId = req.params.courseId as string;

  if (!courseId) {
    return res.status(400).json({ error: 'courseId est requis.' });
  }
  
  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course) {
    return res.status(404).json({ error: 'Cours non trouvé.' });
  }

  if (new Date() > course.endTime) {
    return res.status(403).json({ error: 'Ce cours est terminé. Aucun QR ne peut être généré.' });
  }

  // Optionnel : vérifier que le professeur est bien titulaire du cours
  // (ajout possible avec un appel Prisma ici)

  const token = generateDynamicToken(professorId, courseId);

  // On renvoie le payload complet que le QR Code devra encoder
  // Format : "token|professorId|courseId"
  const qrPayload = `${token}|${professorId}|${courseId}`;

  return res.json({ qrPayload });
};