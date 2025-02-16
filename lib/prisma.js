// lib/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

export const prisma = 
  globalForPrisma.prisma || 
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;