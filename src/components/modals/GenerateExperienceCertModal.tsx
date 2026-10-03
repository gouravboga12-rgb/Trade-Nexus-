import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Award, 
  Sparkles, 
  Building2, 
  Send,
  Eye,
  FileEdit,
  Loader2
} from 'lucide-react';
import { ExperienceCertData } from '../../types';
import signatureVidhyaSagar from '../../assets/signature-vidhya-sagar.png';
import watermarkEmblem from '../../assets/watermark-emblem.png';
import headerExperience from '../../assets/header-experience.png';
import corporateFooter from '../../assets/corporate-footer.png';

interface GenerateExperienceCertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerateExperienceCertModal: React.FC<GenerateExperienceCertModalProps> = ({ isOpen, onClose }) => {
  const { 
    teamMembers, 
    generateExperienceCert, 
    selectedExperienceCertEmpId,
    setSelectedExperienceCertEmpId,
    triggerToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock body scroll when modal is open — prevents page scroll from stealing events
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Form State — 100% HR Editable
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [designation, setDesignation] = useState('Senior Sales Executive');
  const [department, setDepartment] = useState('Client Acquisition');
  const [startDate, setStartDate] = useState('01 January 2023');
  const [endDate, setEndDate] = useState('01 January 2025');
  const [refNumber, setRefNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState(() => 
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const [companyName, setCompanyName] = useState('Trade Nexus');
  const [signatoryName, setSignatoryName] = useState('T. Vidhya Sagar');
  const [signatoryRole, setSignatoryRole] = useState('Chief Executive Officer');

  // Paragraphs
  const [introParagraph, setIntroParagraph] = useState('');
  const [roleParagraph, setRoleParagraph] = useState('');
  const [conductRemarks, setConductRemarks] = useState('');
  const [closingParagraph, setClosingParagraph] = useState('');

  // Auto-generate template text helper
  const regenerateDefaultParagraphs = (
    nameVal: string,
    guardianVal: string,
    codeVal: string,
    roleVal: string,
    deptVal: string,
    startVal: string,
    endVal: string,
    companyVal: string
  ) => {
    const safeName = nameVal || 'the employee';
    const safeCode = codeVal || 'TNX-001';
    const safeRole = roleVal || 'Executive';
    const safeDept = deptVal || 'Operations';
    const safeStart = startVal || '01 January 2023';
    const safeEnd = endVal || '01 January 2025';
    const safeCompany = companyVal || 'Trade Nexus';
    const guardianClause = guardianVal ? `, son/daughter of ${guardianVal},` : '';
    const firstName = safeName.split(' ')[0] || safeName;

    setIntroParagraph(
      `This is to certify that Mr./Ms. ${safeName}${guardianClause} bearing Employee Identification Number ${safeCode}, was bona fide employed with ${safeCompany} from ${safeStart} to ${safeEnd}.`
    );
    setRoleParagraph(
      `During the period of tenure with ${safeCompany}, ${safeName} served in the professional capacity of ${safeRole} within the ${safeDept} department.`
    );
    setConductRemarks(
      `During their tenure, ${firstName} performed their duties with sincerity, professionalism, and dedication. They were responsible for supervising client operations, ensuring high standards of service, coordinating with staff, and maintaining smooth day-to-day operations. Their conduct, character, and performance were satisfactory throughout their period of employment.`
    );
    setClosingParagraph(
      `We appreciate the valuable contributions rendered during their service with ${safeCompany} and convey our best wishes for continued success and excellence in all future professional endeavors.`
    );
  };

  // Sync when selectedExperienceCertEmpId changes
  useEffect(() => {
    if (isOpen) {
      const targetId = selectedExperienceCertEmpId || selectedEmpId;
      if (targetId) {
        handleSelectEmployee(targetId);
      } else if (!employeeName) {
        const year = new Date().getFullYear();
        setRefNumber(`TNX/EXP/${year}/001`);
        regenerateDefaultParagraphs('Staff Member', '', 'TNX-001', 'Senior Sales Executive', 'Client Acquisition', '01 January 2023', '01 January 2025', 'Trade Nexus');
      }
    }
  }, [isOpen, selectedExperienceCertEmpId]);

  if (!isOpen) return null;

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    if (setSelectedExperienceCertEmpId) setSelectedExperienceCertEmpId(empId);
    const emp = teamMembers.find(m => m.id === empId || m.empCode === empId);
    if (emp) {
      const name = emp.name;
      const code = emp.empCode || 'TNX-001';
      const role = emp.role || 'Executive';
      const dept = emp.group ? `${emp.group} Department` : 'Client Acquisition';
      const jDate = (emp as any).joiningDate || (emp as any).joinDate || '01 January 2023';
      const lDate = (emp as any).lastWorkingDate || '01 January 2025';
      const guard = (emp as any).guardianName || (emp as any).fatherName || '';
      const year = new Date().getFullYear();

      setEmployeeName(name);
      setEmpCode(code);
      setDesignation(role);
      setDepartment(dept);
      setStartDate(jDate);
      setEndDate(lDate);
      setGuardianName(guard);
      setRefNumber(`TNX/EXP/${year}/${code.replace(/[^a-zA-Z0-9]/g, '') || '001'}`);

      regenerateDefaultParagraphs(name, guard, code, role, dept, jDate, lDate, companyName);
      triggerToast(`✓ Auto-filled Experience Letter for ${name}`);
    }
  };

  const handleResetToDefaultTemplate = () => {
    regenerateDefaultParagraphs(employeeName, guardianName, empCode, designation, department, startDate, endDate, companyName);
    triggerToast('✓ Template paragraphs reset to standard phrasing');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      triggerToast('⚠️ Please enter employee name');
      return;
    }

    setIsSubmitting(true);
    try {
      const newCertData: Omit<ExperienceCertData, 'id' | 'issuedDate'> & { issuedDate?: string } = {
        employeeId: selectedEmpId || undefined,
        employeeName: employeeName.trim(),
        empCode: empCode.trim() || 'TNX-001',
        guardianName: guardianName.trim(),
        designation: designation.trim(),
        department: department.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        refNumber: refNumber.trim() || `TNX/EXP/${new Date().getFullYear()}/${empCode || '001'}`,
        issuedDate: issuedDate.trim(),
        companyName: companyName.trim() || 'Trade Nexus',
        introParagraph: introParagraph.trim(),
        roleParagraph: roleParagraph.trim(),
        conductRemarks: conductRemarks.trim(),
        closingParagraph: closingParagraph.trim(),
        signatoryName: signatoryName.trim(),
        signatoryRole: signatoryRole.trim(),
      };

      await generateExperienceCert(newCertData);
      onClose();
    } catch (err: any) {
      triggerToast(`⚠️ Failed to generate: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95">
        
        {/* Top Header */}
        <div className="bg-[#06152B] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30 shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-white">Generate Experience Certificate</h3>
              <p className="text-[11px] text-slate-300">Template 3 (2.png) • 100% HR Field &amp; Paragraph Customization</p>
            </div>
          </div>

          {/* Tab Switcher & Close */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'edit'
                    ? 'bg-[#00C9A7] text-[#0A2540] shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Edit Fields</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-[#00C9A7] text-[#0A2540] shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'edit' ? (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-700">
            
            {/* Quick Employee Selector */}
            <div className="bg-[#00C9A7]/10 border border-[#00C9A7]/30 p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#0A2540] flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#00A88B]" />
                  Select Employee from Active Roster
                </label>
                <p className="text-[11px] text-slate-500">Auto-populates employee records, reference numbers, and template phrasing</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedEmpId}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-[#00C9A7] focus:outline-none min-w-[240px]"
                >
                  <option value="">-- Choose Employee --</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.empCode}) • {m.role}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleResetToDefaultTemplate}
                  className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-[11px] text-slate-700 whitespace-nowrap"
                  title="Reset all body paragraphs to standard template"
                >
                  Reset Text
                </button>
              </div>
            </div>

            {/* Section 1: Official Header & Metadata */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#00C9A7]" />
                Document Metadata &amp; Organization
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Company / Issuer Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reference Number *</label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="TNX/EXP/2026/001"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Issue Date *</label>
                  <input
                    type="text"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    placeholder="01 January 2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Employee Details */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Employee Profile &amp; Role Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Employee Full Name *</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Employee Code *</label>
                  <input
                    type="text"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Parent / Guardian Name (Optional)</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="e.g. Sh. Heera Singh"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Designation / Role *</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Joining / Start Date *</label>
                  <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Relieving / End Date *</label>
                  <input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 3: HR Body Paragraphs (100% Editable) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Letter Body Paragraphs (HR 100% Control)
                </h4>
                <span className="text-[10px] text-slate-400">All visible text matches the PDF output</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paragraph 1 — Employment Verification Intro</label>
                <textarea
                  rows={2}
                  value={introParagraph}
                  onChange={(e) => setIntroParagraph(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans"
                  placeholder="This is to certify that Mr./Ms. ..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paragraph 2 — Role &amp; Department Scope</label>
                <textarea
                  rows={2}
                  value={roleParagraph}
                  onChange={(e) => setRoleParagraph(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans"
                  placeholder="During the period of tenure with Trade Nexus..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paragraph 3 — Conduct, Responsibilities &amp; Performance</label>
                <textarea
                  rows={3}
                  value={conductRemarks}
                  onChange={(e) => setConductRemarks(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans"
                  placeholder="During their tenure, they performed duties with sincerity..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Paragraph 4 — Appreciation &amp; Closing Statement</label>
                <textarea
                  rows={2}
                  value={closingParagraph}
                  onChange={(e) => setClosingParagraph(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans"
                  placeholder="We appreciate the valuable contributions rendered..."
                />
              </div>
            </div>

            {/* Section 4: Authorized Signatory */}
            <div className="space-y-2 pt-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Authorized Signatory Block
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Signatory Name *</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Signatory Role / Designation *</label>
                  <input
                    type="text"
                    value={signatoryRole}
                    onChange={(e) => setSignatoryRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Footer Submit */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-[#00A88B]" />
                <span>Preview Document First</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-lg shadow-[#00C9A7]/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating &amp; Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Generate, Save &amp; Dispatch PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        ) : (
          /* Live Document Preview */
          <div className="flex flex-col flex-1 min-h-0">
            {/* Scrollable certificate area — max-height + overscroll-contain is most reliable */}
            <div
              className="overflow-y-auto overscroll-contain p-4 sm:p-6 bg-slate-100/80 flex flex-col items-center gap-4"
              style={{ maxHeight: 'calc(94vh - 140px)' }}
            >
            
            <div className="w-full max-w-2xl bg-white text-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col justify-between relative">
              
              {/* Header Banner */}
              <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
                <img src={headerExperience} alt="Header Banner" className="w-full object-cover select-none" />
              </div>

              {/* Watermark Emblem */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                <img src={watermarkEmblem} alt="Watermark" className="w-72 h-72 object-contain opacity-[0.06]" />
              </div>

              {/* Document Body */}
              <div className="p-6 sm:p-8 space-y-5 flex-1 relative z-10 text-xs sm:text-sm leading-relaxed text-slate-700">
                
                {/* Date & Ref Line */}
                <div className="flex justify-between items-center text-xs font-bold text-slate-800 pt-1">
                  <div>
                    <span className="text-slate-500 font-normal">Ref:</span> <span className="font-mono text-[#0A2540]">{refNumber || 'TNX/EXP/2026/001'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-normal">Date:</span> <span className="text-slate-700">{issuedDate}</span>
                  </div>
                </div>

                {/* Centered Heading */}
                <div className="text-center py-2">
                  <h2 className="font-serif sm:font-display font-bold text-xl sm:text-2xl text-[#0A2540] tracking-tight">
                    To Whom It May Concern
                  </h2>
                  <div className="w-28 h-0.5 bg-[#00C9A7] mx-auto mt-2" />
                </div>

                {/* Main Paragraphs */}
                <div className="space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
                  <p>{introParagraph || `This is to certify that Mr./Ms. ${employeeName || 'Staff Member'} was employed with ${companyName}...`}</p>
                  <p>{roleParagraph || `During the period of tenure with ${companyName}, ${employeeName} served as ${designation}...`}</p>
                  <p>{conductRemarks || `During their tenure, they performed duties with sincerity, professionalism, and dedication...`}</p>
                  <p className="font-medium text-slate-800">{closingParagraph || 'We appreciate the valuable contributions rendered during their service...'}</p>
                </div>

                {/* Sign-off Block */}
                <div className="pt-6 space-y-1">
                  <p className="text-xs font-semibold text-slate-700">For {companyName} Corporate Services,</p>
                  
                  <div className="py-2">
                    <img
                      src={signatureVidhyaSagar}
                      alt="Signature"
                      className="h-8 w-auto object-contain select-none"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <p className="font-display font-black text-xs sm:text-sm text-[#0A2540]">
                      {signatoryName || 'T. Vidhya Sagar'}
                    </p>
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-600">
                      {signatoryRole || 'Chief Executive Officer'}
                    </p>
                    <p className="text-[10px] font-bold text-[#00A88B]">
                      {companyName}
                    </p>
                  </div>
                </div>

              </div>

              {/* Footer Banner */}
              <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
                <img src={corporateFooter} alt="Corporate Footer" className="w-full object-cover select-none" />
              </div>

            </div>
            </div>{/* end scrollable */}

            {/* Sticky Action Bar — always visible at bottom */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Return to Editing</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-md shadow-[#00C9A7]/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating &amp; Saving...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm &amp; Dispatch Document</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
