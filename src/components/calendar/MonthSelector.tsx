/**
 * MonthSelector Component
 * 
 * Displays a 3x4 grid of month buttons for calendar navigation.
 * Shows month abbreviations (Jan, Feb, Mar, etc.).
 * Highlights the currently selected month.
 * 
 * Requirements: 3.1, 3.4, 5.1
 */

import { MonthSelectorProps } from './types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

export default function MonthSelector({
  selectedMonth,
  onMonthSelect,
}: MonthSelectorProps) {
  return (
    <div className="flex flex-col">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Month</h4>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_NAMES.map((name, index) => (
          <button
            key={index}
            onClick={() => onMonthSelect(index)}
            className={`px-2 py-2 text-sm rounded hover:bg-gray-100 transition-colors ${
              index === selectedMonth
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700'
            }`}
            aria-pressed={index === selectedMonth}
            aria-label={`Select ${name}`}
          >
            {name.substring(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );
}
