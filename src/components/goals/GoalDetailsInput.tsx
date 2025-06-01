'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { getNotesForGoal, createNote, updateNote, deleteNote } from '@/actions/notes';
import { cn } from '@/lib/utils';

interface GoalDetailsInputProps {
  goal: {
    id: string;
    name: string;
    description?: string | null;
  };
}

export function GoalDetailsInput({ goal }: GoalDetailsInputProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isPending, startTransition] = useTransition();

  // Fetch notes when component mounts
  React.useEffect(() => {
    if (goal?.id) {
      startTransition(async () => {
        const result = await getNotesForGoal(goal.id);
        if (result.success) {
          setNotes(result.notes || []);
        }
      });
    }
  }, [goal?.id]);

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 pt-1">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCreateNote}
            disabled={!newNoteContent.trim() || isPending}
            variant="outline"
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <CardTitle className="text-lg font-semibold">Goal Details & Notes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden flex flex-col space-y-2">
        {/* Goal Description */}
        {goal.description && (
          <div className="p-2 bg-muted/30 rounded-md border">
            <p className="text-sm whitespace-pre-wrap">{goal.description}</p>
          </div>
        )}

        {/* Add new note */}
        <div>
          <Textarea
            placeholder="Add a note about this goal..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handleCreateNote();
              }
            }}
            className="min-h-[40px] max-h-[40px] resize-none"
            disabled={isPending}
          />
        </div>

        {/* Existing notes - Scrollable */}
        <div className="h-48 overflow-y-auto space-y-1 border rounded-md p-1">
          {notes.map((note) => (
            <div key={note.id} className="px-2 py-1.5 bg-muted/20 rounded border">
              {editingNoteId === note.id ? (
                <div className="space-y-1">
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
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditingNote}
                      disabled={isPending}
                      className="h-6 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editingNoteContent.trim() || isPending}
                      className="h-6 px-2 text-xs"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm whitespace-pre-wrap mb-1">{note.content}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(note.updatedAt), 'MMM d, yyyy h:mm a')}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditingNote(note)}
                        disabled={isPending}
                        className="h-5 w-5 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={isPending}
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              No notes yet. Add your first note above.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
