/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Activity, Loader2 } from 'lucide-react';
import { craneSearchApi, HititAvailableFlightDate } from '../services/craneApi';

interface AirZimDatePickerProps {
  label: string;
  selectedDate: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  originCode: string;
  destinationCode: string;
  helperText?: string;
}

export const AirZimDatePicker: React.FC<AirZimDatePickerProps> = ({
  label,
  selectedDate,
  minDate,
  onSelectDate,
  originCode,
  destinationCode,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view month
  const initialDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDateObj.getMonth()); // 0-indexed

  // Real-time Hitit Crane API availability states
  const [hititDates, setHititDates] = useState<Map<string, HititAvailableFlightDate>>(new Map());
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [isHititConnected, setIsHititConnected] = useState<boolean>(false);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real-time available flight dates from Hitit Crane Search API
  useEffect(() => {
    let isCancelled = false;

    async function fetchHititFlightDates() {
      setHititDates(new Map());
      setIsHititConnected(false);
      if (!originCode || !destinationCode) {
        setIsLoadingApi(false);
        return;
      }
      setIsLoadingApi(true);

      try {
        const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Call Hitit Crane API endpoint /search/availableFlightDates
        const dates = await craneSearchApi.getAvailableFlightDates(
          originCode,
          destinationCode,
          startOfMonth,
          endOfMonth
        );

        if (!isCancelled) {
          const dateMap = new Map<string, HititAvailableFlightDate>();
          dates.forEach((d) => {
            // The service normalizes IBE dates to YYYY-MM-DD before they reach the calendar.
            if (d.date && d.available) dateMap.set(d.date, d);
          });
          setHititDates(dateMap);
          setIsHititConnected(true);
        }
      } catch (err) {
        console.warn('Hitit API fetch error:', err);
        if (!isCancelled) {
          setIsHititConnected(false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingApi(false);
        }
      }
    }

    fetchHititFlightDates();

    return () => {
      isCancelled = true;
    };
  }, [originCode, destinationCode, currentYear, currentMonth]);

  // A date is selectable only when the live IBE endpoint explicitly returns it as available.
  const getFlightAvailability = (year: number, month: number, day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hititMatch = hititDates.get(dateString);
    return {
      available: Boolean(hititMatch?.available),
      basePrice: hititMatch?.minPrice !== undefined ? `${hititMatch.currency || 'USD'} ${hititMatch.minPrice}` : '',
    };
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  const handlePrevMonth = () => {
    const today = new Date();
    if (currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth <= today.getMonth())) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(formatted);
    setIsOpen(false);
  };

  // Convert selected string to human readable format
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return 'Select Date';
    try {
      const parts = dStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  const minDateObj = minDate ? new Date(minDate) : new Date();
  minDateObj.setHours(0, 0, 0, 0);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
        {label}
      </label>

      {/* Date Trigger Input */}
      <button
        type="button"
        aria-label={label}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 text-left flex items-center justify-between hover:border-[#163784] focus:outline-none focus:ring-2 focus:ring-[#163784] transition-all shadow-xs cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#163784]" />
          <span>{formatDisplayDate(selectedDate)}</span>
        </div>
        <span className="text-[11px] font-bold text-[#163784] bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
          {isLoadingApi ? (
            <Loader2 className="w-3 h-3 animate-spin text-[#163784]" />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${isHititConnected ? 'bg-blue-600' : 'bg-amber-500'}`} />
          )}
          <span>{isLoadingApi ? 'Checking IBE' : isHititConnected ? 'Live IBE dates' : 'Dates unavailable'}</span>
        </span>
      </button>

      {helperText && (
        <span className="text-[10px] text-slate-400 mt-1 block">{helperText}</span>
      )}

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 sm:w-88 animate-in fade-in zoom-in duration-150">
          {/* Calendar Header with Month Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              aria-label="Previous month"
              onClick={handlePrevMonth}
              disabled={currentYear === new Date().getFullYear() && currentMonth <= new Date().getMonth()}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-sm font-bold text-[#163784]">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <div className="text-[9px] text-slate-500 font-medium">Select a travel date</div>
            </div>

            <button
              type="button"
              aria-label="Next month"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 py-2">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading cells */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="h-10" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(currentYear, currentMonth, day);
              dateObj.setHours(0, 0, 0, 0);

              const isPast = dateObj < minDateObj;
              const { available, basePrice } = getFlightAvailability(currentYear, currentMonth, day);

              const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate === dateString;

              const isDisabled = isPast || !available || isLoadingApi || !isHititConnected;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs relative transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#163784] text-white font-black shadow-md'
                      : available && !isPast
                      ? 'bg-blue-50/80 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold'
                      : 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                  }`}
                >
                  <span className="leading-none">{day}</span>
                  {available && !isPast && basePrice && (
                    <span
                      className={`text-[8px] font-mono leading-none mt-0.5 ${
                        isSelected ? 'text-blue-200' : 'text-[#163784]'
                      }`}
                    >
                      {basePrice}
                    </span>
                  )}
                  {/* Blue indicator badge for scheduled flights on airzimbabwe.aero */}
                  {available && !isPast && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend like airzimbabwe.aero */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span className="font-medium text-[#163784]">Live IBE availability</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />
              <span>{isLoadingApi ? 'Checking dates…' : isHititConnected ? 'Not available' : 'Live dates unavailable'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
