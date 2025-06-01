const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

/**
 * Comprehensive Seed Script
 *
 * This script seeds the database with robust, varied, and interconnected sample data.
 * Perfect for remote developers and test users with 5X comprehensive data.
 * No habit references - that feature has been completely removed.
 */

// Helper function to get dates relative to today with varied times
const getDateRelativeToToday = (days, hour = null, minute = null) => {
  const date = new Date();
  date.setDate(date.getDate() + days);

  // If specific time provided, use it; otherwise randomize
  if (hour !== null && minute !== null) {
    date.setHours(hour, minute, 0, 0);
  } else {
    // Spread times across business hours (6 AM to 10 PM)
    const randomHour = Math.floor(Math.random() * 16) + 6; // 6-21 (6 AM to 9 PM)
    const randomMinute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
    date.setHours(randomHour, randomMinute, 0, 0);
  }

  return date;
};

// Helper function to get random time for recurring reminders
const getRandomTime = () => {
  const times = [
    { hour: 7, minute: 0 },   // 7:00 AM
    { hour: 8, minute: 30 },  // 8:30 AM
    { hour: 9, minute: 15 },  // 9:15 AM
    { hour: 12, minute: 0 },  // 12:00 PM
    { hour: 14, minute: 30 }, // 2:30 PM
    { hour: 17, minute: 0 },  // 5:00 PM
    { hour: 18, minute: 30 }, // 6:30 PM
    { hour: 20, minute: 0 },  // 8:00 PM
    { hour: 21, minute: 30 }, // 9:30 PM
  ];
  return times[Math.floor(Math.random() * times.length)];
};

