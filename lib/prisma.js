// lib/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

export const prisma = 
  globalForPrisma.prisma || 
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Implement proper connection handling
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;