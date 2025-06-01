/**
 * Base component props that all components should support
 */
export interface BaseComponentProps {
  /** Optional CSS class name to apply to the component */
  className?: string;
  
  /** Optional ID attribute for the component */
  id?: string;
  
  /** Optional data-testid attribute for testing */
  'data-testid'?: string;
}

/**
 * Props for components that can have children
 */
export interface WithChildrenProps {
  /** React children elements */
  children?: React.ReactNode;
}

/**
 * Props for components that must have children
 */
export interface RequiredChildrenProps {
  /** React children elements */
  children: React.ReactNode;
}

/**
 * Props for components that can be disabled
 */
export interface DisableableProps {
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Props for components that can have a variant
 */
export interface VariantProps<T extends string> {
  /** The variant of the component */
  variant?: T;
}

/**
 * Props for components that can have a size
 */
export interface SizeProps<T extends string> {
  /** The size of the component */
  size?: T;
}

/**
 * Props for components that can have an aria-label
 */
export interface AriaLabelProps {
  /** Accessible label for the component */
  'aria-label'?: string;
}

/**
 * Props for components that can have a tooltip
 */
export interface TooltipProps {
  /** Tooltip text to display on hover */
  tooltip?: string;
}

/**
 * Utility type to create props for a component with variants
 */
export type ComponentWithVariants<
  BaseProps,
  VariantType extends string
> = BaseProps & VariantProps<VariantType>;

/**
 * Utility type to create props for a component with sizes
 */
export type ComponentWithSizes<
  BaseProps,
  SizeType extends string
> = BaseProps & SizeProps<SizeType>;

/**
 * Utility type to create props for a component with variants and sizes
 */
export type ComponentWithVariantsAndSizes<
  BaseProps,
  VariantType extends string,
  SizeType extends string
> = BaseProps & VariantProps<VariantType> & SizeProps<SizeType>;
