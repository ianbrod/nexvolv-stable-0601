'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Re-export the original Accordion and AccordionItem components
export const MinimalistAccordion = AccordionPrimitive.Root;
export const MinimalistAccordionItem = AccordionPrimitive.Item;

// Create a custom minimalist AccordionTrigger
export const MinimalistAccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-1 text-xs font-medium transition-all",
        "group hover:bg-muted/30 rounded px-1",
        "[&[data-state=open]>svg]:rotate-90",
        className
      )}
      {...props}
    >
      <div className="flex items-center">
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 mr-1" />
        {children}
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
MinimalistAccordionTrigger.displayName = 'MinimalistAccordionTrigger';

// Create a custom minimalist AccordionContent
export const MinimalistAccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down pl-4",
      className
    )}
    {...props}
  >
    <div className="pb-2 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
MinimalistAccordionContent.displayName = 'MinimalistAccordionContent';