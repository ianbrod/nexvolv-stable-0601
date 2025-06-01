'use client';

import React, { useState, useEffect } from 'react';
import { Reminder } from '@/types';
import { useReminders } from '@/contexts/ReminderContext';
import { ReminderItem } from './ReminderItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Filter, Plus, RefreshCw } from 'lucide-react';
import { ReminderStatus } from '@/lib/schemas/reminders';
import { ReminderForm } from '@/components/reminders/ReminderForm';
import { TestReminderButton } from '@/components/reminders/TestReminderButton';

interface ReminderListProps {
  initialReminders?: Reminder[];
}

export function ReminderList({ initialReminders = [] }: ReminderListProps) {
  // Get reminders from context
  const { reminders, refreshReminders, isLoading, error } = useReminders();

  // Local state for filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch reminders when component mounts
  useEffect(() => {
    const fetchReminders = async () => {
      await refreshReminders();
    };

    fetchReminders();
  }, [refreshReminders]);

  // Filter reminders based on search query and status filter
  const filteredReminders = reminders.filter(reminder => {
    // Filter by search query
    const matchesSearch =
      (reminder.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      ((reminder.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || false);

    // Filter by status
    const matchesStatus =
      statusFilter === 'ALL' ||
      reminder.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    refreshReminders();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with title and add button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Reminders</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              setIsRefreshing(true);
              await refreshReminders();
              setIsRefreshing(false);
            }}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="outline"
          size="sm"
          className="bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 text-black dark:bg-amber-700/30 dark:hover:bg-amber-700/50 dark:border-amber-700 dark:text-amber-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Reminder
        </Button>
      </div>

      {/* Add Reminder Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Reminder</DialogTitle>
            </DialogHeader>
            <ReminderForm
              onFormSubmitSuccess={handleFormSuccess}
              onCancel={handleCancel}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Test Reminder Button */}
      <div className="flex justify-end">
        <div className="w-48">
          <TestReminderButton />
        </div>
      </div>

      {/* Search and filter controls */}
      <div className="flex gap-2">
        <Input
          placeholder="Search reminders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={statusFilter === 'ALL'}
              onCheckedChange={() => setStatusFilter('ALL')}
            >
              All
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === 'PENDING'}
              onCheckedChange={() => setStatusFilter('PENDING')}
            >
              Pending
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === 'COMPLETED'}
              onCheckedChange={() => setStatusFilter('COMPLETED')}
            >
              Completed
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === 'DISMISSED'}
              onCheckedChange={() => setStatusFilter('DISMISSED')}
            >
              Dismissed
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === 'SNOOZED'}
              onCheckedChange={() => setStatusFilter('SNOOZED')}
            >
              Snoozed
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reminders list - scrollable container with visible scrollbar */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 scrollbar-visible"
           style={{
             scrollbarWidth: 'thin',
             scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
           }}>
        {isLoading && !isRefreshing ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>Error loading reminders: {error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => refreshReminders()}
            >
              Try Again
            </Button>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {reminders.length === 0
              ? "No reminders found. Create your first reminder to get started!"
              : "No reminders match your search criteria."}
          </div>
        ) : (
          filteredReminders.map((reminder, index) => (
            <ReminderItem
              key={`${reminder.id}-${index}`}
              reminder={reminder}
              onRefresh={refreshReminders}
            />
          ))
        )}
      </div>
    </div>
  );
}
