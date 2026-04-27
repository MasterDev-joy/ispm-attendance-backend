// src/middlewares/role.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * ✅ Middleware de contrôle de rôle.
 * À utiliser APRÈS authenticateToken pour restreindre l'accès par rôle.
 *
 * Exemple : router.get('/...', authenticateToken, requireRole('PROFESSOR'), handler)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Accès refusé. Rôle requis : ${allowedRoles.join(' ou ')}.`
      });
    }

    next();
  };
};