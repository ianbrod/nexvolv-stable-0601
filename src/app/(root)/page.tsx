'use client';

// Removed duplicate React import
// Remove useLiveQuery and DexieInitializer imports
import { db } from '@/lib/db'; // Keep db for manual updates
import { Goal as GoalType } from '@/types'; // Import Goal from @/types
import { Task } from '@prisma/client'; // Import Task from Prisma
import { Goal as PrismaGoal, Task as PrismaTask } from '@prisma/client'; // Import Prisma Goal & Task types
import { TaskStatus } from '@prisma/client'; // Keep enum import
import { DashboardGoalCard } from '@/components/dashboard/DashboardGoalCard';
import { CalendarContainer } from '@/components/dashboard/CalendarContainer';
// Add useState and useEffect for manual fetching
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { getDashboardData } from '@/actions/getDashboardData'; // Import the server action
import { getTopGoals, invalidateTopGoalsCache } from '@/services/topGoalsService'; // Import our new top goals algorithm

export default function DashboardPage() {
  // State for tasks and goals, fetched manually
  const [tasks, setTasks] = useState<Task[] | null>(null); // State uses the updated Task type from @/types
  // Adjust state type to include _count
  type GoalWithSubgoalCount = PrismaGoal & { _count?: { subGoals: number } };
  const [goals, setGoals] = useState<GoalWithSubgoalCount[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Define fetchData using useCallback to potentially optimize later if needed
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    console.log('[DashboardPage] Fetching data...');
    try {
      const result = await getDashboardData();
      console.log('[DashboardPage] Got result:', result);

      // Validate the result structure
      if (!result) {
        throw new Error('getDashboardData returned null or undefined');
      }

      if (!result.tasks || !result.goals) {
        console.error('[DashboardPage] Invalid data structure returned:', result);
        throw new Error('Invalid data structure: missing tasks or goals property');
      }

      const { tasks: fetchedTasks, goals: fetchedGoals } = result;
      console.log(`[DashboardPage] Fetched ${fetchedTasks.length} tasks, ${fetchedGoals.length} goals.`);

      // Update component state
      setTasks(fetchedTasks as Task[]);
      setGoals(fetchedGoals);

      // Update Dexie cache (clear and bulk add) - Consider if Dexie is still needed
      console.log('[DashboardPage] Updating Dexie cache...');
      await db.tasks.clear();
      await db.goals.clear();
      if (fetchedTasks.length > 0) {
        await db.tasks.bulkPut(fetchedTasks as Task[]);
      }
      if (fetchedGoals.length > 0) {
        // Convert the Prisma goals to the format expected by Dexie
        const dexieGoals = fetchedGoals.map(goal => ({
          ...goal,
          category: goal.category ? goal.category.name : undefined
        }));
        await db.goals.bulkPut(dexieGoals as any[]);
      }
      console.log('[DashboardPage] Dexie cache updated.');

    } catch (error) {
      console.error('[DashboardPage] Error fetching data:', error);
      // Set empty arrays to prevent null reference errors
      setTasks([]);
      setGoals([]);
    } finally {
      setIsLoading(false);
      console.log('[DashboardPage] Fetching complete.');
    }
  }, []); // Empty dependency array for useCallback

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Include fetchData in dependency array

  // Function to update a single task in the state
  const handleTaskUpdate = useCallback((updatedTask: PrismaTask) => {
    setTasks(currentTasks => {
      if (!currentTasks) return null; // Should not happen if already loaded
      // Find the index of the task to update
      const index = currentTasks.findIndex(task => task.id === updatedTask.id);
      if (index === -1) {
        // Task not found, maybe add it? Or log warning. For now, return current state.
        console.warn(`[DashboardPage] Task with ID ${updatedTask.id} not found in current state for update.`);
        return currentTasks;
      }
      // Create a new array with the updated task
      const newTasks = [...currentTasks];
      // Ensure the updatedTask conforms to the frontend Task type if they differ
      // This might involve mapping PrismaTask fields to Task fields if necessary
      newTasks[index] = { ...currentTasks[index], ...updatedTask } as Task;

      // Invalidate the top goals cache when a task is updated
      // This ensures that the top goals are recalculated when task status changes
      invalidateTopGoalsCache();

      return newTasks;
    });

    // Optionally update Dexie cache as well
    // db.tasks.put(updatedTask as Task).catch(err => console.error("Failed to update Dexie:", err));

  }, []); // No dependencies needed if it only uses setTasks


  // We're now using the imported getTopGoals function from topGoalsService

  const topGoalsWithTasks = useMemo(() => {
    if (!goals || !tasks) return [];
    return getTopGoals(goals, tasks, 3, true);
  }, [goals, tasks]);

  if (isLoading || !tasks || !goals) { // Simplified loading check
    return <div className="p-4">Loading dashboard data...</div>;
  }

  return (
      <div className="w-full px-4 py-4 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex flex-col space-y-4 h-full">
        {/* Top Goals Section */}
        <section className="flex-shrink-0">
          {goals.length === 0 && (
            <p className="text-muted-foreground text-sm">No goals set yet.</p>
          )}
          {topGoalsWithTasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topGoalsWithTasks.map(([goal, goalTasks]) => (
                <DashboardGoalCard
                  key={goal.id}
                  goal={goal}
                  linkedTasks={goalTasks}
                  subgoalCount={goal._count?.subGoals || 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* Calendar Timeline Section */}
        <section className="flex-grow">
          <div className="h-full">
            {/* Pass the handleTaskUpdate function down */}
            <CalendarContainer
              tasks={tasks}
              goals={goals}
              onTaskUpdate={handleTaskUpdate} // Pass the update handler
            />
          </div>
        </section>
      </div>
    </div>
);
}
