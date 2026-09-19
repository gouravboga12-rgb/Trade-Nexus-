import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, PhoneCall, Clock, Calendar, CheckCircle2, PhoneForwarded, PhoneOff, ThumbsDown, Award } from 'lucide-react';
import { CallOutcome, AssignedLead } from '../../types';

export const QuickCallLogModal: React.FC = () => {
  const {
    isQuickCallModalOpen,
    setIsQuickCallModalOpen,
    activeCallingLead,
    setActiveCallingLead,
    updateAssignedLeadStatus,
    logNewCall,
    myLeads: clients,
    assignedLeads,
  } = useApp();

  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome>('INTERESTED');
  const [durationMin, setDurationMin] = useState('2');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [dealAmount, setDealAmount] = useState<string>('');

  const resetForm = () => {
    setClientName('');
    setCompanyName('');
    setPhone('');
    setNotes('');
    setFollowUpDate('');
    setDealAmount('');
    setDurationMin('2');
    setOutcome('INTERESTED');
  };

  useEffect(() => {
    if (activeCallingLead) {
      setClientName(activeCallingLead.name);
      setCompanyName(activeCallingLead.company);
      setPhone(activeCallingLead.phone);
      setNotes(activeCallingLead.notes || '');
      setOutcome(
        activeCallingLead.status === 'CONVERTED'
          ? 'DEAL_CLOSED'
          : activeCallingLead.status === 'CALLBACK'
          ? 'CALLBACK'
          : activeCallingLead.status === 'BUSY'
          ? 'BUSY'
          : activeCallingLead.status === 'NOT_INTERESTED'
          ? 'NOT_INTERESTED'
          : 'INTERESTED'
      );
      if (activeCallingLead.dealValue) {
        setDealAmount(String(activeCallingLead.dealValue));
      }
    } else {
      resetForm();
    }
  }, [activeCallingLead, isQuickCallModalOpen]);

  if (!isQuickCallModalOpen) return null;

  const handlePickLead = (leadId: string) => {
    const lead = assignedLeads.find((l) => l.id === leadId) || clients.find((c) => c.id === leadId);
    if (!lead) return;
    setClientName(lead.name);
    setCompanyName(lead.company);
    setPhone(lead.phone);
  };

  const handleClose = () => {
    setIsQuickCallModalOpen(false);
    setActiveCallingLead(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericDeal = dealAmount.trim() ? Number(dealAmount) : undefined;

    if (activeCallingLead) {
      // Map CallOutcome to AssignedLead status
      const mappedStatus: AssignedLead['status'] =
        outcome === 'DEAL_CLOSED'
          ? 'CONVERTED'
          : outcome === 'INTERESTED'
          ? 'INTERESTED'
          : outcome === 'CALLBACK'
          ? 'CALLBACK'
          : outcome === 'BUSY'
          ? 'BUSY'
          : outcome === 'NOT_INTERESTED'
          ? 'NOT_INTERESTED'
          : 'INTERESTED';

      updateAssignedLeadStatus(
        activeCallingLead.id,
        mappedStatus,
        notes,
        mappedStatus === 'CONVERTED' ? numericDeal || 0 : undefined,
        mappedStatus === 'CALLBACK' ? followUpDate || 'Tomorrow, 11:00 AM' : undefined
      );
    } else {
      logNewCall({
        clientName: clientName.trim() || 'Direct Caller',
        companyName: companyName.trim() || 'Direct Client',
        phoneNumber: phone.trim() || 'Not Provided',
        outcome,
        durationSec: outcome === 'BUSY' ? 0 : parseInt(durationMin || '2', 10) * 60,
        notes,
        followUpDate: outcome === 'CALLBACK' || outcome === 'INTERESTED' ? followUpDate || undefined : undefined,
      });
    }

    handleClose();
  };

  const outcomeOptions: {
    id: CallOutcome;
    label: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }[] = [
    {
      id: 'INTERESTED',
      label: '🟢 Interested',
      description: 'Wants quote or proposal',
      color: '#0284C7',
      bg: '#E0F2FE',
      border: 'border-sky-300',
      icon: CheckCircle2,
    },
    {
      id: 'CALLBACK',
      label: '⏰ Call Back Later',
      description: 'Customer asked to call later',
      color: '#D97706',
      bg: '#FEF3C7',
      border: 'border-amber-300',
      icon: PhoneForwarded,
    },
    {
      id: 'BUSY',
      label: '📵 No Answer / Busy',
      description: 'Rang out or disconnected',
      color: '#64748B',
      bg: '#F1F5F9',
      border: 'border-slate-300',
      icon: PhoneOff,
    },
    {
      id: 'NOT_INTERESTED',
      label: '🔴 Not Interested',
      description: 'Refused or invalid lead',
      color: '#DC2626',
      bg: '#FEE2E2',
      border: 'border-rose-300',
      icon: ThumbsDown,
    },
    {
      id: 'DEAL_CLOSED',
      label: '🏆 Won Deal',
      description: 'Payment agreed or done',
      color: '#16A34A',
      bg: '#DCFCE7',
      border: 'border-emerald-400',
      icon: Award,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#00A88B]">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-[#0A2540]">Record Call Result</h3>
              <p className="text-[11px] text-slate-500 font-medium">Save what happened on this call</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lead Summary Badge: ONLY Phone Number displayed */}
        {activeCallingLead ? (
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 mb-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number</span>
              <span className="font-mono font-black text-lg text-[#0A2540]">{activeCallingLead.phone}</span>
            </div>
            <span className="text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-lg bg-[#00C9A7]/15 text-[#00876f] border border-[#00C9A7]/30">
              {activeCallingLead.status.replace('_', ' ')}
            </span>
          </div>
        ) : (
          /* Manual Lead Selector or Freeform Entry */
          <div className="space-y-3 mb-3.5">
            {assignedLeads.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Pick Assigned Lead (Optional)
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => handlePickLead(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  <option value="">— Or type contact below —</option>
                  {assignedLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.company} ({l.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7] font-mono"
                placeholder="+91 ..."
                required
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Outcome 1-Tap Buttons Grid */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              What happened on the call?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {outcomeOptions.map((opt) => {
                const isSelected = outcome === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => {
                      setOutcome(opt.id);
                      if (opt.id === 'BUSY') {
                        setDurationMin('0');
                      } else if (durationMin === '0') {
                        setDurationMin('2');
                      }
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-2 shadow-xs scale-[1.01]'
                        : 'border-slate-200 hover:bg-slate-50 opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: isSelected ? opt.color : undefined,
                      backgroundColor: isSelected ? opt.bg : undefined,
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: opt.color }} />
                    <div className="min-w-0">
                      <span className="font-bold text-xs block truncate" style={{ color: opt.color }}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">{opt.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Input: If Won Deal */}
          {outcome === 'DEAL_CLOSED' && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 space-y-1.5 animate-in fade-in zoom-in-95">
              <label className="block text-[11px] font-black text-emerald-900">
                Deal Amount Closed (₹ INR) *
              </label>
              <input
                type="number"
                min="1"
                value={dealAmount}
                onChange={(e) => setDealAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                required
              />
              <p className="text-[10px] text-emerald-700 font-medium">
                ✓ Will submit to HR & Admin for payment verification and update your monthly sales quota.
              </p>
            </div>
          )}

          {/* Conditional Input: If Callback Scheduled */}
          {outcome === 'CALLBACK' && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 space-y-1.5 animate-in fade-in zoom-in-95">
              <label className="block text-[11px] font-black text-amber-900">
                When should you call back? *
              </label>
              <input
                type="text"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                placeholder="e.g. Today, 04:30 PM or Tomorrow, 11:00 AM"
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600"
                required
              />
              <p className="text-[10px] text-amber-700 font-medium">
                ✓ Will set an alert banner on your Home page when due.
              </p>
            </div>
          )}

          {/* Call Duration & Notes */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Duration (min)
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 mr-1.5 flex-shrink-0" />
                <input
                  type="number"
                  min="0"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Conversation Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                placeholder="Key points discussed..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-display font-extrabold text-sm shadow-md shadow-[#00C9A7]/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Save Call</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
