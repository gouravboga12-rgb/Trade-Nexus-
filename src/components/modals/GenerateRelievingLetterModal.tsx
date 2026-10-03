import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Briefcase, 
  Sparkles, 
  Building2, 
  Send,
  Eye,
  FileEdit,
  Loader2
} from 'lucide-react';
import { RelievingLetterData } from '../../types';
import headerRelieving from '../../assets/header-relieving.png';
import watermarkEmblem from '../../assets/watermark-emblem.png';
import corporateFooter from '../../assets/corporate-footer.png';
import tradeNexusSeal from '../../assets/trade-nexus-seal.png';

interface GenerateRelievingLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerateRelievingLetterModal: React.FC<GenerateRelievingLetterModalProps> = ({ isOpen, onClose }) => {
  const { 
    teamMembers, 
    generateRelievingLetter, 
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
  const [designation, setDesignation] = useState('Digital Marketing Specialist');
  const [department, setDepartment] = useState('Marketing & Communications');
  const [employeeType, setEmployeeType] = useState('Full-Time');
  const [employeeAddress, setEmployeeAddress] = useState('123 Business Avenue, Financial District, Hyderabad, 500081');
  const [resignationDate, setResignationDate] = useState('15 July 2025');
  const [lastWorkingDate, setLastWorkingDate] = useState('31 August 2025');
  const [joiningDate, setJoiningDate] = useState('12 January 2024');
  const [issuedDate, setIssuedDate] = useState(() =>
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const [companyName, setCompanyName] = useState('Trade Nexus');
  const [refNumber, setRefNumber] = useState('');
  const [signatoryName, setSignatoryName] = useState('T. Vidhya Sagar');
  const [signatoryRole, setSignatoryRole] = useState('Chief Executive Officer');

  // Body paragraphs
  const [bodyParagraph1, setBodyParagraph1] = useState('');
  const [bodyParagraph2, setBodyParagraph2] = useState('');
  const [bodyParagraph3, setBodyParagraph3] = useState('');
  const [bodyParagraph4, setBodyParagraph4] = useState('');

  const regenerateDefaultParagraphs = (
    nameVal: string,
    roleVal: string,
    deptVal: string,
    resignVal: string,
    lwtVal: string,
    joinVal: string,
    compVal: string
  ) => {
    const safeName = nameVal || 'the employee';
    const firstName = safeName.split(' ')[0] || safeName;
    const safeRole = roleVal || 'Executive';
    const safeDept = deptVal || 'Operations';
    const safeResign = resignVal || '15 July 2025';
    const safeLwt = lwtVal || '31 August 2025';
    const safeJoin = joinVal || '12 January 2024';
    const safeComp = compVal || 'Trade Nexus';

    setBodyParagraph1(
      `This has reference to your formal letter of resignation dated ${safeResign}, wherein you requested to be relieved from your employment responsibilities as ${safeRole} in the ${safeDept} department at ${safeComp}.`
    );
    setBodyParagraph2(
      `We wish to inform you that your resignation has been accepted by the Management, and you are officially relieved from your duties and contractual obligations with ${safeComp} with effect from the close of business working hours on ${safeLwt}.`
    );
    setBodyParagraph3(
      `We hereby confirm that you have successfully handed over all corporate assets, systems access credentials, and records. Your full and final settlement accounts have been thoroughly reconciled and processed in accordance with company policy. There are no outstanding liabilities pending against you.`
    );
    setBodyParagraph4(
      `We take this opportunity to thank you for your committed service and valuable contributions during your association with ${safeComp} from ${safeJoin} to ${safeLwt}, and wish you all the very best for your future personal and career endeavors, ${firstName}.`
    );
  };

  // Initialize defaults on open
  useEffect(() => {
    if (isOpen && !employeeName) {
      const year = new Date().getFullYear();
      setRefNumber(`TNX/RL/${year}/001`);
      regenerateDefaultParagraphs('the Employee', 'Digital Marketing Specialist', 'Marketing & Communications', '15 July 2025', '31 August 2025', '12 January 2024', 'Trade Nexus');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = teamMembers.find(m => m.id === empId || m.empCode === empId);
    if (emp) {
      const name = emp.name;
      const code = emp.empCode || 'TNX-001';
      const role = emp.role || 'Executive';
      const dept = emp.group ? `${emp.group} Department` : 'Client Acquisition';
      const jDate = (emp as any).joiningDate || (emp as any).joinDate || '12 January 2024';
      const year = new Date().getFullYear();

      setEmployeeName(name);
      setEmpCode(code);
      setDesignation(role);
      setDepartment(dept);
      setJoiningDate(jDate);
      setRefNumber(`TNX/RL/${year}/${code.replace(/[^a-zA-Z0-9]/g, '') || '001'}`);

      regenerateDefaultParagraphs(name, role, dept, resignationDate, lastWorkingDate, jDate, companyName);
      triggerToast(`✓ Auto-filled Relieving Letter for ${name}`);
    }
  };

  const handleResetToDefaultTemplate = () => {
    regenerateDefaultParagraphs(employeeName, designation, department, resignationDate, lastWorkingDate, joiningDate, companyName);
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
      const newLetterData: Omit<RelievingLetterData, 'id' | 'issuedDate'> & { issuedDate?: string } = {
        employeeId: selectedEmpId || undefined,
        employeeName: employeeName.trim(),
        empCode: empCode.trim() || 'TNX-001',
        designation: designation.trim(),
        department: department.trim(),
        employeeType: employeeType.trim(),
        employeeAddress: employeeAddress.trim(),
        resignationDate: resignationDate.trim(),
        lastWorkingDate: lastWorkingDate.trim(),
        joiningDate: joiningDate.trim(),
        issuedDate: issuedDate.trim(),
        companyName: companyName.trim() || 'Trade Nexus',
        refNumber: refNumber.trim() || `TNX/RL/${new Date().getFullYear()}/${empCode || '001'}`,
        bodyParagraph1: bodyParagraph1.trim(),
        bodyParagraph2: bodyParagraph2.trim(),
        bodyParagraph3: bodyParagraph3.trim(),
        bodyParagraph4: bodyParagraph4.trim(),
        signatoryName: signatoryName.trim(),
        signatoryRole: signatoryRole.trim(),
      };

      await generateRelievingLetter(newLetterData);
      onClose();
    } catch (err: any) {
      triggerToast(`⚠️ Failed to generate: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstName = employeeName.split(' ')[0] || employeeName || 'Employee';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95">
        
        {/* Top Header */}
        <div className="bg-[#06152B] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30 shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-white">Generate Relieving Letter</h3>
              <p className="text-[11px] text-slate-300">Template 3 (3.png) • 100% HR Field & Body Paragraph Customization</p>
            </div>
          </div>

          {/* Tab Switcher & Close */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'edit' ? 'bg-[#00C9A7] text-[#0A2540]' : 'text-slate-400 hover:text-white'}`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Edit Fields</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'preview' ? 'bg-[#00C9A7] text-[#0A2540]' : 'text-slate-400 hover:text-white'}`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* EDIT TAB */}
        {activeTab === 'edit' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
              style={{ overscrollBehavior: 'contain', maxHeight: 'calc(94vh - 140px)' }}
            >
              {/* Employee Auto-Fill */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#00C9A7]" />
                  <span className="font-bold text-slate-700 text-sm">Auto-Fill from Employee Roster</span>
                </div>
                <select
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  value={selectedEmpId}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7] focus:ring-2 focus:ring-[#00C9A7]/20"
                >
                  <option value="">— Select Employee to Auto-fill —</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.empCode} • {m.role})</option>
                  ))}
                </select>
              </div>

              {/* Employee Details */}
              <div>
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Employee Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Employee Name *</label>
                    <input type="text" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Employee Code</label>
                    <input type="text" value={empCode} onChange={(e) => setEmpCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" placeholder="TNX-001" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Designation</label>
                    <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Department</label>
                    <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Employee Type</label>
                    <select value={employeeType} onChange={(e) => setEmployeeType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]">
                      <option>Full-Time</option>
                      <option>Part-Time</option>
                      <option>Contract</option>
                      <option>Intern</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Employee Address</label>
                    <textarea rows={2} value={employeeAddress} onChange={(e) => setEmployeeAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#00C9A7] resize-none" />
                  </div>
                </div>
              </div>

              {/* Dates & Reference */}
              <div>
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Dates & Reference</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Joining Date</label>
                    <input type="text" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" placeholder="12 January 2024" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Resignation Date</label>
                    <input type="text" value={resignationDate} onChange={(e) => setResignationDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" placeholder="15 July 2025" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Last Working Date</label>
                    <input type="text" value={lastWorkingDate} onChange={(e) => setLastWorkingDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" placeholder="31 August 2025" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Issued Date</label>
                    <input type="text" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Reference Number</label>
                    <input type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" placeholder="TNX/RL/2025/001" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Company Name</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" />
                  </div>
                </div>
              </div>

              {/* Body Paragraphs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Body Paragraphs (HR Editable)</h4>
                  <button
                    type="button"
                    onClick={handleResetToDefaultTemplate}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-[#00C9A7]" />
                    Reset to Template
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Paragraph 1 — Resignation Reference', val: bodyParagraph1, set: setBodyParagraph1 },
                    { label: 'Paragraph 2 — Acceptance & Relief', val: bodyParagraph2, set: setBodyParagraph2 },
                    { label: 'Paragraph 3 — Asset Handover & Settlement', val: bodyParagraph3, set: setBodyParagraph3 },
                    { label: 'Paragraph 4 — Gratitude & Best Wishes', val: bodyParagraph4, set: setBodyParagraph4 },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">{label}</label>
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#00C9A7] focus:ring-2 focus:ring-[#00C9A7]/10 resize-none leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Signatory */}
              <div>
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3">Signatory</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Signatory Name</label>
                    <input type="text" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Signatory Role</label>
                    <input type="text" value={signatoryRole} onChange={(e) => setSignatoryRole(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Bar */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Letter</span>
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

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div
              className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 flex justify-center"
              style={{ overscrollBehavior: 'contain', maxHeight: 'calc(94vh - 140px)' }}
            >
              {/* Relieving Letter Document Preview */}
              <div
                className="w-full max-w-2xl bg-white text-slate-800 rounded-none overflow-hidden relative border border-slate-200/60 flex flex-col justify-between shadow-xs"
                style={{ minHeight: '780px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                {/* Header Banner */}
                <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
                  <img src={headerRelieving} alt="Trade Nexus Header" className="w-full object-cover select-none" />
                </div>

                {/* Center Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                  <img src={watermarkEmblem} alt="Watermark" className="w-72 h-72 object-contain opacity-[0.06]" />
                </div>

                {/* Document Body */}
                <div className="p-5 sm:p-8 space-y-4 flex-1 relative text-xs sm:text-sm leading-relaxed text-slate-700">
                  {/* Date + Title */}
                  <div className="text-center pt-2 pb-1">
                    <h2 className="font-display font-black text-lg sm:text-2xl text-[#0A2540] tracking-tight">RELIEVING LETTER</h2>
                    <div className="w-32 h-0.5 bg-[#00C9A7] mx-auto mt-2 rounded-full" />
                  </div>

                  <div className="text-right text-[11px] text-slate-600 font-bold">Date: {issuedDate}</div>
                  {refNumber && <div className="text-[11px] text-slate-500 font-mono">Ref: {refNumber}</div>}

                  {/* Address Block */}
                  <div className="space-y-0.5 text-xs font-semibold text-slate-800">
                    <p className="font-black text-[#0A2540] text-sm">{employeeName || '[Employee Name]'}</p>
                    <p>{designation || '[Designation]'}</p>
                    <p>{department || '[Department]'}</p>
                    <p>{employeeType || 'Full-Time'}</p>
                    <p>Employee ID: {empCode || 'TNX-001'}</p>
                    <p className="text-slate-600 font-normal whitespace-pre-line">{employeeAddress || '[Employee Address]'}</p>
                  </div>

                  {/* Salutation */}
                  <div className="pt-1 font-bold text-slate-800">
                    <p>Dear {firstName},</p>
                  </div>

                  {/* Body Paragraphs — HR-written */}
                  <div className="space-y-3 text-slate-700 leading-relaxed">
                    {bodyParagraph1 && <p>{bodyParagraph1}</p>}
                    {bodyParagraph2 && <p>{bodyParagraph2}</p>}
                    {bodyParagraph3 && <p>{bodyParagraph3}</p>}
                    {bodyParagraph4 && <p>{bodyParagraph4}</p>}
                    {!bodyParagraph1 && !bodyParagraph2 && !bodyParagraph3 && !bodyParagraph4 && (
                      <p className="text-slate-400 italic">[Body paragraphs will appear here based on Edit Fields tab]</p>
                    )}
                  </div>

                  {/* Signatory Block */}
                  <div className="pt-6 flex justify-end">
                    <div className="text-center space-y-1.5">
                      <div className="flex justify-center py-1">
                        <img src={tradeNexusSeal} alt="Trade Nexus Official Seal" className="w-36 h-auto object-contain select-none" />
                      </div>
                      <div className="space-y-0.5 pt-1">
                        <p className="font-bold text-xs text-[#0A2540]">{signatoryName || 'T. Vidhya Sagar'}</p>
                        <p className="text-[11px] text-slate-600 font-medium">{signatoryRole || 'Chief Executive Officer'}</p>
                        <p className="text-xs font-black text-[#0A2540] tracking-wide">Authorized Signatory</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Banner */}
                <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
                  <img src={corporateFooter} alt="Corporate Footer" className="w-full object-cover select-none" />
                </div>
              </div>
            </div>

            {/* Sticky Action Bar */}
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
