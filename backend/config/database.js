const { PrismaClient } = require('@prisma/client');

// Create Prisma Client instance
const prisma = new PrismaClient({
  log: ['error', 'warn'], // Reduced logging to avoid spam
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
