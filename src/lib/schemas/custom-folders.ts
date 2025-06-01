import * as z from 'zod';

// --- Base Custom Folder Fields ---
const CustomFolderBaseSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(50, "Folder name must be 50 characters or less"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
});

// --- Create Custom Folder Schema ---
export const CreateCustomFolderSchema = CustomFolderBaseSchema;

// --- Update Custom Folder Schema ---
export const UpdateCustomFolderSchema = z.object({
  id: z.string().cuid("Invalid folder ID format"),
  name: z.string().min(1, "Folder name is required").max(50, "Folder name must be 50 characters or less").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
});

// --- Type exports ---
export type CreateCustomFolderInput = z.infer<typeof CreateCustomFolderSchema>;
export type UpdateCustomFolderInput = z.infer<typeof UpdateCustomFolderSchema>;
