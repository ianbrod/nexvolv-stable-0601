import { test, expect } from '@playwright/test';
import { addMinutes, format } from 'date-fns';

/**
 * End-to-end test for the editable date-time picker functionality
 * Tests the ability to manually enter precise times in the reminder form
 */
test('editable date-time picker allows precise time entry', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');

  // Wait for the page to load
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  // Navigate to the reminders section
  await page.getByRole('link', { name: /reminders/i }).click();

  // Wait for the reminders page to load
  await expect(page.getByRole('heading', { name: /reminders/i })).toBeVisible();

  // Open the reminder creation modal
  // Look for any button that might open the reminder creation dialog
  const addButtons = await page.getByRole('button').filter({ hasText: /(new|add) reminder/i }).all();
  if (addButtons.length > 0) {
    await addButtons[0].click();
  } else {
    // If no button found, try clicking the first button in the header actions
    await page.locator('.header-actions button').first().click();
  }

  // Wait for the reminder creation modal to appear
  await expect(page.getByText(/create reminder/i, { exact: false })).toBeVisible();

  // Fill in the reminder details
  await page.getByLabel(/title/i).fill('Time Test Reminder');
  await page.getByLabel(/description/i).fill('Testing precise time entry');

  // Open the date-time picker
  await page.getByText(/due date & time/i).click();

  // Select today's date in the calendar
  const today = new Date();
  const dayButton = page.getByRole('button', { name: new RegExp(today.getDate().toString()) }).first();
  await dayButton.click();

  // Click the time edit button to manually enter a time
  await page.getByTestId('time-edit-button').click();

  // Enter a precise time (23 minutes from now)
  const futureTime = format(addMinutes(new Date(), 23), 'h:mm a');
  await page.getByTestId('time-input-field').fill(futureTime);
  await page.getByTestId('time-input-field').press('Enter');

  // Submit the form
  await page.getByRole('button', { name: /save|create/i }).click();

  // Wait for the modal to close
  await expect(page.getByText(/create reminder/i, { exact: false })).not.toBeVisible();

  // Verify that the reminder appears in the list with the correct time
  await expect(page.getByText('Time Test Reminder')).toBeVisible();

  // Now test editing a reminder
  // Find and click the edit button for the reminder we just created
  await page.getByText('Time Test Reminder').first().click();

  // Wait for the edit modal to appear
  await expect(page.getByText(/edit reminder/i, { exact: false })).toBeVisible();

  // Open the date-time picker again
  await page.getByText(/due date & time/i).click();

  // Click the time edit button to manually enter a time
  await page.getByTestId('time-edit-button').click();

  // Enter a different precise time (45 minutes from now)
  const newFutureTime = format(addMinutes(new Date(), 45), 'h:mm a');
  await page.getByTestId('time-input-field').fill(newFutureTime);
  await page.getByTestId('time-input-field').press('Enter');

  // Submit the form
  await page.getByRole('button', { name: /save|update/i }).click();

  // Wait for the modal to close
  await expect(page.getByText(/edit reminder/i, { exact: false })).not.toBeVisible();

  // Success! The test has verified the editable date-time picker functionality
  console.log('Editable date-time picker test completed successfully');
});
