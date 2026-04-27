import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('❌ FATAL: JWT_SECRET est absent du fichier .env. Le serveur ne peut pas démarrer.');
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format "Bearer TOKEN" [cite: 125]

  if (!token) return res.status(401).json({ error: "Accès refusé" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Token invalide" });
    (req as any).user = user;
    next();
  });
};