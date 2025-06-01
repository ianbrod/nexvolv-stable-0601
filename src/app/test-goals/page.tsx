import React from 'react';
import { SimpleGoalCard } from '@/components/goals/SimpleGoalCard';
import { prisma } from '@/lib/prisma';

export default async function TestGoalsPage() {
  // Fetch goals directly
  const goals = await prisma.goal.findMany({
    where: {
      userId: 'user_placeholder',
      parentGoalId: null, // Only top-level goals
      isArchived: false
    },
    include: {
      category: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Goals Page</h1>
      <p className="mb-4">This is a simple test page to verify that goal links work correctly.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map(goal => (
          <SimpleGoalCard
            key={goal.id}
            id={goal.id}
            name={goal.name}
            description={goal.description}
            categoryColor={goal.category?.color || '#808080'}
          />
        ))}
      </div>

      {/* Add a few hardcoded test goals */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Hardcoded Test Goals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SimpleGoalCard
            id="test-1"
            name="Test Goal 1"
            description="This is a test goal with a hardcoded ID"
            categoryColor="#ff0000"
          />
          <SimpleGoalCard
            id="test-2"
            name="Test Goal 2"
            description="This is another test goal with a hardcoded ID"
            categoryColor="#00ff00"
          />
        </div>
      </div>
    </div>
  );
}
