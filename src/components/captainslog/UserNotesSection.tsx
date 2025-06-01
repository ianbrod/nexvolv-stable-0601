'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Check, X, NotebookPen, Trash2 } from 'lucide-react';
import { LogEntry } from '@/types';

interface UserNotesSectionProps {
  entry: LogEntry;
  onUpdate: (updatedEntry: LogEntry) => void;
}

/**
 * User Notes Section Component
 *
 * Features:
 * - Display user notes with edit functionality
 * - Inline editing with save/cancel actions
 * - Responsive design for split-screen layout
 */
export function UserNotesSection({ entry, onUpdate }: UserNotesSectionProps) {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // Parse existing notes as individual note items (for now, treat as single note)
  const notes = entry.notes ? [{
    id: 'main-note',
    content: entry.notes,
    updatedAt: entry.updatedAt || new Date()
  }] : [];

  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;

    // For now, append to existing notes or create new
    const existingNotes = entry.notes || '';
    const newNotes = existingNotes ? `${existingNotes}\n\n${newNoteContent}` : newNoteContent;

    const updatedEntry = {
      ...entry,
      notes: newNotes,
      updatedAt: new Date()
    };
    onUpdate(updatedEntry);
    setNewNoteContent('');
  };

  const handleUpdateNote = (noteId: string) => {
    if (!editingNoteContent.trim()) return;

    const updatedEntry = {
      ...entry,
      notes: editingNoteContent,
      updatedAt: new Date()
    };
    onUpdate(updatedEntry);
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleDeleteNote = () => {
    const updatedEntry = {
      ...entry,
      notes: '',
      updatedAt: new Date()
    };
    onUpdate(updatedEntry);
  };

  const startEditingNote = (note: any) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleCreateNote();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setNewNoteContent('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
        <CardContent className="p-2 pt-0 h-full flex flex-col">
          <div className="mb-0">
            <h2 className="text-lg font-medium flex items-center">
              <NotebookPen className="h-4 w-4 mr-2" />
              Notes
            </h2>
          </div>

          {/* Notes content - always editable like tasks detail */}
          <div className="flex-1 flex flex-col space-y-1 min-h-0">
            {/* Add new note input - single line */}
            <div className="space-y-1">
              <Input
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="focus:border-primary"
                placeholder="Add your personal notes about this recording..."
              />
              <p className="text-xs text-muted-foreground">
                Ctrl+Enter to save, Esc to cancel
              </p>
            </div>

            {/* Existing notes display */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
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
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditingNote();
                          }
                        }}
                        className="min-h-[60px] resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Ctrl+Enter to save, Esc to cancel
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm whitespace-pre-wrap mb-1">{note.content}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Last updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingNote(note)}
                            className="h-5 w-5 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDeleteNote}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
