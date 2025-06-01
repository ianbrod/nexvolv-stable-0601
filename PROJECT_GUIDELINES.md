# NexVolv Project Guidelines

## Build & Test Commands
- Development server: `npm run dev`
- Build: `npm run build`
- Start production server: `npm run start`
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Run tests: `npm test` or `npm run test`
- Run specific test: `npm test -- -t "test name"`
- Database operations:
  - Generate Prisma client: `npx prisma generate`
  - Apply migrations: `npx prisma migrate dev`
  - Reset database: `npx prisma db push --force-reset`
  - Seed database: `npm run seed`
- Pre-commit checks: `npm run lint && npx tsc --noEmit && npm test`

## Code Style Guidelines
- **Naming Conventions**:
  - PascalCase for React components and type definitions
  - camelCase for variables, functions, and instances
  - SCREAMING_SNAKE_CASE for constants
  - Use descriptive, intention-revealing names

- **Component Structure**:
  - Prefer functional components with hooks
  - Use named exports for components
  - Keep components focused on a single responsibility
  - Extract reusable logic into custom hooks

- **Error Handling**:
  - Use try/catch for async operations
  - Create custom error handling utilities
  - Implement proper error boundaries for React components
  - Provide meaningful error messages to users

- **Imports**:
  - Group imports by external libraries, then internal modules
  - Sort imports alphabetically within groups
  - Use absolute imports with `@/` prefix (as configured in tsconfig.json)

- **TypeScript**:
  - Define explicit types for props, state, and function parameters/returns
  - Use interfaces for object shapes that will be extended
  - Use type for unions, intersections, and mapped types
  - Avoid `any` type; use `unknown` when type is truly unknown

- **State Management**:
  - Use React hooks (useState, useReducer) for component-level state
  - Use context for shared state across components
  - Consider server components for data fetching when appropriate

- **Styling**:
  - Use Tailwind CSS utility classes
  - Follow the shadcn/ui component patterns
  - Keep styling consistent with the design system

## Development Rules
- **Testing**:
  - Write tests for all new features
  - Unit tests for utility functions and hooks
  - Component tests for UI components
  - Integration tests for complex workflows
  - Place tests alongside the code they test or in `__tests__` directories

- **Database**:
  - Use Prisma for database operations
  - Define clear schemas with appropriate relations
  - Use migrations for schema changes
  - Implement proper error handling for database operations

- **Performance**:
  - Optimize component re-renders (use React.memo, useMemo, useCallback)
  - Implement proper data fetching strategies
  - Use Next.js features like ISR, SSG, and SSR appropriately
  - Monitor and optimize bundle size

- **Accessibility**:
  - Ensure proper semantic HTML
  - Include appropriate ARIA attributes
  - Test with keyboard navigation
  - Maintain sufficient color contrast

- **Best Practices**:
  - Follow DRY (Don't Repeat Yourself) principles
  - Apply SOLID principles where applicable
  - Use server components for data fetching when possible
  - Keep client components lightweight
  - Implement proper loading states and error handling
  - Document complex logic with comments
  - Use TypeScript to enforce type safety

- **Git Workflow**:
  - Write clear, descriptive commit messages
  - Review changes before committing
  - Keep PRs focused on a single feature or fix
  - Run linting and tests before pushing changes

- **Documentation**:
  - Document complex components with JSDoc comments
  - Keep README and other documentation up to date
  - Document API endpoints and data structures

- **Code Review**:
  - Look for potential bugs and edge cases
  - Check for proper error handling
  - Ensure code follows project guidelines
  - Verify tests cover the new functionality

## General Guidelines
- If you have questions or something is unclear, stop and ask
- Keep your work focused on the task at hand
- Avoid changing code unrelated to the current task
- Periodically review the requirements to stay on track
- Prefer small, incremental changes over large rewrites
