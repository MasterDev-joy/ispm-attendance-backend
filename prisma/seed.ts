import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // 0. GRAND NETTOYAGE (Reset total de la base de données)
  // On supprime d'abord les cours, puis les utilisateurs pour éviter les conflits
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  console.log('🧹 Base de données vidée !');

  // 1. Création de l'Administrateur
  await prisma.user.upsert({
    where: { email: 'admin@ispm.com' },
    update: {},
    create: {
      email: 'admin@ispm.com',
      password,
      firstName: 'Directeur',
      lastName: 'Général',
      role: 'ADMIN',
      isFirstLogin: true,
    },
  });

  // 2. Création du Professeur [cite: 33, 35]
  const prof = await prisma.user.upsert({
    where: { email: 'prof@ispm.com' },
    update: {},
    create: {
      email: 'prof@ispm.com',
      password,
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'PROFESSOR',
      isFirstLogin: true,
    },
  });

  // 3. Création du Surveillant [cite: 133, 153]
  await prisma.user.upsert({
    where: { email: 'surveillant@ispm.com' },
    update: {},
    create: {
      email: 'surveillant@ispm.com',
      password,
      firstName: 'Marc',
      lastName: 'Vigil',
      role: 'SUPERVISOR',
      isFirstLogin: true,
    },
  });

 // 4. Création d'un cours de test
  await prisma.course.create({
    data: {
      title: 'Algorithmique Avancée',
      field_of_study: 'Informatique',
      startTime: new Date('2026-09-01T08:00:00Z'), // Début à 08h00
      endTime: new Date('2026-09-01T10:00:00Z'),   // Fin à 10h00
      professorId: prof.id,
    },
  });

  console.log('✅ Base de données initialisée avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });