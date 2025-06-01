import { Suspense } from 'react';
import { CompletedGoalsClientWrapper } from '@/components/goals/CompletedGoalsClientWrapper';
import { getCategories } from '@/actions/categories';
import { getCompletedGoals } from '@/actions/goals';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Server Component for the Completed Goals Repository page
 *
 * This page displays all completed goals in a dedicated repository,
 * allowing users to browse, filter, and search through their achievements.
 */
export default async function CompletedGoalsPage() {
  // Fetch categories and completed goals in parallel
  const [categories, completedGoals] = await Promise.all([
    getCategories(),
    getCompletedGoals()
  ]);

  return (
    <div className="w-full h-[calc(100vh-4rem)] px-4 py-4">
      <Suspense fallback={<CompletedGoalsLoading />}>
        <div className="h-full w-full">
          <CompletedGoalsClientWrapper
            goals={completedGoals}
            categories={categories}
          />
        </div>
      </Suspense>
    </div>
  );
}

/**
 * Loading state component for the Completed Goals page
 */
function CompletedGoalsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Goals list skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
