import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { 
  getTodayDateIST, 
  getTomorrowDateIST, 
  getISTHourMinute 
} from '../../utils/dateUtils';

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

// 12-Hour choices (01 to 12)
const HOURS_12 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

// Quick minute slot shortcuts
const QUICK_MINUTES = ['00', '15', '30', '45'];

// Quick preset times in 12-hour format
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
  // Always compute Today and Tomorrow strictly as per IST (Asia/Kolkata)
  const todayIso = getTodayDateIST();
  const tomorrowIso = getTomorrowDateIST();

  // Initialize date selection
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(todayIso);

  // Initialize Hour, Minute (any 0-59), and AM/PM strictly based on current IST time or provided value
  const [selectedHour, setSelectedHour] = useState<string>(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) return match[1].padStart(2, '0');
    }
    const { hours, minutes } = getISTHourMinute();
    let nextHours = hours;
    if (minutes >= 30) {
      nextHours = (nextHours + 1) % 24;
    }
    const h12 = nextHours % 12 || 12;
    return String(h12).padStart(2, '0');
  });

  const [selectedMinute, setSelectedMinute] = useState<string>(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) return match[2];
    }
    const { minutes } = getISTHourMinute();
    return minutes < 30 ? '30' : '00';
  });

  const [period, setPeriod] = useState<'AM' | 'PM'>(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) return match[3].toUpperCase() as 'AM' | 'PM';
    }
    const { hours, minutes } = getISTHourMinute();
    let nextHours = hours;
    if (minutes >= 30) {
      nextHours = (nextHours + 1) % 24;
    }
    return nextHours >= 12 ? 'PM' : 'AM';
  });

  const [duration, setDuration] = useState<number>(30);

  const selectedIsoDate =
    dateMode === 'today' ? todayIso : dateMode === 'tomorrow' ? tomorrowIso : customDate;

  // Ensure minute is always 2 digits for display and formatting
  const paddedMinute = (selectedMinute || '00').padStart(2, '0');

  // Formatted 12-hour string (e.g. "05:30 PM")
  const time12 = `${selectedHour}:${paddedMinute} ${period}`;

  // Corresponding 24-hour string for backend compatibility
  const time24 = formatTo24Hour(time12);

  // Build user-friendly schedule label
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
  }, [dateMode, customDate, selectedHour, selectedMinute, period, duration]);

  // Handle typing custom minute (allows any number from 0 to 59)
  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(-2);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 59) {
      val = '59';
    }
    setSelectedMinute(val);
  };

  const handleMinuteBlur = () => {
    let num = parseInt(selectedMinute, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    setSelectedMinute(String(num).padStart(2, '0'));
  };

  const stepMinute = (delta: number) => {
    let num = parseInt(selectedMinute, 10) || 0;
    num = (num + delta + 60) % 60;
    setSelectedMinute(String(num).padStart(2, '0'));
  };

  // Handle clicking quick 1-tap presets
  const handleSelectPreset = (preset: string) => {
    const match = preset.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      setSelectedHour(match[1].padStart(2, '0'));
      setSelectedMinute(match[2]);
      setPeriod(match[3].toUpperCase() as 'AM' | 'PM');
    }
  };

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
          <span className="text-[10px] font-semibold text-slate-500">
            {dateMode === 'today' ? `Today (IST: ${todayIso})` : dateMode === 'tomorrow' ? `Tomorrow (${tomorrowIso})` : selectedIsoDate}
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

      {/* 2. Time Row (12-Hour AM/PM Selector with Custom 0-59 Minute Entry) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>2. MEETING TIME (EXACT TIME SELECTOR)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
              IST (UTC+5:30)
            </span>
            <span className="font-mono text-xs font-black text-[#0A2540] bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
              {time12}
            </span>
          </div>
        </div>

        {/* 12-Hour AM / PM Selector Card with Custom Minute Input */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-2xs flex items-center justify-between gap-2.5">
          {/* Hour Selector */}
          <div className="flex-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Hour
            </span>
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="w-full py-2 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer text-center transition-colors"
            >
              {HOURS_12.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-400 font-black text-lg pt-4 select-none">:</span>

          {/* Minute Custom 00-59 Numeric Input with Steppers */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Minute
              </span>
              <span className="text-[8px] font-black text-teal-700 bg-teal-50 border border-teal-200 px-1 py-0.2 rounded uppercase">
                0-59
              </span>
            </div>
            <div className="flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 focus-within:bg-white transition-all">
              <button
                type="button"
                onClick={() => stepMinute(-1)}
                className="px-2.5 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 text-sm font-black transition-colors select-none cursor-pointer"
                title="Decrease 1 minute"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={selectedMinute}
                onChange={handleMinuteChange}
                onBlur={handleMinuteBlur}
                className="w-full py-2 bg-transparent text-sm font-mono font-black text-slate-800 text-center focus:outline-none"
                placeholder="00"
                title="Type any minute from 00 to 59"
              />
              <button
                type="button"
                onClick={() => stepMinute(1)}
                className="px-2.5 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 text-sm font-black transition-colors select-none cursor-pointer"
                title="Increase 1 minute"
              >
                +
              </button>
            </div>
          </div>

          {/* AM / PM Segmented Option Buttons */}
          <div className="shrink-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1 text-center">
              AM / PM
            </span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setPeriod('AM')}
                className={`px-3 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer ${
                  period === 'AM'
                    ? 'bg-[#0A2540] text-[#00C9A7] shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 bg-transparent'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setPeriod('PM')}
                className={`px-3 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer ${
                  period === 'PM'
                    ? 'bg-[#0A2540] text-[#00C9A7] shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 bg-transparent'
                }`}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        {/* Quick Minute Shortcuts + 1-Tap Presets */}
        <div className="pt-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-semibold shrink-0">
              Quick Min:
            </span>
            <div className="flex gap-1">
              {QUICK_MINUTES.map((m) => {
                const isSelected = paddedMinute === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMinute(m)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    :{m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-semibold block mb-1">
              Quick 1-Tap Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TIMES.map((preset) => {
                const isSelected = time12 === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xs font-black'
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
