import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { XCircle, X, Calendar, AlertCircle, Clock } from 'lucide-react';
import { LeaveRequest } from '../../types';

interface RejectedLeaveBannerProps {
  className?: string;
}

export const RejectedLeaveBanner: React.FC<RejectedLeaveBannerProps> = ({ className = '' }) => {
  const { currentUser, profile, leaveRequests } = useApp();
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('tnx_dismissed_rejected_leaves');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const updated = [...prev, id];
      try {
        localStorage.setItem('tnx_dismissed_rejected_leaves', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save dismissed leave id', err);
      }
      return updated;
    });
  };

  // Find all rejected leaves belonging to the currently logged in user
  const currentEmpId = currentUser?.employeeId || currentUser?.id || profile.id;
  const currentEmpCode = currentUser?.empCode || profile.empCode;
  const currentName = (currentUser?.name || profile.name || '').toLowerCase();

  const rejectedLeaves = (leaveRequests || []).filter(req => {
    if (req.status !== 'REJECTED') return false;
    if (dismissedIds.includes(req.id)) return false;

    const matchesId = req.employeeId && (req.employeeId === currentEmpId || req.employeeId === currentEmpCode);
    const matchesCode = req.employeeCode && (req.employeeCode === currentEmpCode || req.employeeCode === currentEmpId);
    const matchesName = req.employeeName && req.employeeName.toLowerCase() === currentName;

    return matchesId || matchesCode || matchesName;
  });

  if (rejectedLeaves.length === 0) return null;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {rejectedLeaves.map(req => {
        const rejectionDetails = req.approvedBy || req.rejectionReason || 'Declined due to operational scheduling requirements';
        
        return (
          <div
            key={req.id}
            className="bg-rose-50/95 border-2 border-rose-300 rounded-2xl p-3.5 sm:p-4 text-slate-800 shadow-sm animate-in slide-in-from-top-2 relative overflow-hidden"
          >
            {/* Top Red Accent Banner */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                  <XCircle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-900 bg-rose-200/80 px-2 py-0.5 rounded-md">
                      Leave Request Rejected
                    </span>
                    <span className="text-xs font-bold text-rose-800">
                      {req.leaveType}
                    </span>
                  </div>

                  {/* Dates & Duration */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-700 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-rose-600" />
                      <span>{req.fromDate} {req.toDate !== req.fromDate ? `– ${req.toDate}` : ''}</span>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200 shadow-2xs">
                      {req.totalDays || 1} Day{(req.totalDays || 1) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Applied reason */}
                  {req.reason && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-rose-200/60">
                      <span className="font-bold text-slate-500 block mb-0.5">Your Applied Reason:</span>
                      <span className="italic">"{req.reason}"</span>
                    </div>
                  )}

                  {/* Rejection Remarks / Decision by */}
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-100/70 border border-rose-300/80 text-xs text-rose-900">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-800 mb-0.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Decision &amp; Rejection Remarks:</span>
                    </div>
                    <p className="font-medium leading-relaxed pl-5">
                      {rejectionDetails}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close / Dismiss Button */}
              <button
                type="button"
                onClick={() => handleDismiss(req.id)}
                title="Dismiss this rejection notice"
                className="w-7 h-7 rounded-xl bg-rose-200/60 hover:bg-rose-300 text-rose-800 hover:text-rose-900 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Bottom Dismiss Footer for Mobile */}
            <div className="mt-3 pt-2 border-t border-rose-200/70 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Applied on: {req.appliedOn || 'Recent'}</span>
              <button
                type="button"
                onClick={() => handleDismiss(req.id)}
                className="font-bold text-rose-700 hover:text-rose-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Acknowledge &amp; Close</span>
                <X className="w-3 h-3 stroke-[2]" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
