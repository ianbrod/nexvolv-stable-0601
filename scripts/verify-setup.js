const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Verify Setup Script
 * 
 * This script verifies that the database is properly set up and seeded.
 */

async function verifySetup() {
  try {
    console.log('🔍 Verifying database setup...');
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: 'user_placeholder' }
    });
    
    if (!user) {
      console.log('❌ Test user not found');
      return false;
    }
    console.log(`✅ Test user found: ${user.email}`);
    
    // Count records
    const counts = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      goals: await prisma.goal.count(),
      tasks: await prisma.task.count(),
      reminders: await prisma.reminder.count(),
    };
    
    console.log('📊 Database contents:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} records`);
    });
    
    // Check relationships
    const categoriesWithGoals = await prisma.category.findMany({
      include: {
        goals: true,
        _count: {
          select: { goals: true }
        }
      }
    });
    
    console.log('🔗 Category relationships:');
    categoriesWithGoals.forEach(category => {
      console.log(`  - ${category.name}: ${category._count.goals} goals`);
    });
    
    console.log('🎉 Database verification completed successfully!');
    console.log('');
    console.log('Your database is ready for development.');
    console.log('Start the server with: npm run dev');
    
    return true;
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    return false;
  }
}

verifySetup()
  .then((success) => {
    if (!success) {
      console.log('');
      console.log('💡 Try running: npm run db:reset');
      process.exit(1);
    }
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
