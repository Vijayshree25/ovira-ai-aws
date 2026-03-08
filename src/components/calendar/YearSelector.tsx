/**
 * YearSelector Component
 * 
 * Displays a scrollable list of years for calendar navigation.
 * Dynamically calculates year range based on current year (current - 10 to current + 5).
 * Highlights the currently selected year.
 * 
 * Requirements: 2.1, 2.2, 5.1
 */

import { YearSelectorProps } from './types';

export default function YearSelector({
  selectedYear,
  onYearSelect,
  minYear,
  maxYear,
}: YearSelectorProps) {
  // Calculate dynamic year range: current year - 10 to current year + 5
  const currentYear = new Date().getFullYear();
  const yearMin = minYear ?? currentYear - 10;
  const yearMax = maxYear ?? currentYear + 5;
  
  // Generate array of years in the range
  const years = Array.from(
    { length: yearMax - yearMin + 1 },
    (_, i) => yearMin + i
  );

  return (
    <div className="flex flex-col">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Year</h4>
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearSelect(year)}
            className={`w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
              year === selectedYear
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700'
            }`}
            aria-pressed={year === selectedYear}
            aria-label={`Select year ${year}`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
