'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

// Add custom CSS to fix the alignment issues
const calendarStyles = `
.rdp-months {
  display: flex;
  flex-direction: column;
}

.rdp-month {
  margin: 0;
}

.rdp-table {
  width: 100%;
  border-collapse: collapse;
}

.rdp-head_row {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.rdp-head_cell {
  width: 36px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: normal;
  color: var(--muted-foreground);
  padding: 0;
}

.rdp-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 4px;
}

.rdp-cell {
  width: 36px;
  text-align: center;
  padding: 0;
}

.rdp-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 4px;
  margin: 0 auto;
}
`;

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // Add the custom styles to the document
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = calendarStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'space-y-4',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell: 'text-muted-foreground text-[0.8rem] font-normal text-center w-9',
        row: 'flex w-full mt-2',
        cell: 'text-center relative p-0 w-9',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 p-0 font-normal aria-selected:opacity-100'
        ),
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'bg-accent text-accent-foreground',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-50',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}

export { Calendar };