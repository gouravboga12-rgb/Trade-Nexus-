import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Printer, 
  Download, 
  Award, 
  TrendingUp, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Edit3
} from 'lucide-react';
import { ExperienceCertData } from '../../types';

export const ExperienceCertModal: React.FC = () => {
  const { 
    isExperienceCertModalOpen, 
    setIsExperienceCertModalOpen, 
    selectedExperienceCert, 
    teamMembers, 
    triggerToast 
  } = useApp();

  const [formData, setFormData] = useState<ExperienceCertData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedExperienceCert) {
      setFormData(selectedExperienceCert);
    }
  }, [selectedExperienceCert]);

  if (!isExperienceCertModalOpen || !formData) return null;

  const handlePrint = () => {
    triggerToast('✓ Opening print dialogue for Experience Certificate...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = () => {
    triggerToast(`✓ Experience Certificate for ${formData.employeeName} ready for PDF save`);
    setTimeout(() => {
      window.print();
    }, 100);
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
        startDate: (emp as any).joiningDate || (emp as any).joinDate || '01-01-2023',
        endDate: '03-01-2025',
        refNumber: `TNX/EXP/${new Date().getFullYear()}/${emp.empCode}`,
      } : prev);
      triggerToast(`✓ Selected employee ${emp.name}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Top Header Bar */}
        <div className="bg-[#06152B] px-4 sm:px-6 py-3.5 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">Official Experience Certificate</h3>
              <p className="text-[11px] text-slate-400">Trade Nexus Corporate Employment Verification</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isEditing ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Done Editing' : 'Edit Fields'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#00C9A7]" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button 
              onClick={() => setIsExperienceCertModalOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Edit Bar if editing enabled */}
        {isEditing && (
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
                <label className="text-[10px] font-bold text-slate-500 block">Guardian / Father Name</label>
                <input 
                  type="text" 
                  value={formData.guardianName || ''} 
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  placeholder="Sh. Heera Singh"
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
                <label className="text-[10px] font-bold text-slate-500 block">Start Date</label>
                <input 
                  type="text" 
                  value={formData.startDate} 
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">End Date / Relieved Date</label>
                <input 
                  type="text" 
                  value={formData.endDate} 
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Reference Number</label>
                <input 
                  type="text" 
                  value={formData.refNumber} 
                  onChange={(e) => setFormData({ ...formData, refNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Printable Document Sheet Container */}
        <div 
          ref={scrollRef}
          className="overflow-y-auto flex-1 p-3 sm:p-6 bg-slate-100/80 flex justify-center"
        >
          
          {/* Certificate Letterhead matching 2.png */}
          <div 
            id="experience-certificate-sheet"
            className="printable-document-sheet w-full bg-white text-slate-800 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden relative border border-slate-200 flex flex-col justify-between"
            style={{ 
              minHeight: '780px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            
            {/* Top Navy Header with Teal Angled Accent (Exact 2.png Header) */}
            <div 
              className="doc-printable-header relative text-white px-5 sm:px-8 pt-5 sm:pt-6 pb-4 sm:pb-5 overflow-hidden flex-shrink-0"
              style={{ 
                backgroundColor: '#06152B',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                colorAdjust: 'exact'
              }}
            >
              {/* Teal Accent Lines */}
              <div 
                className="absolute -bottom-1 left-0 right-0 h-2.5" 
                style={{ backgroundColor: '#00A88B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              />
              <div 
                className="absolute bottom-1 left-0 w-3/5 h-1" 
                style={{ backgroundColor: '#38E1B7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              />

              <div className="flex items-center justify-between gap-3 relative z-10">
                {/* Brand Logo & Name */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 shadow-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #00C9A7 0%, #00897B 100%)',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center text-[#00C9A7]"
                      style={{ backgroundColor: '#06152B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div>
                    <h1 className="font-display font-black text-sm sm:text-xl text-white tracking-wider leading-none uppercase">
                      TRADE NEXUS
                    </h1>
                    <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                      <span className="h-px w-3 sm:w-4" style={{ backgroundColor: '#00C9A7' }} />
                      <span className="text-[7px] sm:text-[9px] font-extrabold tracking-[0.2em]" style={{ color: '#00C9A7' }}>
                        TRADE SMART
                      </span>
                      <span className="h-px w-3 sm:w-4" style={{ backgroundColor: '#00C9A7' }} />
                    </div>
                  </div>
                </div>

                {/* Right Document Title */}
                <div className="text-right flex-shrink-0">
                  <h2 className="font-display font-black text-xs sm:text-lg text-white tracking-wider uppercase">
                    EXPERIENCE CERTIFICATE
                  </h2>
                  <div className="h-0.5 w-full mt-0.5" style={{ backgroundColor: '#00C9A7' }} />
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 flex-1 relative text-xs sm:text-sm leading-relaxed text-slate-700">
              
              {/* Background Watermark */}
              <div className="absolute right-4 bottom-16 opacity-5 pointer-events-none select-none">
                <div className="w-56 h-56 rounded-full border-8 border-[#0A2540] flex items-center justify-center">
                  <TrendingUp className="w-36 h-36 text-[#0A2540] stroke-[2]" />
                </div>
              </div>

              {/* Date & Ref Line matching 2.png */}
              <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-slate-800 pt-2">
                <div>
                  <strong>Date:</strong> <span>{formData.issuedDate || '01-01-2050'}</span>
                </div>
                <div>
                  <strong>Ref:</strong> <span className="font-mono">{formData.refNumber || '______________'}</span>
                </div>
              </div>

              {/* Centered Heading: To Whom It May Concern (Matching 2.png) */}
              <div className="text-center py-4">
                <h2 className="font-serif sm:font-display font-bold text-xl sm:text-2xl text-[#0A2540] tracking-tight">
                  To Whom It May Concern
                </h2>
              </div>

              {/* Main Certificate Paragraphs (Exact 2.png copy) */}
              <div className="space-y-5 text-slate-700 text-xs sm:text-sm leading-relaxed">
                <p>
                  This letter serves to confirm that{' '}
                  <strong className="text-[#00A88B] font-bold">Mr. / Ms. {formData.employeeName}</strong>
                  {formData.guardianName ? <>, son/daughter of <strong className="text-[#00A88B] font-bold">{formData.guardianName}</strong>,</> : null}{' '}
                  was employed as a <strong className="text-[#00A88B] font-bold">{formData.designation}</strong> at{' '}
                  <strong className="text-[#0A2540] font-bold">Trade Nexus</strong>, a renowned organization in corporate finance &amp; trading services, from{' '}
                  <strong className="text-[#00A88B] font-bold">{formData.startDate}</strong> to{' '}
                  <strong className="text-[#00A88B] font-bold">{formData.endDate}</strong>.
                </p>

                <p>
                  During their tenure, Mr./Ms. {formData.employeeName} performed duties with sincerity, professionalism, and dedication. They were responsible for supervising client operations, ensuring high standards of service, coordinating with staff, and maintaining smooth day-to-day operations. Their conduct and performance were satisfactory throughout their period of employment.
                </p>

                <div className="py-2 text-center sm:text-left">
                  <p className="font-semibold text-slate-800">
                    We wish them all the best in their future endeavours.
                  </p>
                </div>
              </div>

              {/* Sign-off matching 2.png */}
              <div className="pt-6 space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Sincerely,</p>
                <p className="font-bold text-xs sm:text-sm text-[#0A2540]">For: Trade Nexus</p>
                
                {/* Authentic Handwritten Signature */}
                <div className="py-2">
                  <span 
                    className="font-signature text-3xl sm:text-4xl text-[#0A2540] inline-block font-semibold tracking-wide transform -rotate-3 select-none leading-tight"
                    style={{ 
                      fontFamily: "'Caveat', 'Great Vibes', 'Dancing Script', cursive",
                      color: '#0A2540',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    T. Vidhya sagar
                  </span>
                </div>

                <div className="space-y-0.5">
                  <p className="font-display font-black text-xs sm:text-sm text-[#0A2540]">
                    {formData.signatoryName || 'T .Vidhya Sagar'}
                  </p>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-600">
                    {formData.signatoryRole || 'Chief Executive Officer'}
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Footer Bar (Matching 2.png) */}
            <div 
              className="doc-printable-footer text-white px-5 sm:px-8 py-3 sm:py-3.5 flex items-center justify-between text-[10px] sm:text-[11px] gap-2 font-medium flex-shrink-0"
              style={{ 
                backgroundColor: '#06152B',
                borderTop: '3px solid #00C9A7',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                colorAdjust: 'exact'
              }}
            >
              <span className="flex items-center gap-1.5 text-slate-200">
                <Phone className="w-3.5 h-3.5 text-[#00C9A7]" />
                +91 98765 43210
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <Mail className="w-3.5 h-3.5 text-[#00C9A7]" />
                info@tradenexus.com
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <Globe className="w-3.5 h-3.5 text-[#00C9A7]" />
                www.tradenexus.com
              </span>
            </div>

          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsExperienceCertModalOpen(false)}
            className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-sm hover:brightness-105 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Certificate PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
};
