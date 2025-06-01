export const createTestReminder = async (page: any) => {
  // Create a reminder that's due in 5 seconds
  const now = new Date();
  const dueDate = new Date(now.getTime() + 5000); // 5 seconds in the future
  
  // Format the date and time for the input fields
  const formattedDate = dueDate.toISOString().split('T')[0];
  const formattedTime = `${dueDate.getHours().toString().padStart(2, '0')}:${dueDate.getMinutes().toString().padStart(2, '0')}`;
  
  // Navigate to reminders page
  await page.goto('/reminders');
  
  // Click the "Add Reminder" button
  await page.click('[data-testid="add-reminder-button"]');
  
  // Fill in the reminder form
  await page.fill('[data-testid="reminder-title-input"]', 'Test Reminder');
  await page.fill('[data-testid="reminder-date-input"]', formattedDate);
  await page.fill('[data-testid="reminder-time-input"]', formattedTime);
  
  // Submit the form
  await page.click('[data-testid="save-reminder-button"]');
  
  // Wait for the reminder to be created
  await page.waitForSelector('[data-testid="reminder-item"]');
  
  // Force a notification check
  await page.evaluate(() => {
    if (window.testReminderNotification) {
      window.testReminderNotification();
    }
  });
  
  // Wait for the notification to appear
  await page.waitForSelector('[data-testid="toast-container"] div', { timeout: 10000 });
  
  return true;
};
