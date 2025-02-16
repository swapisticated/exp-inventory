// lib/prisma.js
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'production' 
          ? process.env.DIRECT_URL  // Use direct connection in production
          : process.env.DATABASE_URL // Use pooled connection in development
      }
    }
  });
};

const globalForPrisma = global;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;