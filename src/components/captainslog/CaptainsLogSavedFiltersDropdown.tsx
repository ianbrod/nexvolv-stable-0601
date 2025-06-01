'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BookmarkPlus, Bookmark, Trash2 } from 'lucide-react';
import { CaptainsLogFilterOptions } from '@/types';
import {
  createCaptainsLogSavedFilter,
  getCaptainsLogSavedFilters,
  deleteCaptainsLogSavedFilter,
} from '@/actions/captains-log-saved-filters';

interface CaptainsLogSavedFiltersDropdownProps {
  currentFilters: CaptainsLogFilterOptions;
  onApplyFilter: (filters: CaptainsLogFilterOptions) => void;
}

export function CaptainsLogSavedFiltersDropdown({ 
  currentFilters, 
  onApplyFilter 
}: CaptainsLogSavedFiltersDropdownProps) {
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
      const result = await getCaptainsLogSavedFilters();
      if (result.success) {
        setSavedFilters(result.savedFilters || []);
      }
    });
  };

  const handleSaveCurrentFilter = async () => {
    if (!filterName.trim()) return;

    startTransition(async () => {
      const result = await createCaptainsLogSavedFilter(
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

  const handleDeleteFilter = async (filterId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    startTransition(async () => {
      const result = await deleteCaptainsLogSavedFilter(filterId);
      if (result.success) {
        await loadSavedFilters();
      }
    });
  };

  const getFilterDisplayName = (filters: CaptainsLogFilterOptions) => {
    if (filters.isMultiSelectMode) {
      const count = filters.selectedFilters.length;
      return `${count} filter${count !== 1 ? 's' : ''} selected`;
    } else {
      return filters.activeFilter === 'recent' ? 'Recent Files' : 
             filters.activeFilter === 'favorites' ? 'Favorites' :
             filters.activeFilter === 'uncategorized' ? 'Uncategorized' :
             filters.activeFilter.startsWith('folder:') ? 'Custom Filter' : 
             'Custom Filter';
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md hover:bg-muted transition-colors"
            title="Saved Filters"
          >
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Saved Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setIsSaveDialogOpen(true)}>
            <BookmarkPlus className="mr-2 h-4 w-4" />
            Save Current Filter
          </DropdownMenuItem>
          
          {savedFilters.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {savedFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => handleApplyFilter(filter)}
                  className="flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{filter.name}</div>
                    {filter.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {filter.description}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    onClick={(e) => handleDeleteFilter(filter.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {savedFilters.length === 0 && (
            <DropdownMenuItem disabled>
              No saved filters yet
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Filter Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>
              Save your current filter configuration: {getFilterDisplayName(currentFilters)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filter-name">Name</Label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Enter filter name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter-description">Description (optional)</Label>
              <Textarea
                id="filter-description"
                value={filterDescription}
                onChange={(e) => setFilterDescription(e.target.value)}
                placeholder="Enter filter description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCurrentFilter}
              disabled={!filterName.trim() || isPending}
            >
              {isPending ? 'Saving...' : 'Save Filter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
