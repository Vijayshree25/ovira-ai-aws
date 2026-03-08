'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { CalendarHeaderProps } from './types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Range of years available in the picker (2020 → current year). */
function buildYearRange(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 2020; y--) {
    years.push(y);
  }
  return years;
}

const YEAR_RANGE = buildYearRange();

export default function CalendarHeader({
  year,
  month,
  onPreviousMonth,
  onNextMonth,
  onJumpToMonth,
  canNavigateNext,
}: CalendarHeaderProps) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep picker year in sync when month changes via arrow buttons
  useEffect(() => {
    setPickerYear(year);
  }, [year]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleMonthSelect = useCallback(
    (m: number) => {
      onJumpToMonth(pickerYear, m);
      setOpen(false);
    },
    [pickerYear, onJumpToMonth],
  );

  const today = new Date();
  const isCurrentOrFuture = (y: number, m: number) =>
    y > today.getFullYear() || (y === today.getFullYear() && m > today.getMonth());

  return (
    <div className="flex items-center justify-between mb-6 relative">
      {/* Left arrow */}
      <button
        onClick={onPreviousMonth}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Previous month"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Clickable month/year heading */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <h3 className="text-xl font-semibold text-gray-900" aria-live="polite">
            {MONTH_NAMES[month]} {year}
          </h3>
          {/* Chevron icon */}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 flex overflow-hidden"
            style={{ minWidth: '340px' }}
            role="dialog"
            aria-label="Pick month and year"
          >
            {/* Month panel */}
            <div className="flex-1 p-3 border-r border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Month</p>
              <div className="grid grid-cols-3 gap-1">
                {MONTH_NAMES.map((name, i) => {
                  const disabled = isCurrentOrFuture(pickerYear, i);
                  const isActive = i === month && pickerYear === year;
                  return (
                    <button
                      key={name}
                      disabled={disabled}
                      onClick={() => !disabled && handleMonthSelect(i)}
                      className={`
                        text-sm py-2 px-1 rounded-lg font-medium transition-colors text-center
                        ${isActive
                          ? 'bg-teal-600 text-white'
                          : disabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'}
                      `}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Year panel */}
            <div className="w-24 p-3 flex flex-col">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Year</p>
              <div className="overflow-y-auto flex-1" style={{ maxHeight: '200px' }}>
                {YEAR_RANGE.map((y) => (
                  <button
                    key={y}
                    onClick={() => setPickerYear(y)}
                    className={`
                      w-full text-sm py-2 px-2 rounded-lg font-medium transition-colors text-center mb-0.5
                      ${pickerYear === y
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'}
                    `}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right arrow */}
      <button
        onClick={onNextMonth}
        disabled={!canNavigateNext}
        className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${canNavigateNext
            ? 'hover:bg-gray-100 text-gray-700'
            : 'text-gray-300 cursor-not-allowed'
          }`}
        aria-label="Next month"
        aria-disabled={!canNavigateNext}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
