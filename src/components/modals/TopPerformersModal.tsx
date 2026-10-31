import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Trophy, 
  Crown, 
  Award, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  User, 
  Sparkles, 
  AlertCircle,
  Search,
  ChevronDown,
  Check,
  Plus
} from 'lucide-react';
import { TopPerformer } from '../../types';

interface TopPerformersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TopPerformersModal: React.FC<TopPerformersModalProps> = ({ isOpen, onClose }) => {
  const { topPerformers, teamMembers, saveTopPerformer, deleteTopPerformer } = useApp();

  const currentDefaultMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const [selectedMonth, setSelectedMonth] = useState<string>(currentDefaultMonth);

  // Dynamic Ranks List: Admin can dynamically add or edit any rank slot
  const existingRanks = useMemo(() => topPerformers.map(p => p.rank), [topPerformers]);
  const [availableRanks, setAvailableRanks] = useState<number[]>([1, 2, 3]);
  const [activeRankTab, setActiveRankTab] = useState<number>(1);

  // Sync available ranks when topPerformers change
  useEffect(() => {
    setAvailableRanks(prev => {
      const merged = Array.from(new Set([...prev, ...existingRanks]));
      return merged.sort((a, b) => a - b);
    });
  }, [existingRanks]);

  // Searchable Staff Dropdown State
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState<boolean>(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsStaffDropdownOpen(false);
      }
    };
    if (isStaffDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isStaffDropdownOpen]);

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

    setIsStaffDropdownOpen(false);
    setStaffSearchQuery('');

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

  // Filtered staff list based on search query
  const filteredStaff = useMemo(() => {
    const q = staffSearchQuery.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter(m => 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.empCode && m.empCode.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.group && m.group.toLowerCase().includes(q))
    );
  }, [teamMembers, staffSearchQuery]);

  const selectedMember = teamMembers.find(m => m.id === employeeId);

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
      // If employee already has an avatar
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

  // Add a dynamic rank slot
  const handleAddRankSlot = () => {
    const nextRank = (availableRanks.length > 0 ? Math.max(...availableRanks) : 0) + 1;
    setAvailableRanks(prev => [...prev, nextRank]);
    setActiveRankTab(nextRank);
  };

  // Remove a dynamic rank slot
  const handleRemoveRankSlot = async (rankToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = topPerformers.find(p => p.rank === rankToRemove);
    if (existing) {
      if (!window.confirm(`Remove Rank #${rankToRemove} (${existing.employeeName}) from the showcase?`)) return;
      await deleteTopPerformer(existing.id);
    }
    setAvailableRanks(prev => prev.filter(r => r !== rankToRemove));
    if (activeRankTab === rankToRemove) {
      const remaining = availableRanks.filter(r => r !== rankToRemove);
      setActiveRankTab(remaining.length > 0 ? remaining[0] : 1);
    }
  };

  // Handle Save & Publish -> Closes Modal immediately without asking for next member!
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
        onClose(); // Closes immediately!
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

          {/* Dynamic Rank Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#0A2540]">
                  Dynamic Rank Slots ({availableRanks.length})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Click slot to edit
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddRankSlot}
                className="flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200/70 px-2.5 py-1 rounded-xl border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                title="Add a new rank position (e.g. Rank 4, Rank 5)"
              >
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                <span>Add Rank Slot</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableRanks.map(rank => {
                const performer = topPerformers.find(p => p.rank === rank);
                const isActive = activeRankTab === rank;
                return (
                  <div
                    key={rank}
                    onClick={() => setActiveRankTab(rank)}
                    className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer group ${
                      isActive
                        ? rank === 1
                          ? 'border-amber-400 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/20'
                          : rank === 2
                          ? 'border-slate-400 bg-slate-100 shadow-xs ring-2 ring-slate-400/20'
                          : 'border-amber-600 bg-orange-50/70 shadow-xs ring-2 ring-amber-600/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black flex items-center gap-1 ${
                        rank === 1 ? 'text-amber-700' : rank === 2 ? 'text-slate-700' : 'text-amber-800'
                      }`}>
                        {rank === 1 ? (
                          <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                        ) : (
                          <Award className="w-3.5 h-3.5" />
                        )}
                        <span>Rank #{rank}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {performer ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Performer" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" title="Empty Slot" />
                        )}

                        {availableRanks.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRankSlot(rank, e)}
                            className="text-slate-300 hover:text-rose-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete rank slot"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] font-bold text-[#0A2540] truncate mt-1">
                      {performer?.employeeName || 'Empty'}
                    </p>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {performer ? `₹${performer.salesAmount.toLocaleString('en-IN')}` : 'Click to set'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form for Active Rank */}
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
                <span>Configuring Rank #{activeRankTab}</span>
                {activeRankTab === 1 ? '🥇 Champion' : activeRankTab === 2 ? '🥈 Runner Up' : activeRankTab === 3 ? '🥉 2nd Runner Up' : `🌟 Performer #${activeRankTab}`}
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

            {/* Dynamic Rank Number Selector / Editor */}
            <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <label className="text-xs font-bold text-[#0A2540] block">
                  Dynamic Rank Position
                </label>
                <span className="text-[11px] text-slate-500">
                  Admin dynamic access: assign any rank number (e.g. 1, 2, 3, 4, 5...)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 font-mono">Rank #</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={activeRankTab}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setActiveRankTab(val);
                    setAvailableRanks(prev => Array.from(new Set([...prev, val])).sort((a, b) => a - b));
                  }}
                  className="w-20 px-3 py-1.5 text-xs font-black text-center bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-inner"
                />
              </div>
            </div>

            {/* Searchable Quick Pick from Staff Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#0A2540] block">
                  Select from Existing Staff (Searchable)
                </label>
                {employeeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeId('');
                      setStaffSearchQuery('');
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Dropdown Trigger Box */}
              <button
                type="button"
                onClick={() => {
                  setIsStaffDropdownOpen(prev => !prev);
                  setStaffSearchQuery('');
                }}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
              >
                {selectedMember ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedMember.avatar && selectedMember.avatar.startsWith('data:image') ? (
                      <img src={selectedMember.avatar} alt={selectedMember.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-700 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                        {selectedMember.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-bold text-[#0A2540] truncate">
                      {selectedMember.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">
                      ({selectedMember.role || 'Staff'}) — {selectedMember.group || 'Squad'}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium truncate">
                    -- Choose employee or search by name / squad / role --
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isStaffDropdownOpen ? 'rotate-180 text-amber-600' : ''}`} />
              </button>

              {/* Floating Searchable Menu */}
              {isStaffDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Search Bar Input */}
                  <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        placeholder="Search employee by name, squad, role or emp code..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                      />
                      {staffSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setStaffSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100/70">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectStaff('');
                        setIsStaffDropdownOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>-- Custom / Manual Entry (No linked profile) --</span>
                      {!employeeId && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </button>

                    {filteredStaff.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-400">
                        No team members matching "{staffSearchQuery}"
                      </div>
                    ) : (
                      filteredStaff.map((m) => {
                        const isSelected = employeeId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              handleSelectStaff(m.id);
                              setIsStaffDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {m.avatar && m.avatar.startsWith('data:image') ? (
                                <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-700 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                  {m.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-[#0A2540] truncate">
                                  {m.name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {m.role || 'Staff'} {m.group ? `• ${m.group}` : ''}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Employee Full Name */}
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

            {/* Designation / Position */}
            <div>
              <label className="text-xs font-bold text-[#0A2540] block mb-1">
                Designation / Position *
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Telecaller / SDR, BDA, Sales Specialist"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
            </div>

            {/* Sales Cleared (₹) */}
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
                  step="any"
                  required
                  value={salesAmount}
                  onChange={(e) => setSalesAmount(e.target.value)}
                  placeholder="e.g. 300000"
                  className="w-full pl-8 pr-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                />
              </div>
            </div>

            {/* Marketing Leads Closed Count */}
            <div>
              <label className="text-xs font-bold text-[#0A2540] block mb-1">
                Marketing Leads Closed *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={leadsClosedCount}
                onChange={(e) => setLeadsClosedCount(e.target.value)}
                placeholder="e.g. 24"
                className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
              />
            </div>

            {/* Performer Photo */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="text-xs font-bold text-[#0A2540] block mb-2">
                Performer Photo
              </label>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 flex-shrink-0 shadow-inner">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-[#0A2540] text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer">
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

            {/* Submit Action: Saves & immediately closes modal */}
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
                <span>Save &amp; Publish</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
