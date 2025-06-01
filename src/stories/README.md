# Storybook Examples

This directory contains example stories for components in the NexVolv application. These files demonstrate how the components would be used in a Storybook environment.

## Using These Examples

While Storybook is not currently installed in the project, these files serve as documentation and examples of how to use the components. They can be used as a reference when implementing or modifying components.

## Setting Up Storybook

To set up Storybook in this project:

1. Install Storybook:
   ```bash
   npx storybook init
   ```

2. Start Storybook:
   ```bash
   npm run storybook
   ```

## VirtualizedTaskList Examples

The `VirtualizedTaskList.stories.tsx` file demonstrates different configurations of the `VirtualizedTaskList` component:

- **Default**: Basic usage with default settings
- **WithSelectionMode**: Demonstrates the component with selection mode enabled
- **CustomItemSize**: Shows how to customize the item size
- **FewItems**: Demonstrates how the component handles a small number of items

These examples show how to:
- Configure the component with different props
- Handle task selection
- Provide goal name resolution
- Set up event handlers for task interactions
- Customize the appearance and behavior of the list

## Adding More Examples

When adding new components, consider creating corresponding story files to document their usage and demonstrate different configurations.
