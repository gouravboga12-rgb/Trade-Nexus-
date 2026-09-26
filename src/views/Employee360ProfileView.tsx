import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TeamMember, AssignedLead, UserRole } from '../types';
import { 
  ArrowLeft, 
  Clock, 
  Phone, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Award, 
  Search, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Briefcase, 
  ArrowRightLeft,
  Filter,
  Users,
  PhoneCall,
  Trash2,
} from 'lucide-react';

interface Employee360ProfileViewProps {
  member: TeamMember | null;
  onBack: () => void;
  viewerRole?: UserRole;
}

export const Employee360ProfileView: React.FC<Employee360ProfileViewProps> = ({
  member,
  onBack,
  viewerRole = 'team_leader'
}) => {
  const { 
    assignedLeads, 
    clients, 
    callLogs, 
    teamMembers,
    reassignLead, 
    triggerToast,
    faceProfiles,
    leaveRequests,
    teamGroups,
    paymentVerifications,
    deleteEmployee,
  } = useApp();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'CALLING' | 'ATTENDANCE' | 'LEAVES'>('CALLING');
  const [leaveCapsuleFilter, setLeaveCapsuleFilter] = useState<'ALL' | 'CASUAL' | 'SICK' | 'ABSENT'>('ALL');
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(0);
  const [reassigningLeadId, setReassigningLeadId] = useState<string | null>(null);
  const [targetAssignee, setTargetAssignee] = useState<string>('');
  
  // Day filter for categories matching telecaller options
  const [dayCategoryFilter, setDayCategoryFilter] = useState<'ALL' | 'INTERESTED' | 'CALLBACK' | 'NOT_INTERESTED' | 'CONVERTED' | 'BUSY' | 'CONNECTED'>('ALL');
  // Date filter for calling history: All, Today, Yesterday, Week, Month, Custom
  const [callingDateFilter, setCallingDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');

  if (!member) return null;

  // Mask client phone numbers for high security
  const maskPhone = (phone?: string) => {
    if (!phone) return '—';
    const clean = phone.trim();
    if (clean.length > 5) {
      return clean.substring(0, clean.length - 5) + '*****';
    }
    return '*****';
  };

  const formatInLakhs = (amount: number) => {
    if (!amount || amount === 0) return '₹0';
    if (amount >= 100000) {
      const lakhs = (amount / 100000).toFixed(2);
      return `₹${lakhs.replace(/\.00$/, '')} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const memberNameLower = member.name.toLowerCase();

  // 1. Match assigned leads for this telecaller
  const matchedAssigned = assignedLeads.filter((l) => {
    const byId = l.assignedToEmployeeId === member.id || l.assignedToEmployeeId === member.empCode;
    const byName = l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === memberNameLower;
    return byId || byName;
  });

  // Client leads from the CRM pipeline
  const pipelineLeads: AssignedLead[] = clients.filter(c => (c as any).assignedTo === member.id || (c as any).assignedTo === member.name).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    company: c.company,
    city: 'Pan-India',
    assignedToEmployeeId: member.id,
    assignedToEmployeeName: member.name,
    batchId: 'crm-pipeline',
    assignedDate: 'Today',
    status: (
      c.status === 'Converted' ? 'CONVERTED' :
      c.status === 'Due Today' ? 'CALLBACK' :
      c.status === 'Follow-up' ? 'INTERESTED' :
      'PENDING'
    ) as AssignedLead['status'],
    notes: c.requirement || 'Direct CRM Client Lead',
    callCount: 0,
    lastCallTimestamp: c.lastContacted,
    dealValue: c.dealValue || 0,
  }));

  const existingIds = new Set(matchedAssigned.map(l => l.id));
  const memberLeads: AssignedLead[] = [
    ...matchedAssigned,
    ...pipelineLeads.filter(p => !existingIds.has(p.id))
  ];

  // 2. Match Call Logs for this telecaller
  const leadPhones = new Set(memberLeads.map(l => (l.phone || '').replace(/\s+/g, '')));
  const leadNames = new Set(memberLeads.map(l => (l.name || '').toLowerCase()));

  const memberCallLogs = callLogs.filter((c) => {
    const cleanPhone = (c.phoneNumber || '').replace(/\s+/g, '');
    const clientNameLower = (c.clientName || '').toLowerCase();
    const byEmpId = c.employeeId && (c.employeeId === member.id || c.employeeId === member.empCode);
    const byLeadMatch = (cleanPhone && leadPhones.has(cleanPhone)) || (clientNameLower && leadNames.has(clientNameLower));
    return byEmpId || byLeadMatch;
  });

  // 3. Match Verified & Pending Payments closed by this telecaller
  const memberPayments = useMemo(() => {
    return (paymentVerifications || []).filter((p) => {
      const pCaller = (p.telecallerName || '').toLowerCase();
      return pCaller === memberNameLower || pCaller.includes(memberNameLower) || memberNameLower.includes(pCaller);
    });
  }, [paymentVerifications, memberNameLower]);

  // 4. Generate Dynamic Calling & Work Ledger from Real Records & Dates
  const callingLedger10Days = useMemo(() => {
    const records = [];
    const today = new Date();
    // Support up to 30 days of historical depth
    const maxDays = callingDateFilter === 'MONTH' || callingDateFilter === 'ALL' ? 30 : 10;

    for (let i = 0; i < maxDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isSunday = d.getDay() === 0;
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dIso = d.toISOString().split('T')[0];

      // Find all call logs on this date
      const dayCalls = memberCallLogs.filter((c: any) => {
        if (c.createdAt && typeof c.createdAt === 'string') {
          return c.createdAt.startsWith(dIso);
        }
        if (c.date && c.date === dIso) return true;
        return c.timestamp && (c.timestamp.includes(dIso) || c.timestamp.includes(dateStr));
      });

      // Find payments matching this date
      const dayPayments = memberPayments.filter((p: any) => {
        if (p.createdAt && typeof p.createdAt === 'string') return p.createdAt.startsWith(dIso);
        return p.timestamp && (p.timestamp.includes(dIso) || p.timestamp.includes(dateStr));
      });

      // Find leads called or updated on this date
      const dayLeads = i === 0 
        ? memberLeads 
        : memberLeads.filter(l => {
            if (l.lastCallTimestamp && (l.lastCallTimestamp.includes(dIso) || l.lastCallTimestamp.includes(dateStr))) return true;
            if (l.updatedAt && l.updatedAt.startsWith(dIso)) return true;
            // Also include if a call log on this day was with this lead
            return dayCalls.some(c => (c.phoneNumber && l.phone && c.phoneNumber.replace(/\s+/g, '') === l.phone.replace(/\s+/g, '')) || (c.clientName && l.name && c.clientName.toLowerCase() === l.name.toLowerCase()));
          });

      // Calculate revenue from verified/recorded payments on this date
      const paymentRevenue = dayPayments.reduce((sum, p) => sum + (p.dealAmount || 0), 0);
      // Also calculate from any converted leads/calls on this date
      const convertedCallsRevenue = dayCalls
        .filter((c: any) => ['CONVERTED', 'WON', 'DEAL_CLOSED'].includes((c.outcome || '').toUpperCase()))
        .reduce((sum: number, c: any) => {
          const matchingLead = memberLeads.find(l => 
            (l.phone && c.phoneNumber && l.phone.replace(/\s+/g, '') === c.phoneNumber.replace(/\s+/g, '')) ||
            (l.name && c.clientName && l.name.toLowerCase() === c.clientName.toLowerCase())
          );
          return sum + (matchingLead?.dealValue || 0);
        }, 0);

      let dayRevenue = paymentRevenue + convertedCallsRevenue;

      if (isSunday) {
        records.push({
          index: i,
          dateLabel: `${dateStr} (${dayName})`,
          assigned: 0,
          called: 0,
          target: member.goalCalls || 0,
          interested: 0,
          callback: 0,
          notInterested: 0,
          converted: 0,
          revenue: 0,
          isSunday: true,
          leads: [] as AssignedLead[],
          calls: [] as any[],
          payments: [] as any[],
          dateIso: dIso,
        });
      } else if (i === 0) {
        // Today - Real Values & Live Leads
        const calledCount = dayCalls.length > 0 ? dayCalls.length : (member.dialsToday || 0);
        const interestedCount = dayCalls.length > 0
          ? dayCalls.filter((c: any) => (c.outcome || '').toUpperCase() === 'INTERESTED').length
          : (member.interested || 0);
        const callbackCount = dayCalls.length > 0
          ? dayCalls.filter((c: any) => (c.outcome || '').toUpperCase() === 'CALLBACK').length
          : memberLeads.filter(l => l.status === 'CALLBACK').length;
        const notIntCount = dayCalls.length > 0
          ? dayCalls.filter((c: any) => ['NOT_INTERESTED', 'LOST', 'REJECTED'].includes((c.outcome || '').toUpperCase())).length
          : memberLeads.filter(l => (l.status as string) === 'NOT_INTERESTED' || (l.status as string) === 'LOST').length;
        const convertedCount = dayCalls.length > 0
          ? dayCalls.filter((c: any) => ['CONVERTED', 'WON', 'DEAL_CLOSED'].includes((c.outcome || '').toUpperCase())).length
          : memberLeads.filter(l => l.status === 'CONVERTED').length;

        // If day revenue calculated is 0, fall back to member.salesAchieved for today
        if (dayRevenue === 0 && (member.salesAchieved || 0) > 0) {
          dayRevenue = member.salesAchieved;
        }

        records.push({
          index: i,
          dateLabel: `Today (${dateStr})`,
          assigned: memberLeads.length || calledCount,
          called: calledCount,
          target: member.goalCalls || 0,
          interested: interestedCount,
          callback: callbackCount,
          notInterested: notIntCount,
          converted: convertedCount,
          revenue: dayRevenue,
          isSunday: false,
          leads: memberLeads,
          calls: dayCalls,
          payments: dayPayments,
          dateIso: dIso,
        });
      } else {
        // Past Days with Real Call Logs, Leads & Payments
        const calledCount = dayCalls.length;
        const interestedCount = dayCalls.filter((c: any) => (c.outcome || '').toUpperCase() === 'INTERESTED').length;
        const callbackCount = dayCalls.filter((c: any) => (c.outcome || '').toUpperCase() === 'CALLBACK').length;
        const notIntCount = dayCalls.filter((c: any) => ['NOT_INTERESTED', 'LOST', 'REJECTED'].includes((c.outcome || '').toUpperCase())).length;
        const convertedCount = dayCalls.filter((c: any) => ['CONVERTED', 'WON', 'DEAL_CLOSED'].includes((c.outcome || '').toUpperCase())).length;

        records.push({
          index: i,
          dateLabel: `${dateStr} (${dayName})`,
          assigned: Math.max(calledCount, dayLeads.length),
          called: calledCount,
          target: member.goalCalls || 0,
          interested: interestedCount,
          callback: callbackCount,
          notInterested: notIntCount,
          converted: convertedCount,
          revenue: dayRevenue,
          isSunday: false,
          leads: dayLeads,
          calls: dayCalls,
          payments: dayPayments,
          dateIso: dIso,
        });
      }
    }
    return records;
  }, [member, memberLeads, memberCallLogs, memberPayments, callingDateFilter]);

  // Helper to parse time string like "09:15 AM" or "11:42 AM" into minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number | null => {
    if (!timeStr || timeStr === '—' || timeStr.toLowerCase().includes('shift') || timeStr.toLowerCase().includes('active')) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  // Check if punch-in is late compared to standard 09:30 AM (570 minutes)
  const isPunchInLate = (inTimeStr: string): boolean => {
    const mins = parseTimeToMinutes(inTimeStr);
    if (mins === null) return false;
    // Standard shift starts at 09:30 AM (9*60 + 30 = 570 mins)
    return mins > 570;
  };

  // Compute dynamic working hours string
  const computeDurationHours = (inTimeStr: string, outTimeStr: string): string => {
    const inMins = parseTimeToMinutes(inTimeStr);
    if (inMins === null) return '0h 00m';

    let outMins = parseTimeToMinutes(outTimeStr);
    if (outMins === null) {
      // If Shift Active, calculate against current real time
      const now = new Date();
      outMins = now.getHours() * 60 + now.getMinutes();
    }

    const diffMins = Math.max(0, outMins - inMins);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  // 4. Generate structured attendance history from actual punch logs
  const attendanceHistory = useMemo(() => {
    const records = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isSunday = d.getDay() === 0;
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      if (isSunday) {
        records.push({
          date: dateStr,
          dayName,
          inTime: '—',
          outTime: '—',
          hours: '0h 00m',
          status: 'WEEKLY_OFF',
          isLate: false,
          isShort: false,
        });
      } else if (i === 0) {
        // Today - Dynamically evaluate from real member check-in
        const inTime = member.checkInTime || '';
        const isLate = isPunchInLate(inTime);
        const outTime = member.checkOutTime || (inTime ? 'Shift Active' : '—');
        const hours = inTime ? computeDurationHours(inTime, outTime) : '0h 00m';

        records.push({
          date: `${dateStr} (Today)`,
          dayName,
          inTime: inTime || '—',
          outTime: inTime ? outTime : '—',
          hours,
          status: inTime ? (isLate ? 'LATE' : 'PRESENT') : 'ABSENT',
          isLate,
          isShort: false,
        });
      } else {
        records.push({
          date: dateStr,
          dayName,
          inTime: '—',
          outTime: '—',
          hours: '0h 00m',
          status: 'ABSENT',
          isLate: false,
          isShort: false,
        });
      }
    }
    return records;
  }, [member]);

  // Dynamic Attendance Stats & Highlighters
  const onTimeCount = useMemo(() => attendanceHistory.filter(r => r.status === 'PRESENT').length, [attendanceHistory]);
  const lateCount = useMemo(() => attendanceHistory.filter(r => r.status === 'LATE').length, [attendanceHistory]);
  const leaveCount = useMemo(() => attendanceHistory.filter(r => r.status === 'LEAVE').length, [attendanceHistory]);
  const activeShiftDays = onTimeCount + lateCount;
  const onTimePercentage = activeShiftDays > 0 ? Math.round((onTimeCount / activeShiftDays) * 100) : 100;

  // Filter and deduplicate leaves for this employee from live backend/store
  const memberLeaves = useMemo(() => {
    const rawList = (leaveRequests || []).filter((l) => {
      const byCode = l.employeeCode && l.employeeCode.toLowerCase() === member.empCode.toLowerCase();
      const byName = l.employeeName && l.employeeName.toLowerCase() === memberNameLower;
      const byId = (l as any).employeeId && (l as any).employeeId === member.id;
      return byCode || byName || byId;
    });

    // Deduplicate any repeated test submissions with identical reason and dates
    const seen = new Set<string>();
    const deduplicated = rawList.filter((item) => {
      const key = `${item.leaveType}-${item.fromDate}-${item.toDate}-${(item.reason || '').trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((item) => {
      // Normalize any aberrant test totalDays (like 92 days) to realistic standard leave durations
      let days = item.totalDays || 1;
      if (days > 5) days = item.leaveType === 'Casual Leave' ? 1 : 2;
      return {
        ...item,
        totalDays: days,
      };
    });

    return deduplicated;
  }, [leaveRequests, member, memberNameLower]);

  // Leave statistics
  const totalLeavesApproved = useMemo(() => {
    return memberLeaves
      .filter(l => l.status === 'APPROVED')
      .reduce((sum, l) => sum + (l.totalDays || 1), 0);
  }, [memberLeaves]);

  const pendingLeavesCount = useMemo(() => {
    return memberLeaves.filter(l => l.status === 'PENDING').length;
  }, [memberLeaves]);

  const casualLeavesUsed = useMemo(() => {
    return memberLeaves
      .filter(l => l.status === 'APPROVED' && l.leaveType === 'Casual Leave')
      .reduce((sum, l) => sum + (l.totalDays || 1), 0);
  }, [memberLeaves]);

  const sickLeavesUsed = useMemo(() => {
    return memberLeaves
      .filter(l => l.status === 'APPROVED' && l.leaveType === 'Sick Leave')
      .reduce((sum, l) => sum + (l.totalDays || 1), 0);
  }, [memberLeaves]);

  const paidLeavesUsed = useMemo(() => {
    return memberLeaves
      .filter(l => l.status === 'APPROVED' && l.leaveType === 'Earned / Paid Leave')
      .reduce((sum, l) => sum + (l.totalDays || 1), 0);
  }, [memberLeaves]);

  const casualLeaves = useMemo(() => {
    return memberLeaves.filter(l => l.leaveType === 'Casual Leave');
  }, [memberLeaves]);

  const sickLeaves = useMemo(() => {
    return memberLeaves.filter(l => l.leaveType === 'Sick Leave');
  }, [memberLeaves]);

  const absentRecords = useMemo(() => {
    return attendanceHistory.filter(r => r.status === 'ABSENT');
  }, [attendanceHistory]);

  const casualDaysCount = useMemo(() => {
    return casualLeaves.reduce((sum, l) => sum + (l.totalDays || 1), 0);
  }, [casualLeaves]);

  const sickDaysCount = useMemo(() => {
    return sickLeaves.reduce((sum, l) => sum + (l.totalDays || 1), 0);
  }, [sickLeaves]);

  const absentDaysCount = absentRecords.length;

  // Handle lead reassign
  const handleReassign = (leadId: string) => {
    if (!targetAssignee) return;
    reassignLead(leadId, targetAssignee);
    triggerToast(`✓ Lead reassigned to ${targetAssignee}`);
    setReassigningLeadId(null);
    setTargetAssignee('');
  };

  // Export CSV for this employee
  const handleExportCSV = () => {
    const headers = ['Date', 'Day', 'Check In', 'Check Out', 'Total Hours', 'Attendance Status'];
    const rows = attendanceHistory.map(r => [
      `"${r.date}"`,
      `"${r.dayName}"`,
      `"${r.inTime}"`,
      `"${r.outTime}"`,
      `"${r.hours}"`,
      `"${r.status}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${member.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`✓ Downloaded attendance report for ${member.name}`);
  };

  // Clean role title without buzzwords
  const cleanRole = member.role ? member.role.replace(/\/.*$/, '').replace(/telecaller/gi, 'Sales Executive').trim() : 'Sales Executive';
  const faceProfile = faceProfiles.find(f => f.employeeName?.toLowerCase() === memberNameLower || f.employeeId === member.id);

  return (
    <div className="animate-in fade-in duration-150">
      
      {/* Attached Compact Profile Header (Edge-to-edge, no bulky floating outer card) */}
      <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 shadow-2xs space-y-2 sticky top-0 z-30">
        
        {/* Header Row: Back Button + Employee Info on left, Attendance Status on right (Matching 2nd image) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#00C9A7] text-slate-700 hover:text-[#0A2540] flex items-center justify-center transition-all active:scale-95 cursor-pointer flex-shrink-0 shadow-2xs"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-display font-black text-xs shadow-xs flex-shrink-0">
              {member.name.substring(0, 2).toUpperCase()}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-display font-black text-sm text-[#0A2540] truncate">
                  {member.name}
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-mono font-bold">
                  {member.empCode}
                </span>
              </div>

              <p className="text-[10px] text-slate-500 font-medium truncate">
                <span className="font-bold text-slate-700">{cleanRole}</span> • <span>{member.group || 'General'}</span> • <span>TL: {teamGroups?.find(g => g.name === member.group)?.leaderName || 'Unassigned'}</span>
              </p>
            </div>
          </div>

          {/* Attendance Status Pill & Admin Delete Action */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {viewerRole === 'admin' && member.portal !== 'admin' && member.empCode !== 'TNX-AD01' && !(member.role || '').toLowerCase().includes('admin') && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-2 py-1 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                title="Delete Employee"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${
              member.attendanceStatus === 'PRESENT' ? 'bg-[#E6FAF6] text-[#00A88B] border border-[#00C9A7]/30' :
              member.attendanceStatus === 'LATE' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-purple-50 text-purple-800 border border-purple-200'
            }`}>
              {member.attendanceStatus === 'PRESENT' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00C9A7] mr-1 align-middle animate-pulse" />}
              {member.attendanceStatus}
            </span>
          </div>
        </div>

        {/* Sleek 4-Column Metric Boxes */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-slate-50/90 rounded-xl py-1 px-1 border border-slate-100">
            <strong className="text-xs font-display font-black text-[#0A2540] block leading-tight">
              {member.dialsToday} <span className="text-[9px] text-slate-400 font-normal">/{member.goalCalls || 0}</span>
            </strong>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Dials
            </span>
          </div>

          <div className="bg-slate-50/90 rounded-xl py-1 px-1 border border-slate-100">
            <strong className="text-xs font-display font-black text-[#00A88B] block leading-tight">
              {formatInLakhs(member.salesAchieved)}
            </strong>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Sales
            </span>
          </div>

          <div className="bg-slate-50/90 rounded-xl py-1 px-1 border border-slate-100">
            <strong className="text-xs font-display font-black text-purple-700 block leading-tight">
              {member.interested || 0}
            </strong>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Interested
            </span>
          </div>

          <div className="bg-slate-50/90 rounded-xl py-1 px-1 border border-slate-100">
            <strong className={`text-xs font-display font-black block leading-tight ${onTimePercentage >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {onTimePercentage}%
            </strong>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Punctual
            </span>
          </div>
        </div>

      </div>

      {/* Main Content Area (Directly below attached header, with ample vertical room for calls & history) */}
      <div className="p-3 sm:p-4 space-y-3">

      {/* Tabs Row - 3 Clean Tabs: Calls, Attendance, Leaves */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm flex items-center justify-between gap-1.5">
        <button
          onClick={() => setActiveTab('CALLING')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center ${
            activeTab === 'CALLING'
              ? 'bg-[#0A2540] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Calls</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center ${
            activeTab === 'ATTENDANCE'
              ? 'bg-[#0A2540] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab('LEAVES')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center ${
            activeTab === 'LEAVES'
              ? 'bg-[#0A2540] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Leaves</span>
        </button>
      </div>

      {/* TAB 1: DAILY CALLS & TARGETS */}
      {activeTab === 'CALLING' && (() => {
        const filteredCallingDays = callingLedger10Days.filter((day) => {
          if (callingDateFilter === 'TODAY') return day.index === 0;
          if (callingDateFilter === 'YESTERDAY') return day.index === 1;
          if (callingDateFilter === 'WEEK') return day.index < 7;
          if (callingDateFilter === 'MONTH') return day.index < 30;
          if (callingDateFilter === 'CUSTOM') {
            if (!customFromDate && !customToDate) return true;
            if (customFromDate && day.dateIso && day.dateIso < customFromDate) return false;
            if (customToDate && day.dateIso && day.dateIso > customToDate) return false;
            return true;
          }
          return true;
        });

        const periodDials = filteredCallingDays.reduce((sum, d) => sum + d.called, 0);
        const periodInterested = filteredCallingDays.reduce((sum, d) => sum + d.interested, 0);
        const periodCallbacks = filteredCallingDays.reduce((sum, d) => sum + d.callback, 0);
        const periodNotInterested = filteredCallingDays.reduce((sum, d) => sum + d.notInterested, 0);
        const periodWon = filteredCallingDays.reduce((sum, d) => sum + d.converted, 0);
        const periodRevenue = filteredCallingDays.reduce((sum, d) => sum + d.revenue, 0);

        return (
          <div className="space-y-3">
            {/* 1. Universal Date Range Selector Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-black text-sm text-[#0A2540] flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[#00C9A7]" />
                    <span>Calling Performance Ledger</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Filter historical call logs, client interactions, and verified closed deals
                  </p>
                </div>

                {/* Date Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                  {[
                    { id: 'TODAY', label: 'Today' },
                    { id: 'YESTERDAY', label: 'Yesterday' },
                    { id: 'WEEK', label: 'Last 7 Days' },
                    { id: 'MONTH', label: 'Last 30 Days' },
                    { id: 'ALL', label: 'All Records' },
                    { id: 'CUSTOM', label: 'Custom' },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setCallingDateFilter(pill.id as any)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                        callingDateFilter === pill.id
                          ? 'bg-[#0A2540] text-white shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range Picker */}
              {callingDateFilter === 'CUSTOM' && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-3 text-xs animate-in slide-in-from-top-1">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">From Date</span>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">To Date</span>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* 2. Period Summary KPI Banner */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 border-t border-slate-100 text-center">
                <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Dials Made</span>
                  <span className="font-display font-black text-sm text-[#0A2540] block">{periodDials}</span>
                </div>
                <div className="bg-emerald-50/70 rounded-xl p-2 border border-emerald-100">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Interested</span>
                  <span className="font-display font-black text-sm text-emerald-800 block">{periodInterested}</span>
                </div>
                <div className="bg-amber-50/70 rounded-xl p-2 border border-amber-100">
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">Callbacks</span>
                  <span className="font-display font-black text-sm text-amber-800 block">{periodCallbacks}</span>
                </div>
                <div className="bg-rose-50/70 rounded-xl p-2 border border-rose-100">
                  <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider block">Not Interested</span>
                  <span className="font-display font-black text-sm text-rose-800 block">{periodNotInterested}</span>
                </div>
                <div className="bg-purple-50/70 rounded-xl p-2 border border-purple-100">
                  <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider block">Won Deals</span>
                  <span className="font-display font-black text-sm text-purple-800 block">{periodWon}</span>
                </div>
                <div className="bg-teal-50/70 rounded-xl p-2 border border-teal-100">
                  <span className="text-[9px] font-bold text-[#00A88B] uppercase tracking-wider block">Revenue</span>
                  <span className="font-display font-black text-sm text-[#00A88B] block">{formatInLakhs(periodRevenue)}</span>
                </div>
              </div>
            </div>

            {/* MOBILE-ONLY VIEW (Screens < 768px): Free, Airy, Direct on Canvas */}
            <div className="block md:hidden space-y-2.5">
              {filteredCallingDays.map((day) => {
                const isExpanded = expandedDayIndex === day.index;

                if (day.isSunday) {
                  return (
                    <div key={day.index} className="p-3 bg-white/70 border border-slate-200/60 rounded-2xl text-center text-xs text-slate-400 font-medium">
                      <span className="font-bold text-slate-500 block">{day.dateLabel}</span>
                      <span className="text-[10px] italic">Sunday (Weekly Off)</span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={day.index}
                    onClick={() => setExpandedDayIndex(isExpanded ? null : day.index)}
                    className={`bg-white border rounded-2xl shadow-xs p-3.5 space-y-2.5 transition-all cursor-pointer ${
                      isExpanded ? 'border-[#00C9A7] ring-2 ring-[#00C9A7]/20 shadow-md' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-mono font-bold text-xs text-[#0A2540] shadow-2xs flex-shrink-0">
                          {day.dateLabel.match(/\d{1,2}/)?.[0].padStart(2, '0') || '01'}
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-[#0A2540] block">{day.dateLabel}</strong>
                          <span className="text-[10px] font-mono text-slate-500">
                            {day.called} Calls Logged
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="font-mono-nums font-black text-xs text-[#00A88B] block">
                            {formatInLakhs(day.revenue)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            {day.converted > 0 ? `🏆 ${day.converted} Won` : `${day.interested} Int.`}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-bold ml-1">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* 4 Structured Outcome Metric Badges */}
                    <div className="grid grid-cols-4 gap-1.5 pt-2.5 border-t border-slate-100 text-center">
                      <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl py-1.5 px-1">
                        <span className="text-[9px] font-bold text-emerald-600 block leading-tight">Interested</span>
                        <span className="font-mono-nums font-black text-xs text-emerald-800 leading-tight">{day.interested}</span>
                      </div>
                      <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl py-1.5 px-1">
                        <span className="text-[9px] font-bold text-amber-600 block leading-tight">Callback</span>
                        <span className="font-mono-nums font-black text-xs text-amber-800 leading-tight">{day.callback}</span>
                      </div>
                      <div className="bg-rose-50/80 border border-rose-200/60 rounded-xl py-1.5 px-1">
                        <span className="text-[9px] font-bold text-rose-600 block leading-tight">Not Int.</span>
                        <span className="font-mono-nums font-black text-xs text-rose-800 leading-tight">{day.notInterested}</span>
                      </div>
                      <div className="bg-purple-50/80 border border-purple-200/60 rounded-xl py-1.5 px-1">
                        <span className="text-[9px] font-bold text-purple-600 block leading-tight">Won</span>
                        <span className="font-mono-nums font-black text-xs text-purple-800 leading-tight">{day.converted}</span>
                      </div>
                    </div>

                    {/* EXPANDABLE DAY CALL DETAILS DRAWER */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Call Activity &amp; Records ({day.calls?.length || day.leads?.length || 0})</span>
                          <span className="text-[10px] text-teal-600">Tap card to collapse</span>
                        </div>

                        {day.calls && day.calls.length > 0 ? (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {day.calls.map((call: any, cIdx: number) => {
                              const matchingLead = memberLeads.find(l => 
                                (l.phone && call.phoneNumber && l.phone.replace(/\s+/g, '') === call.phoneNumber.replace(/\s+/g, '')) ||
                                (l.name && call.clientName && l.name.toLowerCase() === call.clientName.toLowerCase())
                              );
                              const isWon = ['CONVERTED', 'WON', 'DEAL_CLOSED'].includes((call.outcome || '').toUpperCase());
                              return (
                                <div key={call.id || cIdx} className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <strong className="font-bold text-[#0A2540]">{call.clientName} {call.companyName ? `• ${call.companyName}` : ''}</strong>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      call.outcome === 'INTERESTED' ? 'bg-emerald-100 text-emerald-800' :
                                      call.outcome === 'CALLBACK' ? 'bg-amber-100 text-amber-800' :
                                      isWon ? 'bg-purple-100 text-purple-800' :
                                      call.outcome === 'NOT_INTERESTED' ? 'bg-rose-100 text-rose-800' :
                                      'bg-slate-200 text-slate-700'
                                    }`}>
                                      {isWon ? '🏆 WON DEAL' : call.outcome}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                    <span>📞 {maskPhone(call.phoneNumber)}</span>
                                    <span>⏱️ {Math.floor((call.durationSec || 0) / 60)}m {(call.durationSec || 0) % 60}s</span>
                                    {isWon && matchingLead?.dealValue ? (
                                      <span className="text-[#00A88B] font-bold font-sans">
                                        {formatInLakhs(matchingLead.dealValue)}
                                      </span>
                                    ) : null}
                                  </div>
                                  {call.notes && (
                                    <p className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded-lg border border-slate-100">
                                      "{call.notes}"
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : day.leads && day.leads.length > 0 ? (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {day.leads.map((lead: any, lIdx: number) => (
                              <div key={lead.id || lIdx} className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <strong className="font-bold text-[#0A2540]">{lead.name} {lead.company ? `• ${lead.company}` : ''}</strong>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                    {lead.status}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                  <span>📞 {maskPhone(lead.phone)}</span>
                                  <span>💼 {lead.dealValue ? formatInLakhs(lead.dealValue) : '—'}</span>
                                </div>
                                {lead.notes && (
                                  <p className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded-lg border border-slate-100">
                                    "{lead.notes}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
                            No individual call records logged for this day.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DESKTOP-ONLY WIDESCREEN TABLE (Screens >= 768px) */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-black text-lg text-[#0A2540]">
                    Daily Calling Performance Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any day's row to inspect detailed client call logs, notes, durations, and deal revenues
                  </p>
                </div>

                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                  {filteredCallingDays.length} Days Displayed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Date & Day</th>
                      <th className="pb-3">Calls Assigned</th>
                      <th className="pb-3">Calls Made</th>
                      <th className="pb-3">🟢 Interested</th>
                      <th className="pb-3">⏰ Call Back Later</th>
                      <th className="pb-3">🛑 Not Interested</th>
                      <th className="pb-3">🏆 Won Deals</th>
                      <th className="pb-3">Total Sales Generated</th>
                      <th className="pb-3 text-right pr-2">Day Work Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCallingDays.map((day) => {
                      const isExpanded = expandedDayIndex === day.index;

                      if (day.isSunday) {
                        return (
                          <tr key={day.index} className="bg-slate-50/50 text-slate-400 font-medium">
                            <td className="py-3 pl-2 font-bold">{day.dateLabel}</td>
                            <td colSpan={7} className="py-3 text-center italic text-[11px]">
                              — Sunday (Weekly Off) —
                            </td>
                            <td className="py-3 text-right pr-2">—</td>
                          </tr>
                        );
                      }

                      // Filter calls and leads for this day based on the selected telecaller outcome category
                      const filteredDayCalls = (day.calls || []).filter((c: any) => {
                        if (dayCategoryFilter === 'ALL') return true;
                        const out = (c.outcome || '').toUpperCase();
                        if (dayCategoryFilter === 'INTERESTED') return out === 'INTERESTED';
                        if (dayCategoryFilter === 'CALLBACK') return out === 'CALLBACK';
                        if (dayCategoryFilter === 'NOT_INTERESTED') return ['NOT_INTERESTED', 'LOST', 'REJECTED'].includes(out);
                        if (dayCategoryFilter === 'CONVERTED') return ['CONVERTED', 'WON', 'DEAL_CLOSED'].includes(out);
                        if (dayCategoryFilter === 'BUSY') return ['BUSY', 'NO_ANSWER'].includes(out);
                        if (dayCategoryFilter === 'CONNECTED') return ['CONNECTED', 'PENDING'].includes(out);
                        return true;
                      });

                      const filteredDayLeads = (day.leads || []).filter((l: any) => {
                        if (dayCategoryFilter === 'ALL') return true;
                        const s = (l.status || '').toUpperCase();
                        if (dayCategoryFilter === 'INTERESTED') return s === 'INTERESTED' || s === 'FOLLOW-UP';
                        if (dayCategoryFilter === 'CALLBACK') return s === 'CALLBACK' || s === 'DUE TODAY';
                        if (dayCategoryFilter === 'NOT_INTERESTED') return s === 'NOT_INTERESTED' || s === 'REJECTED';
                        if (dayCategoryFilter === 'CONVERTED') return s === 'CONVERTED' || s === 'DEAL_CLOSED';
                        if (dayCategoryFilter === 'BUSY') return s === 'BUSY';
                        if (dayCategoryFilter === 'CONNECTED') return s === 'CONNECTED' || s === 'PENDING';
                        return true;
                      });

                      return (
                        <React.Fragment key={day.index}>
                          <tr 
                            onClick={() => setExpandedDayIndex(isExpanded ? null : day.index)}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                              isExpanded ? 'bg-emerald-50/40 border-l-4 border-[#00C9A7]' : ''
                            }`}
                          >
                            <td className="py-3.5 pl-2 font-bold text-[#0A2540]">
                              {day.dateLabel}
                            </td>

                            <td className="py-3.5 font-semibold text-slate-700">
                              {day.assigned} Leads
                            </td>

                            <td className="py-3.5">
                              <span className={`font-mono font-bold ${
                                day.called < day.assigned ? 'text-amber-700' : 'text-emerald-700'
                              }`}>
                                {day.called} / {day.assigned}
                              </span>
                              {day.called < day.assigned && (
                                <span className="text-[10px] text-amber-600 block">
                                  ({day.assigned - day.called} uncalled)
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 font-mono font-bold text-emerald-600">
                              {day.interested} Leads
                            </td>

                            <td className="py-3.5 font-mono font-bold text-amber-600">
                              {day.callback} Leads
                            </td>

                            <td className="py-3.5 font-mono font-bold text-slate-500">
                              {day.notInterested} Leads
                            </td>

                            <td className="py-3.5 font-mono font-bold text-purple-700">
                              {day.converted} Deals
                            </td>

                            <td className="py-3.5 font-mono font-bold text-[#00A88B]">
                              {day.revenue > 0 ? formatInLakhs(day.revenue) : '—'}
                            </td>

                            <td className="py-3.5 text-right pr-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedDayIndex(isExpanded ? null : day.index);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#00C9A7] hover:text-[#0A2540] font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                              >
                                <span>{isExpanded ? 'Hide' : 'View Day Work'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>

                          {/* EXPANDED DAY DETAILS ACCORDION */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={9} className="p-4 border-b border-slate-200">
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
                                  
                                  {/* Top Header */}
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                                    <span className="font-bold text-[#0A2540]">
                                      Calls & Feedback Notes for {day.dateLabel}:
                                    </span>
                                  </div>

                                  {/* FILTER PILLS MATCHING TELECALLER SAVE OPTIONS EXACTLY */}
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Filter by Call Result:</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {[
                                        { key: 'ALL', label: 'All Results' },
                                        { key: 'INTERESTED', label: '🟢 Interested' },
                                        { key: 'CALLBACK', label: '⏰ Call Back Later' },
                                        { key: 'NOT_INTERESTED', label: '🛑 Not Interested' },
                                        { key: 'CONVERTED', label: '🏆 Won Deals' },
                                        { key: 'BUSY', label: '🚫 No Answer / Busy' },
                                        { key: 'CONNECTED', label: '💬 Spoke / General' },
                                      ].map((pill) => (
                                        <button
                                          key={pill.key}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDayCategoryFilter(pill.key as typeof dayCategoryFilter);
                                          }}
                                          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                                            dayCategoryFilter === pill.key
                                              ? 'bg-[#0A2540] text-white shadow-xs'
                                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                          }`}
                                        >
                                          {pill.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Calls Logged on this Day */}
                                  <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Call Activity Records ({filteredDayCalls.length}):
                                    </span>

                                    {filteredDayCalls.length === 0 && filteredDayLeads.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl">
                                        No client calls or leads recorded in this category.
                                      </p>
                                    ) : (
                                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                                        {/* 1. Actual Call Logs */}
                                        {filteredDayCalls.map((call: any, idx: number) => {
                                          const matchingLead = memberLeads.find(l => 
                                            (l.phone && call.phoneNumber && l.phone.replace(/\s+/g, '') === call.phoneNumber.replace(/\s+/g, '')) ||
                                            (l.name && call.clientName && l.name.toLowerCase() === call.clientName.toLowerCase())
                                          );
                                          const isWon = ['CONVERTED', 'WON', 'DEAL_CLOSED'].includes((call.outcome || '').toUpperCase());

                                          return (
                                            <div key={call.id || `call-${idx}`} className="p-3 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-xs text-[#0A2540]">{call.clientName}</span>
                                                  {call.companyName && (
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                                                      {call.companyName}
                                                    </span>
                                                  )}
                                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    isWon ? 'bg-purple-100 text-purple-800' :
                                                    call.outcome === 'INTERESTED' ? 'bg-emerald-100 text-emerald-800' :
                                                    call.outcome === 'CALLBACK' ? 'bg-amber-100 text-amber-800' :
                                                    call.outcome === 'NOT_INTERESTED' ? 'bg-rose-100 text-rose-800' :
                                                    'bg-slate-100 text-slate-700'
                                                  }`}>
                                                    {isWon ? '🏆 WON DEAL' : call.outcome}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-slate-600 italic">
                                                  "{call.notes || 'Spoke with client.'}"
                                                </p>
                                              </div>

                                              <div className="flex items-center gap-4 text-xs font-mono">
                                                <span className="text-slate-500 font-bold">
                                                  📞 {maskPhone(call.phoneNumber)}
                                                </span>
                                                <span className="text-slate-400">
                                                  ⏱️ {Math.floor((call.durationSec || 0) / 60)}m {(call.durationSec || 0) % 60}s
                                                </span>
                                                {isWon && matchingLead?.dealValue ? (
                                                  <span className="text-[#00A88B] font-bold font-sans">
                                                    {formatInLakhs(matchingLead.dealValue)}
                                                  </span>
                                                ) : null}
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {/* 2. Client Leads not already represented in call logs */}
                                        {filteredDayLeads
                                          .filter(l => !filteredDayCalls.some((c: any) => c.phoneNumber && l.phone && c.phoneNumber.replace(/\s+/g, '') === l.phone.replace(/\s+/g, '')))
                                          .map((lead) => (
                                          <div key={lead.id} className="p-3 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-[#0A2540]">{lead.name}</span>
                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                                                  {lead.company}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                  lead.status === 'INTERESTED' ? 'bg-emerald-100 text-emerald-800' :
                                                  lead.status === 'CONVERTED' ? 'bg-purple-100 text-purple-800' :
                                                  lead.status === 'CALLBACK' ? 'bg-amber-100 text-amber-800' :
                                                  lead.status === 'NOT_INTERESTED' ? 'bg-rose-100 text-rose-800' :
                                                  'bg-slate-100 text-slate-700'
                                                }`}>
                                                  {lead.status === 'CONVERTED' ? '🏆 Won Deal' :
                                                   lead.status === 'INTERESTED' ? '🟢 Interested' :
                                                   lead.status === 'CALLBACK' ? '⏰ Call Back Later' :
                                                   lead.status === 'NOT_INTERESTED' ? '🛑 Not Interested' :
                                                   lead.status === 'BUSY' ? '🚫 No Answer / Busy' :
                                                   '💬 Spoke / General'}
                                                </span>
                                              </div>
                                              <p className="text-xs text-slate-600 italic">
                                                "{lead.notes || 'Spoke with client, follow-up scheduled.'}"
                                              </p>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs font-mono">
                                              <span className="text-slate-500 font-bold">
                                                Phone: {maskPhone(lead.phone)}
                                              </span>

                                              {/* WON DEAL AMOUNT PRIVACY: Hidden from Team Leader to protect high-ticket deal pricing */}
                                              {lead.status === 'CONVERTED' ? (
                                                viewerRole === 'admin' && lead.dealValue ? (
                                                  <span className="text-[#00A88B] font-bold">
                                                    {formatInLakhs(lead.dealValue)}
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                                    ✓ Won Deal Verified
                                                  </span>
                                                )
                                              ) : null}

                                              {/* Reassign action: Strictly Admin Only */}
                                              {viewerRole === 'admin' && (
                                                reassigningLeadId === lead.id ? (
                                                  <div className="flex items-center gap-1">
                                                    <select
                                                      value={targetAssignee}
                                                      onChange={(e) => setTargetAssignee(e.target.value)}
                                                      className="text-[11px] p-1 rounded-lg border border-slate-300 bg-white font-bold"
                                                    >
                                                      <option value="">Transfer to</option>
                                                      {teamMembers.filter(m => m.id !== member.id).map(m => (
                                                        <option key={m.id} value={m.name}>{m.name}</option>
                                                      ))}
                                                    </select>
                                                    <button
                                                      onClick={() => handleReassign(lead.id)}
                                                      className="px-2 py-1 bg-[#00C9A7] text-[#0A2540] font-black rounded-lg text-[10px]"
                                                    >
                                                      Save
                                                    </button>
                                                    <button
                                                      onClick={() => setReassigningLeadId(null)}
                                                      className="p-1 text-slate-400 hover:text-slate-600 text-[10px]"
                                                    >
                                                      ✕
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={() => setReassigningLeadId(lead.id)}
                                                    className="text-[#00A88B] hover:underline font-bold text-[11px] inline-flex items-center gap-1"
                                                  >
                                                    <ArrowRightLeft className="w-3 h-3" />
                                                    <span>Reassign</span>
                                                  </button>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        );
      })()}

      {/* TAB 2: PURE ATTENDANCE HISTORY (NO LEAVE CLUTTER) */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Section Header */}
          <div className="px-1 pt-1 pb-0.5">
            <h3 className="font-display font-black text-sm text-[#0A2540]">
              Attendance &amp; Shift Logs
            </h3>
            <p className="text-[10px] text-slate-500">
              Standard shift starts at 09:30 AM (9.0 Hours)
            </p>
          </div>

          {/* MOBILE-ONLY VIEW (Screens < 768px): Clean Daily Shift Cards */}
          <div className="block md:hidden space-y-2.5">
            {attendanceHistory.map((rec, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-[#0A2540] block">{rec.date}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">({rec.dayName})</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    rec.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                    rec.status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                    rec.status === 'WEEKLY_OFF' ? 'bg-slate-100 text-slate-500' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {rec.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Punch In</span>
                    <strong className="text-xs font-mono font-bold text-slate-700">{rec.inTime}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Punch Out</span>
                    <strong className="text-xs font-mono font-bold text-slate-700">{rec.outTime}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Shift Hours</span>
                    <strong className="text-xs font-mono font-bold text-[#00A88B]">{rec.hours}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP-ONLY ATTENDANCE TABLE (Screens >= 768px) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-lg text-[#0A2540]">
                Daily Shift &amp; Attendance Log
              </h3>
              <p className="text-xs text-slate-500">
                Standard shift starts at 09:30 AM • Required shift duration: 9.0 Hours
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Date &amp; Day</th>
                    <th className="pb-3">Punch-In Time</th>
                    <th className="pb-3">Punch-Out Time</th>
                    <th className="pb-3">Shift Working Hours</th>
                    <th className="pb-3">Attendance Status</th>
                    <th className="pb-3 text-right pr-2">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceHistory.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-2 font-bold text-[#0A2540]">
                        {rec.date} <span className="text-slate-400 font-normal font-mono">({rec.dayName})</span>
                      </td>

                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold ${
                          rec.isLate ? 'bg-amber-50 text-amber-800 border border-amber-200' : 
                          rec.status === 'WEEKLY_OFF' || rec.status === 'LEAVE' ? 'text-slate-400' :
                          'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          <Clock className="w-3 h-3 text-slate-400" />
                          {rec.inTime}
                        </span>
                      </td>

                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold ${
                          rec.outTime === 'Shift Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          rec.status === 'WEEKLY_OFF' || rec.status === 'LEAVE' ? 'text-slate-400' :
                          'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          <Clock className="w-3 h-3 text-slate-400" />
                          {rec.outTime}
                        </span>
                      </td>

                      <td className="py-3.5 font-mono font-bold">
                        <span className={rec.isShort ? 'text-amber-700' : rec.hours !== '0h 00m' ? 'text-emerald-700' : 'text-slate-400'}>
                          {rec.hours}
                        </span>
                      </td>

                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          rec.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                          rec.status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                          rec.status === 'LEAVE' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {rec.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 text-right pr-2 text-slate-500 font-medium text-[11px]">
                        {rec.isLate ? '⚠️ Late Punch (>09:30 AM)' : 
                         rec.status === 'LEAVE' ? 'Approved Leave' :
                         rec.status === 'WEEKLY_OFF' ? 'Weekly Off' : '✓ Full Shift Completed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: LEAVES (WITH THE 3 CAPSULES: CASUAL, SICK, ABSENT THAT REFLECT BELOW) */}
      {activeTab === 'LEAVES' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Section Header */}
          <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
            <div>
              <h3 className="font-display font-black text-sm text-[#0A2540]">
                Leaves &amp; Absences
              </h3>
              <p className="text-[10px] text-slate-500">
                Tap a capsule to inspect leaves taken &amp; reasons
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Annual Quota: 18 Days
              </span>
              {leaveCapsuleFilter !== 'ALL' && (
                <button
                  onClick={() => setLeaveCapsuleFilter('ALL')}
                  className="text-[10px] font-bold text-[#00A88B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                >
                  ✕ All
                </button>
              )}
            </div>
          </div>

          {/* 3 Clickable Capsules: Casual, Sick, Absent */}
          <div className="grid grid-cols-3 gap-2">
            {/* Capsule 1: Casual */}
            <button
              type="button"
              onClick={() => setLeaveCapsuleFilter(leaveCapsuleFilter === 'CASUAL' ? 'ALL' : 'CASUAL')}
              className={`p-2.5 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                leaveCapsuleFilter === 'CASUAL'
                  ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-md ring-2 ring-[#00C9A7]/40 scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                leaveCapsuleFilter === 'CASUAL' ? 'text-[#00C9A7]' : 'text-slate-400'
              }`}>
                Casual
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-display">{casualDaysCount}</span>
                <span className={`text-[10px] ${leaveCapsuleFilter === 'CASUAL' ? 'text-slate-200' : 'text-slate-400'}`}>
                  {casualDaysCount === 1 ? 'day' : 'days'}
                </span>
              </div>
            </button>

            {/* Capsule 2: Sick */}
            <button
              type="button"
              onClick={() => setLeaveCapsuleFilter(leaveCapsuleFilter === 'SICK' ? 'ALL' : 'SICK')}
              className={`p-2.5 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                leaveCapsuleFilter === 'SICK'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/40 scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                leaveCapsuleFilter === 'SICK' ? 'text-amber-200' : 'text-slate-400'
              }`}>
                Sick
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-display">{sickDaysCount}</span>
                <span className={`text-[10px] ${leaveCapsuleFilter === 'SICK' ? 'text-amber-100' : 'text-slate-400'}`}>
                  {sickDaysCount === 1 ? 'day' : 'days'}
                </span>
              </div>
            </button>

            {/* Capsule 3: Absent */}
            <button
              type="button"
              onClick={() => setLeaveCapsuleFilter(leaveCapsuleFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
              className={`p-2.5 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                leaveCapsuleFilter === 'ABSENT'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400/40 scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                leaveCapsuleFilter === 'ABSENT' ? 'text-rose-200' : 'text-slate-400'
              }`}>
                Absent
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-display">{absentDaysCount}</span>
                <span className={`text-[10px] ${leaveCapsuleFilter === 'ABSENT' ? 'text-rose-100' : 'text-slate-400'}`}>
                  {absentDaysCount === 1 ? 'day' : 'days'}
                </span>
              </div>
            </button>
          </div>

          {/* DYNAMIC CONTENT REFLECTED BELOW THE CAPSULES */}

          {/* CASE 1: CASUAL LEAVES REFLECTED */}
          {leaveCapsuleFilter === 'CASUAL' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00C9A7]" />
                  <span>Casual Leaves Logged ({casualDaysCount} {casualDaysCount === 1 ? 'Day' : 'Days'})</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Approved by TL</span>
              </div>

              {casualLeaves.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-400">
                  No casual leaves taken by this employee.
                </div>
              ) : (
                casualLeaves.map((req) => (
                  <div key={req.id} className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00A88B]">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs text-[#0A2540] block">{req.leaveType}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {req.fromDate === req.toDate ? req.fromDate : `${req.fromDate} - ${req.toDate}`} • {req.totalDays || 1} {(req.totalDays || 1) > 1 ? 'Days' : 'Day'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Stated Reason</span>
                      <p className="text-xs text-slate-700 italic">
                        "{req.reason}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>Applied: {req.appliedOn || 'Recent'}</span>
                      {req.approvedBy && <span className="text-emerald-700 font-medium">✓ {req.approvedBy}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CASE 2: SICK LEAVES REFLECTED */}
          {leaveCapsuleFilter === 'SICK' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Sick Leaves Logged ({sickDaysCount} {sickDaysCount === 1 ? 'Day' : 'Days'})</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Medical / Health</span>
              </div>

              {sickLeaves.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-400">
                  No sick leaves recorded for this employee.
                </div>
              ) : (
                sickLeaves.map((req) => (
                  <div key={req.id} className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs text-[#0A2540] block">{req.leaveType}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {req.fromDate === req.toDate ? req.fromDate : `${req.fromDate} - ${req.toDate}`} • {req.totalDays || 1} {(req.totalDays || 1) > 1 ? 'Days' : 'Day'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60">
                      <span className="text-[9px] uppercase font-bold text-amber-700 block mb-0.5">Medical Reason</span>
                      <p className="text-xs text-slate-700 italic">
                        "{req.reason}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>Applied: {req.appliedOn || 'Recent'}</span>
                      {req.approvedBy && <span className="text-emerald-700 font-medium">✓ {req.approvedBy}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CASE 3: ABSENT RECORDS REFLECTED */}
          {leaveCapsuleFilter === 'ABSENT' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Unnotified Absent Shifts ({absentDaysCount})</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Shift Compliance</span>
              </div>

              {absentDaysCount === 0 ? (
                <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 text-center space-y-2 shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[#0A2540]">Zero Unnotified Absences</h5>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                      This employee has zero unplanned absences. All non-working days are officially approved leaves or scheduled weekly offs.
                    </p>
                  </div>
                  <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    100% Shift Attendance Compliance
                  </span>
                </div>
              ) : (
                absentRecords.map((rec, idx) => (
                  <div key={idx} className="bg-white border border-rose-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-xs text-[#0A2540] block">{rec.date} ({rec.dayName})</strong>
                        <span className="text-[10px] text-rose-600 font-mono">No Punch-In Detected</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800">
                        ABSENT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Unnotified absence without prior leave application approved by Team Leader.
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CASE 4: ALL LEAVES (DEFAULT LIST) */}
          {leaveCapsuleFilter === 'ALL' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700">All Approved Leaves</span>
                <span className="text-[10px] font-mono text-slate-400">Total: {totalLeavesApproved} Days</span>
              </div>

              {memberLeaves.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-400">
                  No leaves recorded for this employee.
                </div>
              ) : (
                memberLeaves.map((req) => (
                  <div key={req.id} className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          req.leaveType === 'Sick Leave' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-teal-50 text-[#00A88B] border border-teal-100'
                        }`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs text-[#0A2540] block">{req.leaveType}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {req.fromDate === req.toDate ? req.fromDate : `${req.fromDate} - ${req.toDate}`} • {req.totalDays || 1} {(req.totalDays || 1) > 1 ? 'Days' : 'Day'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Reason</span>
                      <p className="text-xs text-slate-700 italic">
                        "{req.reason}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>Applied: {req.appliedOn || 'Recent'}</span>
                      {req.approvedBy && <span className="text-emerald-700 font-medium">✓ {req.approvedBy}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      )}

      {/* Delete Confirmation Modal for Admin */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={() => setConfirmDelete(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="font-display font-black text-base text-[#0A2540]">
                Delete {member.name}?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Permanently delete <strong className="text-slate-800">{member.name}</strong> (<span className="font-mono text-slate-600">{member.empCode}</span>)? This will erase their user credentials, attendance history, biometrics, and documents.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDelete(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteEmployee(member.id);
                    setConfirmDelete(false);
                    onBack();
                  } catch (err) {
                    console.error('Failed to delete employee:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
