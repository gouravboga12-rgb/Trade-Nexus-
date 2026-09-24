import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Award, 
  User, 
  Calendar, 
  Building, 
  Briefcase, 
  FileText,
  Send,
  Sparkles
} from 'lucide-react';
import { ExperienceCertData } from '../../types';

interface GenerateExperienceCertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerateExperienceCertModal: React.FC<GenerateExperienceCertModalProps> = ({ isOpen, onClose }) => {
  const { 
    teamMembers, 
    generateExperienceCert, 
    setSelectedExperienceCert, 
    setIsExperienceCertModalOpen, 
    triggerToast 
  } = useApp();

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [guardianName, setGuardianName] = useState('Shri Ramdas Sharma');
  const [designation, setDesignation] = useState('Senior Sales Executive');
  const [department, setDepartment] = useState('Client Acquisition');
  const [startDate, setStartDate] = useState('01-01-2023');
  const [endDate, setEndDate] = useState('03-01-2025');
  const [issuedDate, setIssuedDate] = useState('03-01-2025');
  const [conductRemarks, setConductRemarks] = useState(
    'During the tenure, the employee performed all assigned duties with sincerity, dedication, and professional excellence. Their conduct and character were exemplary throughout their service.'
  );
  const [signatoryName, setSignatoryName] = useState('T. Vidhya Sagar');
  const [signatoryRole, setSignatoryRole] = useState('Chief Executive Officer');

  if (!isOpen) return null;

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = teamMembers.find(m => m.id === empId);
    if (emp) {
      setEmployeeName(emp.name);
      setEmpCode(emp.empCode);
      setDesignation(emp.role);
      setDepartment(emp.group ? `${emp.group} Department` : 'Client Acquisition');
      const jDate = (emp as any).joiningDate || (emp as any).joinDate || '01-01-2023';
      setStartDate(jDate);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      triggerToast('Please select or enter employee name');
      return;
    }

    const refNumber = `TNX/EXP/${new Date().getFullYear()}/${empCode || '001'}`;
    const newCert: Omit<ExperienceCertData, 'id' | 'issuedDate'> & { issuedDate?: string } = {
      employeeName: employeeName.trim(),
      empCode: empCode.trim() || 'TNX-001',
      guardianName: guardianName.trim(),
      designation: designation.trim(),
      department: department.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      refNumber,
      issuedDate: issuedDate.trim(),
      conductRemarks: conductRemarks.trim(),
      signatoryName: signatoryName.trim(),
      signatoryRole: signatoryRole.trim(),
    };

    generateExperienceCert(newCert);

    const fullCert: ExperienceCertData = {
      ...newCert,
      id: `exp-${Date.now().toString().slice(-4)}`,
      issuedDate: issuedDate.trim() || new Date().toLocaleDateString('en-GB'),
    };
    setSelectedExperienceCert(fullCert);
    onClose();
    setIsExperienceCertModalOpen(true);
    triggerToast(`✓ Experience Certificate generated & dispatched to ${employeeName}'s portal!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#06152B] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-white">Generate Experience Certificate</h3>
              <p className="text-[11px] text-slate-300">Template 3 (2.png) • Official Employment Verification</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs text-slate-700">
          
          {/* Quick Employee Selector */}
          <div className="bg-[#00C9A7]/10 border border-[#00C9A7]/30 p-3.5 rounded-2xl space-y-2">
            <label className="font-bold text-[#0A2540] flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#00A88B]" />
              Select Employee from Directory (Auto-fill)
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-[#00C9A7] focus:outline-none"
            >
              <option value="">-- Choose Active Team Member --</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.empCode}) • {m.role}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Employee Full Name *</label>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="e.g. Anand Sharma"
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
                placeholder="e.g. TNX-018"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Designation / Role *</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Sales Executive"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Client Acquisition"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>

          {/* Service Tenure Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Start / Joining Date</label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">End / Relieving Date</label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Certificate Issued Date</label>
              <input
                type="text"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Conduct & Character Remarks */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tenure Evaluation & Conduct Remarks</label>
            <textarea
              rows={3}
              value={conductRemarks}
              onChange={(e) => setConductRemarks(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed"
            />
          </div>

          {/* Signatory Authority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Authorized Signatory Name</label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Signatory Title / Role</label>
              <input
                type="text"
                value={signatoryRole}
                onChange={(e) => setSignatoryRole(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-lg shadow-[#00C9A7]/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Generate & Dispatch to Employee</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
