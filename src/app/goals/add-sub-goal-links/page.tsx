'use client';

import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function AddSubGoalLinksPage() {
  // Fetch all parent goals (non-sub-goals)
  const parentGoals = await prisma.goal.findMany({
    where: { 
      userId: 'user_placeholder',
      parentGoalId: null,
      isArchived: false
    },
    include: { category: true }
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add Sub-Goal Links</h1>
      <p className="mb-4">Click on any link to add a sub-goal to the parent goal:</p>
      
      <ul className="space-y-2">
        {parentGoals.map(goal => (
          <li key={goal.id} className="border p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{goal.name}</p>
                <p className="text-sm text-muted-foreground">
                  Category: {goal.category?.name || 'None'}
                </p>
              </div>
              <Link 
                href={`/goals/${goal.id}/add-sub-goal`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Sub-Goal
              </Link>
            </div>
          </li>
        ))}
      </ul>
      
      <div className="mt-8">
        <Link href="/goals" className="text-blue-600 hover:underline">
          Back to Goals Page
        </Link>
      </div>
    </div>
  );
}
