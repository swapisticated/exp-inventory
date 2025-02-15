// lib/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
globalForPrisma.prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = globalForPrisma.prisma;

export const prisma = globalForPrisma.prisma;
export default prisma;