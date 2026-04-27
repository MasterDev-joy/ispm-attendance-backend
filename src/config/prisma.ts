import { PrismaClient } from '@prisma/client';

// Crée une instance unique de PrismaClient
const prisma = new PrismaClient();

export default prisma;