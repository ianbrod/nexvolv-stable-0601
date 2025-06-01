'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { BookmarkIcon, Plus, Trash2, Star } from 'lucide-react';
import { TaskFilterOptions } from './TaskFilters';
import { getSavedFilters, createSavedFilter, deleteSavedFilter, updateSavedFilter } from '@/actions/saved-filters';

interface SavedFiltersDropdownProps {
  currentFilters: TaskFilterOptions;
  onApplyFilter: (filters: TaskFilterOptions) => void;
}

export function SavedFiltersDropdown({ currentFilters, onApplyFilter }: SavedFiltersDropdownProps) {
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [isPending, startTransition] = useTransition();

  // Load saved filters on component mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = async () => {
    startTransition(async () => {
      const result = await getSavedFilters();
      if (result.success) {
        setSavedFilters(result.savedFilters || []);
      }
    });
  };

  const handleSaveCurrentFilter = async () => {
    if (!filterName.trim()) return;

    startTransition(async () => {
      const result = await createSavedFilter(
        filterName,
        currentFilters,
        filterDescription || undefined
      );

      if (result.success) {
        await loadSavedFilters();
        setIsSaveDialogOpen(false);
        setFilterName('');
        setFilterDescription('');
      }
    });
  };

  const handleApplyFilter = (savedFilter: any) => {
    try {
      const filterData = JSON.parse(savedFilter.filterData);
      onApplyFilter(filterData);
      setIsOpen(false);
    } catch (error) {
      console.error('Error parsing saved filter:', error);
    }
  };

  const handleDeleteFilter = async (filterId: string) => {
    startTransition(async () => {
      const result = await deleteSavedFilter(filterId);
      if (result.success) {
        await loadSavedFilters();
      }
    });
  };

  const handleSetAsDefault = async (filterId: string) => {
    startTransition(async () => {
      const result = await updateSavedFilter(filterId, { isDefault: true });
      if (result.success) {
        await loadSavedFilters();
      }
    });
  };

  // Check if current filters have any active filters
  const hasActiveFilters = () => {
    return (
      currentFilters.status !== null ||
      currentFilters.priority !== null ||
      currentFilters.goalId !== null ||
      currentFilters.goalIds.length > 0 ||
      currentFilters.categoryIds.length > 0 ||
      currentFilters.isOverdue ||
      (currentFilters.searchQuery && currentFilters.searchQuery.trim() !== '')
    );
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 transition-all duration-200 hover:bg-accent/50"
            title="Saved Filters"
          >
            <BookmarkIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {savedFilters.length > 0 && (
            <>
              {savedFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  className="flex items-center justify-between p-2"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApplyFilter(filter)}
                        className="text-left flex-1 min-w-0 hover:text-primary"
                      >
                        <div className="font-medium truncate">{filter.name}</div>
                        {filter.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {filter.description}
                          </div>
                        )}
                      </button>
                      {filter.isDefault && (
                        <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {!filter.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetAsDefault(filter.id)}
                        disabled={isPending}
                        className="h-6 w-6 p-0"
                        title="Set as default"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteFilter(filter.id)}
                      disabled={isPending}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      title="Delete filter"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onSelect={() => setIsSaveDialogOpen(true)}
            disabled={!hasActiveFilters() || isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Save Current Filter
          </DropdownMenuItem>

          {savedFilters.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No saved filters yet.
              {hasActiveFilters() && (
                <div className="mt-1">
                  Apply some filters and save them.
                </div>
              )}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Filter Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Enter filter name..."
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor="filter-description">Description (optional)</Label>
              <Input
                id="filter-description"
                value={filterDescription}
                onChange={(e) => setFilterDescription(e.target.value)}
                placeholder="Enter description..."
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCurrentFilter}
              disabled={!filterName.trim() || isPending}
            >
              Save Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
