'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { CalendarModalProps, CalendarDataState } from './types';
import { generateCalendarDates, canNavigateToNextMonth, getMonthKey } from '@/lib/utils/calendar-utils';
import { getCalendarCache } from '@/lib/utils/calendar-cache';
import { getSymptomLogsByMonth } from '@/lib/aws/dynamodb';
import { SymptomLog } from '@/types';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import CalendarLegend from './CalendarLegend';

export default function CalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  userId,
}: CalendarModalProps) {
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [dataState, setDataState] = useState<CalendarDataState>({
    symptomLogs: new Map(),
    isLoading: false,
    error: null,
  });

  const cache = getCalendarCache();

  // Generate calendar dates for current month
  const calendarDates = useMemo(() => {
    return generateCalendarDates(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Check if we can navigate to next month
  const canNavigateNext = useMemo(() => {
    return canNavigateToNextMonth(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Fetch symptom logs for current month
  const fetchMonthData = useCallback(async (year: number, month: number) => {
    const monthKey = getMonthKey(year, month);

    // Check cache first
    const cachedData = cache.get(monthKey);
    if (cachedData) {
      const logsMap = new Map<string, SymptomLog>();
      cachedData.forEach(log => {
        logsMap.set(log.date.split('T')[0], log);
      });
      setDataState(prev => ({ ...prev, symptomLogs: logsMap, isLoading: false, error: null }));
      return;
    }

    // Fetch from API
    setDataState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      console.log(`Fetching symptom logs for ${monthKey} (${year}-${month + 1})`);
      const logs = await getSymptomLogsByMonth(userId, year, month);
      console.log(`Retrieved ${logs.length} symptom logs for ${monthKey}`);

      // Cache the results
      cache.set(monthKey, logs);

      // Convert to Map for easy lookup
      const logsMap = new Map<string, SymptomLog>();
      logs.forEach(log => {
        // Handle timezone issues by using the date as intended by the user
        let dateKey: string;

        if (log.date.includes('T')) {
          // If it's an ISO string, parse it and format as local date
          const logDate = new Date(log.date);
          const year = logDate.getFullYear();
          const month = String(logDate.getMonth() + 1).padStart(2, '0');
          const day = String(logDate.getDate()).padStart(2, '0');
          dateKey = `${year}-${month}-${day}`;
        } else {
          // If it's already in YYYY-MM-DD format, use as is
          dateKey = log.date;
        }

        console.log(`Mapping log date ${log.date} to calendar date ${dateKey}, flowLevel: ${log.flowLevel}`);
        logsMap.set(dateKey, log);
      });

      console.log('Final logsMap:', Array.from(logsMap.entries()).map(([key, val]) => ({ key, flowLevel: val.flowLevel })));

      setDataState({ symptomLogs: logsMap, isLoading: false, error: null });
    } catch (error) {
      console.error('Failed to fetch symptom logs:', error);
      let errorMessage = 'Failed to load calendar data. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('ValidationException')) {
          errorMessage = 'Database configuration issue. Please contact support.';
        } else if (error.message.includes('UnrecognizedClientException')) {
          errorMessage = 'Authentication issue. Please try logging out and back in.';
        } else {
          errorMessage = `Failed to load calendar data: ${error.message}`;
        }
      }

      setDataState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [userId, cache]);

  // Handle direct month/year jump from dropdown
  const handleJumpToMonth = useCallback((newYear: number, newMonth: number) => {
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
  }, []);

  // Handle month navigation

  const handlePreviousMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (canNavigateNext) {
      if (currentMonth === 11) {
        setCurrentYear(prev => prev + 1);
        setCurrentMonth(0);
      } else {
        setCurrentMonth(prev => prev + 1);
      }
    }
  }, [currentMonth, canNavigateNext]);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    onDateSelect(date);
    onClose();
  }, [onDateSelect, onClose]);

  // Handle Escape key press
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Handle click outside modal
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Fetch data when month changes
  useEffect(() => {
    if (isOpen) {
      fetchMonthData(currentYear, currentMonth);
    }
  }, [isOpen, currentYear, currentMonth, fetchMonthData]);

  // Add/remove event listeners and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscapeKey]);

  // Reset to selected date when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentYear(selectedDate.getFullYear());
      setCurrentMonth(selectedDate.getMonth());
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto sm:max-w-[90%] md:max-w-[700px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <h2 id="calendar-modal-title" className="sr-only">
            Calendar View
          </h2>

          <CalendarHeader
            year={currentYear}
            month={currentMonth}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onJumpToMonth={handleJumpToMonth}
            canNavigateNext={canNavigateNext}
          />

          {dataState.isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {dataState.error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{dataState.error}</p>
              <button
                onClick={() => fetchMonthData(currentYear, currentMonth)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!dataState.isLoading && !dataState.error && (
            <>
              <CalendarGrid
                dates={calendarDates}
                symptomLogs={dataState.symptomLogs}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
              />

              <CalendarLegend showSymptomIndicator={dataState.symptomLogs.size > 0} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
