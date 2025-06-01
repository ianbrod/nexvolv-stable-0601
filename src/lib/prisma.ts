import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Add logging to track Prisma initialization
console.log('Initializing PrismaClient...');

export const prisma =
  global.prisma ||
  new PrismaClient({
    // Enable logs for debugging
    log: ['query', 'info', 'warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  console.log('Development environment: Storing PrismaClient in global scope');
  global.prisma = prisma;
}

// Test connection
prisma.$connect()
  .then(() => console.log('PrismaClient connected successfully'))
  .catch(e => console.error('PrismaClient connection failed:', e));
