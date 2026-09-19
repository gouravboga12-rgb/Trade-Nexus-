import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TeamMember, AssignedLead, CallLogItem } from '../../types';
import { 
  X, 
  Clock, 
  Phone, 
  PhoneCall, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRightLeft, 
  Search,
  Filter,
  UserCheck,
  Calendar
} from 'lucide-react';

interface TelecallerDetailDrawerProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TelecallerDetailDrawer: React.FC<TelecallerDetailDrawerProps> = ({
  member,
  isOpen,
  onClose
}) => {
  const { 
    assignedLeads, 
    clients,
    callLogs, 
    teamMembers, 
    reassignLead, 
    triggerToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'LEADS' | 'CALLS'>('LEADS');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reassigningLeadId, setReassigningLeadId] = useState<string | null>(null);
  const [targetAssignee, setTargetAssignee] = useState<string>('');

  if (!isOpen || !member) return null;

  // Mask phone numbers for high security data protection
  const maskPhone = (phone?: string) => {
    if (!phone) return '—';
    const clean = phone.trim();
    if (clean.length > 5) {
      return clean.substring(0, clean.length - 5) + '*****';
    }
    return '*****';
  };

  const formatInLakhs = (amount: number) => {
    if (amount >= 100000) {
      const lakhs = (amount / 100000).toFixed(2);
      return `₹${lakhs.replace(/\.00$/, '')} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const memberNameLower = member.name.toLowerCase();

  // 1. Match assigned_leads for this telecaller (by ID, empCode, or Name)
  const matchedAssigned = assignedLeads.filter((l) => {
    const byId = l.assignedToEmployeeId === member.id || l.assignedToEmployeeId === member.empCode;
    const byName = l.assignedToEmployeeName && l.assignedToEmployeeName.toLowerCase() === memberNameLower;
    return byId || byName;
  });

  // 2. Also map active CRM pipeline client_leads
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
    notes: c.requirement || 'Direct CRM Pipeline Lead',
    callCount: 1,
    lastCallTimestamp: c.lastContacted,
    dealValue: c.dealValue,
  }));

  // Merged lead list
  const existingIds = new Set(matchedAssigned.map(l => l.id));
  const memberLeads: AssignedLead[] = [
    ...matchedAssigned,
    ...pipelineLeads.filter(p => !existingIds.has(p.id))
  ];

  // Match category filters across naming variations
  const matchesCategory = (leadStatus: string, filter: string) => {
    if (filter === 'ALL') return true;
    const s = (leadStatus || '').toUpperCase();
    if (filter === 'INTERESTED') return s === 'INTERESTED' || s === 'FOLLOW-UP';
    if (filter === 'CALLBACK') return s === 'CALLBACK' || s === 'DUE TODAY';
    if (filter === 'PENDING') return s === 'PENDING';
    if (filter === 'NOT_INTERESTED') return s === 'NOT_INTERESTED' || s === 'REJECTED';
    if (filter === 'CONVERTED') return s === 'CONVERTED' || s === 'DEAL_CLOSED';
    return s === filter;
  };

  const filteredLeads = memberLeads.filter((l) => {
    const matchesStatus = matchesCategory(l.status, leadStatusFilter);
    const matchesSearch = 
      !searchQuery || 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // 3. Match Call Logs for this telecaller
  const leadPhones = new Set(memberLeads.map(l => (l.phone || '').replace(/\s+/g, '')));
  const leadNames = new Set(memberLeads.map(l => (l.name || '').toLowerCase()));

  const memberCallLogs = callLogs.filter((c) => {
    const cleanPhone = (c.phoneNumber || '').replace(/\s+/g, '');
    const clientNameLower = (c.clientName || '').toLowerCase();
    const byEmpId = c.employeeId && (c.employeeId === member.id || c.employeeId === member.empCode);
    const byLeadMatch = (cleanPhone && leadPhones.has(cleanPhone)) || (clientNameLower && leadNames.has(clientNameLower));
    return byEmpId || byLeadMatch;
  });

  // Timing & Late highlights (Reference time: 09:30 AM, Shift Target: 9.0 Hours)
  const inTime = member.checkInTime || null;
  const isLate = member.attendanceStatus === 'LATE' || (inTime && (() => {
    const parts = inTime.match(/(\d+):(\d+)/);
    if (!parts) return false;
    const h = parseInt(parts[1], 10);
    const m = parseInt(parts[2], 10);
    return (h === 9 && m > 30) || (h > 9 && h < 12);
  })());

  const outTime = member.checkOutTime;

  const handleReassignSubmit = (leadId: string) => {
    if (!targetAssignee) return;
    reassignLead(leadId, targetAssignee);
    triggerToast(`✓ Lead reassigned to ${targetAssignee}`);
    setReassigningLeadId(null);
    setTargetAssignee('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-display font-black text-xl shadow-md">
              {member.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-xl text-[#0A2540]">
                  {member.name}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  member.attendanceStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                  member.attendanceStatus === 'LATE' ? 'bg-amber-100 text-amber-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {member.attendanceStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {member.empCode} • {member.role ? member.role.replace(/telecaller/gi, 'Sales Executive') : 'Sales Executive'} • {member.group || 'Alpha Team'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Operations Bar (Check-in, Check-out, and Today's Stats) */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          
          {/* Check-In Card */}
          <div className={`p-3 rounded-2xl border ${
            isLate ? 'bg-amber-50/80 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75 mb-0.5">
              Check-In Time
            </span>
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>{inTime || 'Not Punched'}</span>
            </div>
            {isLate && <span className="text-[10px] text-amber-700 font-black block mt-0.5">⚠️ Late (&gt;09:30 AM)</span>}
          </div>

          {/* Check-Out Card */}
          <div className="p-3 rounded-2xl border bg-slate-50 border-slate-200 text-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75 mb-0.5">
              Check-Out Time
            </span>
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{outTime || 'Shift Active'}</span>
            </div>
            {!outTime && (
              <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                In Office
              </span>
            )}
          </div>

          {/* Dials Today */}
          <div className="p-3 rounded-2xl border bg-slate-50 border-slate-200 text-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75 mb-0.5">
              Today's Dials
            </span>
            <span className="font-mono-nums font-black text-base text-[#0A2540]">
              {member.dialsToday} Calls
            </span>
          </div>

          {/* Sales Achieved */}
          <div className="p-3 rounded-2xl border bg-[#E6FAF6]/50 border-[#00C9A7]/30 text-[#00A88B]">
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75 mb-0.5">
              Sales Achieved
            </span>
            <span className="font-mono-nums font-black text-base text-[#00A88B]">
              {formatInLakhs(member.salesAchieved)}
            </span>
          </div>

        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 border-b border-slate-200 bg-slate-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('LEADS')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'LEADS'
                  ? 'border-[#00C9A7] text-[#0A2540]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>Assigned Leads Bucket</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
                {memberLeads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('CALLS')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'CALLS'
                  ? 'border-[#00C9A7] text-[#0A2540]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>Today's Call Records</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
                {memberCallLogs.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00C9A7]" />
            <span>Secure Lead Protection</span>
          </div>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: ASSIGNED LEADS BUCKET */}
          {activeTab === 'LEADS' && (
            <div className="space-y-4">
              
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client or company..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto w-full sm:w-auto">
                  {[
                    { key: 'ALL', label: 'All' },
                    { key: 'INTERESTED', label: 'Interested' },
                    { key: 'CALLBACK', label: 'Callback' },
                    { key: 'PENDING', label: 'Pending' },
                    { key: 'NOT_INTERESTED', label: 'Not Interested' },
                    { key: 'CONVERTED', label: 'Converted' },
                  ].map((st) => (
                    <button
                      key={st.key}
                      onClick={() => setLeadStatusFilter(st.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                        leadStatusFilter === st.key
                          ? 'bg-white text-[#0A2540] shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leads List */}
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl space-y-2 bg-slate-50/50">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-xs text-slate-600">No leads found in this filter</p>
                  <p className="text-[11px] text-slate-400">All leads in this bucket have been called or reassigned.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeads.map((lead) => (
                    <div 
                      key={lead.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#00C9A7] transition-all space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#0A2540]">{lead.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              ID: {lead.id}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {lead.company || 'Private Client'} • Phone: <span className="font-mono text-slate-600 font-bold">{maskPhone(lead.phone)}</span>
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          lead.status === 'INTERESTED' ? 'bg-emerald-100 text-emerald-800' :
                          lead.status === 'CONVERTED' ? 'bg-purple-100 text-purple-800' :
                          lead.status === 'CALLBACK' ? 'bg-amber-100 text-amber-800' :
                          lead.status === 'NOT_INTERESTED' ? 'bg-rose-100 text-rose-800' :
                          lead.status === 'BUSY' ? 'bg-slate-200 text-slate-700' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </div>

                      {lead.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                          "{lead.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#00A88B]">
                            {lead.dealValue ? formatInLakhs(lead.dealValue) : '—'}
                          </span>
                          <span>• {lead.callCount} calls made</span>
                        </div>

                        {/* 1-Click Reassign */}
                        {reassigningLeadId === lead.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={targetAssignee}
                              onChange={(e) => setTargetAssignee(e.target.value)}
                              className="text-[11px] p-1 rounded-lg border border-slate-300 bg-white font-bold"
                            >
                              <option value="">Select Employee</option>
                              {teamMembers.filter(m => m.id !== member.id).map(m => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleReassignSubmit(lead.id)}
                              className="px-2 py-1 bg-[#00C9A7] text-[#0A2540] font-black rounded-lg text-[10px]"
                            >
                              Transfer
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
                            className="text-[#00A88B] hover:underline font-bold text-[11px] flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Reassign Lead</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TODAY'S CALL LOGS & NOTES */}
          {activeTab === 'CALLS' && (
            <div className="space-y-3">
              {memberCallLogs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl space-y-2 bg-slate-50/50">
                  <PhoneCall className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-xs text-slate-600">No calls recorded today yet</p>
                  <p className="text-[11px] text-slate-400">Calls logged by {member.name} will appear here with feedback notes.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {memberCallLogs.map((log) => (
                    <div 
                      key={log.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#0A2540]">
                            Lead #{log.id.substring(0, 6)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.timestamp}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          ⏱️ {Math.floor(log.durationSec / 60)}m {log.durationSec % 60}s
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                        "{log.notes || 'Call completed. No additional remarks.'}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-medium">Outcome: <strong className="text-emerald-700 font-bold">{log.outcome}</strong></span>
                        <span className="font-mono text-slate-400 font-semibold">Protected Contact: {maskPhone(log.phoneNumber)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Viewing workspace for <strong className="text-[#0A2540]">{member.name}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
          >
            Close Drawer
          </button>
        </div>

      </div>
    </div>
  );
};
