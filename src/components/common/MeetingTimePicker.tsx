import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';

export interface MeetingScheduleDetails {
  date: string; // YYYY-MM-DD or 'Today' / 'Tomorrow'
  dateIso: string; // YYYY-MM-DD
  time12: string; // e.g. "04:30 PM"
  time24: string; // e.g. "16:30"
  duration: number; // minutes e.g. 30, 45, 60
  formatted: string; // e.g. "Today at 04:30 PM"
}

interface MeetingTimePickerProps {
  value?: string;
  onChange: (formatted: string, details: MeetingScheduleDetails) => void;
  accentColor?: 'teal' | 'blue' | 'indigo' | 'slate';
  className?: string;
}

// Convert 24h "HH:MM" to 12h "hh:mm AM/PM"
export const formatTo12Hour = (time24: string): string => {
  if (!time24) return '11:00 AM';
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr || '00';
  if (isNaN(hour)) return '11:00 AM';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // 0 => 12
  const formattedHour = hour < 10 ? `0${hour}` : `${hour}`;
  return `${formattedHour}:${min} ${ampm}`;
};

// Convert 12h "04:30 PM" to 24h "16:30"
export const formatTo24Hour = (time12: string): string => {
  if (!time12) return '11:00';
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '11:00';
  let hour = parseInt(match[1], 10);
  const min = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return `${hour < 10 ? '0' : ''}${hour}:${min}`;
};

// Get current date string YYYY-MM-DD in local time
const getLocalDateString = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Quick preset times
const PRESET_TIMES = [
  '09:30 AM',
  '10:30 AM',
  '11:30 AM',
  '02:30 PM',
  '04:00 PM',
  '05:30 PM',
  '06:30 PM',
];

const DURATIONS = [15, 30, 45, 60, 90];

export const MeetingTimePicker: React.FC<MeetingTimePickerProps> = ({
  value,
  onChange,
  accentColor = 'teal',
  className = '',
}) => {
  const todayIso = getLocalDateString(0);
  const tomorrowIso = getLocalDateString(1);

  // Initialize date selection
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(todayIso);

  // Initialize time (default to next rounded 30 min slot or 11:00 AM)
  const [time24, setTime24] = useState<string>(() => {
    const now = new Date();
    let hours = now.getHours();
    let mins = now.getMinutes();
    if (mins < 30) {
      mins = 30;
    } else {
      hours = (hours + 1) % 24;
      mins = 0;
    }
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  });

  const [duration, setDuration] = useState<number>(30);

  const selectedIsoDate =
    dateMode === 'today' ? todayIso : dateMode === 'tomorrow' ? tomorrowIso : customDate;

  const time12 = formatTo12Hour(time24);

  // Build user-friendly string
  const formatScheduleString = (): string => {
    let datePart = 'Today';
    if (dateMode === 'tomorrow') {
      datePart = 'Tomorrow';
    } else if (dateMode === 'custom') {
      if (customDate === todayIso) {
        datePart = 'Today';
      } else if (customDate === tomorrowIso) {
        datePart = 'Tomorrow';
      } else {
        const [y, m, d] = customDate.split('-');
        const parsed = new Date(Number(y), Number(m) - 1, Number(d));
        datePart = parsed.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
      }
    }
    return `${datePart} at ${time12}`;
  };

  // Sync back to parent
  useEffect(() => {
    const formatted = formatScheduleString();
    onChange(formatted, {
      date: dateMode === 'today' ? 'Today' : dateMode === 'tomorrow' ? 'Tomorrow' : customDate,
      dateIso: selectedIsoDate,
      time12,
      time24,
      duration,
      formatted,
    });
  }, [dateMode, customDate, time24, duration]);

  // Color scheme classes
  const activeBtnClass =
    accentColor === 'blue'
      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
      : accentColor === 'indigo'
      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
      : 'bg-[#0A2540] text-[#00C9A7] border-[#0A2540] shadow-sm';

  const ringFocusClass =
    accentColor === 'blue'
      ? 'focus:ring-blue-500 focus:border-blue-500'
      : accentColor === 'indigo'
      ? 'focus:ring-indigo-500 focus:border-indigo-500'
      : 'focus:ring-teal-500 focus:border-teal-500';

  return (
    <div className={`space-y-3 bg-slate-50/80 p-3 sm:p-3.5 rounded-2xl border border-slate-200 ${className}`}>
      
      {/* 1. Date Row */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>1. MEETING DATE</span>
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            {dateMode === 'today' ? 'Today' : dateMode === 'tomorrow' ? 'Tomorrow' : selectedIsoDate}
          </span>
        </label>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setDateMode('today')}
            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
              dateMode === 'today'
                ? activeBtnClass
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDateMode('tomorrow')}
            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
              dateMode === 'tomorrow'
                ? activeBtnClass
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => setDateMode('custom')}
            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
              dateMode === 'custom'
                ? activeBtnClass
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Pick Date
          </button>
        </div>

        {dateMode === 'custom' && (
          <div className="pt-1 animate-in fade-in">
            <input
              type="date"
              min={todayIso}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className={`w-full p-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 ${ringFocusClass}`}
            />
          </div>
        )}
      </div>

      {/* 2. Time Row (Proper Exact Clock Picker + Preset Chips) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>2. MEETING TIME (EXACT TIME SELECTOR)</span>
          </span>
          <span className="font-mono text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
            {time12}
          </span>
        </label>

        {/* Exact native clock time input */}
        <div className="relative">
          <input
            type="time"
            value={time24}
            onChange={(e) => setTime24(e.target.value)}
            className={`w-full p-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 ${ringFocusClass}`}
          />
        </div>

        {/* Quick-Select Presets Chips */}
        <div className="pt-1">
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">
            Quick 1-Tap Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TIMES.map((preset) => {
              const preset24 = formatTo24Hour(preset);
              const isSelected = time24 === preset24;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTime24(preset24)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Duration Selector */}
      <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700">3. DURATION</span>
          <span className="text-[10px] font-bold text-slate-500">{duration} Minutes</span>
        </div>
        <div className="flex gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                duration === d
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      {/* 4. Live Schedule Summary Banner */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
              Scheduled For
            </span>
            <span className="text-xs font-black text-[#0A2540] truncate block">
              📅 {formatScheduleString()} ({duration} mins)
            </span>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200 shrink-0">
          All Can Join
        </span>
      </div>

    </div>
  );
};
