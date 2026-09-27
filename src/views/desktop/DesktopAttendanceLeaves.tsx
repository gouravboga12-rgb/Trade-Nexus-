import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import { 
  Calendar as CalendarIcon, 
  UserCheck, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { RejectedLeaveBanner } from '../../components/common/RejectedLeaveBanner';

export const DesktopAttendanceLeaves: React.FC = () => {
  const { 
    profile, 
    attendanceLogs, 
    leaveRequests, 
    setIsLeaveModalOpen, 
    weeklyOffDays,
    companyHolidays,
    triggerToast 
  } = useApp();

  useScreenData('attendanceLeaves');

  // Calendar is driven by the attendance records in SQLite. The displayed month
  // follows the most recent record so the grid always lines up with real data.
  const latestLogDate = attendanceLogs
    .map((l) => l.date)
    .sort()
    .at(-1);
  const monthAnchor = latestLogDate ? new Date(`${latestLogDate}T00:00:00`) : new Date();
  const monthLabel = monthAnchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const leadingBlanks = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1).getDay();

  const statusByDay = new Map(attendanceLogs.map((log) => [log.dayNumber, log.status]));
  const latestDay = latestLogDate ? new Date(`${latestLogDate}T00:00:00`).getDate() : new Date().getDate();

  const countOf = (status: string) => attendanceLogs.filter((l) => l.status === status).length;
  const presentDays = countOf('PRESENT') + countOf('HALF_DAY');
  const leaveDays = countOf('LEAVE');
  const absentDays = countOf('ABSENT');
  const holidayDays = countOf('HOLIDAY');

  // Leave quotas derived from the employee's balance and their approved requests
  const usedByType = (type: string) =>
    leaveRequests
      .filter((r) => r.leaveType === type && r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.totalDays, 0);
  const casualUsed = usedByType('Casual Leave');
  const sickUsed = usedByType('Sick Leave');
  const paidUsed = usedByType('Earned / Paid Leave');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Rejected Leave Notification Banner */}
      <RejectedLeaveBanner className="mb-2" />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
            Attendance Records & Leave Management
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Biometric Face ID tracking, working hours logs, and leave approval pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Monthly Calendar (Left 5 Cols) + Leave Quotas & History Table (Right 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Monthly Calendar Card */}
        <div className="lg:col-span-5 nexus-card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-lg text-[#0A2540]">{monthLabel} Calendar</h3>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
              <button className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 py-1 border-b border-slate-100">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-bold">
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
                  title={holidayMatch ? `Holiday: ${holidayMatch.name}` : isWeeklyOff ? 'Weekly Off' : status ? `${day}: ${status}` : `${day}`}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                    isLatest ? 'bg-[#00C9A7] text-[#0A2540] shadow-md shadow-[#00C9A7]/30 font-extrabold ring-2 ring-[#00C9A7]/50' :
                    status === 'LEAVE' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                    status === 'ABSENT' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                    status === 'PRESENT' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    status === 'HALF_DAY' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                    holidayMatch || status === 'HOLIDAY' ? 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold shadow-2xs' :
                    isWeeklyOff ? 'bg-slate-100 text-slate-400 border border-slate-200/80' :
                    'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span>{day}</span>
                  {holidayMatch && (
                    <span className="text-[8px] font-black leading-none text-purple-700 mt-0.5">★</span>
                  )}
                  {status === 'PRESENT' && !isLatest && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                  )}
                  {isWeeklyOff && !holidayMatch && !status && (
                    <span className="text-[8px] text-slate-400 mt-0.5 leading-none font-medium">OFF</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present ({presentDays} Days)</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Approved Leave ({leaveDays})</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent ({absentDays} Days)</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Weekly Off</span>
            <span className="flex items-center gap-2 col-span-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Company Holiday</span>
          </div>
        </div>

        {/* Right: Leave Balances + Request History Table */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Leave Quota Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="nexus-card p-4 bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Casual Leave</span>
              <span className="font-mono-nums font-black text-2xl text-[#0A2540] my-1 block">{casualUsed}</span>
              <span className="text-[10px] text-emerald-600 font-bold block">Days Approved</span>
            </div>

            <div className="nexus-card p-4 bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sick Leave</span>
              <span className="font-mono-nums font-black text-2xl text-sky-600 my-1 block">{sickUsed}</span>
              <span className="text-[10px] text-sky-600 font-bold block">Days Approved</span>
            </div>

            <div className="nexus-card p-4 bg-white border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Balance Remaining</span>
              <span className="font-mono-nums font-black text-2xl text-[#00A88B] my-1 block">{profile.totalLeaveBalance}</span>
              <span className="text-[10px] text-[#00A88B] font-bold block">{paidUsed} Paid Used</span>
            </div>
          </div>

          {/* Leave Requests History Table */}
          <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-base text-[#0A2540]">Leave Applications History</h3>
              <span className="text-xs text-slate-400 font-medium">Supervisor: {profile.teamLeaderName}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="pb-3 px-2">Leave Type</th>
                    <th className="pb-3 px-2">Date Range</th>
                    <th className="pb-3 px-2">Days</th>
                    <th className="pb-3 px-2">Reason</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-2 font-bold text-[#0A2540]">{req.leaveType}</td>
                      <td className="py-3 px-2 font-mono text-slate-600">{req.fromDate} to {req.toDate}</td>
                      <td className="py-3 px-2 font-mono font-bold text-slate-800">{req.totalDays} Day(s)</td>
                      <td className="py-3 px-2 text-slate-600 max-w-xs truncate">{req.reason}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-slate-500">
                        {req.approvedBy ? req.approvedBy : 'Pending TL Review'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
