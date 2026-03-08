/**
 * TypeScript interfaces for calendar components
 */

import { SymptomLog } from '@/types';
import { CalendarDate } from '@/lib/utils/calendar-utils';

export interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  userId: string;
}

export interface CalendarHeaderProps {
  year: number;
  month: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  canNavigateNext: boolean;
  isDropdownOpen: boolean;
  onHeaderClick: () => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onDropdownClose: () => void;
}

export interface CalendarGridProps {
  dates: CalendarDate[];
  symptomLogs: Map<string, SymptomLog>;
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

export interface CalendarDayProps {
  date: CalendarDate;
  symptomLog?: SymptomLog;
  isSelected: boolean;
  onClick: () => void;
}

export interface FlowIndicatorProps {
  flowLevel: 'none' | 'light' | 'medium' | 'heavy';
}

export interface SymptomIndicatorProps {
  hasSymptoms: boolean;
}

export interface CalendarLegendProps {
  showSymptomIndicator: boolean;
}

export interface CalendarDataState {
  symptomLogs: Map<string, SymptomLog>;
  isLoading: boolean;
  error: string | null;
}

export interface MonthYearDropdownProps {
  year: number;
  month: number;
  isOpen: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onClose: () => void;
}

export interface YearSelectorProps {
  selectedYear: number;
  onYearSelect: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

export interface MonthSelectorProps {
  selectedMonth: number;
  onMonthSelect: (month: number) => void;
}
