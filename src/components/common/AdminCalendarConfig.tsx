import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  CalendarDays,
  Sun,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { CompanyHoliday, CalendarSettings } from '../../types';
import confetti from 'canvas-confetti';

export const AdminCalendarConfig: React.FC = () => {
  const {
    weeklyOffDays,
    toggleWeeklyOffDay,
    setWeeklyOffDays,
    calendarSettings,
    updateCalendarSettings,
    companyHolidays,
    addCompanyHoliday,
    deleteCompanyHoliday,
    loadPresetHolidays,
    clearAllHolidays,
    triggerToast,
  } = useApp();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'POLICY' | 'HOLIDAYS'>('CALENDAR');

  // -------------------------------------------------------------
  // Visual Month Calendar State
  // -------------------------------------------------------------
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth(); // 0-indexed

  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  const prevMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
    setSelectedDayStr(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1));
    setSelectedDayStr(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    const today = new Date().toISOString().split('T')[0];
    setSelectedDayStr(today);
  };

  // Days in month calculation
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      dayOfWeek: number;
    }> = [];

    // Padding for days before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dayNumber: 0,
        dateStr: '',
        isCurrentMonth: false,
        dayOfWeek: i,
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const monthPadded = String(selectedMonth + 1).padStart(2, '0');
      const dayPadded = String(d).padStart(2, '0');
      const dateStr = `${selectedYear}-${monthPadded}-${dayPadded}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth, d).getDay();
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        dayOfWeek,
      });
    }

    return days;
  }, [selectedYear, selectedMonth]);

  // Month summary metrics
  const monthMetrics = useMemo(() => {
    const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    let weeklyOffCount = 0;
    let holidayCount = 0;
    let workingDaysCount = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const monthPadded = String(selectedMonth + 1).padStart(2, '0');
      const dayPadded = String(d).padStart(2, '0');
      const dateStr = `${selectedYear}-${monthPadded}-${dayPadded}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth, d).getDay();

      const isHoliday = companyHolidays.some(h => h.date === dateStr);
      const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

      if (isHoliday) {
        holidayCount++;
      } else if (isWeeklyOff) {
        weeklyOffCount++;
      } else {
        workingDaysCount++;
      }
    }

    return {
      totalDays: totalDaysInMonth,
      workingDays: workingDaysCount,
      weeklyOffs: weeklyOffCount,
      holidays: holidayCount,
    };
  }, [selectedYear, selectedMonth, companyHolidays, weeklyOffDays]);

  // -------------------------------------------------------------
  // Policy Form State
  // -------------------------------------------------------------
  const [weekendPreset, setWeekendPreset] = useState<CalendarSettings['weekendPolicy']>(
    calendarSettings?.weekendPolicy || 'SUNDAY_ONLY'
  );
  const [shiftStart, setShiftStart] = useState(calendarSettings?.shiftStartTime || '09:30 AM');
  const [shiftEnd, setShiftEnd] = useState(calendarSettings?.shiftEndTime || '06:30 PM');
  const [graceMins, setGraceMins] = useState(calendarSettings?.gracePeriodMinutes || 15);
  const [halfDayHours, setHalfDayHours] = useState(calendarSettings?.halfDayThresholdHours || 4.0);
  const [fullDayHours, setFullDayHours] = useState(calendarSettings?.fullDayThresholdHours || 8.0);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  const applyWeekendPreset = (preset: CalendarSettings['weekendPolicy']) => {
    setWeekendPreset(preset);
    if (preset === 'SUNDAY_ONLY') {
      setWeeklyOffDays([0]);
    } else if (preset === 'SATURDAY_SUNDAY') {
      setWeeklyOffDays([0, 6]);
    } else if (preset === 'ALTERNATE_SATURDAY') {
      // Keep Sunday + flag alternate Saturday
      setWeeklyOffDays([0]);
    }
  };

  const handleSavePolicy = async () => {
    setIsSavingPolicy(true);
    try {
      await updateCalendarSettings({
        weekendPolicy: weekendPreset,
        shiftStartTime: shiftStart,
        shiftEndTime: shiftEnd,
        gracePeriodMinutes: Number(graceMins),
        halfDayThresholdHours: Number(halfDayHours),
        fullDayThresholdHours: Number(fullDayHours),
        weeklyOffDays,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // -------------------------------------------------------------
  // Holidays State
  // -------------------------------------------------------------
  const [holidaySearch, setHolidaySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'NATIONAL' | 'FESTIVAL' | 'COMPANY' | 'OPTIONAL'>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayType, setHolidayType] = useState<CompanyHoliday['type']>('FESTIVAL');
  const [holidayDesc, setHolidayDesc] = useState('');
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim()) {
      triggerToast('Please provide a holiday name');
      return;
    }
    if (!holidayDate) {
      triggerToast('Please select a date for the holiday');
      return;
    }

    await addCompanyHoliday({
      name: holidayName.trim(),
      date: holidayDate,
      type: holidayType,
      description: holidayDesc.trim(),
    });

    setHolidayName('');
    setHolidayDate('');
    setHolidayDesc('');
    setIsAdding(false);
  };

  const handleLoadPresets = async () => {
    setIsLoadingPresets(true);
    try {
      await loadPresetHolidays();
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const filteredHolidays = useMemo(() => {
    return companyHolidays.filter(h => {
      const matchesCategory = categoryFilter === 'ALL' || h.type === categoryFilter;
      const matchesSearch = !holidaySearch || 
        h.name.toLowerCase().includes(holidaySearch.toLowerCase()) ||
        h.date.includes(holidaySearch);
      return matchesCategory && matchesSearch;
    });
  }, [companyHolidays, categoryFilter, holidaySearch]);

  const dayNames = [
    { label: 'Sun', full: 'Sunday', index: 0 },
    { label: 'Mon', full: 'Monday', index: 1 },
    { label: 'Tue', full: 'Tuesday', index: 2 },
    { label: 'Wed', full: 'Wednesday', index: 3 },
    { label: 'Thu', full: 'Thursday', index: 4 },
    { label: 'Fri', full: 'Friday', index: 5 },
    { label: 'Sat', full: 'Saturday', index: 6 },
  ];

  // Selected Day Details for Inspector Card
  const selectedDayInfo = useMemo(() => {
    if (!selectedDayStr) return null;
    const dateObj = new Date(selectedDayStr + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const dayName = dayNames.find(d => d.index === dayOfWeek)?.full || '';
    const holiday = companyHolidays.find(h => h.date === selectedDayStr);
    const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

    return {
      dateStr: selectedDayStr,
      dayName,
      holiday,
      isWeeklyOff,
      formattedDate: dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
    };
  }, [selectedDayStr, companyHolidays, weeklyOffDays]);

  return (
    <div className="nexus-card bg-white border border-slate-200 shadow-sm rounded-3xl p-5 md:p-6 space-y-6">
      {/* --------------------------------------------------------- Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center shadow-xs flex-shrink-0">
            <CalendarIcon className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-lg text-[#0A2540] tracking-tight">
                Company Calendar &amp; Attendance Setup
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SQLite Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Configure company working schedule, shift timings, grace periods, and official gazetted holidays
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('CALENDAR')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'CALENDAR'
                ? 'bg-white text-[#0A2540] shadow-xs'
                : 'text-slate-600 hover:text-[#0A2540]'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Monthly Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('POLICY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'POLICY'
                ? 'bg-white text-[#0A2540] shadow-xs'
                : 'text-slate-600 hover:text-[#0A2540]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Shift &amp; Policy</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HOLIDAYS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'HOLIDAYS'
                ? 'bg-white text-[#0A2540] shadow-xs'
                : 'text-slate-600 hover:text-[#0A2540]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Official Holidays ({companyHolidays.length})</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Weekly Schedule</span>
          <span className="font-extrabold text-xs text-[#0A2540] block mt-0.5">
            {weeklyOffDays.length} Off Day{weeklyOffDays.length === 1 ? '' : 's'}/wk ({7 - weeklyOffDays.length} Work)
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Shift Timings</span>
          <span className="font-extrabold text-xs text-[#0A2540] block mt-0.5">
            {calendarSettings?.shiftStartTime || '09:30 AM'} - {calendarSettings?.shiftEndTime || '06:30 PM'}
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Late Grace Period</span>
          <span className="font-extrabold text-xs text-[#00A88B] block mt-0.5">
            +{calendarSettings?.gracePeriodMinutes || 15} mins buffer
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Official Holidays</span>
          <span className="font-extrabold text-xs text-purple-700 block mt-0.5">
            {companyHolidays.length} Listed in 2026
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------- TAB 1: MONTHLY VISUAL CALENDAR */}
      {activeTab === 'CALENDAR' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Calendar Header & Month Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/90">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                title="Previous Month"
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h4 className="font-display font-black text-base text-[#0A2540] tracking-tight min-w-36 text-center">
                {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </h4>
              <button
                type="button"
                onClick={nextMonth}
                title="Next Month"
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 ml-1 cursor-pointer transition-colors shadow-2xs"
              >
                Today
              </button>
            </div>

            {/* Month Stats Pill Strip */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {monthMetrics.workingDays} Working Days
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/80">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                {monthMetrics.weeklyOffs} Weekly Offs
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200/80">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                {monthMetrics.holidays} Holiday{monthMetrics.holidays === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* 7-Column Calendar Grid Container */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2.5 border-b border-slate-200 text-xs font-black uppercase tracking-wider">
              {dayNames.map((d) => (
                <div 
                  key={d.index} 
                  className={d.index === 0 || d.index === 6 ? 'text-slate-400' : 'text-slate-600'}
                >
                  <span>{d.label}</span>
                </div>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2.5">
              {calendarGrid.map((item, idx) => {
                if (!item.isCurrentMonth) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="aspect-square sm:aspect-auto sm:min-h-[64px] md:min-h-[76px] rounded-xl bg-slate-50/40 border border-dashed border-slate-200/50"
                    />
                  );
                }

                const isWeeklyOff = weeklyOffDays.includes(item.dayOfWeek);
                const holiday = companyHolidays.find((h) => h.date === item.dateStr);
                const isSelected = selectedDayStr === item.dateStr;
                const isToday = new Date().toISOString().split('T')[0] === item.dateStr;

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDayStr(item.dateStr)}
                    className={`aspect-square sm:aspect-auto sm:min-h-[64px] md:min-h-[76px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'border-[#00C9A7] ring-2 ring-[#00C9A7] bg-white shadow-md z-10 scale-[1.01]'
                        : holiday
                        ? 'bg-purple-50/70 border-purple-200/80 hover:border-purple-300 hover:bg-purple-50'
                        : isWeeklyOff
                        ? 'bg-slate-100/70 text-slate-500 border-slate-200/80 hover:bg-slate-100'
                        : 'bg-white border-slate-200/90 hover:border-[#00C9A7]/60 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Date Number & Compact Status Chip */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-mono font-bold flex items-center justify-center ${
                          isToday
                            ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00C9A7] text-[#0A2540] font-black shadow-2xs'
                            : holiday
                            ? 'text-purple-900 font-black'
                            : isWeeklyOff
                            ? 'text-slate-500'
                            : 'text-slate-800 group-hover:text-[#0A2540]'
                        }`}
                      >
                        {item.dayNumber}
                      </span>

                      {/* Status Badges */}
                      {holiday ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                          <span className="hidden md:inline">{holiday.type === 'NATIONAL' ? 'National' : 'Festival'}</span>
                        </span>
                      ) : isWeeklyOff ? (
                        <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-200/80 px-1 py-0.5 rounded">
                          OFF
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 hidden sm:block" />
                      )}
                    </div>

                    {/* Bottom: Desktop Holiday Title or Mobile Indicator Dot */}
                    <div className="w-full mt-auto">
                      {holiday ? (
                        <>
                          {/* Desktop Title Banner */}
                          <div className="hidden md:block pt-1">
                            <span 
                              className="text-[10px] font-extrabold text-purple-800 bg-purple-100/80 px-1.5 py-0.5 rounded block truncate" 
                              title={holiday.name}
                            >
                              {holiday.name}
                            </span>
                          </div>
                          {/* Mobile / Compact Dot */}
                          <div className="block md:hidden text-center pt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />
                          </div>
                        </>
                      ) : isWeeklyOff ? (
                        <div className="hidden md:block pt-1">
                          <span className="text-[10px] font-medium text-slate-400 block">Weekly Off</span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 mt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shadow-2xs" />
                  <span>Working Day</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />
                  <span>Weekly Off</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Official Holiday</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7]" />
                  <span>Today</span>
                </span>
              </div>

              <span className="text-[11px] text-slate-400 italic hidden sm:inline">
                Click any day to inspect details or manage schedule
              </span>
            </div>
          </div>

          {/* Selected Day Inspector Popover / Card */}
          {selectedDayInfo && (
            <div className="p-4 bg-gradient-to-br from-indigo-50/50 via-white to-white border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block">
                    Day Inspector
                  </span>
                  <h5 className="font-display font-black text-sm text-[#0A2540]">
                    {selectedDayInfo.formattedDate}
                  </h5>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                      selectedDayInfo.holiday
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : selectedDayInfo.isWeeklyOff
                        ? 'bg-slate-900 text-[#00C9A7] border-slate-700'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {selectedDayInfo.holiday
                      ? `Holiday: ${selectedDayInfo.holiday.name}`
                      : selectedDayInfo.isWeeklyOff
                      ? 'Scheduled Weekly Off'
                      : 'Regular Working Day'}
                  </span>
                </div>
              </div>

              {/* Day Inspector Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedDayInfo.holiday ? (
                  <button
                    type="button"
                    onClick={() => deleteCompanyHoliday(selectedDayInfo.holiday!.id)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Holiday "{selectedDayInfo.holiday.name}"</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setHolidayDate(selectedDayInfo.dateStr);
                      setActiveTab('HOLIDAYS');
                      setIsAdding(true);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Holiday on this Date</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const dateObj = new Date(selectedDayInfo.dateStr + 'T00:00:00');
                    toggleWeeklyOffDay(dateObj.getDay());
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Toggle Recurring {selectedDayInfo.dayName} Off</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- TAB 2: WEEKLY OFF & SHIFT TIMINGS */}
      {activeTab === 'POLICY' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Section 1: Weekly Off Policy Presets */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-black text-sm text-[#0A2540]">
                  Weekly Off Schedule &amp; Preset
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select a standard policy preset or customize off days individually
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                {weeklyOffDays.length} Off Day{weeklyOffDays.length === 1 ? '' : 's'}/wk
              </span>
            </div>

            {/* Presets Button Group */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => applyWeekendPreset('SUNDAY_ONLY')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  weeklyOffDays.length === 1 && weeklyOffDays.includes(0)
                    ? 'border-[#00C9A7] bg-[#E6FAF6] text-[#0A2540] shadow-xs ring-1 ring-[#00C9A7]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Sunday Only</span>
                  {weeklyOffDays.length === 1 && weeklyOffDays.includes(0) && (
                    <Check className="w-3.5 h-3.5 text-[#00A88B]" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block">6-Day Working Week (Standard)</span>
              </button>

              <button
                type="button"
                onClick={() => applyWeekendPreset('SATURDAY_SUNDAY')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  weeklyOffDays.length === 2 && weeklyOffDays.includes(0) && weeklyOffDays.includes(6)
                    ? 'border-[#00C9A7] bg-[#E6FAF6] text-[#0A2540] shadow-xs ring-1 ring-[#00C9A7]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Sat &amp; Sunday</span>
                  {weeklyOffDays.length === 2 && weeklyOffDays.includes(0) && weeklyOffDays.includes(6) && (
                    <Check className="w-3.5 h-3.5 text-[#00A88B]" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block">5-Day Corporate Week</span>
              </button>

              <button
                type="button"
                onClick={() => applyWeekendPreset('ALTERNATE_SATURDAY')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  weekendPreset === 'ALTERNATE_SATURDAY'
                    ? 'border-[#00C9A7] bg-[#E6FAF6] text-[#0A2540] shadow-xs ring-1 ring-[#00C9A7]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Alt Saturday</span>
                  {weekendPreset === 'ALTERNATE_SATURDAY' && (
                    <Check className="w-3.5 h-3.5 text-[#00A88B]" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block">Sunday + 2nd/4th Sat Off</span>
              </button>

              <button
                type="button"
                onClick={() => setWeekendPreset('CUSTOM')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  weekendPreset === 'CUSTOM'
                    ? 'border-[#00C9A7] bg-[#E6FAF6] text-[#0A2540] shadow-xs ring-1 ring-[#00C9A7]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Custom Days</span>
                  {weekendPreset === 'CUSTOM' && (
                    <Check className="w-3.5 h-3.5 text-[#00A88B]" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block">Toggle any combination</span>
              </button>
            </div>

            {/* Individual Day Toggles */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                Click any day below to toggle its status:
              </span>
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map((d) => {
                  const isOff = weeklyOffDays.includes(d.index);
                  return (
                    <button
                      key={d.index}
                      type="button"
                      onClick={() => toggleWeeklyOffDay(d.index)}
                      className={`py-3 px-1 rounded-2xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                        isOff
                          ? 'bg-[#0A2540] text-white shadow-xs ring-2 ring-[#00C9A7]/50 font-black'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-black block">{d.label}</span>
                      <span
                        className={`text-[9px] font-mono uppercase mt-1 px-1.5 py-0.2 rounded ${
                          isOff
                            ? 'bg-[#00C9A7] text-[#0A2540] font-extrabold'
                            : 'bg-slate-100 text-slate-500 font-bold'
                        }`}
                      >
                        {isOff ? 'OFF' : 'Work'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Shift Timings & Attendance Thresholds */}
          <div className="space-y-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            <div>
              <h4 className="font-display font-black text-sm text-[#0A2540]">
                Official Shift Timings &amp; Attendance Rules
              </h4>
              <p className="text-[11px] text-slate-500">
                Determines punctuality, late mark thresholds, and half-day work calculations
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Shift Start Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    placeholder="09:30 AM"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Shift End Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    placeholder="06:30 PM"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={graceMins}
                  onChange={(e) => setGraceMins(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Half-Day Min Work Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="8"
                  value={halfDayHours}
                  onChange={(e) => setHalfDayHours(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Full-Day Standard Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="12"
                  value={fullDayHours}
                  onChange={(e) => setFullDayHours(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={isSavingPolicy}
                  className="w-full bg-[#0A2540] hover:bg-[#00C9A7] hover:text-[#0A2540] text-white font-black text-xs py-2 px-4 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-[#00C9A7] group-hover:text-[#0A2540]" />
                  <span>{isSavingPolicy ? 'Saving Policy...' : 'Save Policy to SQLite'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- TAB 3: OFFICIAL GAZETTED HOLIDAYS */}
      {activeTab === 'HOLIDAYS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Action Strip: Load Presets, Add Holiday, Clear All */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadPresets}
                disabled={isLoadingPresets}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLoadingPresets ? 'Loading...' : '✨ Load 2026 Indian Gazetted Holidays (15 Days)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAdding ? 'Close Form' : '+ Add Holiday'}</span>
              </button>
            </div>

            {companyHolidays.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all company holidays?')) {
                    clearAllHolidays();
                  }
                }}
                className="text-slate-400 hover:text-rose-600 text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Clear All Holidays
              </button>
            )}
          </div>

          {/* Inline Add Holiday Form */}
          {isAdding && (
            <form
              onSubmit={handleCreateHoliday}
              className="p-4 bg-gradient-to-br from-indigo-50/70 via-white to-white border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2 text-indigo-900 font-black text-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Schedule New Official Holiday</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Holiday Date
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Holiday Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali Festival"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Category
                  </label>
                  <select
                    value={holidayType}
                    onChange={(e) => setHolidayType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="NATIONAL">National Holiday (Republic Day, etc.)</option>
                    <option value="FESTIVAL">Festival Holiday (Diwali, Holi, etc.)</option>
                    <option value="COMPANY">Company Holiday (Founders Day, etc.)</option>
                    <option value="OPTIONAL">Optional / Restricted Leave</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. All branch offices closed nationwide"
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Save Holiday to SQLite
                </button>
              </div>
            </form>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'NATIONAL', 'FESTIVAL', 'COMPANY', 'OPTIONAL'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#0A2540] text-white border-slate-800 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'ALL' ? `All (${companyHolidays.length})` : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={holidaySearch}
                onChange={(e) => setHolidaySearch(e.target.value)}
                placeholder="Search holiday..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Holidays List */}
          {filteredHolidays.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 italic mb-2">
                No holidays found matching your criteria.
              </p>
              <button
                type="button"
                onClick={handleLoadPresets}
                className="text-xs font-black text-purple-600 hover:underline cursor-pointer"
              >
                Click here to load 15 official Indian gazetted holidays
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredHolidays.map((hol) => {
                const dateObj = new Date(`${hol.date}T00:00:00`);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffTime = dateObj.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let countdownLabel = '';
                if (diffDays === 0) countdownLabel = 'Today!';
                else if (diffDays > 0) countdownLabel = `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
                else countdownLabel = 'Passed';

                return (
                  <div
                    key={hol.id}
                    className="flex flex-col justify-between p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-purple-300 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                            hol.type === 'NATIONAL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : hol.type === 'FESTIVAL'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {hol.type || 'FESTIVAL'}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold ${
                            diffDays === 0
                              ? 'text-emerald-600 animate-pulse'
                              : diffDays > 0 && diffDays <= 15
                              ? 'text-amber-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {countdownLabel}
                        </span>
                      </div>

                      <h5 className="font-bold text-xs text-[#0A2540] truncate block">
                        {hol.name}
                      </h5>
                      {hol.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {hol.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                      <span className="text-[11px] font-mono text-slate-500 font-semibold block">
                        📅 {dateObj.toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>

                      <button
                        type="button"
                        onClick={() => deleteCompanyHoliday(hol.id)}
                        title="Remove Holiday"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
