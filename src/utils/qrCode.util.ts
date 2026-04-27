import crypto from 'crypto';

// ✅ Le secret est uniquement lu depuis les variables d'environnement
// Il ne doit JAMAIS être hardcodé ici ni connu du client Flutter
const QR_SECRET = process.env.QR_SECRET;

if (!QR_SECRET) {
  throw new Error('❌ FATAL: QR_SECRET est absent du fichier .env. Le serveur ne peut pas démarrer.');
}

/**
 * Génère un token HMAC-SHA256 dynamique pour un professeur et un cours donnés.
 * Le compteur change toutes les 15 secondes, rendant le token temporaire.
 */
export const generateDynamicToken = (professorId: string, courseId: string): string => {
  const counter = Math.floor(Date.now() / 15000);
  return crypto
    .createHmac('sha256', QR_SECRET!)
    .update(`${professorId}-${courseId}-${counter}`)
    .digest('hex');
};

/**
 * Vérifie un token reçu en acceptant une tolérance de ±1 tranche (±15s)
 * pour compenser les légers décalages d'horloge entre client et serveur.
 */
export const verifyDynamicToken = (token: string, professorId: string, courseId: string): boolean => {
  const currentCounter = Math.floor(Date.now() / 15000);

  // On vérifie la tranche courante ET les deux tranches précédentes (tolérance 30s)
  for (let i = 0; i >= -2; i--) {
    const expectedToken = crypto
      .createHmac('sha256', QR_SECRET!)
      .update(`${professorId}-${courseId}-${currentCounter + i}`)
      .digest('hex');

    // ✅ Comparaison résistante aux attaques temporelles (timing attack)
    if (crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expectedToken, 'hex'))) {
      return true;
    }
  }

  return false;
};
