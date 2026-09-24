import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useScreenData } from '../hooks/useScreenData';
import { 
  Calendar, 
  UserCheck, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export const AttendanceLeavesView: React.FC = () => {
  const { 
    attendanceLogs, 
    leaveRequests, 
    setIsLeaveModalOpen, 
    profile,
    weeklyOffDays,
    companyHolidays,
    openPunchIn,
    openPunchOut
  } = useApp();

  useScreenData('attendanceLeaves');
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'leaves'>('attendance');

  // Calendar reflects the attendance records stored in SQLite
  const latestLogDate = attendanceLogs.map((l) => l.date).sort().at(-1);
  const monthAnchor = latestLogDate ? new Date(`${latestLogDate}T00:00:00`) : new Date();
  const monthLabel = monthAnchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const leadingBlanks = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1).getDay();
  const statusByDay = new Map(attendanceLogs.map((log) => [log.dayNumber, log.status]));
  const latestDay = monthAnchor.getDate();

  const countOf = (status: string) => attendanceLogs.filter((l) => l.status === status).length;
  const presentDays = countOf('PRESENT') + countOf('HALF_DAY');
  const leaveDays = countOf('LEAVE');
  const absentDays = countOf('ABSENT');
  const holidayDays = countOf('HOLIDAY');

  const formatLogDate = (iso: string) => {
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    const today = new Date();
    const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const pretty = parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (isSameDay(parsed, today)) return `Today, ${pretty}`;
    if (isSameDay(parsed, yesterday)) return `Yesterday, ${pretty}`;
    return pretty;
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2 px-3 sm:px-4 max-w-lg mx-auto">
      
      {/* 1. Sub-Tab Switcher */}
      <div className="flex p-1 bg-slate-200/80 rounded-2xl">
        <button
          onClick={() => setActiveSubTab('attendance')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'attendance'
              ? 'bg-white text-[#0A2540] shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attendance Calendar
        </button>

        <button
          onClick={() => setActiveSubTab('leaves')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'leaves'
              ? 'bg-white text-[#0A2540] shadow-sm font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Leave Management
        </button>
      </div>

      {activeSubTab === 'attendance' ? (
        <div className="space-y-4">
          {/* Biometric Face ID Punch In / Out Lifecycle Card */}
          <div className="nexus-card p-3.5 bg-gradient-to-r from-[#E6FAF6]/90 via-white to-white border border-[#00C9A7]/30 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00C9A7]/15 text-[#00A88B] flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0A2540]">Face Recognition Punch</h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {profile.checkInTime ? `Punched in: ${profile.checkInTime}` : 'Not checked in today'}
                </p>
              </div>
            </div>

            {profile.checkInTime && profile.faceIdStatus === 'VERIFIED_PRESENT' ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Present
                </span>
                <button
                  type="button"
                  onClick={openPunchOut}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  Punch Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openPunchIn}
                className="px-4 py-2 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Punch In (Face ID)</span>
              </button>
            )}
          </div>

          {/* Monthly Calendar View Card */}
          <div className="nexus-card p-4 bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="font-display font-black text-base text-[#0A2540]">{monthLabel}</h4>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                <button className="p-1 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Days Grid with clean vertical separation & Admin Weekly Off/Holiday reflection */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-mono font-bold">
              {[...Array(leadingBlanks)].map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const status = statusByDay.get(day);
                const isLatest = day === latestDay;

                const year = monthAnchor.getFullYear();
                const month = monthAnchor.getMonth();
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayOfWeek = new Date(year, month, day).getDay();
                const holidayMatch = companyHolidays.find((h) => h.date === dateStr);
                const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);

                return (
                  <div
                    key={day}
                    title={holidayMatch ? `Holiday: ${holidayMatch.name}` : isWeeklyOff ? 'Weekly Off' : undefined}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                      isLatest ? 'bg-[#00C9A7] text-[#0A2540] shadow-md shadow-[#00C9A7]/30 font-extrabold ring-2 ring-[#00C9A7]/50' :
                      status === 'LEAVE' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      status === 'ABSENT' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                      status === 'PRESENT' ? 'bg-emerald-50/80 text-emerald-900 border border-emerald-200' :
                      status === 'HALF_DAY' ? 'bg-sky-50 text-sky-900 border border-sky-200' :
                      holidayMatch || status === 'HOLIDAY' ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs font-black' :
                      isWeeklyOff ? 'bg-slate-100 text-slate-400 border border-slate-200/80' :
                      'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs leading-none">{day}</span>
                    {holidayMatch && (
                      <span className="text-[8px] font-black leading-none text-purple-700 mt-0.5 max-w-[40px] truncate">
                        ★
                      </span>
                    )}
                    {status === 'PRESENT' && !isLatest && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                    )}
                    {status === 'LEAVE' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />
                    )}
                    {isWeeklyOff && !holidayMatch && !status && (
                      <span className="text-[8px] text-slate-400 mt-0.5 leading-none font-sans font-medium">OFF</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-600 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Leave</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Weekly Off</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-600" /> Holiday</span>
            </div>
          </div>

          {/* Attendance Log Stream */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="font-display font-bold text-xs text-slate-500">Recent Daily Logs</h4>
              <span className="text-[10px] text-slate-400 font-mono">Synced</span>
            </div>
            {attendanceLogs
              .filter((log, idx, arr) => arr.findIndex((x) => x.date === log.date) === idx)
              .map((log, idx) => (
                <div key={idx} className="nexus-card p-3 bg-white border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#0A2540] block">{formatLogDate(log.date)}</span>
                    <span className="text-slate-400 text-[10px] font-mono block mt-0.5">{log.method || 'Weekly Off'}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold block ${
                      log.status === 'PRESENT' ? 'text-emerald-700' : log.status === 'LEAVE' ? 'text-amber-700' : 'text-slate-500'
                    }`}>
                      {log.workHours ? `${log.workHours} Worked` : log.status === 'LEAVE' ? 'On Leave' : 'Holiday'}
                    </span>
                    {log.checkIn && (
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {log.checkIn}{log.checkOut ? ` - ${log.checkOut}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* Leave Requests Tab */
        <div className="space-y-4">
          <div className="nexus-card p-4 bg-white border border-slate-200 flex items-center justify-between shadow-sm">
            <div>
              <h4 className="font-display font-bold text-sm text-[#0A2540]">Annual Leave Balance</h4>
              <p className="text-[11px] text-slate-500 font-medium">{profile.totalLeaveBalance} Days Available</p>
            </div>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-[#00C9A7]/25 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Apply Leave</span>
            </button>
          </div>

          {/* Requests History List */}
          <div className="space-y-2.5">
            <h4 className="font-display font-bold text-xs text-slate-500 px-1">Leave Requests History</h4>
            {leaveRequests.map((req) => (
              <div key={req.id} className="nexus-card p-3.5 bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm text-[#0A2540]">{req.leaveType}</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {req.status}
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-600">
                  <span>{req.fromDate} to {req.toDate}</span> • <strong>{req.totalDays} Day(s)</strong>
                </div>

                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {req.reason}
                </p>

                {req.approvedBy && (
                  <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Approved by {req.approvedBy}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
