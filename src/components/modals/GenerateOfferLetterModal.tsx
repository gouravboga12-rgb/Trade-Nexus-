import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  FileCheck, 
  Sparkles, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  DollarSign, 
  Calendar,
  Send
} from 'lucide-react';
import { OfferLetterData } from '../../types';

interface GenerateOfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerateOfferLetterModal: React.FC<GenerateOfferLetterModalProps> = ({ isOpen, onClose }) => {
  const { 
    candidates, 
    teamMembers, 
    generateOfferLetter, 
    setSelectedOfferLetter, 
    setIsOfferLetterModalOpen,
    triggerToast 
  } = useApp();

  const [candidateName, setCandidateName] = useState('');
  const [candidateAddress, setCandidateAddress] = useState('Bengaluru Corporate HQ, India');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('+91 98765 43210');
  const [roleTitle, setRoleTitle] = useState('Marketing Coordinator');
  const [department, setDepartment] = useState('Client Acquisition');
  const [monthlyGross, setMonthlyGross] = useState(700000);
  const [joiningDate, setJoiningDate] = useState('Immediate / Next Monday');
  const [reportingManager, setReportingManager] = useState('Operations Team Leader');
  const [acceptanceDeadline, setAcceptanceDeadline] = useState('Within 7 business days');
  const [signatoryName, setSignatoryName] = useState('T .Vidhya Sagar');

  if (!isOpen) return null;

  // Quick auto-fill from candidates or team roster
  const handleSelectCandidate = (candName: string) => {
    const cand = candidates.find(c => c.candidateName === candName);
    const emp = teamMembers.find(m => m.name === candName);
    if (cand) {
      setCandidateName(cand.candidateName);
      setRoleTitle(cand.roleApplied || 'Marketing Coordinator');
      setCandidateEmail(cand.email || `${cand.candidateName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`);
      setCandidatePhone(cand.phone || '+91 98765 43210');
    } else if (emp) {
      setCandidateName(emp.name);
      setRoleTitle(emp.role || 'Telecaller Executive');
      setCandidateEmail(emp.email || '');
      setCandidatePhone(emp.phone || '');
      if (emp.address) setCandidateAddress(emp.address);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      triggerToast('Please enter candidate name');
      return;
    }

    const newOffer: Omit<OfferLetterData, 'id' | 'issuedDate'> & { candidateAddress?: string; acceptanceDeadline?: string; signatoryName?: string } = {
      candidateName: candidateName.trim(),
      candidateAddress: candidateAddress.trim(),
      candidateEmail: candidateEmail.trim() || `${candidateName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      candidatePhone: candidatePhone.trim(),
      roleTitle: roleTitle.trim(),
      department: department.trim(),
      annualCtc: monthlyGross * 12,
      monthlyGross: Number(monthlyGross),
      joiningDate: joiningDate.trim(),
      reportingManager: reportingManager.trim(),
      location: 'Bengaluru Corporate HQ',
      acceptanceDeadline: acceptanceDeadline.trim(),
      signatoryName: signatoryName.trim(),
    };

    generateOfferLetter(newOffer);
    
    // Immediately open the rendered Offer Letter sheet
    const fullLetter: OfferLetterData = {
      ...newOffer,
      id: `off-${Date.now().toString().slice(-4)}`,
      issuedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    };
    setSelectedOfferLetter(fullLetter);
    onClose();
    setIsOfferLetterModalOpen(true);
    triggerToast(`✓ Official Offer Letter created & dispatched to ${candidateName}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#0A192F] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#00C9A7]/20 text-[#00C9A7] border border-[#00C9A7]/30 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">Generate Job Offer Letter</h3>
              <p className="text-xs text-slate-400">Pre-onboarding formal employment offer &amp; dispatch</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Quick Autoselect from Candidates */}
          {candidates.length > 0 && (
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-3">
              <label className="text-[11px] font-bold text-teal-900 block mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>Auto-fill from Interviewed Candidate</span>
              </label>
              <select
                onChange={(e) => handleSelectCandidate(e.target.value)}
                className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              >
                <option value="">— Select Candidate to Auto-fill —</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.candidateName}>
                    {c.candidateName} ({c.roleApplied} • {c.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Candidate Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Candidate Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Jonathan Patterson"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Position / Designation *</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Marketing Coordinator"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Candidate Address &amp; City</label>
            <input
              type="text"
              value={candidateAddress}
              onChange={(e) => setCandidateAddress(e.target.value)}
              placeholder="e.g. 123 Anywhere St., Any City, ST 12345"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          {/* Contact (Email & Phone) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Candidate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="jonathan.p@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Candidate Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>
          </div>

          {/* Salary & Reporting Manager */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Monthly Salary (INR)</label>
              <div className="relative">
                <span className="text-slate-500 font-bold absolute left-3 top-2">₹</span>
                <input
                  type="number"
                  value={monthlyGross}
                  onChange={(e) => setMonthlyGross(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Reporting Manager</label>
              <input
                type="text"
                value={reportingManager}
                onChange={(e) => setReportingManager(e.target.value)}
                placeholder="e.g. Rosa Maria (Marketing Manager)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* Joining Date & Acceptance Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Joining Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  placeholder="e.g. September 9, 2025"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Signing Deadline</label>
              <input
                type="text"
                value={acceptanceDeadline}
                onChange={(e) => setAcceptanceDeadline(e.target.value)}
                placeholder="e.g. August 30, 2025"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* Signatory */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">HR Signatory Name</label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Generate &amp; Dispatch</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
