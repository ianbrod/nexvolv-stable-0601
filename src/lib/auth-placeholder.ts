// This is a temporary file to store the user ID for development purposes
// In a real app, this would be handled by a proper authentication system

// Use a consistent user ID for development that matches the data in the database
// This ID is used for fetching categories, goals, and other user-specific data
export const PLACEHOLDER_USER_ID = "user_placeholder";

// Note: This ID should match the one used in the seed script (prisma/seed.js)
// If you're seeing foreign key constraint errors, make sure this ID matches
// the one in your database.

// Export a function to get the user ID consistently across the app
export async function getUserId(): Promise<string> {
  return PLACEHOLDER_USER_ID;
}
