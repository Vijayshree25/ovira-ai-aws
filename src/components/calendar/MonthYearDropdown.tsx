import { useEffect, useRef } from 'react';
import { MonthYearDropdownProps } from './types';
import YearSelector from './YearSelector';
import MonthSelector from './MonthSelector';

/**
 * MonthYearDropdown component provides a dropdown panel for quick year and month selection
 * in the calendar. It appears below the calendar header when opened and contains
 * YearSelector and MonthSelector components in a two-column grid layout.
 * 
 * Requirements: 1.1, 2.1, 3.1
 */
export default function MonthYearDropdown({
  year,
  month,
  isOpen,
  onYearChange,
  onMonthChange,
  onClose,
}: MonthYearDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Focus management: move focus into dropdown when it opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const firstFocusable = dropdownRef.current.querySelector<HTMLElement>(
        'button, [tabindex="0"]'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Don't render anything when closed
  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4"
      role="region"
      aria-label="Month and year selection"
    >
      <div className="grid grid-cols-2 gap-4">
        <YearSelector
          selectedYear={year}
          onYearSelect={onYearChange}
        />
        <MonthSelector
          selectedMonth={month}
          onMonthSelect={onMonthChange}
        />
      </div>
    </div>
  );
}