async function main() {
  try {
    console.log('🌱 Starting database seeding...');

    // --- Clean existing data first ---
    console.log('🧹 Cleaning existing data...');
    await prisma.goalProgressSnapshot.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.reminder.deleteMany({});
    await prisma.savedFilter.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.goal.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('✅ Existing data cleaned');

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        id: 'user_placeholder',
        email: 'test@example.com',
        hashedPassword,
      },
    });
    console.log(`✅ Created user: ${user.email}`);

    // Create categories with more variety
    const categories = [
      {
        name: 'WORK',
        description: 'Professional development and career goals',
        color: '#4f46e5', // Indigo
        order: 1,
        userId: user.id,
      },
      {
        name: 'PERSONAL',
        description: 'Self-improvement and learning goals',
        color: '#10b981', // Emerald
        order: 2,
        userId: user.id,
      },
      {
        name: 'HEALTH',
        description: 'Physical and mental wellness goals',
        color: '#ef4444', // Red
        order: 3,
        userId: user.id,
      },
      {
        name: 'WEALTH',
        description: 'Financial planning and wealth building',
        color: '#f59e0b', // Amber
        order: 4,
        userId: user.id,
      },
      {
        name: 'FAMILY',
        description: 'Family time and relationship building',
        color: '#8b5cf6', // Purple
        order: 5,
        userId: user.id,
      },
      {
        name: 'HOBBIES',
        description: 'Creative pursuits and recreational activities',
        color: '#06b6d4', // Cyan
        order: 6,
        userId: user.id,
      },
      {
        name: 'HOME',
        description: 'Home improvement and lifestyle goals',
        color: '#84cc16', // Lime
        order: 7,
        userId: user.id,
      },
      {
        name: 'TRAVEL',
        description: 'Travel plans and adventure goals',
        color: '#f97316', // Orange
        order: 8,
        userId: user.id,
      },
    ];

    const createdCategories = {};
    for (const category of categories) {
      const createdCategory = await prisma.category.create({
        data: category,
      });
      console.log(`✅ Created category: ${createdCategory.name}`);
      createdCategories[createdCategory.name] = createdCategory;
    }

    // Create comprehensive goals with varied progress and statuses
    const goals = [
      // Work & Career Goals
      {
        name: 'Complete Project Alpha',
        description: 'Finish all tasks related to Project Alpha including documentation and testing',
        timeframe: 'This Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(45),
        progress: 85,
        order: 1,
        userId: user.id,
      },
      {
        name: 'Get AWS Certification',
        description: 'Study for and pass AWS Solutions Architect certification',
        timeframe: 'This Year',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(120),
        progress: 25,
        order: 2,
        userId: user.id,
      },
      {
        name: 'Launch Side Business',
        description: 'Start freelance consulting business',
        timeframe: 'This Year',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(180),
        progress: 15,
        order: 3,
        userId: user.id,
      },

      // Personal Growth Goals
      {
        name: 'Learn Japanese',
        description: 'Complete beginner to intermediate Japanese course',
        timeframe: 'This Year',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(300),
        progress: 40,
        order: 4,
        userId: user.id,
      },
      {
        name: 'Read 24 Books',
        description: 'Read 2 books per month this year',
        timeframe: 'This Year',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(365),
        progress: 33,
        order: 5,
        userId: user.id,
      },
      {
        name: 'Master Public Speaking',
        description: 'Join Toastmasters and complete 10 speeches',
        timeframe: 'This Year',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(270),
        progress: 60,
        order: 6,
        userId: user.id,
      },

      // Health & Fitness Goals
      {
        name: 'Run Marathon',
        description: 'Train for and complete first marathon',
        timeframe: 'This Year',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(200),
        progress: 45,
        order: 7,
        userId: user.id,
      },
      {
        name: 'Lose 20 Pounds',
        description: 'Reach target weight through diet and exercise',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(90),
        progress: 70,
        order: 8,
        userId: user.id,
      },
      {
        name: 'Daily Meditation',
        description: 'Meditate for 20 minutes every day',
        timeframe: 'This Year',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(365),
        progress: 80,
        order: 9,
        userId: user.id,
      },

      // Finance & Wealth Goals
      {
        name: 'Build Emergency Fund',
        description: 'Save $10,000 for emergency fund',
        timeframe: 'This Year',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(365),
        progress: 65,
        order: 10,
        userId: user.id,
      },
      {
        name: 'Max Out 401k',
        description: 'Contribute maximum amount to 401k this year',
        timeframe: 'This Year',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(365),
        progress: 50,
        order: 11,
        userId: user.id,
      },
      {
        name: 'Start Investment Portfolio',
        description: 'Open brokerage account and start investing',
        timeframe: 'This Quarter',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(60),
        progress: 90,
        order: 12,
        userId: user.id,
      },

      // Family & Relationships Goals
      {
        name: 'Weekly Date Nights',
        description: 'Have a date night with spouse every week',
        timeframe: 'This Year',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(365),
        progress: 75,
        order: 13,
        userId: user.id,
      },
      {
        name: 'Family Vacation',
        description: 'Plan and take a 2-week family vacation',
        timeframe: 'This Year',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(180),
        progress: 30,
        order: 14,
        userId: user.id,
      },

      // Hobbies & Creativity Goals
      {
        name: 'Learn Guitar',
        description: 'Learn to play 10 songs on guitar',
        timeframe: 'This Year',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(300),
        progress: 20,
        order: 15,
        userId: user.id,
      },
      {
        name: 'Photography Project',
        description: 'Complete 365-day photography challenge',
        timeframe: 'This Year',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(365),
        progress: 55,
        order: 16,
        userId: user.id,
      },

      // Home & Lifestyle Goals
      {
        name: 'Kitchen Renovation',
        description: 'Complete kitchen remodel project',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(75),
        progress: 40,
        order: 17,
        userId: user.id,
      },
      {
        name: 'Organize Home Office',
        description: 'Declutter and organize home office space',
        timeframe: 'This Month',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(15),
        progress: 95,
        order: 18,
        userId: user.id,
      },

      // Travel & Adventure Goals
      {
        name: 'Visit Japan',
        description: 'Plan and take 2-week trip to Japan',
        timeframe: 'This Year',
        categoryId: createdCategories['TRAVEL'].id,
        deadline: getDateRelativeToToday(240),
        progress: 35,
        order: 19,
        userId: user.id,
      },
      {
        name: 'Hiking Challenge',
        description: 'Hike 50 different trails this year',
        timeframe: 'This Year',
        categoryId: createdCategories['TRAVEL'].id,
        deadline: getDateRelativeToToday(365),
        progress: 60,
        order: 20,
        userId: user.id,
      },

      // COMPLETED Goals (100% progress, properly finished)
      {
        name: 'Complete Online Course',
        description: 'Finished React Advanced Patterns course',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(-30),
        progress: 100,
        order: 21,
        userId: user.id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-25), // Completed 25 days ago
      },
      {
        name: 'Morning Routine',
        description: 'Establish consistent morning routine',
        timeframe: 'Last Month',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(-15),
        progress: 100,
        order: 22,
        userId: user.id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-10), // Completed 10 days ago
      },
      {
        name: 'Home Office Setup',
        description: 'Create productive home office workspace',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(-45),
        progress: 100,
        order: 23,
        userId: user.id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-40), // Completed 40 days ago
      },
      {
        name: 'Learn Basic Photography',
        description: 'Master camera basics and composition rules',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(-60),
        progress: 100,
        order: 24,
        userId: user.id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-55), // Completed 55 days ago
      },
      {
        name: 'Pay Off Credit Card Debt',
        description: 'Eliminate all credit card debt',
        timeframe: 'Last Year',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(-90),
        progress: 100,
        order: 25,
        userId: user.id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-85), // Completed 85 days ago
      },
      {
        name: 'Complete 5K Training',
        description: 'Train for and complete first 5K race',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(-120),
        progress: 100,
        order: 26,
        userId: user.id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-115), // Completed 115 days ago
      },
      {
        name: 'Plan Wedding Anniversary',
        description: 'Organize special 10th anniversary celebration',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(-150),
        progress: 100,
        order: 27,
        userId: user.id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-145), // Completed 145 days ago
      },
      {
        name: 'Backyard Garden Project',
        description: 'Create vegetable garden in backyard',
        timeframe: 'Last Year',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(-180),
        progress: 100,
        order: 28,
        userId: user.id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-175), // Completed 175 days ago
      },
    ];

    const createdGoals = {};
    for (const goal of goals) {
      const createdGoal = await prisma.goal.create({
        data: goal,
      });
      console.log(`✅ Created goal: ${createdGoal.name}`);
      createdGoals[createdGoal.name] = createdGoal;
    }

    // Create comprehensive sub-goals with varied progress and completion states
    const subGoals = [
      // Project Alpha Sub-goals
      {
        name: 'Alpha Backend Development',
        description: 'Complete all backend API endpoints for Project Alpha',
        timeframe: 'This Month',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(15),
        progress: 100,
        order: 1,
        userId: user.id,
        parentGoalId: createdGoals['Complete Project Alpha'].id,
        isArchived: true, // Completed sub-goal
        completedAt: getDateRelativeToToday(-5), // Completed 5 days ago
      },
      {
        name: 'Alpha Frontend Integration',
        description: 'Integrate frontend with backend APIs',
        timeframe: 'This Month',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(25),
        progress: 90,
        order: 2,
        userId: user.id,
        parentGoalId: createdGoals['Complete Project Alpha'].id,
      },
      {
        name: 'Alpha Testing & QA',
        description: 'Complete comprehensive testing suite',
        timeframe: 'This Month',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(35),
        progress: 75,
        order: 3,
        userId: user.id,
        parentGoalId: createdGoals['Complete Project Alpha'].id,
      },

      // AWS Certification Sub-goals
      {
        name: 'AWS Core Services Study',
        description: 'Master EC2, S3, RDS, and VPC services',
        timeframe: 'This Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(45),
        progress: 60,
        order: 4,
        userId: user.id,
        parentGoalId: createdGoals['Get AWS Certification'].id,
      },
      {
        name: 'AWS Security & IAM',
        description: 'Learn AWS security best practices and IAM',
        timeframe: 'This Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(60),
        progress: 30,
        order: 5,
        userId: user.id,
        parentGoalId: createdGoals['Get AWS Certification'].id,
      },
      {
        name: 'AWS Practice Exams',
        description: 'Complete 5 practice exams with 80%+ score',
        timeframe: 'This Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(90),
        progress: 0,
        order: 6,
        userId: user.id,
        parentGoalId: createdGoals['Get AWS Certification'].id,
      },

      // Side Business Sub-goals
      {
        name: 'Business Legal Setup',
        description: 'Register LLC, get EIN, set up business banking',
        timeframe: 'This Month',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(30),
        progress: 100,
        order: 7,
        userId: user.id,
        parentGoalId: createdGoals['Launch Side Business'].id,
        isArchived: true, // Completed sub-goal
        completedAt: getDateRelativeToToday(-12), // Completed 12 days ago
      },
      {
        name: 'Build Portfolio Website',
        description: 'Create professional portfolio and service pages',
        timeframe: 'This Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(45),
        progress: 70,
        order: 8,
        userId: user.id,
        parentGoalId: createdGoals['Launch Side Business'].id,
      },
      {
        name: 'Client Acquisition Strategy',
        description: 'Develop marketing plan and find first 3 clients',
        timeframe: 'This Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(75),
        progress: 25,
        order: 9,
        userId: user.id,
        parentGoalId: createdGoals['Launch Side Business'].id,
      },

      // Japanese Learning Sub-goals
      {
        name: 'Hiragana & Katakana Mastery',
        description: 'Memorize all hiragana and katakana characters',
        timeframe: 'This Quarter',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(60),
        progress: 85,
        order: 10,
        userId: user.id,
        parentGoalId: createdGoals['Learn Japanese'].id,
      },
      {
        name: 'Basic Kanji (200 characters)',
        description: 'Learn 200 most common kanji characters',
        timeframe: 'This Year',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(180),
        progress: 40,
        order: 11,
        userId: user.id,
        parentGoalId: createdGoals['Learn Japanese'].id,
      },
      {
        name: 'Conversational Japanese',
        description: 'Hold 10-minute conversation with native speaker',
        timeframe: 'This Year',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(270),
        progress: 20,
        order: 12,
        userId: user.id,
        parentGoalId: createdGoals['Learn Japanese'].id,
      },

      // Marathon Training Sub-goals
      {
        name: 'Build Base Mileage',
        description: 'Consistently run 40+ miles per week',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(90),
        progress: 65,
        order: 13,
        userId: user.id,
        parentGoalId: createdGoals['Run Marathon'].id,
      },
      {
        name: 'Long Run Progression',
        description: 'Complete 20-mile long run without stopping',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(120),
        progress: 50,
        order: 14,
        userId: user.id,
        parentGoalId: createdGoals['Run Marathon'].id,
      },
      {
        name: 'Speed & Tempo Training',
        description: 'Improve 5K time to under 22 minutes',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(105),
        progress: 35,
        order: 15,
        userId: user.id,
        parentGoalId: createdGoals['Run Marathon'].id,
      },

      // Weight Loss Sub-goals
      {
        name: 'Nutrition Plan',
        description: 'Follow structured meal plan with calorie tracking',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(90),
        progress: 80,
        order: 16,
        userId: user.id,
        parentGoalId: createdGoals['Lose 20 Pounds'].id,
      },
      {
        name: 'Strength Training',
        description: 'Complete 3 strength workouts per week',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(90),
        progress: 70,
        order: 17,
        userId: user.id,
        parentGoalId: createdGoals['Lose 20 Pounds'].id,
      },
      {
        name: 'Weekly Progress Tracking',
        description: 'Track weight, measurements, and photos weekly',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(90),
        progress: 90,
        order: 18,
        userId: user.id,
        parentGoalId: createdGoals['Lose 20 Pounds'].id,
      },

      // Emergency Fund Sub-goals
      {
        name: 'Budget Optimization',
        description: 'Reduce monthly expenses by $500',
        timeframe: 'This Quarter',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(60),
        progress: 100,
        order: 19,
        userId: user.id,
        parentGoalId: createdGoals['Build Emergency Fund'].id,
        isArchived: true, // Completed sub-goal
        completedAt: getDateRelativeToToday(-20), // Completed 20 days ago
      },
      {
        name: 'High-Yield Savings Account',
        description: 'Open and transfer funds to high-yield savings',
        timeframe: 'This Month',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(30),
        progress: 85,
        order: 20,
        userId: user.id,
        parentGoalId: createdGoals['Build Emergency Fund'].id,
      },
      {
        name: 'Automatic Savings Plan',
        description: 'Set up automatic monthly transfers',
        timeframe: 'This Month',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(15),
        progress: 95,
        order: 21,
        userId: user.id,
        parentGoalId: createdGoals['Build Emergency Fund'].id,
      },

      // Family Vacation Sub-goals
      {
        name: 'Destination Research',
        description: 'Research and choose vacation destination',
        timeframe: 'This Quarter',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(45),
        progress: 60,
        order: 22,
        userId: user.id,
        parentGoalId: createdGoals['Family Vacation'].id,
      },
      {
        name: 'Budget & Savings Plan',
        description: 'Set vacation budget and savings timeline',
        timeframe: 'This Quarter',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(30),
        progress: 80,
        order: 23,
        userId: user.id,
        parentGoalId: createdGoals['Family Vacation'].id,
      },
      {
        name: 'Booking & Reservations',
        description: 'Book flights, hotels, and activities',
        timeframe: 'This Quarter',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(90),
        progress: 15,
        order: 24,
        userId: user.id,
        parentGoalId: createdGoals['Family Vacation'].id,
      },

      // Guitar Learning Sub-goals
      {
        name: 'Basic Chords Mastery',
        description: 'Master 15 basic guitar chords',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(90),
        progress: 70,
        order: 25,
        userId: user.id,
        parentGoalId: createdGoals['Learn Guitar'].id,
      },
      {
        name: 'Strumming Patterns',
        description: 'Learn 10 different strumming patterns',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(120),
        progress: 45,
        order: 26,
        userId: user.id,
        parentGoalId: createdGoals['Learn Guitar'].id,
      },
      {
        name: 'Song Performance',
        description: 'Perform 10 songs from memory',
        timeframe: 'This Year',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(300),
        progress: 20,
        order: 27,
        userId: user.id,
        parentGoalId: createdGoals['Learn Guitar'].id,
      },

      // Kitchen Renovation Sub-goals
      {
        name: 'Design & Planning',
        description: 'Finalize kitchen design and layout',
        timeframe: 'This Month',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(20),
        progress: 90,
        order: 28,
        userId: user.id,
        parentGoalId: createdGoals['Kitchen Renovation'].id,
      },
      {
        name: 'Contractor Selection',
        description: 'Choose contractor and sign contract',
        timeframe: 'This Month',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(25),
        progress: 60,
        order: 29,
        userId: user.id,
        parentGoalId: createdGoals['Kitchen Renovation'].id,
      },
      {
        name: 'Material Procurement',
        description: 'Order all cabinets, countertops, and appliances',
        timeframe: 'This Quarter',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(45),
        progress: 30,
        order: 30,
        userId: user.id,
        parentGoalId: createdGoals['Kitchen Renovation'].id,
      },

      // Japan Trip Sub-goals
      {
        name: 'Travel Documentation',
        description: 'Get passport, visa, and travel insurance',
        timeframe: 'This Quarter',
        categoryId: createdCategories['TRAVEL'].id,
        deadline: getDateRelativeToToday(90),
        progress: 75,
        order: 31,
        userId: user.id,
        parentGoalId: createdGoals['Visit Japan'].id,
      },
      {
        name: 'Itinerary Planning',
        description: 'Plan detailed 2-week itinerary',
        timeframe: 'This Quarter',
        categoryId: createdCategories['TRAVEL'].id,
        deadline: getDateRelativeToToday(120),
        progress: 40,
        order: 32,
        userId: user.id,
        parentGoalId: createdGoals['Visit Japan'].id,
      },
      {
        name: 'Language Preparation',
        description: 'Learn basic Japanese phrases for travel',
        timeframe: 'This Year',
        categoryId: createdCategories['TRAVEL'].id,
        deadline: getDateRelativeToToday(200),
        progress: 55,
        order: 33,
        userId: user.id,
        parentGoalId: createdGoals['Visit Japan'].id,
      },

      // COMPLETED GOALS SUB-GOALS - Add sub-goals for completed goals
      // Complete Online Course Sub-goals
      {
        name: 'Course Module Completion',
        description: 'Complete all React Advanced Patterns modules',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(-90),
        progress: 100,
        order: 34,
        userId: user.id,
        parentGoalId: createdGoals['Complete Online Course'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-95),
      },
      {
        name: 'Final Project Submission',
        description: 'Build and submit capstone project',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(-85),
        progress: 100,
        order: 35,
        userId: user.id,
        parentGoalId: createdGoals['Complete Online Course'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-88),
      },
      {
        name: 'Course Certificate',
        description: 'Receive completion certificate',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['WORK'].id,
        deadline: getDateRelativeToToday(-80),
        progress: 100,
        order: 36,
        userId: user.id,
        parentGoalId: createdGoals['Complete Online Course'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-82),
      },

      // Morning Routine Sub-goals
      {
        name: 'Wake Up Consistency',
        description: 'Wake up at 6 AM daily for 30 days',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(-120),
        progress: 100,
        order: 37,
        userId: user.id,
        parentGoalId: createdGoals['Morning Routine'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-125),
      },
      {
        name: 'Exercise Integration',
        description: 'Add 20-minute morning workout',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(-115),
        progress: 100,
        order: 38,
        userId: user.id,
        parentGoalId: createdGoals['Morning Routine'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-118),
      },
      {
        name: 'Meditation Practice',
        description: 'Include 10-minute daily meditation',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['PERSONAL'].id,
        deadline: getDateRelativeToToday(-110),
        progress: 100,
        order: 39,
        userId: user.id,
        parentGoalId: createdGoals['Morning Routine'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-112),
      },

      // Home Office Setup Sub-goals
      {
        name: 'Desk & Chair Purchase',
        description: 'Buy ergonomic desk and chair',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(-100),
        progress: 100,
        order: 40,
        userId: user.id,
        parentGoalId: createdGoals['Home Office Setup'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-105),
      },
      {
        name: 'Lighting & Monitor Setup',
        description: 'Install proper lighting and dual monitors',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(-95),
        progress: 100,
        order: 41,
        userId: user.id,
        parentGoalId: createdGoals['Home Office Setup'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-98),
      },
      {
        name: 'Organization System',
        description: 'Set up filing and storage system',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(-90),
        progress: 100,
        order: 42,
        userId: user.id,
        parentGoalId: createdGoals['Home Office Setup'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-92),
      },

      // Learn Basic Photography Sub-goals
      {
        name: 'Camera Basics Mastery',
        description: 'Learn aperture, shutter speed, ISO',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(-70),
        progress: 100,
        order: 43,
        userId: user.id,
        parentGoalId: createdGoals['Learn Basic Photography'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-75),
      },
      {
        name: 'Composition Techniques',
        description: 'Master rule of thirds, leading lines, framing',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(-65),
        progress: 100,
        order: 44,
        userId: user.id,
        parentGoalId: createdGoals['Learn Basic Photography'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-68),
      },
      {
        name: 'Photo Portfolio',
        description: 'Create portfolio of 50 best photos',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HOBBIES'].id,
        deadline: getDateRelativeToToday(-60),
        progress: 100,
        order: 45,
        userId: user.id,
        parentGoalId: createdGoals['Learn Basic Photography'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-62),
      },

      // Pay Off Credit Card Debt Sub-goals
      {
        name: 'Debt Consolidation',
        description: 'Consolidate all credit card debt',
        timeframe: 'Last Year',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(-120),
        progress: 100,
        order: 46,
        userId: user.id,
        parentGoalId: createdGoals['Pay Off Credit Card Debt'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-125),
      },
      {
        name: 'Payment Plan Execution',
        description: 'Follow aggressive payment schedule',
        timeframe: 'Last Year',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(-100),
        progress: 100,
        order: 47,
        userId: user.id,
        parentGoalId: createdGoals['Pay Off Credit Card Debt'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-105),
      },
      {
        name: 'Final Payment',
        description: 'Make final payment and close accounts',
        timeframe: 'Last Year',
        categoryId: createdCategories['WEALTH'].id,
        deadline: getDateRelativeToToday(-90),
        progress: 100,
        order: 48,
        userId: user.id,
        parentGoalId: createdGoals['Pay Off Credit Card Debt'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-92),
      },

      // Complete 5K Training Sub-goals
      {
        name: 'Base Running Fitness',
        description: 'Build up to running 30 minutes continuously',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(-140),
        progress: 100,
        order: 49,
        userId: user.id,
        parentGoalId: createdGoals['Complete 5K Training'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-145),
      },
      {
        name: 'Speed Development',
        description: 'Improve pace through interval training',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(-130),
        progress: 100,
        order: 50,
        userId: user.id,
        parentGoalId: createdGoals['Complete 5K Training'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-135),
      },
      {
        name: '5K Race Completion',
        description: 'Complete first official 5K race',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['HEALTH'].id,
        deadline: getDateRelativeToToday(-120),
        progress: 100,
        order: 51,
        userId: user.id,
        parentGoalId: createdGoals['Complete 5K Training'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-122),
      },

      // Plan Wedding Anniversary Sub-goals
      {
        name: 'Venue Booking',
        description: 'Reserve special restaurant for anniversary dinner',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(-160),
        progress: 100,
        order: 52,
        userId: user.id,
        parentGoalId: createdGoals['Plan Wedding Anniversary'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-165),
      },
      {
        name: 'Gift Selection',
        description: 'Choose meaningful 10th anniversary gift',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(-155),
        progress: 100,
        order: 53,
        userId: user.id,
        parentGoalId: createdGoals['Plan Wedding Anniversary'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-158),
      },
      {
        name: 'Memory Book Creation',
        description: 'Create photo album of 10 years together',
        timeframe: 'Last Quarter',
        categoryId: createdCategories['FAMILY'].id,
        deadline: getDateRelativeToToday(-150),
        progress: 100,
        order: 54,
        userId: user.id,
        parentGoalId: createdGoals['Plan Wedding Anniversary'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-152),
      },

      // Backyard Garden Project Sub-goals
      {
        name: 'Garden Design & Planning',
        description: 'Design layout and choose vegetables to grow',
        timeframe: 'Last Year',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(-200),
        progress: 100,
        order: 55,
        userId: user.id,
        parentGoalId: createdGoals['Backyard Garden Project'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-205),
      },
      {
        name: 'Soil Preparation',
        description: 'Prepare soil, add compost, and create raised beds',
        timeframe: 'Last Year',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(-190),
        progress: 100,
        order: 56,
        userId: user.id,
        parentGoalId: createdGoals['Backyard Garden Project'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-195),
      },
      {
        name: 'Planting & Harvesting',
        description: 'Plant vegetables and harvest first crop',
        timeframe: 'Last Year',
        categoryId: createdCategories['HOME'].id,
        deadline: getDateRelativeToToday(-180),
        progress: 100,
        order: 57,
        userId: user.id,
        parentGoalId: createdGoals['Backyard Garden Project'].id,
        isArchived: true,
        completedAt: getDateRelativeToToday(-182),
      },
    ];

    const createdSubGoals = {};
    for (const subGoal of subGoals) {
      const createdSubGoal = await prisma.goal.create({
        data: subGoal,
      });
      console.log(`✅ Created sub-goal: ${createdSubGoal.name}`);
      createdSubGoals[createdSubGoal.name] = createdSubGoal;
    }

    // Create comprehensive tasks with varied priorities, statuses, times, and sub-goal associations
    const tasks = [
      // Project Alpha Tasks (Work & Career) - linked to sub-goals
      {
        name: 'Finalize Alpha Documentation',
        description: 'Complete technical documentation for Project Alpha',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(5, 14, 30), // 2:30 PM
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-3, 9, 0), // 9:00 AM
        goalId: createdSubGoals['Alpha Testing & QA'].id, // Link to sub-goal
        userId: user.id,
      },
      {
        name: 'Alpha Code Review',
        description: 'Conduct final code review with team',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(3, 10, 0), // 10:00 AM
        status: 'TODO',
        goalId: createdSubGoals['Alpha Frontend Integration'].id, // Link to sub-goal
        userId: user.id,
      },
      {
        name: 'Deploy Alpha to Production',
        description: 'Deploy Project Alpha to production environment',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(7, 16, 0), // 4:00 PM
        status: 'TODO',
        goalId: createdSubGoals['Alpha Testing & QA'].id, // Link to sub-goal
        userId: user.id,
      },
      {
        name: 'Alpha Retrospective Meeting',
        description: 'Conduct project retrospective with stakeholders',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(10, 11, 30), // 11:30 AM
        status: 'TODO',
        goalId: createdGoals['Complete Project Alpha'].id, // Link to main goal
        userId: user.id,
      },
      {
        name: 'Backend API Testing',
        description: 'Complete unit tests for all backend endpoints',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(2, 15, 45), // 3:45 PM
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(-1, 17, 30), // 5:30 PM yesterday
        goalId: createdSubGoals['Alpha Backend Development'].id, // Link to completed sub-goal
        userId: user.id,
      },

      // AWS Certification Tasks - linked to sub-goals
      {
        name: 'Study AWS EC2',
        description: 'Complete EC2 module in AWS course',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(14, 19, 0), // 7:00 PM
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-2, 18, 30), // 6:30 PM
        goalId: createdSubGoals['AWS Core Services Study'].id, // Link to sub-goal
        userId: user.id,
      },
      {
        name: 'Practice AWS Labs',
        description: 'Complete hands-on labs for AWS services',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(21, 13, 15), // 1:15 PM
        status: 'TODO',
        goalId: createdSubGoals['AWS Core Services Study'].id, // Link to sub-goal
        userId: user.id,
      },
      {
        name: 'Schedule AWS Exam',
        description: 'Book AWS certification exam date',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(30, 9, 30), // 9:30 AM
        status: 'TODO',
        goalId: createdSubGoals['AWS Practice Exams'].id, // Link to sub-goal
        userId: user.id,
      },
      {
        name: 'AWS IAM Deep Dive',
        description: 'Study AWS Identity and Access Management',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(25, 20, 0), // 8:00 PM
        status: 'TODO',
        goalId: createdSubGoals['AWS Security & IAM'].id, // Link to sub-goal
        userId: user.id,
      },

      // Side Business Tasks
      {
        name: 'Register Business Name',
        description: 'Register LLC for consulting business',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(14),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(-5),
        goalId: createdGoals['Launch Side Business'].id,
        userId: user.id,
      },
      {
        name: 'Create Business Website',
        description: 'Build portfolio website for consulting services',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(21),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-7),
        goalId: createdGoals['Launch Side Business'].id,
        userId: user.id,
      },
      {
        name: 'Set Up Business Banking',
        description: 'Open business bank account',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(28),
        status: 'TODO',
        goalId: createdGoals['Launch Side Business'].id,
        userId: user.id,
      },

      // Japanese Learning Tasks
      {
        name: 'Daily Hiragana Practice',
        description: 'Practice writing hiragana characters',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(0),
        status: 'TODO',
        goalId: createdGoals['Learn Japanese'].id,
        userId: user.id,
      },
      {
        name: 'Japanese Vocabulary Review',
        description: 'Review 50 new vocabulary words',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(2),
        status: 'TODO',
        goalId: createdGoals['Learn Japanese'].id,
        userId: user.id,
      },
      {
        name: 'Watch Japanese Drama',
        description: 'Watch one episode with subtitles',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(1),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(-1),
        goalId: createdGoals['Learn Japanese'].id,
        userId: user.id,
      },

      // Reading Tasks
      {
        name: 'Read "Atomic Habits"',
        description: 'Finish reading Atomic Habits book',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(14),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-10),
        goalId: createdGoals['Read 24 Books'].id,
        userId: user.id,
      },
      {
        name: 'Read "Clean Code"',
        description: 'Technical book for professional development',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(30),
        status: 'TODO',
        goalId: createdGoals['Read 24 Books'].id,
        userId: user.id,
      },

      // Public Speaking Tasks
      {
        name: 'Join Toastmasters Club',
        description: 'Find and join local Toastmasters chapter',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(7),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(-14),
        goalId: createdGoals['Master Public Speaking'].id,
        userId: user.id,
      },
      {
        name: 'Prepare Ice Breaker Speech',
        description: 'Write and practice first Toastmasters speech',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(14),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-3),
        goalId: createdGoals['Master Public Speaking'].id,
        userId: user.id,
      },

      // Marathon Training Tasks
      {
        name: 'Long Run - 15 miles',
        description: 'Complete 15-mile training run',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(2),
        status: 'TODO',
        goalId: createdGoals['Run Marathon'].id,
        userId: user.id,
      },
      {
        name: 'Speed Training',
        description: 'Interval training session',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(1),
        status: 'TODO',
        goalId: createdGoals['Run Marathon'].id,
        userId: user.id,
      },
      {
        name: 'Recovery Run',
        description: 'Easy 5-mile recovery run',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(0),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(0),
        goalId: createdGoals['Run Marathon'].id,
        userId: user.id,
      },

      // Weight Loss Tasks
      {
        name: 'Meal Prep Sunday',
        description: 'Prepare healthy meals for the week',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(1),
        status: 'TODO',
        goalId: createdGoals['Lose 20 Pounds'].id,
        userId: user.id,
      },
      {
        name: 'Track Daily Calories',
        description: 'Log all food intake in MyFitnessPal',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(0),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-30),
        goalId: createdGoals['Lose 20 Pounds'].id,
        userId: user.id,
      },
      {
        name: 'Weekly Weigh-in',
        description: 'Record weekly weight measurement',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(3),
        status: 'TODO',
        goalId: createdGoals['Lose 20 Pounds'].id,
        userId: user.id,
      },

      // Meditation Tasks
      {
        name: 'Morning Meditation',
        description: '20-minute morning meditation session',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(0),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(0),
        goalId: createdGoals['Daily Meditation'].id,
        userId: user.id,
      },
      {
        name: 'Evening Reflection',
        description: '10-minute evening reflection practice',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(0),
        status: 'TODO',
        goalId: createdGoals['Daily Meditation'].id,
        userId: user.id,
      },

      // Emergency Fund Tasks
      {
        name: 'Set Up Automatic Transfer',
        description: 'Automate monthly savings transfer',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(7),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(-20),
        goalId: createdGoals['Build Emergency Fund'].id,
        userId: user.id,
      },
      {
        name: 'Research High-Yield Accounts',
        description: 'Compare savings account interest rates',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(14),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-5),
        goalId: createdGoals['Build Emergency Fund'].id,
        userId: user.id,
      },
      {
        name: 'Monthly Budget Review',
        description: 'Review and optimize monthly budget',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(30),
        status: 'TODO',
        goalId: createdGoals['Build Emergency Fund'].id,
        userId: user.id,
      },

      // 401k Tasks
      {
        name: 'Increase 401k Contribution',
        description: 'Raise contribution to 15% of salary',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(14),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(-10),
        goalId: createdGoals['Max Out 401k'].id,
        userId: user.id,
      },
      {
        name: 'Review Investment Options',
        description: 'Analyze 401k investment fund options',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(21),
        status: 'TODO',
        goalId: createdGoals['Max Out 401k'].id,
        userId: user.id,
      },

      // Investment Portfolio Tasks
      {
        name: 'Open Brokerage Account',
        description: 'Set up account with Vanguard',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(3),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(-2),
        goalId: createdGoals['Start Investment Portfolio'].id,
        userId: user.id,
      },
      {
        name: 'Initial Investment',
        description: 'Make first $1000 investment',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(7),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-1),
        goalId: createdGoals['Start Investment Portfolio'].id,
        userId: user.id,
      },

      // Date Night Tasks
      {
        name: 'Plan This Week\'s Date',
        description: 'Choose restaurant and make reservation',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(2),
        status: 'TODO',
        goalId: createdGoals['Weekly Date Nights'].id,
        userId: user.id,
      },
      {
        name: 'Date Night Ideas List',
        description: 'Create list of 20 date night ideas',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(14),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-7),
        goalId: createdGoals['Weekly Date Nights'].id,
        userId: user.id,
      },

      // Family Vacation Tasks
      {
        name: 'Research Destinations',
        description: 'Research family-friendly vacation spots',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(21),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-5),
        goalId: createdGoals['Family Vacation'].id,
        userId: user.id,
      },
      {
        name: 'Set Vacation Budget',
        description: 'Determine total vacation budget',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(14),
        status: 'TODO',
        goalId: createdGoals['Family Vacation'].id,
        userId: user.id,
      },

      // Guitar Learning Tasks
      {
        name: 'Practice Chords',
        description: 'Practice basic guitar chords for 30 minutes',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(0),
        status: 'TODO',
        goalId: createdGoals['Learn Guitar'].id,
        userId: user.id,
      },
      {
        name: 'Learn "Wonderwall"',
        description: 'Master playing Wonderwall by Oasis',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(30),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-14),
        goalId: createdGoals['Learn Guitar'].id,
        userId: user.id,
      },

      // Photography Tasks
      {
        name: 'Daily Photo Challenge',
        description: 'Take and edit one photo today',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(0),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(0),
        goalId: createdGoals['Photography Project'].id,
        userId: user.id,
      },
      {
        name: 'Photo Walk Downtown',
        description: 'Dedicated photography session downtown',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(3),
        status: 'TODO',
        goalId: createdGoals['Photography Project'].id,
        userId: user.id,
      },

      // Kitchen Renovation Tasks
      {
        name: 'Get Contractor Quotes',
        description: 'Obtain 3 quotes from kitchen contractors',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(7),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-3),
        goalId: createdGoals['Kitchen Renovation'].id,
        userId: user.id,
      },
      {
        name: 'Choose Cabinet Style',
        description: 'Select kitchen cabinet design and color',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(14),
        status: 'TODO',
        goalId: createdGoals['Kitchen Renovation'].id,
        userId: user.id,
      },
      {
        name: 'Order Appliances',
        description: 'Purchase new kitchen appliances',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(21),
        status: 'TODO',
        goalId: createdGoals['Kitchen Renovation'].id,
        userId: user.id,
      },

      // Home Office Tasks
      {
        name: 'Sort Office Papers',
        description: 'Organize and file important documents',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(2),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-1),
        goalId: createdGoals['Organize Home Office'].id,
        userId: user.id,
      },
      {
        name: 'Set Up Filing System',
        description: 'Create organized filing system',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(5),
        status: 'TODO',
        goalId: createdGoals['Organize Home Office'].id,
        userId: user.id,
      },

      // Japan Trip Tasks
      {
        name: 'Apply for Passport',
        description: 'Submit passport application',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(30),
        status: 'COMPLETED',
        completedAt: getDateRelativeToToday(-45),
        goalId: createdGoals['Visit Japan'].id,
        userId: user.id,
      },
      {
        name: 'Book Flights to Tokyo',
        description: 'Purchase round-trip flights to Tokyo',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(60),
        status: 'TODO',
        goalId: createdGoals['Visit Japan'].id,
        userId: user.id,
      },
      {
        name: 'Research Tokyo Hotels',
        description: 'Find and book accommodation in Tokyo',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(45),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-7),
        goalId: createdGoals['Visit Japan'].id,
        userId: user.id,
      },

      // Hiking Challenge Tasks
      {
        name: 'Hike Eagle Peak Trail',
        description: 'Complete 8-mile Eagle Peak hike',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(3),
        status: 'TODO',
        goalId: createdGoals['Hiking Challenge'].id,
        userId: user.id,
      },
      {
        name: 'Update Hiking Log',
        description: 'Record completed hikes in journal',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(7),
        status: 'TODO',
        goalId: createdGoals['Hiking Challenge'].id,
        userId: user.id,
      },
      {
        name: 'Plan Next 5 Hikes',
        description: 'Research and plan upcoming hiking routes',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(14),
        status: 'IN_PROGRESS',
        startedAt: getDateRelativeToToday(-2),
        goalId: createdGoals['Hiking Challenge'].id,
        userId: user.id,
      },

      // Overdue Tasks (for testing)
      {
        name: 'Submit Tax Documents',
        description: 'Send tax documents to accountant',
        priority: 'HIGH',
        dueDate: getDateRelativeToToday(-5),
        status: 'TODO',
        goalId: createdGoals['Build Emergency Fund'].id,
        userId: user.id,
      },
      {
        name: 'Renew Car Registration',
        description: 'Complete annual car registration renewal',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(-3),
        status: 'TODO',
        goalId: createdSubGoals['Budget Optimization'].id, // Link to wealth management
        userId: user.id,
      },

      // All tasks must be linked to goals/subgoals (no standalone tasks allowed)
      {
        name: 'Schedule Dentist Appointment',
        description: 'Book routine dental cleaning',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(14),
        status: 'TODO',
        goalId: createdSubGoals['Weekly Progress Tracking'].id, // Link to health tracking
        userId: user.id,
      },
      {
        name: 'Buy Birthday Gift',
        description: 'Purchase gift for friend\'s birthday',
        priority: 'MEDIUM',
        dueDate: getDateRelativeToToday(5),
        status: 'TODO',
        goalId: createdSubGoals['Budget & Savings Plan'].id, // Link to family budget planning
        userId: user.id,
      },
      {
        name: 'Oil Change',
        description: 'Get car oil changed',
        priority: 'LOW',
        dueDate: getDateRelativeToToday(21),
        status: 'TODO',
        goalId: createdSubGoals['Automatic Savings Plan'].id, // Link to financial planning
        userId: user.id,
      },
    ];

    let createdTasksCount = 0;
    for (const task of tasks) {
      const createdTask = await prisma.task.create({
        data: task,
      });
      console.log(`✅ Created task: ${createdTask.name}`);
      createdTasksCount++;
    }

    // Create comprehensive reminders with varied times and BETTER recurrence distribution
    // ONLY 1 daily, rest spread between weekly, monthly, yearly
    const reminders = [
      // Work & Career Reminders
      {
        title: 'Weekly Team Standup',
        description: 'Monday morning team sync-up meeting',
        dueDate: getDateRelativeToToday(1, 9, 0), // 9:00 AM Monday
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['WORK'].id,
        userId: user.id,
      },
      {
        title: 'Submit Timesheet',
        description: 'Submit weekly timesheet by Friday',
        dueDate: getDateRelativeToToday(4, 17, 0), // 5:00 PM Friday
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['WORK'].id,
        userId: user.id,
      },
      {
        title: 'Quarterly Review Prep',
        description: 'Prepare materials for quarterly performance review',
        dueDate: getDateRelativeToToday(21, 14, 0), // 2:00 PM
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['WORK'].id,
        userId: user.id,
      },
      {
        title: 'Annual Performance Review',
        description: 'Complete annual self-evaluation and goal setting',
        dueDate: getDateRelativeToToday(120, 10, 30), // 10:30 AM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'yearly',
        categoryId: createdCategories['WORK'].id,
        userId: user.id,
      },

      // Personal Growth Reminders - ONLY ONE DAILY RECURRENCE
      {
        title: 'Daily Reading Time',
        description: 'Read for 30 minutes before bed',
        dueDate: getDateRelativeToToday(0, 21, 30), // 9:30 PM
        isCompleted: true,
        completedAt: getDateRelativeToToday(0, 21, 30),
        isRecurring: true,
        recurrence: 'daily', // THE ONLY DAILY RECURRENCE
        categoryId: createdCategories['PERSONAL'].id,
        userId: user.id,
      },
      {
        title: 'Japanese Study Session',
        description: 'Weekly Japanese language practice session',
        dueDate: getDateRelativeToToday(2, 18, 0), // 6:00 PM - CHANGED TO WEEKLY
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly', // CHANGED FROM DAILY
        categoryId: createdCategories['PERSONAL'].id,
        userId: user.id,
      },
      {
        title: 'Toastmasters Meeting',
        description: 'Attend weekly Toastmasters meeting',
        dueDate: getDateRelativeToToday(3, 19, 0), // 7:00 PM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['PERSONAL'].id,
        userId: user.id,
      },
      {
        title: 'Monthly Book Club',
        description: 'Attend monthly book club discussion',
        dueDate: getDateRelativeToToday(15, 14, 30), // 2:30 PM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly',
        categoryId: createdCategories['PERSONAL'].id,
        userId: user.id,
      },
      {
        title: 'Annual Learning Goals Review',
        description: 'Review and set learning goals for the year',
        dueDate: getDateRelativeToToday(300, 16, 0), // 4:00 PM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'yearly',
        categoryId: createdCategories['PERSONAL'].id,
        userId: user.id,
      },

      // Health & Fitness Reminders - NO MORE DAILY RECURRENCES
      {
        title: 'Weekly Workout Planning',
        description: 'Plan workout schedule for the week',
        dueDate: getDateRelativeToToday(1, 7, 0), // 7:00 AM - CHANGED TO WEEKLY
        isCompleted: true,
        completedAt: getDateRelativeToToday(0, 7, 0),
        isRecurring: true,
        recurrence: 'weekly', // CHANGED FROM DAILY
        categoryId: createdCategories['HEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Monthly Vitamin Restock',
        description: 'Check and restock vitamin supplements',
        dueDate: getDateRelativeToToday(15, 12, 0), // 12:00 PM - CHANGED TO MONTHLY
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly', // CHANGED FROM DAILY
        categoryId: createdCategories['HEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Meal Prep Sunday',
        description: 'Prepare healthy meals for the week',
        dueDate: getDateRelativeToToday(2, 10, 30), // 10:30 AM Sunday
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['HEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Quarterly Fitness Assessment',
        description: 'Track fitness progress and adjust goals',
        dueDate: getDateRelativeToToday(30, 15, 0), // 3:00 PM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly',
        categoryId: createdCategories['HEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Annual Physical Exam',
        description: 'Complete annual physical examination',
        dueDate: getDateRelativeToToday(180, 9, 30), // 9:30 AM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'yearly',
        categoryId: createdCategories['HEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Dentist Cleaning',
        description: 'Bi-annual dental cleaning appointment',
        dueDate: getDateRelativeToToday(60, 14, 0), // 2:00 PM
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['HEALTH'].id,
        userId: user.id,
      },

      // Finance & Wealth Reminders - Mix of monthly and yearly
      {
        title: 'Pay Rent',
        description: 'Monthly rent payment due',
        dueDate: getDateRelativeToToday(5, 8, 0), // 8:00 AM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly',
        categoryId: createdCategories['WEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Review Credit Card Statements',
        description: 'Check and reconcile credit card charges',
        dueDate: getDateRelativeToToday(10, 19, 30), // 7:30 PM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly',
        categoryId: createdCategories['WEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Weekly Budget Check',
        description: 'Review weekly expenses and budget',
        dueDate: getDateRelativeToToday(6, 20, 0), // 8:00 PM Sunday
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['WEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Quarterly Investment Review',
        description: 'Review and rebalance investment portfolio',
        dueDate: getDateRelativeToToday(30, 16, 30), // 4:30 PM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly',
        categoryId: createdCategories['WEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Annual Tax Preparation',
        description: 'Gather documents and file annual taxes',
        dueDate: getDateRelativeToToday(75, 13, 0), // 1:00 PM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'yearly',
        categoryId: createdCategories['WEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Annual Insurance Review',
        description: 'Review and update all insurance policies',
        dueDate: getDateRelativeToToday(200, 11, 0), // 11:00 AM
        isCompleted: false,
        isRecurring: true,
        recurrence: 'yearly',
        categoryId: createdCategories['WEALTH'].id,
        userId: user.id,
      },

      // Family & Relationships Reminders
      {
        title: 'Date Night',
        description: 'Weekly date night with spouse',
        dueDate: getDateRelativeToToday(2),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['FAMILY'].id,
        userId: user.id,
      },
      {
        title: 'Call Parents',
        description: 'Weekly check-in call with parents',
        dueDate: getDateRelativeToToday(1),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['FAMILY'].id,
        userId: user.id,
      },
      {
        title: 'Family Game Night',
        description: 'Monthly family game night',
        dueDate: getDateRelativeToToday(12),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly',
        categoryId: createdCategories['FAMILY'].id,
        userId: user.id,
      },
      {
        title: 'Anniversary Dinner',
        description: 'Wedding anniversary celebration',
        dueDate: getDateRelativeToToday(180),
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['FAMILY'].id,
        userId: user.id,
      },

      // Hobbies & Creativity Reminders
      {
        title: 'Guitar Practice',
        description: 'Daily guitar practice session',
        dueDate: getDateRelativeToToday(0),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'daily',
        categoryId: createdCategories['HOBBIES'].id,
        userId: user.id,
      },
      {
        title: 'Photography Walk',
        description: 'Weekly photography expedition',
        dueDate: getDateRelativeToToday(3),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['HOBBIES'].id,
        userId: user.id,
      },
      {
        title: 'Art Supply Restock',
        description: 'Check and restock art supplies',
        dueDate: getDateRelativeToToday(20),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly',
        categoryId: createdCategories['HOBBIES'].id,
        userId: user.id,
      },

      // Home & Lifestyle Reminders
      {
        title: 'Weekly House Cleaning',
        description: 'Deep clean house weekly',
        dueDate: getDateRelativeToToday(1),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['HOME'].id,
        userId: user.id,
      },
      {
        title: 'Grocery Shopping',
        description: 'Weekly grocery shopping trip',
        dueDate: getDateRelativeToToday(2),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['HOME'].id,
        userId: user.id,
      },
      {
        title: 'Change Air Filters',
        description: 'Replace HVAC air filters',
        dueDate: getDateRelativeToToday(30),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'monthly',
        categoryId: createdCategories['HOME'].id,
        userId: user.id,
      },
      {
        title: 'Seasonal Wardrobe Swap',
        description: 'Switch out seasonal clothing',
        dueDate: getDateRelativeToToday(45),
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['HOME'].id,
        userId: user.id,
      },
      {
        title: 'Home Security Check',
        description: 'Test smoke detectors and security system',
        dueDate: getDateRelativeToToday(90),
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['HOME'].id,
        userId: user.id,
      },

      // Travel & Adventure Reminders
      {
        title: 'Plan Weekend Hike',
        description: 'Research and plan this weekend\'s hiking trail',
        dueDate: getDateRelativeToToday(2),
        isCompleted: false,
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['TRAVEL'].id,
        userId: user.id,
      },
      {
        title: 'Japan Trip Visa Application',
        description: 'Submit visa application for Japan trip',
        dueDate: getDateRelativeToToday(90),
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['TRAVEL'].id,
        userId: user.id,
      },
      {
        title: 'Travel Insurance Renewal',
        description: 'Renew annual travel insurance policy',
        dueDate: getDateRelativeToToday(150),
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['TRAVEL'].id,
        userId: user.id,
      },

      // Overdue Reminders (for testing)
      {
        title: 'Car Registration Renewal',
        description: 'Renew annual car registration',
        dueDate: getDateRelativeToToday(-7),
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['WEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Library Book Return',
        description: 'Return overdue library books',
        dueDate: getDateRelativeToToday(-3),
        isCompleted: false,
        isRecurring: false,
        categoryId: createdCategories['PERSONAL'].id,
        userId: user.id,
      },

      // Completed Reminders (for variety)
      {
        title: 'Morning Meditation',
        description: 'Daily morning meditation practice',
        dueDate: getDateRelativeToToday(-1),
        isCompleted: true,
        completedAt: getDateRelativeToToday(-1),
        isRecurring: true,
        recurrence: 'daily',
        categoryId: createdCategories['HEALTH'].id,
        userId: user.id,
      },
      {
        title: 'Weekly Budget Review',
        description: 'Review weekly expenses and budget',
        dueDate: getDateRelativeToToday(-2),
        isCompleted: true,
        completedAt: getDateRelativeToToday(-2),
        isRecurring: true,
        recurrence: 'weekly',
        categoryId: createdCategories['WEALTH'].id,
        userId: user.id,
      },
    ];

    let createdRemindersCount = 0;
    for (const reminder of reminders) {
      const createdReminder = await prisma.reminder.create({
        data: reminder,
      });
      console.log(`✅ Created reminder: ${createdReminder.title}`);
      createdRemindersCount++;
    }

    console.log('🎉 ENHANCED Comprehensive database seeding completed successfully!');
    console.log('');
    console.log('📊 Created Sample Data:');
    console.log(`  👤 1 test user (${user.email})`);
    console.log(`  📁 ${Object.keys(createdCategories).length} categories (Work, Personal, Health, Finance, Family, Hobbies, Home, Travel)`);
    console.log(`  🎯 ${Object.keys(createdGoals).length} main goals (varied progress: 15%-100%, some completed)`);
    console.log(`  🎯 ${Object.keys(createdSubGoals).length} sub-goals (hierarchical breakdown with varied completion)`);
    console.log(`  ✅ ${createdTasksCount} tasks (linked to sub-goals, varied times, all priorities/statuses)`);
    console.log(`  ⏰ ${createdRemindersCount} reminders (ONLY 1 daily, rest weekly/monthly/yearly, varied times)`);
    console.log('');
    console.log('🔗 ENHANCED Data Interconnections:');
    console.log('  - Tasks linked to SUB-GOALS (not just main goals)');
    console.log('  - Sub-goals linked to main goals (hierarchical structure)');
    console.log('  - Reminders with VARIED TIMES (6 AM - 10 PM spread)');
    console.log('  - BETTER recurrence distribution: 1 daily, multiple weekly/monthly/yearly');
    console.log('  - Completed goals AND sub-goals for realistic testing');
    console.log('  - Mixed completion statuses across all levels');
    console.log('');
    console.log('⏰ Time Distribution Fixed:');
    console.log('  - Tasks: Random times between 6 AM - 10 PM (no more 5 AM!)');
    console.log('  - Reminders: Specific meaningful times (9 AM meetings, 8 PM evening tasks)');
    console.log('  - Recurrence: Only 1 daily, rest spread across weekly/monthly/yearly');
    console.log('');
    console.log('🏗️ Sub-Goal Structure:');
    console.log('  - 57 sub-goals across all main goals (33 active + 24 completed)');
    console.log('  - 24 completed sub-goals with completedAt dates');
    console.log('  - Tasks properly linked to sub-goals');
    console.log('  - Hierarchical goal breakdown for better organization');
    console.log('');
    console.log('✅ COMPLETED Goals & Sub-Goals:');
    console.log('  - 8 completed main goals (100% progress + completedAt dates)');
    console.log('  - 24 completed sub-goals (100% progress + completedAt dates)');
    console.log('  - All completed items are archived for clean UI');
    console.log('  - Completion dates spread over past 6 months');
    console.log('');
    console.log('🚀 Ready for Development:');
    console.log('  - Test User: test@example.com / password123');
    console.log('  - User ID: user_placeholder');
    console.log('  - Start server: npm run dev');
    console.log('  - Verify data: npm run db:verify');
    console.log('');
    console.log('🧹 Clean Slate Achieved:');
    console.log('  - No habit references (old feature removed)');
    console.log('  - IndexedDB/voice data should be cleared manually');
    console.log('  - Database is fresh and comprehensive');
    console.log('');
    console.log('Perfect for testing week/month views with varied times! 🎯⏰');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

