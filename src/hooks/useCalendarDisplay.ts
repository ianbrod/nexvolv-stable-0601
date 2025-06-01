import { useCallback, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addWeeks,
  addMonths,
  addYears,
  subWeeks,
  subMonths,
  subYears
} from 'date-fns';

type CalendarView = 'week' | 'month' | 'year';

interface UseCalendarDisplayProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
}

interface HeaderDateInfo {
  dayOfMonth: string;
  monthYear: string;
  dateRange: string;
}

interface UseCalendarDisplayReturn {
  handlePrevious: () => void;
  handleNext: () => void;
  handleToday: () => void;
  headerDateInfo: HeaderDateInfo;
}

export function useCalendarDisplay({
  currentDate,
  view,
  onDateChange
}: UseCalendarDisplayProps): UseCalendarDisplayReturn {

  const handlePrevious = useCallback(() => {
    let newDate: Date;

    switch (view) {
      case 'week':
        newDate = subWeeks(currentDate, 1);
        break;
      case 'month':
        newDate = subMonths(currentDate, 1);
        break;
      case 'year':
        newDate = subYears(currentDate, 1);
        break;
      default:
        newDate = currentDate;
    }

    onDateChange(newDate);
  }, [currentDate, view, onDateChange]);

  const handleNext = useCallback(() => {
    let newDate: Date;

    switch (view) {
      case 'week':
        newDate = addWeeks(currentDate, 1);
        break;
      case 'month':
        newDate = addMonths(currentDate, 1);
        break;
      case 'year':
        newDate = addYears(currentDate, 1);
        break;
      default:
        newDate = currentDate;
    }

    onDateChange(newDate);
  }, [currentDate, view, onDateChange]);

  const handleToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  const headerDateInfo = useMemo((): HeaderDateInfo => {
    const dayOfMonth = format(currentDate, 'd');
    const monthYear = format(currentDate, 'MMMM, yyyy');

    let dateRange: string;

    switch (view) {
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        dateRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
        break;
      }
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        dateRange = `${format(monthStart, 'MMM d')} - ${format(monthEnd, 'MMM d, yyyy')}`;
        break;
      }
      case 'year': {
        const yearStart = startOfYear(currentDate);
        const yearEnd = endOfYear(currentDate);
        dateRange = `${format(yearStart, 'MMM d, yyyy')} - ${format(yearEnd, 'MMM d, yyyy')}`;
        break;
      }
      default:
        dateRange = format(currentDate, 'MMM d');
    }

    return {
      dayOfMonth,
      monthYear,
      dateRange
    };
  }, [currentDate, view]);

  return {
    handlePrevious,
    handleNext,
    handleToday,
    headerDateInfo
  };
}
