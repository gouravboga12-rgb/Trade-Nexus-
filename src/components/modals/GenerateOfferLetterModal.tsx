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
  Calendar,
  Send,
  MapPin,
  Clock,
  Award
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

  // Basic Information
  const [candidateName, setCandidateName] = useState('');
  const [candidateAddress, setCandidateAddress] = useState('Bengaluru Corporate HQ, India');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('+91 98765 43210');
  
  // Role & Department
  const [roleTitle, setRoleTitle] = useState('Marketing Coordinator');
  const [department, setDepartment] = useState('Sales & Client Acquisition');
  const [location, setLocation] = useState('Bengaluru Corporate HQ, India');
  const [employeeType, setEmployeeType] = useState<'Full Time' | 'Intern' | 'Contract'>('Full Time');
  
  // Compensation
  const [monthlyGross, setMonthlyGross] = useState(700000);
  const [salaryType, setSalaryType] = useState('Monthly Gross / Annual CTC');

  // Dates & Reporting
  const [joiningDate, setJoiningDate] = useState('Immediate / Next Monday');
  const [reportingManager, setReportingManager] = useState('Operations Team Leader');
  const [issuedDate, setIssuedDate] = useState(() => 
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  );
  const [acceptanceDeadline, setAcceptanceDeadline] = useState('Within 7 business days');

  // Signatory
  const [signatoryName, setSignatoryName] = useState('T .Vidhya Sagar');
  const [signatoryRole, setSignatoryRole] = useState('Chief executive Officer');

  // Company Brand & Contact Header
  const [companyName, setCompanyName] = useState('Trade Nexus');
  const [companyAddress, setCompanyAddress] = useState('123 Business Avenue, Financial District, Your City, 500001');
  const [companyPhone, setCompanyPhone] = useState('+91 98765 43210');
  const [companyEmail, setCompanyEmail] = useState('info@tradenexus.com');
  const [companyWebsite, setCompanyWebsite] = useState('www.tradenexus.com');

  if (!isOpen) return null;

  // Deduplicate candidates by name and email to prevent repeats like Akash Deep
  const uniqueCandidates = Array.from(
    new Map(
      candidates.map(c => [
        `${(c.candidateName || '').toLowerCase().trim()}_${(c.email || '').toLowerCase().trim()}`,
        c
      ])
    ).values()
  );

  // Quick auto-fill from candidates or active team roster
  const handleSelectPerson = (selectedVal: string) => {
    if (!selectedVal) return;

    if (selectedVal.startsWith('cand:')) {
      const candId = selectedVal.replace('cand:', '');
      const cand = candidates.find(c => c.id === candId || c.candidateName === candId);
      if (cand) {
        setCandidateName(cand.candidateName);
        setRoleTitle(cand.roleApplied || 'Marketing Coordinator');
        setCandidateEmail(cand.email || `${cand.candidateName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`);
        setCandidatePhone(cand.phone || '+91 98765 43210');
        setDepartment('Sales & Client Acquisition');
        triggerToast(`✓ Auto-filled details from candidate ${cand.candidateName}`);
      }
    } else if (selectedVal.startsWith('emp:')) {
      const empId = selectedVal.replace('emp:', '');
      const emp = teamMembers.find(m => m.id === empId || m.empCode === empId);
      if (emp) {
        setCandidateName(emp.name);
        setRoleTitle(emp.role || 'Telecaller Executive');
        setCandidateEmail(emp.email || '');
        setCandidatePhone(emp.phone || '');
        if (emp.address) setCandidateAddress(emp.address);
        if (emp.salary) setMonthlyGross(emp.salary);
        if ((emp as any).department) setDepartment((emp as any).department);
        if ((emp as any).employeeType) {
          const raw = String((emp as any).employeeType).toLowerCase();
          if (raw.includes('intern')) setEmployeeType('Intern');
          else if (raw.includes('contract')) setEmployeeType('Contract');
          else setEmployeeType('Full Time');
        }
        triggerToast(`✓ Auto-filled details from employee ${emp.name}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      triggerToast('Please enter candidate full name');
      return;
    }

    const newOffer: Omit<OfferLetterData, 'id' | 'issuedDate'> & { 
      issuedDate?: string;
      candidateAddress?: string; 
      acceptanceDeadline?: string; 
      signatoryName?: string;
      signatoryRole?: string;
      employeeType?: string;
      salaryType?: string;
    } = {
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
      location: location.trim(),
      issuedDate: issuedDate.trim(),
      acceptanceDeadline: acceptanceDeadline.trim(),
      signatoryName: signatoryName.trim(),
      signatoryRole: signatoryRole.trim(),
      employeeType,
      salaryType,
      companyName: companyName.trim(),
      companyAddress: companyAddress.trim(),
      companyPhone: companyPhone.trim(),
      companyEmail: companyEmail.trim(),
      companyWebsite: companyWebsite.trim(),
    };

    generateOfferLetter(newOffer);
    
    // Immediately open the rendered Offer Letter sheet
    const fullLetter: OfferLetterData = {
      ...newOffer,
      id: `off-${Date.now().toString().slice(-4)}`,
      issuedDate: issuedDate.trim(),
    };
    setSelectedOfferLetter(fullLetter);
    onClose();
    setIsOfferLetterModalOpen(true);
    triggerToast(`✓ Official Offer Letter created & dispatched to ${candidateName}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        
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
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Quick Autoselect from Candidates OR Existing Team Members */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-3.5">
            <label className="text-[11px] font-bold text-teal-900 block mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Select Candidate or Active Employee to Auto-fill</span>
            </label>
            <select
              onChange={(e) => handleSelectPerson(e.target.value)}
              className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7] cursor-pointer"
            >
              <option value="">— Select from Candidates or Team Roster —</option>
              {uniqueCandidates.length > 0 && (
                <optgroup label="📋 Interviewed Candidates">
                  {uniqueCandidates.map((c) => (
                    <option key={`c-${c.id}`} value={`cand:${c.id}`}>
                      {c.candidateName} ({c.roleApplied} • {c.status})
                    </option>
                  ))}
                </optgroup>
              )}
              {teamMembers.length > 0 && (
                <optgroup label="👥 Active Employees &amp; Staff">
                  {teamMembers.map((m) => (
                    <option key={`m-${m.id}`} value={`emp:${m.id}`}>
                      {m.name} ({m.empCode} • {m.role})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Section 1: Candidate Name & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Candidate Full Name *</label>
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
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Position / Designation *</label>
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

          {/* Section 2: Department & Work Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Department *</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Sales &amp; Client Acquisition"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Work / Office Location *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru Corporate HQ, India"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact (Email & Phone) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Candidate Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="jonathan.p@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Candidate Phone *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 4: Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Candidate Residence Address</label>
            <input
              type="text"
              value={candidateAddress}
              onChange={(e) => setCandidateAddress(e.target.value)}
              placeholder="e.g. 123 Anywhere St., Any City, ST 12345"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
            />
          </div>

          {/* Section 5: Salary & Employment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Monthly Salary (INR) *</label>
              <div className="relative">
                <span className="text-slate-500 font-bold absolute left-3 top-2">₹</span>
                <input
                  type="number"
                  value={monthlyGross}
                  onChange={(e) => setMonthlyGross(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7] font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Employment Type</label>
              <select
                value={employeeType}
                onChange={(e) => setEmployeeType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7] cursor-pointer"
              >
                <option value="Full Time">Full - Time</option>
                <option value="Intern">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Salary Note</label>
              <input
                type="text"
                value={salaryType}
                onChange={(e) => setSalaryType(e.target.value)}
                placeholder="Monthly Gross / Annual CTC"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* Section 6: Joining Date & Reporting Manager */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Joining Date</label>
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
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Reporting Manager</label>
              <input
                type="text"
                value={reportingManager}
                onChange={(e) => setReportingManager(e.target.value)}
                placeholder="e.g. Rosa Maria (Marketing Manager)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* Section 7: Letter Issued Date & Acceptance Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Letter Issued Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  placeholder="e.g. 03 October 2026"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Signing / Acceptance Deadline</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={acceptanceDeadline}
                  onChange={(e) => setAcceptanceDeadline(e.target.value)}
                  placeholder="e.g. Within 7 business days"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>
          </div>

          {/* Section 8: Signatory Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">HR Signatory Name</label>
              <div className="relative">
                <Award className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="e.g. T .Vidhya Sagar"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">HR Signatory Role</label>
              <input
                type="text"
                value={signatoryRole}
                onChange={(e) => setSignatoryRole(e.target.value)}
                placeholder="e.g. Chief executive Officer"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* Section 9: Company Brand & Contact Header (Dynamic Letterhead) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-teal-600" />
              <span>Company Letterhead &amp; Contact Information</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Trade Nexus"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Official Company Phone</label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Official Company Email</label>
                <input
                  type="text"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="info@tradenexus.com"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Official Website</label>
                <input
                  type="text"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="www.tradenexus.com"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Corporate HQ / Registered Address</label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="123 Business Avenue, Financial District, Your City, 500001"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Generate &amp; Dispatch Offer Letter</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
