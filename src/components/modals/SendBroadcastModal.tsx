import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  X,
  Send,
  Users,
  Search,
  Sparkles,
  BellRing,
  Award,
  Target,
  Megaphone,
  Check,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SendBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'ANNOUNCEMENT' | 'BIRTHDAY' | 'TARGET_ALERT' | 'PERFORMANCE' | 'GENERAL';
  prefilledEmployee?: {
    id: string;
    name: string;
    empCode?: string;
    role?: string;
  };
}

export const SendBroadcastModal: React.FC<SendBroadcastModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'ANNOUNCEMENT',
  prefilledEmployee,
}) => {
  const { teamMembers, currentUser, profile, triggerToast } = useApp();

  const [category, setCategory] = useState<'ANNOUNCEMENT' | 'BIRTHDAY' | 'TARGET_ALERT' | 'PERFORMANCE' | 'GENERAL'>(defaultCategory);
  const [targetScope, setTargetScope] = useState<'ALL' | 'ROLE' | 'CUSTOM'>('ALL');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['telecaller']);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    prefilledEmployee?.id ? [prefilledEmployee.id] : []
  );
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  
  const [title, setTitle] = useState(() => {
    if (defaultCategory === 'BIRTHDAY' && prefilledEmployee?.name) {
      return `🎂 Happy Birthday, ${prefilledEmployee.name}! 🎉`;
    }
    return '';
  });

  const [message, setMessage] = useState(() => {
    if (defaultCategory === 'BIRTHDAY' && prefilledEmployee?.name) {
      return `Wishing ${prefilledEmployee.name} a joyous birthday filled with success and happiness from the entire Trade Nexus family! Let's celebrate together today at the office.`;
    }
    return '';
  });

  const [actionUrl, setActionUrl] = useState('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentSuccessCount, setSentSuccessCount] = useState<number | null>(null);

  // Available roles for segmented broadcast
  const roleOptions = [
    { key: 'telecaller', label: 'Telecallers (Sales)' },
    { key: 'team_leader', label: 'Team Leaders' },
    { key: 'hr', label: 'HR Team' },
    { key: 'admin', label: 'Admin Team' },
  ];

  // Filter members for custom member selection
  const filteredMembers = useMemo(() => {
    const q = searchMemberQuery.toLowerCase().trim();
    if (!q) return [];
    return (teamMembers || []).filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.empCode && m.empCode.toLowerCase().includes(q)) ||
        (m.group && m.group.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [teamMembers, searchMemberQuery]);

  // Selected members objects
  const selectedMemberObjects = useMemo(() => {
    const idSet = new Set(selectedUserIds);
    return (teamMembers || []).filter((m) => idSet.has(m.id) || (m.empCode && idSet.has(m.empCode)));
  }, [teamMembers, selectedUserIds]);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: typeof category) => {
    setCategory(cat);
    if (cat === 'BIRTHDAY') {
      const empName = prefilledEmployee?.name || 'our team member';
      setTitle(`🎂 Happy Birthday, ${empName}! 🎉`);
      setMessage(`Wishing ${empName} a very happy birthday filled with happiness, health, and stellar achievements! Let's celebrate together.`);
      setTargetScope('ALL');
    } else if (cat === 'TARGET_ALERT') {
      setTitle(`🎯 Target Milestone Sprint Alert`);
      setMessage(`Dear Team, let's accelerate calling dials and lead conversions today! Keep up the momentum to crush this month's targets.`);
      setTargetScope('ROLE');
      setSelectedRoles(['telecaller', 'team_leader']);
      setActionUrl('calling');
    } else if (cat === 'ANNOUNCEMENT') {
      setTitle(`📢 Important Company Announcement`);
      setMessage(``);
      setTargetScope('ALL');
      setActionUrl('home');
    } else if (cat === 'PERFORMANCE') {
      setTitle(`⭐ Performance Spotlight`);
      setMessage(`Outstanding performance dedication today! Keep up the great work.`);
    }
  };

  const toggleRole = (r: string) => {
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide both title and announcement message.');
      return;
    }

    if (targetScope === 'ROLE' && selectedRoles.length === 0) {
      alert('Please select at least one role category.');
      return;
    }

    if (targetScope === 'CUSTOM' && selectedUserIds.length === 0) {
      alert('Please select at least one member to receive the alert.');
      return;
    }

    setIsSubmitting(true);
    setSentSuccessCount(null);

    try {
      const senderName = currentUser?.name || profile?.name || 'Management';
      const senderRole = currentUser?.role || (profile as any)?.role || 'admin';
      const senderId = currentUser?.id || profile?.id || 'admin';

      const res = await api.sendBroadcast({
        senderId,
        senderName,
        senderRole,
        category,
        targetScope,
        targetRoles: targetScope === 'ROLE' ? selectedRoles : undefined,
        targetUserIds: targetScope === 'CUSTOM' ? selectedUserIds : undefined,
        title: title.trim(),
        message: message.trim(),
        actionUrl,
      });

      setSentSuccessCount(res.deliveredDevices ?? 1);
      triggerToast(`✓ Alert dispatched successfully!`);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(`Could not dispatch broadcast: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#07192C] to-[#0A2540] px-5 sm:px-6 py-4 flex items-center justify-between text-white border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00C9A7]/15 border border-[#00C9A7]/30 flex items-center justify-center text-[#00C9A7]">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base tracking-tight">
                Send Company Alert &amp; Push Notification
              </h3>
              <p className="text-[11px] text-slate-300">
                Delivers instant pop-up in app and external lockscreen notification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-5 sm:p-6 space-y-4">
          {/* Category Pill Selector */}
          <div>
            <label className="text-[11px] font-black text-[#0A2540] uppercase tracking-wider block mb-1.5">
              Alert Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectCategory('BIRTHDAY')}
                className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all text-left ${
                  category === 'BIRTHDAY'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🎂</span>
                <span className="truncate">Birthday</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('TARGET_ALERT')}
                className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all text-left ${
                  category === 'TARGET_ALERT'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🎯</span>
                <span className="truncate">Target Nudge</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('ANNOUNCEMENT')}
                className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all text-left ${
                  category === 'ANNOUNCEMENT'
                    ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-400/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">📢</span>
                <span className="truncate">Notice</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCategory('PERFORMANCE')}
                className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all text-left ${
                  category === 'PERFORMANCE'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-400/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">⭐</span>
                <span className="truncate">Spotlight</span>
              </button>
            </div>
          </div>

          {/* Recipient Audience Scope */}
          <div>
            <label className="text-[11px] font-black text-[#0A2540] uppercase tracking-wider block mb-1.5">
              Who Should Receive This Alert?
            </label>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setTargetScope('ALL')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  targetScope === 'ALL'
                    ? 'bg-white text-[#0A2540] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🌐 Entire Company
              </button>
              <button
                type="button"
                onClick={() => setTargetScope('ROLE')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  targetScope === 'ROLE'
                    ? 'bg-white text-[#0A2540] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🏢 By Department
              </button>
              <button
                type="button"
                onClick={() => setTargetScope('CUSTOM')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  targetScope === 'CUSTOM'
                    ? 'bg-white text-[#0A2540] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🎯 Specific Members
              </button>
            </div>
          </div>

          {/* Sub-selector for ROLE scope */}
          {targetScope === 'ROLE' && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2">
              <p className="text-[11px] font-bold text-slate-500">Select target roles:</p>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(opt.key)}
                      onChange={() => toggleRole(opt.key)}
                      className="w-4 h-4 text-[#00A88B] rounded focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#0A2540]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sub-selector for CUSTOM members scope */}
          {targetScope === 'CUSTOM' && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search member by name or Emp Code (e.g., Sagar, TN-002)..."
                  value={searchMemberQuery}
                  onChange={(e) => setSearchMemberQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {filteredMembers.length > 0 && (
                <div className="max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xs divide-y divide-slate-100">
                  {filteredMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        toggleMemberSelection(m.id);
                        setSearchMemberQuery('');
                      }}
                      className="p-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-[#0A2540]">{m.name}</span>
                        <span className="text-slate-400 ml-1.5 font-mono text-[10px]">
                          {m.empCode || m.role}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#00A88B]">+ Add</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Member Chips */}
              <div className="flex flex-wrap gap-1.5">
                {selectedMemberObjects.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0A2540] shadow-2xs"
                  >
                    <span>{m.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleMemberSelection(m.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selectedMemberObjects.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic">No members selected yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Title Field */}
          <div>
            <label className="text-[11px] font-black text-[#0A2540] uppercase tracking-wider block mb-1">
              Alert Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 🎂 Happy Birthday Rohit! or 🎯 Calling Target Sprint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          {/* Message Field */}
          <div>
            <label className="text-[11px] font-black text-[#0A2540] uppercase tracking-wider block mb-1">
              Message Content
            </label>
            <textarea
              required
              rows={3}
              placeholder="Enter announcement details, celebration greetings, or specific reminders..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          {/* Action Redirection Link */}
          <div>
            <label className="text-[11px] font-black text-[#0A2540] uppercase tracking-wider block mb-1">
              Tap Action Redirection
            </label>
            <select
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0A2540] focus:outline-none cursor-pointer"
            >
              <option value="home">Dashboard / Home</option>
              <option value="calling">Calling Leads Screen</option>
              <option value="clients">Clients &amp; Pipeline</option>
              <option value="attendance">Biometric Attendance</option>
              <option value="leaves">Leaves &amp; Approvals</option>
            </select>
          </div>

          {/* Success Message Banner */}
          {sentSuccessCount !== null && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Broadcast dispatched to {sentSuccessCount} active device(s)!</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00C9A7] to-[#00A88B] text-[#0A2540] font-black text-xs hover:shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Broadcast Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
