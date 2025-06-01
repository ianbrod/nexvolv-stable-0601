'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Task as PrismaTask, TaskStatus } from '@prisma/client';

// Define a more complete Task type that includes the goal relationship
type Task = PrismaTask & {
  goal?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
      color: string;
    } | null;
  } | null;
};

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Edit, X, Calendar, Clock, CheckCircle, AlertCircle, NotebookPen, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { getNotesForTask, createNote, updateNote, deleteNote } from '@/actions/notes';

interface TaskDetailViewProps {
  task: Task | null;
  goalName?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
  mode: 'panel' | 'modal'; // 'panel' for side panel, 'modal' for overlay
}

export function UnifiedTaskDetailView({
  task,
  goalName,
  isOpen,
  onOpenChange,
  onEdit,
  mode = 'modal'
}: TaskDetailViewProps) {
  if (!task) return null;

  // State for notes functionality
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isPending, startTransition] = useTransition();

  // Fetch notes when task changes
  useEffect(() => {
    if (task?.id) {
      startTransition(async () => {
        const result = await getNotesForTask(task.id);
        if (result.success) {
          setNotes(result.notes || []);
        }
      });
    }
  }, [task?.id]);

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'No due date';
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  // Get status display
  const getStatusDisplay = (): string => {
    switch (task.status) {
      case TaskStatus.TODO:
        return 'To Do';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.COMPLETED:
        return 'Completed';
      case TaskStatus.ARCHIVED:
        return 'Archived';
      default:
        return 'Unknown';
    }
  };

  // Get status class
  const getStatusClass = (): string => {
    switch (task.status) {
      case TaskStatus.TODO:
        return 'status-badge-todo';
      case TaskStatus.IN_PROGRESS:
        return 'status-badge-in-progress';
      case TaskStatus.COMPLETED:
        return 'status-badge-completed';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  // Get priority display
  const getPriorityDisplay = (): string => {
    switch (task.priority) {
      case 'LOW':
        return 'Low';
      case 'MEDIUM':
        return 'Medium';
      case 'HIGH':
        return 'High';
      default:
        return 'Unknown';
    }
  };

  // Get priority color - matching task card styling
  const getPriorityColor = (): string => {
    switch (task.priority) {
      case 'HIGH':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800';
      case 'MEDIUM':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800';
      case 'LOW':
        return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  // Note handling functions
  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    startTransition(async () => {
      const result = await createNote({
        content: newNoteContent,
        taskId: task.id,
        goalId: null
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
        taskId: task.id,
        goalId: null
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
      {/* All details in a single row: status, priority, time details, notes count */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge className={getStatusClass()}>
          <CheckCircle className="h-3 w-3 mr-1" />
          {getStatusDisplay()}
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            "text-xs px-2 py-0.5 font-normal",
            getPriorityColor()
          )}
        >
          {getPriorityDisplay()}
        </Badge>

        {task.dueDate && (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <span className="text-xs text-muted-foreground block">Due Date</span>
              <span className="font-medium">{formatDate(task.dueDate)}</span>
            </div>
          </div>
        )}

        {task.createdAt && (
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <div>
              <span className="text-xs text-muted-foreground block">Created</span>
              <span className="font-medium">{format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
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
      {task.description && (
        <div>
          <h3 className="text-sm font-medium mb-1 text-muted-foreground">Description</h3>
          <div className="text-sm whitespace-pre-wrap p-2 bg-muted/30 rounded-md border">
            {task.description}
          </div>
        </div>
      )}

      {/* Show completion date if task is completed */}
      {task.status === TaskStatus.COMPLETED && task.completedAt && (
        <div className="flex items-center text-sm p-2 bg-green-50 rounded-md border border-green-100 dark:bg-green-900/30 dark:border-green-800">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
          <span className="dark:text-green-300">Completed on {format(new Date(task.completedAt), 'PPP')}</span>
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
            onClick={(e) => e.stopPropagation()} // Prevent click from bubbling
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
                    onClick={(e) => e.stopPropagation()} // Prevent click from bubbling
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
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEditingNote();
                      }}
                      disabled={isPending}
                      className="h-5 px-1 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateNote(note.id);
                      }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingNote(note);
                        }}
                        disabled={isPending}
                        className="h-4 w-4 p-0"
                      >
                        <Edit className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
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
        <DialogContent
          className="sm:max-w-md task-detail-panel"
          onClick={(e) => e.stopPropagation()} // Prevent click events from bubbling
        >
          <DialogHeader className="pb-1">
            <DialogTitle className="text-2xl font-bold">{task.name}</DialogTitle>
            {goalName && (
              <Badge
                variant="outline"
                className="text-sm font-normal truncate max-w-[200px] w-fit"
                title={goalName}
                style={{
                  borderColor: `${task.goal?.category?.color || '#9ca3af'}80`,
                  color: task.goal?.category?.color || '#9ca3af'
                }}
              >
                {goalName}
              </Badge>
            )}
          </DialogHeader>

          <div onClick={(e) => e.stopPropagation()}>
            {detailContent}
          </div>

          <DialogFooter className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChange(false);
              }}
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                  onEdit(task);
                }}
                className="edit-task-button"
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Task
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateNote();
                }}
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
    <Card className="h-full flex flex-col task-detail-panel">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
        <div className="flex-1">
          <CardTitle className="text-2xl font-bold">{task.name}</CardTitle>
          {goalName && (
            <Badge
              variant="outline"
              className="text-sm font-normal truncate max-w-[200px] w-fit mt-1"
              title={goalName}
              style={{
                borderColor: `${task.goal?.category?.color || '#9ca3af'}80`,
                color: task.goal?.category?.color || '#9ca3af'
              }}
            >
              {goalName}
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
            onClick={() => onEdit(task)}
            className="flex-1 edit-task-button h-7 px-2 text-xs"
            variant="outline"
            size="sm"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit Task
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
