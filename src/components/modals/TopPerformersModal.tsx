import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Trophy, Crown, Award, Upload, Trash2, CheckCircle2, User, Sparkles, AlertCircle } from 'lucide-react';
import { TopPerformer } from '../../types';

interface TopPerformersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TopPerformersModal: React.FC<TopPerformersModalProps> = ({ isOpen, onClose }) => {
  const { topPerformers, teamMembers, saveTopPerformer, deleteTopPerformer } = useApp();

  const currentDefaultMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const [selectedMonth, setSelectedMonth] = useState<string>(currentDefaultMonth);
  const [activeRankTab, setActiveRankTab] = useState<1 | 2 | 3>(1);

  // Form State for Active Rank Slot
  const [employeeId, setEmployeeId] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [salesAmount, setSalesAmount] = useState<string>('');
  const [leadsClosedCount, setLeadsClosedCount] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [badgeNote, setBadgeNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync form when rank tab changes or topPerformers update
  useEffect(() => {
    if (!isOpen) return;

    const existingPerformer = topPerformers.find(p => p.rank === activeRankTab);
    if (existingPerformer) {
      setSelectedMonth(existingPerformer.monthYear || currentDefaultMonth);
      setEmployeeId(existingPerformer.employeeId || '');
      setEmployeeName(existingPerformer.employeeName || '');
      setDesignation(existingPerformer.designation || '');
      setSalesAmount(existingPerformer.salesAmount ? String(existingPerformer.salesAmount) : '');
      setLeadsClosedCount(existingPerformer.leadsClosedCount ? String(existingPerformer.leadsClosedCount) : '');
      setPhotoUrl(existingPerformer.photoUrl || '');
      setBadgeNote(existingPerformer.badgeNote || '');
    } else {
      // Clear for new entry
      setEmployeeId('');
      setEmployeeName('');
      setDesignation(activeRankTab === 1 ? 'Senior Sales Executive' : activeRankTab === 2 ? 'Sales Specialist' : 'Telecaller');
      setSalesAmount('');
      setLeadsClosedCount('');
      setPhotoUrl('');
      setBadgeNote(activeRankTab === 1 ? 'Top Closer' : '');
    }
  }, [activeRankTab, topPerformers, isOpen, currentDefaultMonth]);

  if (!isOpen) return null;

  // Handle staff selection from dropdown
  const handleSelectStaff = (empId: string) => {
    setEmployeeId(empId);
    if (!empId) return;

    const matched = teamMembers.find(m => m.id === empId);
    if (matched) {
      setEmployeeName(matched.name);
      if (matched.role) {
        setDesignation(matched.role);
      }
      // If employee already has a photo/avatar
      if (matched.avatar && (matched.avatar.startsWith('data:image') || matched.avatar.startsWith('http') || matched.avatar.startsWith('/'))) {
        setPhotoUrl(matched.avatar);
      }
    }
  };

  // Handle Image Upload -> Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size is too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPhotoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !designation.trim()) {
      alert('Please provide Employee Name and Designation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const existing = topPerformers.find(p => p.rank === activeRankTab);

      const payload: Partial<TopPerformer> = {
        id: existing?.id,
        monthYear: selectedMonth.trim() || currentDefaultMonth,
        rank: activeRankTab,
        employeeId: employeeId || undefined,
        employeeName: employeeName.trim(),
        designation: designation.trim(),
        salesAmount: Number(salesAmount || 0),
        leadsClosedCount: Number(leadsClosedCount || 0),
        photoUrl: photoUrl || undefined,
        badgeNote: badgeNote.trim() || undefined,
        isActive: true,
      };

      const success = await saveTopPerformer(payload);
      if (success) {
        // Stay in modal so admin can easily set Rank 2 and Rank 3
        if (activeRankTab < 3) {
          setActiveRankTab((prev) => (prev + 1) as 2 | 3);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Performer for active rank
  const handleDelete = async () => {
    const existing = topPerformers.find(p => p.rank === activeRankTab);
    if (!existing) return;

    if (window.confirm(`Remove Rank #${activeRankTab} (${existing.employeeName}) from the showcase?`)) {
      setIsSubmitting(true);
      try {
        await deleteTopPerformer(existing.id);
        setEmployeeId('');
        setEmployeeName('');
        setSalesAmount('');
        setLeadsClosedCount('');
        setPhotoUrl('');
        setBadgeNote('');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const existingRank1 = topPerformers.find(p => p.rank === 1);
  const existingRank2 = topPerformers.find(p => p.rank === 2);
  const existingRank3 = topPerformers.find(p => p.rank === 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-[#0A2540]">
                Monthly Top Sales Champions
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Publish star performers with photos, sales cleared &amp; closed leads
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Active Month Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <label className="text-xs font-bold text-[#0A2540] block">
                Showcase Month &amp; Year
              </label>
              <span className="text-[11px] text-slate-500">
                Shown as the badge title on employee home screens
              </span>
            </div>
            <input
              type="text"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              placeholder="e.g. October 2026"
              className="px-3.5 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all sm:w-48"
            />
          </div>

          {/* Rank Tabs (1st, 2nd, 3rd) */}
          <div className="grid grid-cols-3 gap-2">
            {/* Rank 1 Button */}
            <button
              type="button"
              onClick={() => setActiveRankTab(1)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                activeRankTab === 1
                  ? 'border-amber-400 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-700 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  <span>Rank #1</span>
                </span>
                {existingRank1 ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" title="Empty" />
                )}
              </div>
              <p className="text-[11px] font-bold text-[#0A2540] truncate mt-1">
                {existingRank1?.employeeName || 'Empty'}
              </p>
              <span className="text-[10px] text-slate-400 block truncate">
                {existingRank1 ? `₹${existingRank1.salesAmount.toLocaleString('en-IN')}` : 'Click to set'}
              </span>
            </button>

            {/* Rank 2 Button */}
            <button
              type="button"
              onClick={() => setActiveRankTab(2)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                activeRankTab === 2
                  ? 'border-slate-400 bg-slate-100 shadow-xs ring-2 ring-slate-400/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rank #2</span>
                </span>
                {existingRank2 ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" title="Empty" />
                )}
              </div>
              <p className="text-[11px] font-bold text-[#0A2540] truncate mt-1">
                {existingRank2?.employeeName || 'Empty'}
              </p>
              <span className="text-[10px] text-slate-400 block truncate">
                {existingRank2 ? `₹${existingRank2.salesAmount.toLocaleString('en-IN')}` : 'Click to set'}
              </span>
            </button>

            {/* Rank 3 Button */}
            <button
              type="button"
              onClick={() => setActiveRankTab(3)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                activeRankTab === 3
                  ? 'border-amber-600 bg-orange-50/70 shadow-xs ring-2 ring-amber-600/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  <span>Rank #3</span>
                </span>
                {existingRank3 ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" title="Empty" />
                )}
              </div>
              <p className="text-[11px] font-bold text-[#0A2540] truncate mt-1">
                {existingRank3?.employeeName || 'Empty'}
              </p>
              <span className="text-[10px] text-slate-400 block truncate">
                {existingRank3 ? `₹${existingRank3.salesAmount.toLocaleString('en-IN')}` : 'Click to set'}
              </span>
            </button>
          </div>

          {/* Form for Active Rank */}
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                <span>Configuring Rank #{activeRankTab}</span>
                {activeRankTab === 1 ? '🥇 Champion' : activeRankTab === 2 ? '🥈 Runner Up' : '🥉 2nd Runner Up'}
              </h4>

              {topPerformers.some(p => p.rank === activeRankTab) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Rank #{activeRankTab}</span>
                </button>
              )}
            </div>

            {/* Quick Pick from Staff */}
            <div>
              <label className="text-xs font-bold text-[#0A2540] block mb-1">
                Select from Existing Staff (Optional Quick-Fill)
              </label>
              <select
                value={employeeId}
                onChange={(e) => handleSelectStaff(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              >
                <option value="">-- Choose employee or enter custom details below --</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role || 'Staff'}) — {m.group || 'Squad'}
                  </option>
                ))}
              </select>
            </div>

            {/* Name & Designation Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#0A2540] block mb-1">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#0A2540] block mb-1">
                  Designation / Position *
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Sales Executive"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            {/* Sales Amount & Leads Closed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#0A2540] block mb-1">
                  Sales Cleared (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={salesAmount}
                    onChange={(e) => setSalesAmount(e.target.value)}
                    placeholder="e.g. 300000"
                    className="w-full pl-8 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold"
                  />
                </div>
                {Number(salesAmount) >= 100000 && (
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    Displays as: ₹{(Number(salesAmount) / 100000).toFixed(2)} Lakhs
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#0A2540] block mb-1">
                  Marketing Leads Closed *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={leadsClosedCount}
                  onChange={(e) => setLeadsClosedCount(e.target.value)}
                  placeholder="e.g. 24"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Photo Upload & Preview */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-[#0A2540] block">
                Performer Photo
              </label>

              <div className="flex items-center gap-4">
                {/* Photo Preview Circle */}
                <div className="relative">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Preview"
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-400 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shadow-inner">
                      <User className="w-7 h-7 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload New Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="text-[11px] font-bold text-rose-600 hover:underline block"
                    >
                      Remove photo
                    </button>
                  )}
                  <p className="text-[11px] text-slate-500">
                    PNG or JPG (under 5MB). Professional square headshots look best.
                  </p>
                </div>
              </div>
            </div>

            {/* Optional Badge Note */}
            <div>
              <label className="text-xs font-bold text-[#0A2540] block mb-1">
                Badge Note / Highlight (Optional)
              </label>
              <input
                type="text"
                value={badgeNote}
                onChange={(e) => setBadgeNote(e.target.value)}
                placeholder="e.g. Top Closer, Record Breaker, 100% Target"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Save &amp; Publish Rank #{activeRankTab}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
