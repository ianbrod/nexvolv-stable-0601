'use client';

// Removed duplicate React import
// Remove useLiveQuery and DexieInitializer imports
import { db } from '@/lib/db'; // Keep db for manual updates
import { Goal as GoalType, Task } from '@/types'; // Rename Goal type import
import { Goal as PrismaGoal, Task as PrismaTask, Category } from '@prisma/client'; // Import Prisma Goal & Task types
import { TaskStatus } from '@prisma/client'; // Keep enum import
import { DashboardGoalCard } from '@/components/dashboard/DashboardGoalCard';
import { CalendarContainer } from '@/components/dashboard/CalendarContainer';
// Add useState and useEffect for manual fetching
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { getDashboardData } from '@/actions/getDashboardData'; // Import the server action
import { getCategories } from '@/actions/categories'; // Import categories action

export default function DashboardPage() {
  // State for tasks and goals, fetched manually
  const [tasks, setTasks] = useState<Task[] | null>(null); // State uses the updated Task type from @/types
  // Adjust state type to include _count
  type GoalWithSubgoalCount = PrismaGoal & { _count?: { subGoals: number } };
  const [goals, setGoals] = useState<GoalWithSubgoalCount[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Define fetchData using useCallback to potentially optimize later if needed
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    console.log('[DashboardPage] Fetching data...');
    try {
      const [result, categoriesResult] = await Promise.all([
        getDashboardData(),
        getCategories()
      ]);
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
      setCategories(categoriesResult);

      // Update Dexie cache (clear and bulk add) - Consider if Dexie is still needed
      console.log('[DashboardPage] Updating Dexie cache...');
      await db.tasks.clear();
      await db.goals.clear();
      if (fetchedTasks.length > 0) {
        await db.tasks.bulkPut(fetchedTasks as Task[]);
      }
      if (fetchedGoals.length > 0) {
        await db.goals.bulkPut(fetchedGoals);
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
      return newTasks;
    });

    // Optionally update Dexie cache as well
    // db.tasks.put(updatedTask as Task).catch(err => console.error("Failed to update Dexie:", err));

  }, []); // No dependencies needed if it only uses setTasks


  const topGoalsWithTasks = useMemo(() => {
    if (!goals || !tasks) return [];

    const limit = 3;
    // This function filters out sub-goals (goals with a parentGoalId) and only considers
    // parent goals for the "Top Three Goals" section on the dashboard.
      // Log the total number of goals and how many are sub-goals
      const subGoalCount = goals.filter(goal => goal.parentGoalId !== null).length;
      console.log(`[DashboardPage] Total goals: ${goals.length}, Sub-goals: ${subGoalCount}, Parent goals: ${goals.length - subGoalCount}`);

      // Filter out sub-goals and completed goals - only include active parent goals
      const parentGoals = goals.filter(goal =>
        goal.parentGoalId === null &&
        goal.progress < 100 &&
        !goal.isArchived
      );
      console.log(`[DashboardPage] After filtering: ${parentGoals.length} active parent goals remain`);

      // Create a map of parent goals to their subgoals
      const subgoalsByParent = parentGoals.reduce((acc, parentGoal) => {
        acc[parentGoal.id] = goals.filter(g => g.parentGoalId === parentGoal.id);
        return acc;
      }, {} as Record<string, GoalWithSubgoalCount[]>);

      // Create a map of goals to their tasks, including tasks from subgoals
      const tasksByGoal = tasks.reduce((acc, task) => {
        if (task.goalId) {
          if (!acc[task.goalId]) acc[task.goalId] = [];
          acc[task.goalId].push(task);
        }
        return acc;
      }, {} as Record<string, Task[]>);

      // Log the tasks by goal for debugging
      console.log('[DashboardPage] Tasks by goal:');
      Object.entries(tasksByGoal).forEach(([goalId, goalTasks]) => {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          console.log(`  "${goal.name}" (${goalId}): ${goalTasks.length} tasks`);
        }
      });

      const scoredGoals = parentGoals.map(goal => {
        // Get tasks directly associated with this goal
        const directGoalTasks = tasksByGoal[goal.id] || [];

        // Get all subgoals for this parent goal
        const subgoals = subgoalsByParent[goal.id] || [];

        // Get tasks associated with all subgoals
        const subgoalTasks = subgoals.flatMap(subgoal => tasksByGoal[subgoal.id] || []);

        // Combine direct goal tasks and subgoal tasks
        const allGoalTasks = [...directGoalTasks, ...subgoalTasks];

        console.log(`[DashboardPage] Goal "${goal.name}": ${directGoalTasks.length} direct tasks, ${subgoals.length} tasks from ${subgoals.length} subgoals, ${allGoalTasks.length} total tasks`);

        // Count active, completed, and overdue tasks
        const activeTasksCount = allGoalTasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.ARCHIVED).length;
        const completedTasksCount = allGoalTasks.filter(t => t.status === TaskStatus.COMPLETED).length;

        // Count overdue tasks (tasks with due date in the past that aren't completed)
        const overdueTasksCount = allGoalTasks.filter(t =>
          t.status !== TaskStatus.COMPLETED &&
          t.dueDate &&
          new Date(t.dueDate) < new Date()
        ).length;

        const totalTasks = allGoalTasks.length;

        // Enhanced scoring formula that gives much higher weight to total tasks and overdue tasks
        // Overdue tasks get a weight of 5 (increased from 3)
        // Total tasks count is now a significant factor (multiplier of 2)
        // Active tasks get a weight of 2, completed tasks 1
        // We also keep the completion ratio bonus
        const score =
          (overdueTasksCount * 5) +  // Increased weight for overdue tasks
          (totalTasks * 2) +         // Added significant weight for total task count
          (activeTasksCount * 2) +   // Kept same weight for active tasks
          (completedTasksCount) +    // Kept same weight for completed tasks
          (totalTasks ? (completedTasksCount / totalTasks) * 5 : 0);

        console.log(`[DashboardPage] Goal "${goal.name}" score: ${score} (overdue: ${overdueTasksCount}, active: ${activeTasksCount}, completed: ${completedTasksCount}, total: ${totalTasks})`);

        return { goal, tasks: allGoalTasks, score };
      });

      // Sort goals by score in descending order
      const sortedGoals = scoredGoals.sort((a, b) => b.score - a.score);

      // Log all goals with their scores before slicing
      console.log('[DashboardPage] All goals sorted by score:');
      sortedGoals.forEach((scoredGoal, index) => {
        const { goal, tasks: goalTasks, score } = scoredGoal; // Renamed tasks to goalTasks to avoid conflict
        const overdueTasksCount = goalTasks.filter(t =>
          t.status !== TaskStatus.COMPLETED &&
          t.dueDate &&
          new Date(t.dueDate) < new Date()
        ).length;

        console.log(`  ${index + 1}. "${goal.name}" (score: ${score.toFixed(2)}, overdue: ${overdueTasksCount}, total: ${goalTasks.length})`);
      });

      // Take the top 'limit' goals
      const topGoals = sortedGoals.slice(0, limit);

      // Log the final top goals
      console.log('[DashboardPage] Final top goals:');
      topGoals.forEach((scoredGoal, index) => {
        const { goal, tasks: goalTasks, score } = scoredGoal; // Renamed tasks to goalTasks
        console.log(`  ${index + 1}. "${goal.name}" (score: ${score.toFixed(2)})`);
      });

      return topGoals.map(({ goal, tasks: goalTasks }) => [goal, goalTasks] as [GoalWithSubgoalCount, Task[]]); // Renamed tasks to goalTasks
  }, [goals, tasks]);

  if (isLoading || !tasks || !goals) { // Simplified loading check
    return <div className="p-4">Loading dashboard data...</div>;
  }

  return (
      <div className="w-full px-2 py-2 flex flex-col h-[calc(100vh-22px)]">
      <div className="flex flex-col gap-2 h-full">
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
        <section className="flex-1 min-h-0">
          {/* Pass the handleTaskUpdate function down */}
          <CalendarContainer
            tasks={tasks}
            goals={goals}
            categories={categories}
            onTaskUpdate={handleTaskUpdate} // Pass the update handler
          />
        </section>
      </div>
    </div>
  );
}
