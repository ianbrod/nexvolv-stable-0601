import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function DirectLinksPage() {
  // Fetch all goals
  const goals = await prisma.goal.findMany({
    where: { userId: 'user_placeholder' },
    include: { category: true }
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Direct Links to Goals</h1>
      <p className="mb-4">Click on any goal to view its details:</p>

      <ul className="space-y-2">
        {goals.map(goal => (
          <li key={goal.id} className="border p-4 rounded-lg">
            <Link
              href={`/goals/${goal.id}`}
              className="text-blue-600 hover:underline font-medium"
            >
              {goal.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              Category: {goal.category?.name || 'None'}
            </p>
            {goal.description && (
              <p className="text-sm mt-1">{goal.description}</p>
            )}
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
