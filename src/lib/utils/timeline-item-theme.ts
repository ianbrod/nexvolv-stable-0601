/**
 * Timeline Item Theme Configuration
 * 
 * This file contains theme configuration for timeline items including:
 * - Color schemes for different item types and categories
 * - Icon mappings for different item types
 * - Border styles for different priority levels
 * - Badge configurations for special item states
 */

import { 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Flag, 
  Goal, 
  ListTodo, 
  Repeat, 
  Star, 
  Target, 
  Timer, 
  Zap 
} from 'lucide-react';

// Types of timeline items
export type TimelineItemType = 
  | 'task' 
  | 'goal' 
  | 'habit' 
  | 'event' 
  | 'reminder' 
  | 'note';

// Special states for timeline items
export type TimelineItemState = 
  | 'default'
  | 'overdue' 
  | 'blocked' 
  | 'inProgress' 
  | 'completed' 
  | 'archived'
  | 'flagged'
  | 'recurring';

// Priority levels
export type TimelineItemPriority = 'LOW' | 'MEDIUM' | 'HIGH';

// Theme configuration for timeline items
export interface TimelineItemTheme {
  // Base styling
  background: string;
  text: string;
  border: string;
  
  // Icon configuration
  icon: React.ComponentType;
  iconColor: string;
  
  // Hover and focus states
  hoverBackground: string;
  focusRing: string;
  
  // Dark mode variants
  darkBackground: string;
  darkText: string;
  darkBorder: string;
  darkIconColor: string;
  darkHoverBackground: string;
  darkFocusRing: string;
}

// Badge configuration for special states
export interface TimelineItemBadge {
  text: string;
  background: string;
  textColor: string;
  darkBackground: string;
  darkTextColor: string;
  icon?: React.ComponentType;
}

// Icon mapping for different item types
export const timelineItemIcons = {
  task: ListTodo,
  goal: Target,
  habit: Repeat,
  event: Calendar,
  reminder: Clock,
  note: FileText,
};

// Color schemes for different item types
export const timelineItemTypeStyles: Record<TimelineItemType, TimelineItemTheme> = {
  task: {
    background: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: ListTodo,
    iconColor: 'text-blue-500',
    hoverBackground: 'hover:bg-blue-100',
    focusRing: 'focus-visible:ring-blue-300',
    darkBackground: 'dark:bg-blue-950/30',
    darkText: 'dark:text-blue-300',
    darkBorder: 'dark:border-blue-800',
    darkIconColor: 'dark:text-blue-400',
    darkHoverBackground: 'dark:hover:bg-blue-900/50',
    darkFocusRing: 'dark:focus-visible:ring-blue-700',
  },
  goal: {
    background: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Target,
    iconColor: 'text-purple-500',
    hoverBackground: 'hover:bg-purple-100',
    focusRing: 'focus-visible:ring-purple-300',
    darkBackground: 'dark:bg-purple-950/30',
    darkText: 'dark:text-purple-300',
    darkBorder: 'dark:border-purple-800',
    darkIconColor: 'dark:text-purple-400',
    darkHoverBackground: 'dark:hover:bg-purple-900/50',
    darkFocusRing: 'dark:focus-visible:ring-purple-700',
  },
  habit: {
    background: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: Repeat,
    iconColor: 'text-green-500',
    hoverBackground: 'hover:bg-green-100',
    focusRing: 'focus-visible:ring-green-300',
    darkBackground: 'dark:bg-green-950/30',
    darkText: 'dark:text-green-300',
    darkBorder: 'dark:border-green-800',
    darkIconColor: 'dark:text-green-400',
    darkHoverBackground: 'dark:hover:bg-green-900/50',
    darkFocusRing: 'dark:focus-visible:ring-green-700',
  },
  event: {
    background: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Calendar,
    iconColor: 'text-amber-500',
    hoverBackground: 'hover:bg-amber-100',
    focusRing: 'focus-visible:ring-amber-300',
    darkBackground: 'dark:bg-amber-950/30',
    darkText: 'dark:text-amber-300',
    darkBorder: 'dark:border-amber-800',
    darkIconColor: 'dark:text-amber-400',
    darkHoverBackground: 'dark:hover:bg-amber-900/50',
    darkFocusRing: 'dark:focus-visible:ring-amber-700',
  },
  reminder: {
    background: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: Clock,
    iconColor: 'text-red-500',
    hoverBackground: 'hover:bg-red-100',
    focusRing: 'focus-visible:ring-red-300',
    darkBackground: 'dark:bg-red-950/30',
    darkText: 'dark:text-red-300',
    darkBorder: 'dark:border-red-800',
    darkIconColor: 'dark:text-red-400',
    darkHoverBackground: 'dark:hover:bg-red-900/50',
    darkFocusRing: 'dark:focus-visible:ring-red-700',
  },
  note: {
    background: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: FileText,
    iconColor: 'text-gray-500',
    hoverBackground: 'hover:bg-gray-100',
    focusRing: 'focus-visible:ring-gray-300',
    darkBackground: 'dark:bg-gray-800/30',
    darkText: 'dark:text-gray-300',
    darkBorder: 'dark:border-gray-700',
    darkIconColor: 'dark:text-gray-400',
    darkHoverBackground: 'dark:hover:bg-gray-700/50',
    darkFocusRing: 'dark:focus-visible:ring-gray-600',
  },
};

