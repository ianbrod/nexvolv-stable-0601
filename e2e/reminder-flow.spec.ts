import { test, expect } from '@playwright/test';
import { addMinutes, format } from 'date-fns';

/**
 * End-to-end test for the reminder functionality flow:
 * 1. Log in a user
 * 2. Navigate to the reminders section
 * 3. Create a reminder with a time in the very near future
 * 4. Wait for the reminder time
 * 5. Verify that an in-app notification is displayed
 * 6. Verify that the notification can be dismissed
 */
test('complete reminder flow from creation to notification', async ({ page }) => {
  // Step 1: Navigate to the application and log in
  // For this test, we'll assume there's a test user already set up
  // or that authentication is bypassed in the test environment
  await page.goto('/');

  // Wait for the page to load
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  // Step 2: Navigate to the reminders section
  // This depends on the actual navigation structure of the app
  // For now, we'll assume there's a "Reminders" link in the navigation
  await page.getByRole('link', { name: /reminders/i }).click();

  // Wait for the reminders page to load
  await expect(page.getByRole('heading', { name: /reminders/i })).toBeVisible();

  // Step 3: Create a test reminder that will trigger quickly
  // Click the "Create Test Reminder" button which creates a reminder due in 10 seconds
  await page.getByRole('button', { name: /create test reminder/i }).click();

  // Wait for the button to finish its loading state
  await page.waitForTimeout(1000);

  // Verify that the test reminder appears in the list
  await expect(page.getByText('Test Notification')).toBeVisible();

  // Step 4: Wait for the reminder time and manually trigger notification check
  console.log('Waiting for reminder notification...');

  // Wait a bit for the reminder time to pass
  await page.waitForTimeout(2000);

  // Manually trigger the reminder check by calling the global function
  await page.evaluate(() => {
    // Access the window object and call the checkReminders function if available
    if ((window as any).checkReminders) {
      console.log('Manually triggering reminder check...');
      (window as any).checkReminders();
      return 'Triggered reminder check';
    } else {
      console.error('checkReminders function not found on window object');
      return 'Failed to trigger reminder check';
    }
  });

  // Wait for the notification to appear
  const notificationLocator = page.locator('[role="status"]');
  await expect(notificationLocator).toBeVisible({ timeout: 15000 });

  // Step 5: Verify that the notification contains our reminder text
  await expect(notificationLocator).toContainText('Test Notification');

  // Step 6: Verify that the notification can be dismissed
  // Find and click the close button on the notification
  await page.locator('[role="status"] button[aria-label="Close"]').click();

  // Verify that the notification is dismissed
  await expect(notificationLocator).not.toBeVisible();

  // Success! The test has verified the complete reminder flow
  console.log('Reminder flow test completed successfully');
});
