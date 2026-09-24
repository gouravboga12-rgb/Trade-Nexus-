import React, { useState } from 'react';
import { 
  X, 
  Video, 
  Users, 
  User, 
  Briefcase, 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Search,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { EmployeeAvatar } from '../common/EmployeeAvatar';

interface AdminScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AudienceScope = 'ALL' | 'TEAM' | 'INDIVIDUAL' | 'LEADERSHIP';

const QUICK_TITLE_PRESETS = [
  { label: '🏛️ All-Hands Townhall', title: 'Monthly All-Hands Company Townhall', type: 'All-Hands Townhall', scope: 'ALL' as AudienceScope },
  { label: '📈 Quota Acceleration', title: 'Floor Revenue & Target Acceleration Sync', type: 'Squad Strategy & Targets', scope: 'TEAM' as AudienceScope },
  { label: '🤝 1-on-1 Appraisal', title: 'Executive 1-on-1 Performance Appraisal', type: '1-on-1 Executive Review', scope: 'INDIVIDUAL' as AudienceScope },
  { label: '⚡ Emergency Alignment', title: 'Emergency Floor Operational Alignment', type: 'Emergency Huddle', scope: 'ALL' as AudienceScope },
  { label: '🎖️ Leadership Sync', title: 'Weekly Executive & Team Leaders Sync', type: 'Leadership Sync', scope: 'LEADERSHIP' as AudienceScope },
];

export const AdminScheduleMeetingModal: React.FC<AdminScheduleMeetingModalProps> = ({ isOpen, onClose }) => {
  const { teamMembers, teamGroups, scheduleTeamMeeting, triggerToast } = useApp();

  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('All-Hands Townhall');
  const [audienceScope, setAudienceScope] = useState<AudienceScope>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>(teamGroups[0]?.name || 'HNI Closers');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(teamMembers[0]?.id || '');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [dateOption, setDateOption] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00 AM');
  const [locationType, setLocationType] = useState<'IN_APP' | 'BOARDROOM' | 'EXTERNAL'>('IN_APP');
  const [externalLink, setExternalLink] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'MANDATORY'>('MANDATORY');
  const [agenda, setAgenda] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Selected employee detail
  const selectedMember = teamMembers.find(m => m.id === selectedEmployeeId) || teamMembers[0];

  // Filtered employees for 1-on-1 search
  const filteredEmployees = teamMembers.filter(m => 
    !employeeSearch || 
    m.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    m.empCode.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (m.role || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (m.group || '').toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Calculate attendees count based on scope
  const getCalculatedAttendees = (): number => {
    switch (audienceScope) {
      case 'ALL':
        return Math.max(teamMembers.length + 3, 10); // All staff + Leaders + HR + Admin
      case 'TEAM': {
        const grp = teamGroups.find(g => g.name === selectedTeam);
        return grp ? grp.memberCount + 1 : 5;
      }
      case 'INDIVIDUAL':
        return 2; // Super Admin + Target Employee
      case 'LEADERSHIP':
        return teamGroups.length + 2; // Team Leaders + HR + Admin
    }
  };

  const getScopeLabel = (): string => {
    switch (audienceScope) {
      case 'ALL':
        return 'All Staff (Company-Wide)';
      case 'TEAM':
        return `Squad: ${selectedTeam}`;
      case 'INDIVIDUAL':
        return `1-on-1 with ${selectedMember?.name || 'Employee'}`;
      case 'LEADERSHIP':
        return 'Leadership Team (TLs & HR)';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      triggerToast('Please enter a meeting title');
      return;
    }

    setIsSubmitting(true);

    const resolvedDate = dateOption === 'today' 
      ? 'Today' 
      : dateOption === 'tomorrow' 
        ? 'Tomorrow' 
        : customDate;

    const formattedDateTime = `${resolvedDate}, ${time}`;

    let resolvedLocation = 'In-App Digital Video Room';
    let resolvedLink = '';

    if (locationType === 'BOARDROOM') {
      resolvedLocation = 'Executive Boardroom (HQ Level 4)';
    } else if (locationType === 'EXTERNAL') {
      resolvedLocation = externalLink.trim() || 'Google Meet / Zoom';
      resolvedLink = externalLink.trim();
    }

    const attendees = getCalculatedAttendees();

    scheduleTeamMeeting({
      title: title.trim(),
      dateTime: formattedDateTime,
      type: meetingType,
      location: resolvedLocation,
      agenda: agenda.trim() || `Executive directive from Super Admin for ${getScopeLabel()}.`,
      status: 'UPCOMING',
      meetingLink: resolvedLink || undefined,
      invitedMemberName: audienceScope === 'INDIVIDUAL' ? selectedMember?.name : undefined,
      attendeesCount: attendees,
      targetAudience: audienceScope,
      targetTeam: audienceScope === 'TEAM' ? selectedTeam : undefined,
      targetEmployeeId: audienceScope === 'INDIVIDUAL' ? selectedMember?.id : undefined,
      createdByRole: 'admin',
      priority,
    });

    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.6 }
    });

    triggerToast(`✓ Executive Meeting broadcasted to ${getScopeLabel()}!`);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div 
        className="bg-white text-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Executive Hierarchy Identity */}
        <div className="bg-[#0A2540] text-white p-5 flex items-start justify-between relative overflow-hidden flex-shrink-0">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-[#00C9A7]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-[#00C9A7]/20 border border-[#00C9A7]/40 flex items-center justify-center text-[#00C9A7] shadow-inner flex-shrink-0">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-lg text-white tracking-tight">
                  Executive Meeting Scheduler
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-[#00C9A7] text-[#0A2540] px-2 py-0.5 rounded-md font-mono">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Universal meeting creation for all company levels, squads, or 1-on-1s
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

          {/* Quick Title Presets */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#00A88B]" /> Quick Executive Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TITLE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTitle(p.title);
                    setMeetingType(p.type);
                    setAudienceScope(p.scope);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#00A88B] border border-slate-200 text-slate-600 font-bold text-[11px] transition-all cursor-pointer active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meeting Title Input */}
          <div>
            <label className="font-black text-slate-700 block mb-1">
              Meeting Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q3 Company Townhall / Urgent Strategy Realignment"
              required
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:border-[#00C9A7] focus:bg-white transition-all text-sm"
            />
          </div>

          {/* Universal Audience Scope (The core request) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-black text-sm text-[#0A2540] block">
                  Who is this meeting for? (Audience Scope)
                </label>
                <span className="text-[11px] text-slate-500">
                  Select who should receive this invite & attend
                </span>
              </div>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                ~{getCalculatedAttendees()} Attendees
              </span>
            </div>

            {/* 4 Scope Selector Pills */}
            <div className="grid grid-cols-2 gap-2">
              {/* Scope 1: Everyone */}
              <button
                type="button"
                onClick={() => setAudienceScope('ALL')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  audienceScope === 'ALL'
                    ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${audienceScope === 'ALL' ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-100 text-slate-600'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs block leading-tight">Everyone (All Staff)</span>
                  <span className={`text-[10px] block mt-0.5 ${audienceScope === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Whole floor & all roles
                  </span>
                </div>
              </button>

              {/* Scope 2: Specific Team / Squad */}
              <button
                type="button"
                onClick={() => setAudienceScope('TEAM')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  audienceScope === 'TEAM'
                    ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${audienceScope === 'TEAM' ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-100 text-slate-600'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs block leading-tight">Specific Squad / Team</span>
                  <span className={`text-[10px] block mt-0.5 ${audienceScope === 'TEAM' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Target one squad
                  </span>
                </div>
              </button>

              {/* Scope 3: 1-on-1 Individual */}
              <button
                type="button"
                onClick={() => setAudienceScope('INDIVIDUAL')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  audienceScope === 'INDIVIDUAL'
                    ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${audienceScope === 'INDIVIDUAL' ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-100 text-slate-600'}`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs block leading-tight">Single Person (1-on-1)</span>
                  <span className={`text-[10px] block mt-0.5 ${audienceScope === 'INDIVIDUAL' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Private review / sync
                  </span>
                </div>
              </button>

              {/* Scope 4: Leadership Only */}
              <button
                type="button"
                onClick={() => setAudienceScope('LEADERSHIP')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  audienceScope === 'LEADERSHIP'
                    ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${audienceScope === 'LEADERSHIP' ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-100 text-slate-600'}`}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-xs block leading-tight">Leadership Only</span>
                  <span className={`text-[10px] block mt-0.5 ${audienceScope === 'LEADERSHIP' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Team Leaders & HR
                  </span>
                </div>
              </button>
            </div>

            {/* Contextual Selector: By Team */}
            {audienceScope === 'TEAM' && (
              <div className="pt-2 animate-in fade-in space-y-2 border-t border-slate-200/80">
                <label className="font-bold text-slate-700 block">Select Target Squad:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {teamGroups.map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setSelectedTeam(grp.name)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedTeam === grp.name
                          ? 'border-[#00C9A7] bg-white ring-2 ring-[#00C9A7]/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-xs text-[#0A2540] truncate">{grp.name}</span>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: grp.color }} />
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Lead: {grp.leaderName} · {grp.memberCount} reps
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contextual Selector: 1-on-1 Individual Employee */}
            {audienceScope === 'INDIVIDUAL' && (
              <div className="pt-2 animate-in fade-in space-y-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Select Employee for 1-on-1:</label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'} found
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search employee by name, code, squad, or role..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 p-1.5">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">No employees found.</div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = selectedEmployeeId === emp.id;
                      return (
                        <div
                          key={emp.id}
                          onClick={() => setSelectedEmployeeId(emp.id)}
                          className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[#0A2540] text-[#00C9A7] flex items-center justify-center font-bold text-[10px] flex-shrink-0 overflow-hidden">
                              <EmployeeAvatar
                                avatar={emp.avatar}
                                name={emp.name}
                                className="w-full h-full"
                                fallbackClassName="font-bold text-[10px]"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-[#0A2540] block truncate">
                                {emp.name} <span className="font-mono text-[10px] text-slate-400">({emp.empCode})</span>
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {emp.role || 'Telecaller'} · {emp.group || 'General'}
                              </span>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#00A88B] flex-shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date, Time & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date Picker */}
            <div>
              <label className="font-black text-slate-700 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> When (Date)
              </label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setDateOption('today')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    dateOption === 'today' ? 'bg-[#0A2540] text-[#00C9A7] border-[#0A2540]' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDateOption('tomorrow')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    dateOption === 'tomorrow' ? 'bg-[#0A2540] text-[#00C9A7] border-[#0A2540]' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setDateOption('custom')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    dateOption === 'custom' ? 'bg-[#0A2540] text-[#00C9A7] border-[#0A2540]' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Custom
                </button>
              </div>
              {dateOption === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="mt-1.5 w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                />
              )}
            </div>

            {/* Time Picker */}
            <div>
              <label className="font-black text-slate-700 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Time Slot
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:border-[#00C9A7]"
              >
                <option value="09:30 AM">09:30 AM (Morning Kickoff)</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="11:30 AM">11:30 AM (Floor Sync)</option>
                <option value="02:00 PM">02:00 PM (Post-Lunch Review)</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="05:30 PM">05:30 PM (Evening Wrap-Up)</option>
                <option value="06:30 PM">06:30 PM</option>
              </select>
            </div>
          </div>

          {/* Location / Video Room Option */}
          <div>
            <label className="font-black text-slate-700 block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Meeting Room / Platform
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLocationType('IN_APP')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  locationType === 'IN_APP'
                    ? 'bg-teal-50 border-[#00C9A7] text-[#00A88B]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                🎥 Built-in Room
              </button>
              <button
                type="button"
                onClick={() => setLocationType('BOARDROOM')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  locationType === 'BOARDROOM'
                    ? 'bg-teal-50 border-[#00C9A7] text-[#00A88B]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                🏢 HQ Boardroom
              </button>
              <button
                type="button"
                onClick={() => setLocationType('EXTERNAL')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  locationType === 'EXTERNAL'
                    ? 'bg-teal-50 border-[#00C9A7] text-[#00A88B]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                🌐 External URL
              </button>
            </div>

            {locationType === 'EXTERNAL' && (
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://meet.google.com/xyz-abcd-efg or Zoom URL"
                className="mt-2 w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium focus:outline-none focus:border-[#00C9A7]"
              />
            )}
          </div>

          {/* Priority Flag */}
          <div>
            <label className="font-black text-slate-700 block mb-1">Executive Priority Notice</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPriority('MANDATORY')}
                className={`flex-1 p-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  priority === 'MANDATORY'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Mandatory Attendance</span>
              </button>
              <button
                type="button"
                onClick={() => setPriority('NORMAL')}
                className={`flex-1 p-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  priority === 'NORMAL'
                    ? 'bg-teal-50 border-teal-300 text-teal-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Standard Review</span>
              </button>
            </div>
          </div>

          {/* Agenda / Directives */}
          <div>
            <label className="font-black text-slate-700 block mb-1">
              Executive Agenda & Directives (Optional)
            </label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="e.g., 1. Review yesterday's dial volume & won deals. 2. Pipeline obstacles. 3. New bonus incentives."
              rows={2}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          {/* Live Broadcast Preview Pill */}
          <div className="bg-gradient-to-r from-slate-900 to-[#0A2540] text-white p-3 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00C9A7] animate-ping" />
              <div>
                <span className="text-[10px] font-mono text-slate-300 block uppercase">Broadcast Preview</span>
                <span className="font-bold text-xs text-white truncate block">
                  {title || 'Untitled Meeting'} · {getScopeLabel()}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#00C9A7]/20 text-[#00C9A7] px-2 py-0.5 rounded-md border border-[#00C9A7]/40 flex-shrink-0">
              Host: Super Admin
            </span>
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-[#0A2540] via-teal-900 to-[#00A88B] hover:opacity-95 text-white font-black text-xs shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Video className="w-4 h-4 text-[#00C9A7]" />
              <span>Broadcast & Schedule Meeting</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
