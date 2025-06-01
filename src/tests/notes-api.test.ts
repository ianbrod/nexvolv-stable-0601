// src/tests/notes-api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getNote } from '@/app/api/notes/[noteId]/route';
import { GET as getAllNotes } from '@/app/api/notes/all/route';
import { POST as createNote } from '@/app/api/notes/route';
import { createNote as createNoteAction, updateNote, deleteNote } from '@/actions/notes';

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    goal: {
      findUnique: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock the revalidatePath function
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Notes API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notes/[noteId]', () => {
    it('should return a note when it exists', async () => {
      // Mock the note data
      const mockNote = {
        id: 'note1',
        title: 'Test Note',
        content: 'Test Content',
        userId: 'user_placeholder',
        goalId: 'goal1',
        taskId: null,
        goal: { id: 'goal1', name: 'Test Goal' },
        task: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the findUnique response
      (prisma.note.findUnique as any).mockResolvedValueOnce(mockNote);

      // Call the function
      const response = await getNote({} as NextRequest, { params: { noteId: 'note1' } });
      const data = await response.json();

      // Check the response
      expect(data.success).toBe(true);
      expect(data.note).toEqual(mockNote);
    });

    it('should return 404 when note does not exist', async () => {
      // Mock the findUnique response
      (prisma.note.findUnique as any).mockResolvedValueOnce(null);

      // Call the function
      const response = await getNote({} as NextRequest, { params: { noteId: 'nonexistent' } });
      const data = await response.json();

      // Check the response
      expect(data.success).toBe(false);
      expect(data.message).toBe('Note not found');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/notes/all', () => {
    it('should return all notes for the user', async () => {
      // Mock the notes data
      const mockNotes = [
        {
          id: 'note1',
          title: 'Test Note 1',
          content: 'Test Content 1',
          userId: 'user_placeholder',
          goalId: 'goal1',
          taskId: null,
          goal: { id: 'goal1', name: 'Test Goal' },
          task: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'note2',
          title: 'Test Note 2',
          content: 'Test Content 2',
          userId: 'user_placeholder',
          goalId: null,
          taskId: 'task1',
          goal: null,
          task: { id: 'task1', name: 'Test Task' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock the findMany response
      (prisma.note.findMany as any).mockResolvedValueOnce(mockNotes);

      // Create a mock request with URL
      const mockRequest = {
        url: 'http://localhost:3000/api/notes/all',
      } as NextRequest;

      // Call the function
      const response = await getAllNotes(mockRequest);
      const data = await response.json();

      // Check the response
      expect(data.success).toBe(true);
      expect(data.notes).toEqual(mockNotes);
    });

    it('should filter notes by goalId when provided', async () => {
      // Mock the notes data
      const mockNotes = [
        {
          id: 'note1',
          title: 'Test Note 1',
          content: 'Test Content 1',
          userId: 'user_placeholder',
          goalId: 'goal1',
          taskId: null,
          goal: { id: 'goal1', name: 'Test Goal' },
          task: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock the findMany response
      (prisma.note.findMany as any).mockResolvedValueOnce(mockNotes);

      // Create a mock request with URL including query parameter
      const mockRequest = {
        url: 'http://localhost:3000/api/notes/all?goalId=goal1',
      } as NextRequest;

      // Call the function
      const response = await getAllNotes(mockRequest);
      const data = await response.json();

      // Check the response
      expect(data.success).toBe(true);
      expect(data.notes).toEqual(mockNotes);
      
      // Check that findMany was called with the correct filter
      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user_placeholder',
            goalId: 'goal1',
          }),
        })
      );
    });
  });

  describe('POST /api/notes', () => {
    it('should create a new note when input is valid', async () => {
      // Mock the goal findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce({
        id: 'goal1',
        name: 'Test Goal',
        userId: 'user_placeholder',
      });

      // Mock the note create response
      const mockCreatedNote = {
        id: 'note1',
        title: 'Test Note',
        content: 'Test Content',
        userId: 'user_placeholder',
        goalId: 'goal1',
        taskId: null,
        goal: { id: 'goal1', name: 'Test Goal' },
        task: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.note.create as any).mockResolvedValueOnce(mockCreatedNote);

      // Create a mock request with body
      const mockRequest = {
        json: () => Promise.resolve({
          title: 'Test Note',
          content: 'Test Content',
          goalId: 'goal1',
        }),
      } as NextRequest;

      // Call the function
      const response = await createNote(mockRequest);
      const data = await response.json();

      // Check the response
      expect(data.success).toBe(true);
      expect(data.note).toEqual(mockCreatedNote);
    });

    it('should return 400 when input is invalid', async () => {
      // Create a mock request with invalid body (missing content)
      const mockRequest = {
        json: () => Promise.resolve({
          title: 'Test Note',
          // Missing content
          goalId: 'goal1',
        }),
      } as NextRequest;

      // Call the function
      const response = await createNote(mockRequest);
      const data = await response.json();

      // Check the response
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid input data.');
      expect(response.status).toBe(400);
    });
  });

  describe('createNote action', () => {
    it('should create a note and return success', async () => {
      // Mock the goal findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce({
        id: 'goal1',
        name: 'Test Goal',
        userId: 'user_placeholder',
      });

      // Mock the note create response
      const mockCreatedNote = {
        id: 'note1',
        title: 'Test Note',
        content: 'Test Content',
        userId: 'user_placeholder',
        goalId: 'goal1',
        taskId: null,
        goal: { id: 'goal1', name: 'Test Goal' },
        task: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.note.create as any).mockResolvedValueOnce(mockCreatedNote);

      // Call the action
      const result = await createNoteAction({
        title: 'Test Note',
        content: 'Test Content',
        goalId: 'goal1',
        taskId: null,
      });

      // Check the result
      expect(result.success).toBe(true);
      expect(result.note).toEqual(mockCreatedNote);
    });
  });

  describe('updateNote action', () => {
    it('should update a note and return success', async () => {
      // Mock the note findUnique response
      (prisma.note.findUnique as any).mockResolvedValueOnce({
        id: 'note1',
        title: 'Old Title',
        content: 'Old Content',
        userId: 'user_placeholder',
        goalId: 'goal1',
        taskId: null,
      });

      // Mock the goal findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce({
        id: 'goal1',
        name: 'Test Goal',
        userId: 'user_placeholder',
      });

      // Mock the note update response
      const mockUpdatedNote = {
        id: 'note1',
        title: 'Updated Title',
        content: 'Updated Content',
        userId: 'user_placeholder',
        goalId: 'goal1',
        taskId: null,
        goal: { id: 'goal1', name: 'Test Goal' },
        task: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.note.update as any).mockResolvedValueOnce(mockUpdatedNote);

      // Call the action
      const result = await updateNote({
        id: 'note1',
        title: 'Updated Title',
        content: 'Updated Content',
        goalId: 'goal1',
        taskId: null,
      });

      // Check the result
      expect(result.success).toBe(true);
      expect(result.note).toEqual(mockUpdatedNote);
    });
  });

  describe('deleteNote action', () => {
    it('should delete a note and return success', async () => {
      // Mock the note findUnique response
      (prisma.note.findUnique as any).mockResolvedValueOnce({
        id: 'note1',
        title: 'Test Note',
        content: 'Test Content',
        userId: 'user_placeholder',
        goalId: 'goal1',
        taskId: null,
      });

      // Mock the note delete response
      (prisma.note.delete as any).mockResolvedValueOnce({});

      // Call the action
      const result = await deleteNote('note1');

      // Check the result
      expect(result.success).toBe(true);
      expect(result.message).toBe('Note deleted successfully.');
    });
  });
});
