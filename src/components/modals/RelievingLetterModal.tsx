import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Printer, 
  Download, 
  FileCheck, 
  TrendingUp, 
  Phone, 
  Mail, 
  Globe, 
  Edit3,
  ShieldCheck
} from 'lucide-react';
import { RelievingLetterData } from '../../types';
import { api } from '../../services/api';
import tradeNexusSeal from '../../assets/trade-nexus-seal.png';
import watermarkEmblem from '../../assets/watermark-emblem.png';
import headerRelieving from '../../assets/header-relieving.png';
import corporateFooter from '../../assets/corporate-footer.png';

export const RelievingLetterModal: React.FC = () => {
  const { 
    currentRole,
    isRelievingLetterModalOpen, 
    setIsRelievingLetterModalOpen, 
    selectedRelievingLetter, 
    teamMembers,
    exitList,
    triggerToast 
  } = useApp();

  const canEdit = currentRole === 'admin' || currentRole === 'hr';
  const [formData, setFormData] = useState<RelievingLetterData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRelievingLetter) {
      setFormData(selectedRelievingLetter);
    }
  }, [selectedRelievingLetter]);

  if (!isRelievingLetterModalOpen || !formData) return null;

  const firstName = formData.employeeName.trim().split(' ')[0] || formData.employeeName;

  const handlePrint = () => {
    triggerToast('✓ Opening print dialogue for Relieving Letter...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = async () => {
    try {
      triggerToast(`⏳ Generating & downloading official Relieving Letter PDF for ${formData.employeeName}...`);
      await api.downloadRelievingLetter({ name: formData.employeeName }, formData);
      triggerToast(`✓ Official Relieving Letter PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleSendEmail = async () => {
    const emp = teamMembers.find(m => m.empCode === formData.empCode || m.name.toLowerCase() === formData.employeeName.toLowerCase());
    const targetEmail = emp?.email || (formData as any).email;
    if (!targetEmail) {
      triggerToast('⚠️ No employee email address found to dispatch');
      return;
    }

    setIsSendingEmail(true);
    triggerToast(`Dispatching official Relieving Letter PDF to ${targetEmail}...`);
    try {
      const res = await api.sendRelievingEmail(
        {
          id: emp?.id,
          name: formData.employeeName,
          email: targetEmail,
          empCode: formData.empCode,
          role: formData.designation,
        },
        formData
      );
      if (res.success) {
        triggerToast(`✓ Relieving Letter PDF successfully dispatched to ${targetEmail}!`);
      } else {
        triggerToast(`⚠️ Failed to dispatch: ${(res as any).error || 'Server error'}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Email dispatch failed: ${err.message || 'Network error'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSelectEmployee = (empId: string) => {
    const emp = teamMembers.find(m => m.id === empId);
    if (emp) {
      setFormData(prev => prev ? {
        ...prev,
        employeeName: emp.name,
        empCode: emp.empCode,
        designation: emp.role,
        department: emp.group ? `${emp.group} Department` : 'Client Acquisition',
        employeeType: 'Full-Time',
        employeeAddress: '123 Business Avenue, Financial District, Your City, 500001',
        joiningDate: (emp as any).joiningDate || (emp as any).joinDate || '12 January 2024',
        resignationDate: '15 July 2025',
        lastWorkingDate: '31 August 2025',
        issuedDate: new Date().toLocaleDateString('en-GB'),
      } : prev);
      triggerToast(`✓ Selected employee ${emp.name}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh] printable-modal-dialog print:max-w-none print:rounded-none print:border-none print:shadow-none print:max-h-none">
        
        {/* Top Header Bar */}
        <div className="bg-[#06152B] px-4 sm:px-6 py-3.5 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">Official Relieving Letter Document</h3>
              <p className="text-[11px] text-slate-400">Trade Nexus Corporate Service Relieving Certificate</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isEditing ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Done Editing' : 'Edit Fields'}</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-xs hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button 
              onClick={() => setIsRelievingLetterModalOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Edit Bar if editing enabled */}
        {canEdit && isEditing && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-3 print:hidden max-h-48 overflow-y-auto flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Quick Auto-Fill:</span>
              <select 
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              >
                <option value="">— Select Employee to Auto-fill —</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.empCode} • {m.role})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Employee Name</label>
                <input 
                  type="text" 
                  value={formData.employeeName} 
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Designation</label>
                <input 
                  type="text" 
                  value={formData.designation} 
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Department</label>
                <input 
                  type="text" 
                  value={formData.department} 
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Resignation Date</label>
                <input 
                  type="text" 
                  value={formData.resignationDate} 
                  onChange={(e) => setFormData({ ...formData, resignationDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Last Working Date</label>
                <input 
                  type="text" 
                  value={formData.lastWorkingDate} 
                  onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Joining Date</label>
                <input 
                  type="text" 
                  value={formData.joiningDate} 
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Printable Document Sheet Container */}
        <div 
          ref={scrollRef}
          className="overflow-y-auto flex-1 p-0 sm:p-6 bg-slate-50/60 flex justify-center printable-scroll-container print:p-0 print:bg-white"
        >
          
          {/* Relieving Letter Sheet matching 3.png */}
          <div 
            id="relieving-letter-sheet"
            className="w-full bg-white text-slate-800 rounded-none overflow-hidden relative border-0 sm:border sm:border-slate-200/60 flex flex-col justify-between shadow-none sm:shadow-xs print:border-none print:shadow-none"
            style={{ 
              minHeight: '780px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            
            {/* Top Corporate Header Banner (Matching 3.png) */}
            <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
              <img src={headerRelieving} alt="Trade Nexus Header" className="w-full object-cover select-none" />
            </div>

            {/* Center Background Watermark (Matching 3.png) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              <img src={watermarkEmblem} alt="Trade Nexus Watermark" className="w-72 h-72 object-contain opacity-[0.06]" />
            </div>

            {/* Document Body */}
            <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 flex-1 relative text-xs sm:text-sm leading-relaxed text-slate-700">
              
              {/* Background Watermark (Upward trend arrow) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
                <div className="w-64 h-64 rounded-full border-8 border-[#0A2540] flex items-center justify-center">
                  <TrendingUp className="w-44 h-44 text-[#0A2540] stroke-[2]" />
                </div>
              </div>

              {/* Centered Document Title matching 3.png */}
              <div className="text-center pt-2 pb-1">
                <h2 className="font-display font-black text-lg sm:text-2xl text-[#0A2540] tracking-tight">
                  Relieving Letter Format For Employee
                </h2>
                <div className="w-full h-px bg-slate-200 mt-3" />
              </div>

              {/* Date matching 3.png */}
              <div className="font-bold text-slate-800 text-xs sm:text-sm">
                <span>[{formData.issuedDate || 'DD/MM/YYYY'}]</span>
              </div>

              {/* Recipient Details Block matching 3.png */}
              <div className="space-y-0.5 text-xs sm:text-sm font-semibold text-slate-800">
                <p className="font-black text-[#0A2540]">[{formData.employeeName}]</p>
                <p>[{formData.designation}]</p>
                <p>[{formData.department}]</p>
                <p>[{formData.employeeType || 'Full-Time'}]</p>
                <p>[Employee ID: {formData.empCode || 'TNX-042'}]</p>
                <p className="text-slate-600 font-normal whitespace-pre-line">[{formData.employeeAddress || '123 Business Avenue, Financial District, Your City, 500001'}]</p>
              </div>

              {/* Salutation */}
              <div className="pt-1 text-xs sm:text-sm font-bold text-slate-800">
                <p>Dear [{firstName}],</p>
              </div>

              {/* Body Paragraphs matching 3.png */}
              <div className="space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
                <p>
                  This is to formally inform you that your resignation dated <strong className="text-slate-900">[{formData.resignationDate}]</strong> has been accepted, and your last working day with <strong className="text-[#00A88B] font-bold">[Trade Nexus]</strong> was <strong className="text-slate-900">[{formData.lastWorkingDate}]</strong>.
                </p>

                <p>
                  We would like to confirm that you have been relieved from your duties as <strong className="text-slate-900">[{formData.designation}]</strong> in <strong className="text-slate-900">[{formData.department}]</strong>. We thank you for the dedication, effort, and contributions you have made during your tenure with us, from <strong className="text-slate-900">[{formData.joiningDate}]</strong> to <strong className="text-slate-900">[{formData.lastWorkingDate}]</strong>.
                </p>
              </div>

              {/* Official Stamp & Signatory Block matching 3.png */}
              <div className="pt-8 flex justify-end">
                <div className="text-center space-y-1.5">
                  
                  {/* Official Circular Trade Nexus Seal Stamp with Signature (Matching 3.png) */}
                  <div className="flex justify-center py-1">
                    <img
                      src={tradeNexusSeal}
                      alt="Trade Nexus Official Seal & Signature"
                      className="w-36 h-auto object-contain select-none"
                    />
                  </div>

                  <div className="space-y-0.5 pt-1">
                    <p className="font-bold text-xs text-[#0A2540]">
                      {formData.signatoryName || 'T .Vidhya Sagar'}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {formData.signatoryRole || 'Chief Executive Officer'}
                    </p>
                    <p className="text-xs font-black text-[#0A2540] tracking-wide">
                      Authorized Signatory
                    </p>
                  </div>

                </div>
              </div>

            </div>

            {/* Bottom Corporate Footer (Matching 3.png) */}
            <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
              <img src={corporateFooter} alt="Trade Nexus Footer" className="w-full object-cover select-none" />
            </div>

          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsRelievingLetterModalOpen(false)}
            className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSendingEmail}
              onClick={handleSendEmail}
              className="px-3.5 py-2 rounded-xl border border-[#00C9A7]/40 bg-[#E6FAF6] hover:bg-[#D0F7F0] font-bold text-[#00897B] text-xs flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#00A88B]" />
              <span>{isSendingEmail ? 'Sending...' : 'Email PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-sm hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