// Border styles for different priority levels
export const priorityBorderStyles: Record<TimelineItemPriority, string> = {
  LOW: 'border-l-2 border-l-gray-400',
  MEDIUM: 'border-l-2 border-l-yellow-400',
  HIGH: 'border-l-2 border-l-red-500',
};

// Badge configurations for special item states
export const timelineItemStateBadges: Record<TimelineItemState, TimelineItemBadge> = {
  default: {
    text: '',
    background: '',
    textColor: '',
    darkBackground: '',
    darkTextColor: '',
  },
  overdue: {
    text: 'Overdue',
    background: 'bg-red-100',
    textColor: 'text-red-700',
    darkBackground: 'dark:bg-red-900',
    darkTextColor: 'dark:text-red-200',
    icon: AlertCircle,
  },
  blocked: {
    text: 'Blocked',
    background: 'bg-orange-100',
    textColor: 'text-orange-700',
    darkBackground: 'dark:bg-orange-900',
    darkTextColor: 'dark:text-orange-200',
    icon: AlertCircle,
  },
  inProgress: {
    text: 'In Progress',
    background: 'bg-blue-100',
    textColor: 'text-blue-700',
    darkBackground: 'dark:bg-blue-900',
    darkTextColor: 'dark:text-blue-200',
    icon: Timer,
  },
  completed: {
    text: 'Completed',
    background: 'bg-green-100',
    textColor: 'text-green-700',
    darkBackground: 'dark:bg-green-900',
    darkTextColor: 'dark:text-green-200',
    icon: CheckCircle2,
  },
  archived: {
    text: 'Archived',
    background: 'bg-gray-100',
    textColor: 'text-gray-700',
    darkBackground: 'dark:bg-gray-800',
    darkTextColor: 'dark:text-gray-300',
  },
  flagged: {
    text: 'Flagged',
    background: 'bg-purple-100',
    textColor: 'text-purple-700',
    darkBackground: 'dark:bg-purple-900',
    darkTextColor: 'dark:text-purple-200',
    icon: Flag,
  },
  recurring: {
    text: 'Recurring',
    background: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    darkBackground: 'dark:bg-cyan-900',
    darkTextColor: 'dark:text-cyan-200',
    icon: Repeat,
  },
};

// Print-friendly styles
export const printFriendlyStyles = {
  background: 'print:bg-white',
  text: 'print:text-black',
  border: 'print:border-gray-300',
  icon: 'print:text-gray-700',
};
