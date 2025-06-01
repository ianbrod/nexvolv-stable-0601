'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { GoalModal } from './GoalModal';
import { GoalDetailPanel } from './GoalDetailPanel';
import { TaskModal } from '../tasks/TaskModal';
import { NewGoalButton } from './NewGoalButton';
import { NewCategoryButton } from '../categories/NewCategoryButton';
import { deleteGoal } from '@/actions/goals';
import { updateGoalOrder } from '@/actions/updateGoalOrder';
import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';
import { ClientDraggableCategoriesList } from '@/components/categories/ClientDraggableCategoriesList';

// Import the extracted components
import { RenderGoalHierarchy } from './RenderGoalHierarchy';
import { ClientDraggableGoalList } from './ClientDraggableGoalList';
import { CategoriesPanel } from './CategoriesPanel';
import { GoalListHeader } from './GoalListHeader';
import { GoalDetailPanelWrapper } from './GoalDetailPanelWrapper';

// Import panel resize functionality
import { usePanelResize } from './hooks/useGoalAccordionResize';

// Import shared types
import { GoalCardData, CategoryData } from './types';
import { GoalListWrapperProps } from './goal-list-types';

export function GoalListWrapper({ goals, categories }: GoalListWrapperProps) {
  const router = useRouter(); // Initialize router
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Component state
  const [goalToEdit, setGoalToEdit] = useState<GoalCardData | null>(null);
  const [isPendingDelete, startDeleteTransition] = useTransition();
  // Archive functionality removed - completed goals automatically go to wins page
  const [selectedGoal, setSelectedGoal] = useState<GoalCardData | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskGoalId, setTaskGoalId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isPendingReorder, startReorderTransition] = useTransition();
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categorySelectMode, setCategorySelectMode] = useState(false);

  // Panel resize functionality
  const {
    width: tasksPanelWidth,
    isResizing: isPanelResizing,
    setWidth: setTasksPanelWidth,
    startResize: startPanelResize,
    stopResize: stopPanelResize,
    resetToDefault: resetPanelWidth,
    getConstrainedWidth: getConstrainedPanelWidth
  } = usePanelResize({
    panelId: 'goals-tasks-panel',
    defaultWidth: 400,
    minWidth: 300,
    maxWidth: undefined // Allow dynamic calculation to extend to middle of page
  });

  // Check localStorage for expanded goals on component mount
  useEffect(() => {
    // First check for single expanded goal ID (for backward compatibility)
    const expandedGoalId = localStorage.getItem('expandedGoalId');
    if (expandedGoalId) {
      // Add the expanded goal to the set
      setExpandedGoals(prev => {
        const newSet = new Set(prev);
        newSet.add(expandedGoalId);
        return newSet;
      });

      // Clear the localStorage item to avoid expanding on future page loads
      localStorage.removeItem('expandedGoalId');
    }

    // Then check for all expanded goal IDs (new approach)
    try {
      const allExpandedGoalIdsStr = localStorage.getItem('allExpandedGoalIds');
      if (allExpandedGoalIdsStr) {
        const allExpandedGoalIds = JSON.parse(allExpandedGoalIdsStr);
        if (Array.isArray(allExpandedGoalIds) && allExpandedGoalIds.length > 0) {
          console.log('Restoring expanded goals from localStorage:', allExpandedGoalIds);
          setExpandedGoals(prev => {
            const newSet = new Set(prev);
            allExpandedGoalIds.forEach(id => newSet.add(id));
            return newSet;
          });
        }

        // Clear the localStorage item to avoid expanding on future page loads
        localStorage.removeItem('allExpandedGoalIds');
      }
    } catch (err) {
      console.error('Error restoring expanded goals from localStorage:', err);
    }
  }, []);

  // Handle ESC key to exit category select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && categorySelectMode) {
        setCategorySelectMode(false);
        // If multiple categories are selected, keep only the first one
        if (selectedCategoryIds.length > 1) {
          setSelectedCategoryIds([selectedCategoryIds[0]]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categorySelectMode, selectedCategoryIds]);

  // Handler for showing the detail panel (no navigation)
  const handleCardClick = (goalId: string) => {
    // Check if we're clicking the same goal that's already selected
    const isSameGoal = selectedGoal && selectedGoal.id === goalId;

    if (isSameGoal) {
      // If clicking the same goal, just close the panel
      setSelectedGoal(null);
      return;
    }

    // Find the goal
    const goal = goals.find(g => g.id === goalId) || null;

    // Set the selected goal for the detail panel
    setSelectedGoal(goal);

    // No navigation - just update the UI state
    console.log('Goal selected for detail panel:', goal?.name);
  };

  // Handler for toggling goal expansion (for sub-goals)
  const handleExpandToggle = (goalId: string, e: React.MouseEvent) => {
    // Stop propagation to prevent card click
    e.stopPropagation();

    // Allow expanding any goal that has subgoals, not just parent goals
    const goal = goals.find(g => g.id === goalId) || null;
    if (goal) {
      // Check if this goal has any subgoals (including both active and archived)
      // Use the subGoalCount from the goal data which includes all subgoals
      const hasSubGoals = goal.subGoalCount > 0 || goals.some(g => g.parentGoalId === goalId);

      if (hasSubGoals) {
        // Toggle the expanded state immediately for better responsiveness
        const isCurrentlyExpanded = expandedGoals.has(goalId);

        // Update state with the new expansion state
        setExpandedGoals(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyExpanded) {
            newSet.delete(goalId);
          } else {
            newSet.add(goalId);
          }
          return newSet;
        });

        console.log('Goal expansion toggled:', goal.name, isCurrentlyExpanded ? 'collapsed' : 'expanded');

        // Save expanded goals to localStorage for persistence
        try {
          const expandedGoalIds = Array.from(expandedGoals);
          localStorage.setItem('allExpandedGoalIds', JSON.stringify(expandedGoalIds));
        } catch (err) {
          console.error('Error saving expanded goals to localStorage:', err);
        }
      }
    }
  };

  // Handler for collapsing all expanded goals
  const handleCollapseAll = () => {
    setExpandedGoals(new Set());
    console.log('All goals collapsed');

    // Clear localStorage
    try {
      localStorage.removeItem('allExpandedGoalIds');
    } catch (err) {
      console.error('Error clearing expanded goals from localStorage:', err);
    }
  };

  // Handler to open the modal for editing a specific goal
  const handleEditClick = (goal: GoalCardData) => {
    setGoalToEdit(goal);
    setIsModalOpen(true);
  };

  // Handler to close the modal (clears the goal being edited)
  const handleCloseModal = () => {
    // If we were editing a goal and it has a parent, expand the parent
    if (goalToEdit?.parentGoalId) {
      setExpandedGoals(prev => {
        const newSet = new Set(prev);
        newSet.add(goalToEdit.parentGoalId!);
        return newSet;
      });
    }

    // If we were editing a goal that might have sub-goals, expand it
    if (goalToEdit && goalToEdit.subGoalCount > 0) {
      setExpandedGoals(prev => {
        const newSet = new Set(prev);
        newSet.add(goalToEdit.id);
        return newSet;
      });
    }

    setIsModalOpen(false);
    setGoalToEdit(null);
  };

  // Handler to close the detail panel
  const handleCloseDetailPanel = () => {
    setSelectedGoal(null);
  };

  // Handler to open the task modal
  const handleAddTask = (goalId: string) => {
    setTaskGoalId(goalId);
    setIsTaskModalOpen(true);
  };

  // Handler to close the task modal
  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setTaskGoalId(null);
  };

  // Delete handler
  const handleDeleteConfirm = (id: string) => {
    startDeleteTransition(async () => {
      try {
        const result = await deleteGoal(id);
        if (result.success) {
          console.log("Goal deleted successfully");
        } else {
          console.error("Failed to delete goal:", result.message);
        }
      } catch (err) {
        console.error("Error during goal deletion:", err);
      }
    });
  };

  // Archive functionality removed - completed goals automatically go to wins page

  // Handle category selection
  const handleCategoryClick = (categoryId: string | null) => {
    if (categoryId === null) {
      // "All Categories" option - clear selection
      setSelectedCategoryIds([]);
    } else {
      if (categorySelectMode) {
        // In select mode: Toggle the category in the selection (multi-select)
        setSelectedCategoryIds(prev => {
          const isSelected = prev.includes(categoryId);
          if (isSelected) {
            // Remove the category if it's already selected
            return prev.filter(id => id !== categoryId);
          } else {
            // Add the category if it's not selected
            return [...prev, categoryId];
          }
        });
      } else {
        // In normal mode: Select only this category (single-select)
        setSelectedCategoryIds([categoryId]);
      }
    }
  };

  // Clear all selected categories
  const handleClearCategorySelection = () => {
    setSelectedCategoryIds([]);
  };

  // Handle category select mode toggle
  const handleCategorySelectModeToggle = () => {
    setCategorySelectMode(prev => {
      const newMode = !prev;
      // If exiting select mode and multiple categories are selected, keep only the first one
      if (!newMode && selectedCategoryIds.length > 1) {
        setSelectedCategoryIds([selectedCategoryIds[0]]);
      }
      return newMode;
    });
  };

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handle categories reordering
  const handleCategoriesReordered = (newOrder: CategoryData[]) => {
    console.log('Categories reordered:', newOrder);
    // Force a router refresh to ensure the UI is consistent
    // This will help ensure the categories stay in their correct positions
    startReorderTransition(() => {
      router.refresh();
    });
  };

  // Handle goals reordering
  const handleGoalsReordered = async (newOrder: GoalCardData[]) => {
    console.log('Goals reordered:', newOrder);

    // The DraggableGoalList component now handles the direct API call for immediate persistence
    // This function is just used to update any local state if needed

    // We no longer force a router refresh here to avoid the flashing effect
    // The local state in DraggableGoalList is already updated for a smooth UI experience
  };

  // Filter goals based on selected category and search query
  const filteredGoals = goals
    .filter(goal => {
      // Filter by categories if any are selected
      let categoryMatch = true;

      if (selectedCategoryIds.length > 0) {
        // For parent goals, check if they match any of the selected categories
        if (!goal.parentGoalId) {
          categoryMatch = goal.categoryId ? selectedCategoryIds.includes(goal.categoryId) : false;
        } else {
          // For sub-goals, include them if their parent matches any of the selected categories
          const parentGoal = goals.find(g => g.id === goal.parentGoalId);
          categoryMatch = parentGoal?.categoryId ? selectedCategoryIds.includes(parentGoal.categoryId) : false;
        }
      }

      // Filter by search query if provided
      let searchMatch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = goal.name.toLowerCase().includes(query);
        const descriptionMatch = goal.description?.toLowerCase().includes(query) || false;

        // Check tags - handle both string and array formats
        let tagsMatch = false;
        if (goal.tags) {
          if (typeof goal.tags === 'string') {
            // If tags is a string, split by comma and check each tag
            tagsMatch = goal.tags.toLowerCase().split(',').some(tag =>
              tag.trim().includes(query)
            );
          } else if (Array.isArray(goal.tags)) {
            // If tags is an array, check each tag
            tagsMatch = goal.tags.some(tag =>
              tag.toLowerCase().includes(query)
            );
          }
        }

        searchMatch = nameMatch || descriptionMatch || tagsMatch;
      }

      return categoryMatch && searchMatch;
    })
    // Sort goals based on their properties
    .sort((a, b) => {
      // First sort by parentGoalId (null values first)
      if (a.parentGoalId !== b.parentGoalId) {
        if (!a.parentGoalId) return -1;
        if (!b.parentGoalId) return 1;
        return 0;
      }
      // Then sort by order
      return (a as any).order - (b as any).order;
    });

  // Log all goals and sub-goals for debugging
  console.log('All goals:', goals);
  console.log('Filtered goals:', filteredGoals);
  console.log('Sub-goals:', goals.filter(g => g.parentGoalId));

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)] overflow-hidden">
      {/* Categories Panel (Left) */}
      <CategoriesPanel
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        onCategoryClick={handleCategoryClick}
        onCategoriesReordered={handleCategoriesReordered}
        onClearSelection={handleClearCategorySelection}
        selectMode={categorySelectMode}
        onSelectModeToggle={handleCategorySelectModeToggle}
      />

      {/* Goals Panel (Middle) - Takes remaining width when no goal is selected, adjusts based on tasks panel width when goal is selected */}
      <div
        className="flex-1 min-w-0 px-4 transition-all duration-300 ease-in-out flex flex-col"
        style={{
          maxWidth: selectedGoal ? `calc(100% - ${tasksPanelWidth}px)` : '100%'
        }}
      >
        {/* Goal List Header - Fixed height */}
        <div className="flex-shrink-0">
          <GoalListHeader
            categories={categories}
            parentGoals={goals.filter(goal => !goal.parentGoalId)} // Only pass top-level goals
            onCollapseAll={handleCollapseAll}
            hasExpandedGoals={expandedGoals.size > 0}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
        </div>

        {/* Goal List Area - Flexible height */}
        <div className="flex-grow overflow-auto h-full space-y-4 pb-8">
          {filteredGoals.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              {searchQuery.trim() ? (
                <div>
                  <p>No goals found matching "{searchQuery}"</p>
                  <p className="text-sm mt-2">Try adjusting your search terms or clear the search to see all goals.</p>
                </div>
              ) : selectedCategoryIds.length > 0 ? (
                <p>No goals found in the selected categories.</p>
              ) : (
                <p>No active goals found. Create one to get started!</p>
              )}
            </div>
          ) : (
            // Use the ClientDraggableGoalList component to avoid hydration issues
            <ClientDraggableGoalList
              goals={filteredGoals}
              categories={categories}
              onEdit={handleEditClick}
              onDelete={handleDeleteConfirm}
              isCompletedView={false}
              onClick={handleCardClick}
              onExpandToggle={handleExpandToggle}
              expandedGoals={expandedGoals}
              onGoalsReordered={handleGoalsReordered}
              selectedGoalId={selectedGoal?.id || null}
            />
          )}
        </div>
      </div>

      {/* Tasks Panel (Right) - Only shown when a goal is selected */}
      {selectedGoal && (
        <GoalDetailPanelWrapper
          goal={selectedGoal}
          categories={categories}
          onClose={handleCloseDetailPanel}
          onAddTask={handleAddTask}
          subGoals={goals.filter(g => g.parentGoalId === selectedGoal.id)}
          width={tasksPanelWidth}
          onResize={setTasksPanelWidth}
          onResizeStart={startPanelResize}
          onResizeEnd={stopPanelResize}
          onResetWidth={resetPanelWidth}
          getConstrainedWidth={getConstrainedPanelWidth}
        />
      )}

      {/* Edit Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        categories={categories}
        goalToEdit={goalToEdit}
      />

      {/* Add Task Modal */}
      {taskGoalId && (
        <TaskModal
          mode="create"
          isOpen={isTaskModalOpen}
          onOpenChange={(open) => {
            handleCloseTaskModal();
            // Force a refresh when the modal is closed to update the task list
            if (!open) {
              router.refresh();
            }
          }}
          initialData={{ goalId: taskGoalId }}
          goals={goals} // Pass all goals
        />
      )}
    </div>
  );
}