'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Edit, X, Calendar, Clock, CheckCircle, NotebookPen, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { getNotesForGoal, createNote, updateNote, deleteNote } from '@/actions/notes';

// Goal type based on existing goal structure
type Goal = {
  id: string;
  name: string;
  description?: string | null;
  progress: number;
  deadline?: Date | null;
  isArchived: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
  parentGoalId?: string | null;
};

interface GoalDetailViewProps {
  goal: Goal | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (goal: Goal) => void;
  mode: 'panel' | 'modal'; // 'panel' for side panel, 'modal' for overlay
}

export function UnifiedGoalDetailView({
  goal,
  isOpen,
  onOpenChange,
  onEdit,
  mode = 'modal'
}: GoalDetailViewProps) {
  if (!goal) return null;

  // State for notes functionality
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isPending, startTransition] = useTransition();

  // Fetch notes when goal changes
  useEffect(() => {
    if (goal?.id) {
      startTransition(async () => {
        const result = await getNotesForGoal(goal.id);
        if (result.success) {
          setNotes(result.notes || []);
        }
      });
    }
  }, [goal?.id]);

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'No deadline';
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  // Get status display based on progress and completion
  const getStatusDisplay = (): string => {
    if (goal.completedAt || goal.progress === 100) {
      return 'Completed';
    } else if (goal.isArchived) {
      return 'Archived';
    } else if (goal.progress > 0) {
      return 'In Progress';
    } else {
      return 'Not Started';
    }
  };

  // Get status class
  const getStatusClass = (): string => {
    if (goal.completedAt || goal.progress === 100) {
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:border-green-800';
    } else if (goal.isArchived) {
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    } else if (goal.progress > 0) {
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  // Note handling functions
  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    startTransition(async () => {
      const result = await createNote({
        content: newNoteContent,
        goalId: goal.id,
        taskId: null
      });

      if (result.success) {
        setNotes(prev => [result.note, ...prev]);
        setNewNoteContent('');
      }
    });
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return;

    startTransition(async () => {
      const result = await updateNote({
        id: noteId,
        content: editingNoteContent,
        goalId: goal.id,
        taskId: null
      });

      if (result.success) {
        setNotes(prev => prev.map(note =>
          note.id === noteId ? result.note : note
        ));
        setEditingNoteId(null);
        setEditingNoteContent('');
      }
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    startTransition(async () => {
      const result = await deleteNote(noteId);

      if (result.success) {
        setNotes(prev => prev.filter(note => note.id !== noteId));
      }
    });
  };

  const startEditingNote = (note: any) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  // Content to be displayed in both panel and modal modes
  const detailContent = (
    <div className="space-y-2 h-full flex flex-col">
      {/* All details in a single row: status, progress, time details, notes count */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge className={getStatusClass()}>
          <CheckCircle className="h-3 w-3 mr-1" />
          {getStatusDisplay()}
        </Badge>

        <div className="flex items-center">
          <span className="text-xs text-muted-foreground mr-2">Progress:</span>
          <span className="font-medium">{goal.progress}%</span>
        </div>

        {goal.deadline && (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <span className="text-xs text-muted-foreground block">Deadline</span>
              <span className="font-medium">{formatDate(goal.deadline)}</span>
            </div>
          </div>
        )}

        {goal.createdAt && (
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <span className="text-xs text-muted-foreground block">Created</span>
              <span className="font-medium">{format(new Date(goal.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        )}

        <div className="flex items-center">
          <NotebookPen className="h-4 w-4 mr-2 text-muted-foreground" />
          <div>
            <span className="text-xs text-muted-foreground block">Notes</span>
            <span className="font-medium">{notes.length}</span>
          </div>
        </div>
      </div>

      {/* Description section */}
      {goal.description && (
        <div>
          <h3 className="text-sm font-medium mb-1 text-muted-foreground">Description</h3>
          <div className="text-sm whitespace-pre-wrap p-2 bg-muted/30 rounded-md border">
            {goal.description}
          </div>
        </div>
      )}

      {/* Show completion date if goal is completed */}
      {(goal.completedAt || goal.progress === 100) && goal.completedAt && (
        <div className="flex items-center text-sm p-2 bg-green-50 rounded-md border border-green-100 dark:bg-green-900/30 dark:border-green-800">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
          <span className="dark:text-green-300">Completed on {format(new Date(goal.completedAt), 'PPP')}</span>
        </div>
      )}

      {/* Notes Section - This is the only scrollable section */}
      <div className="border-t pt-2 flex-1 flex flex-col min-h-0">
        {/* Add new note */}
        <div className="mb-2">
          <Textarea
            placeholder="Add a note..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handleCreateNote();
              }
            }}
            className="min-h-[40px] max-h-[120px] resize-none"
            disabled={isPending}
          />
        </div>

        {/* Existing notes - Only this part scrolls */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {notes.map((note) => (
            <div key={note.id} className="px-0.5 py-0.5 bg-muted/20 rounded border">
              {editingNoteId === note.id ? (
                <div className="space-y-0.5">
                  <Textarea
                    value={editingNoteContent}
                    onChange={(e) => setEditingNoteContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateNote(note.id);
                      }
                    }}
                    className="min-h-[60px] resize-none"
                    disabled={isPending}
                  />
                  <div className="flex justify-end gap-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditingNote}
                      disabled={isPending}
                      className="h-5 px-1 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editingNoteContent.trim() || isPending}
                      className="h-5 px-1 text-xs"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm whitespace-pre-wrap">{note.content}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(note.updatedAt), 'MMM d, yyyy h:mm a')}</span>
                    <div className="flex gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditingNote(note)}
                        disabled={isPending}
                        className="h-4 w-4 p-0"
                      >
                        <Edit className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={isPending}
                        className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-1">
              No notes yet. Add your first note above.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render as modal
  if (mode === 'modal') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md goal-detail-panel">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-2xl font-bold">{goal.name}</DialogTitle>
            {goal.category && (
              <Badge
                variant="outline"
                className="text-sm font-normal truncate max-w-[200px] w-fit"
                title={goal.category.name}
                style={{
                  borderColor: `${goal.category.color || '#9ca3af'}80`,
                  color: goal.category.color || '#9ca3af'
                }}
              >
                {goal.category.name}
              </Badge>
            )}
          </DialogHeader>

          {detailContent}

          <DialogFooter className="flex justify-between items-center">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onEdit(goal);
                }}
                className="edit-goal-button"
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Goal
              </Button>
              <Button
                size="sm"
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || isPending}
                variant="outline"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Note
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Render as panel
  return (
    <Card className="h-full flex flex-col goal-detail-panel">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
        <div className="flex-1">
          <CardTitle className="text-2xl font-bold">{goal.name}</CardTitle>
          {goal.category && (
            <Badge
              variant="outline"
              className="text-sm font-normal truncate max-w-[200px] w-fit mt-1"
              title={goal.category.name}
              style={{
                borderColor: `${goal.category.color || '#9ca3af'}80`,
                color: goal.category.color || '#9ca3af'
              }}
            >
              {goal.category.name}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        {detailContent}
      </CardContent>
      <CardFooter className="border-t p-1">
        <div className="flex gap-1 w-full">
          <Button
            onClick={() => onEdit(goal)}
            className="flex-1 edit-goal-button h-7 px-2 text-xs"
            variant="outline"
            size="sm"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit Goal
          </Button>
          <Button
            size="sm"
            onClick={handleCreateNote}
            disabled={!newNoteContent.trim() || isPending}
            variant="outline"
            className="flex-1 h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Note
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
