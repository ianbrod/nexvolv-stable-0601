# End-to-End Tests for NexVolv

This directory contains end-to-end tests for the NexVolv application using Playwright.

## Setup

The tests require Playwright to be installed. This should have been done during the project setup, but if not, you can install it with:

```bash
npm install -D @playwright/test
```

You also need to install the browser binaries:

```bash
npx playwright install
```

## Running Tests

To run all end-to-end tests:

```bash
npm run test:e2e
```

To run a specific test file:

```bash
npx playwright test e2e/reminder-flow.spec.ts
```

To run tests in headed mode (with visible browser):

```bash
npx playwright test --headed
```

## Test Structure

- `reminder-flow.spec.ts`: Tests the complete reminder flow from creation to notification
- `editable-datetime-picker.spec.ts`: Tests the ability to manually enter precise times in the reminder form

## UI Elements Tested

The reminder flow test interacts with the following UI elements:

- Navigation link labeled "Reminders"
- Heading with text "Reminders" on the reminders page
- "New Reminder" or "Add Reminder" button
- Modal with title "Create Reminder"
- Form fields with labels "Title" and "Description"
- "Due Date & Time" field that opens a date-time picker
- Calendar day buttons and time slot buttons in the date-time picker
- Time edit button with data-testid="time-edit-button"
- Time input field with data-testid="time-input-field"
- Save/Create button to submit the form
- Toast notifications with role="status"
- Close button on notifications with aria-label="Close"

## Notes

- The tests assume that the application is running on `http://localhost:3001`
- In development mode, the tests expect the server to be already running
- In CI mode, the tests will automatically start the development server
- The tests are configured to run in Chromium by default

## Running the Test

1. Start the development server:
   ```bash
   npm run dev
   ```

2. In a separate terminal, run the end-to-end test:
   ```bash
   npm run test:e2e
   ```
