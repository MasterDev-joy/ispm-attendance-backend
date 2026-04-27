import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js'; // Notez le .js requis en mode ESM

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('❌ FATAL: JWT_SECRET est absent du fichier .env. Le serveur ne peut pas démarrer.');
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: "Identifiants invalides" });

    // Génération du Token JWT contenant l'ID et le rôle [cite: 12, 46]
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isFirstLogin: user.isFirstLogin // Pour forcer le changement au premier login [cite: 11, 37]
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { newPassword } = req.body;
  const userId = (req as any).user.id; // Récupéré depuis le token JWT par le middleware [cite: 188]

  try {
    // 1. Hasher le nouveau mot de passe 
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 2. Mettre à jour l'utilisateur dans la base de données [cite: 39]
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        isFirstLogin: false // Désactive l'obligation de changement 
      }
    });

    res.json({ message: "Mot de passe mis à jour avec succès. Vous pouvez maintenant accéder à l'application." });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du mot de passe." });
  }
};