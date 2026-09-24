import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Printer, 
  Download, 
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Globe,
  Edit3
} from 'lucide-react';
import { OfferLetterData } from '../../types';

export const OfferLetterModal: React.FC = () => {
  const { 
    isOfferLetterModalOpen, 
    setIsOfferLetterModalOpen, 
    selectedOfferLetter,
    teamMembers,
    candidates,
    triggerToast
  } = useApp();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<OfferLetterData | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (selectedOfferLetter) {
      setFormData(selectedOfferLetter);
    }
  }, [selectedOfferLetter]);

  useEffect(() => {
    if (isOfferLetterModalOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isOfferLetterModalOpen]);

  if (!isOfferLetterModalOpen || !formData) return null;

  const firstName = formData.candidateName.split(' ')[0] || formData.candidateName;
  const formattedSalary = formData.monthlyGross 
    ? `INR ${formData.monthlyGross.toLocaleString('en-IN')}` 
    : 'INR 7,00,000';
  const address = formData.candidateAddress || '123 Anywhere St., Any City\nST 12345';
  const deadline = formData.acceptanceDeadline || 'August 30, 2025';
  const signatory = formData.signatoryName || 'T .Vidhya Sagar';
  const signatoryRole = formData.signatoryRole || 'Chief executive Officer';

  const handlePrint = () => {
    triggerToast('✓ Opening print dialog for Job Offer Letter...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = () => {
    triggerToast(`✓ Offer letter for ${formData.candidateName} ready to save as PDF`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleCandidateSelect = (candId: string) => {
    const cand = candidates.find(c => c.id === candId);
    if (cand) {
      setFormData(prev => prev ? {
        ...prev,
        candidateName: cand.candidateName,
        candidateEmail: cand.email,
        candidatePhone: cand.phone,
        roleTitle: cand.roleApplied,
      } : prev);
      triggerToast(`✓ Prefilled from candidate ${cand.candidateName}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="bg-[#06152B] px-4 sm:px-6 py-3 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7] animate-pulse" />
            <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-200">
              Official Job Offer Letter Document
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isEditing ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Done' : 'Edit Fields'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#00C9A7]" />
              <span className="hidden xs:inline">Print / PDF</span>
            </button>

            <button 
              onClick={() => setIsOfferLetterModalOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Edit Drawer */}
        {isEditing && (
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs space-y-2.5 print:hidden max-h-48 overflow-y-auto flex-shrink-0">
            {candidates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Prefill Candidate:</span>
                <select
                  onChange={(e) => handleCandidateSelect(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800"
                >
                  <option value="">— Select Candidate —</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>{c.candidateName} ({c.roleApplied})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Candidate Name</label>
                <input 
                  type="text" 
                  value={formData.candidateName} 
                  onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Role Title</label>
                <input 
                  type="text" 
                  value={formData.roleTitle} 
                  onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Monthly Salary (INR)</label>
                <input 
                  type="number" 
                  value={formData.monthlyGross || 700000} 
                  onChange={(e) => setFormData({ ...formData, monthlyGross: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Joining Date</label>
                <input 
                  type="text" 
                  value={formData.joiningDate} 
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Reporting Manager</label>
                <input 
                  type="text" 
                  value={formData.reportingManager} 
                  onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block">Acceptance Deadline</label>
                <input 
                  type="text" 
                  value={formData.acceptanceDeadline || 'August 30, 2025'} 
                  onChange={(e) => setFormData({ ...formData, acceptanceDeadline: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Document Container */}
        <div 
          ref={scrollContainerRef}
          className="overflow-y-auto flex-1 p-2 sm:p-5 bg-slate-100/70 flex justify-center"
        >
          
          {/* Printable Letter Sheet (Exact Template matching 1.png) */}
          <div 
            id="offer-letter-sheet"
            className="printable-document-sheet w-full bg-white text-slate-800 shadow-md rounded-xl sm:rounded-2xl overflow-hidden relative border border-slate-200 flex flex-col justify-between"
            style={{ 
              minHeight: '780px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            
            {/* Top Navy Header Banner with Diagonal Teal Wedge (Matching 1.png) */}
            <div 
              className="relative text-white px-4 sm:px-7 pt-5 sm:pt-6 pb-4 sm:pb-5 overflow-hidden flex-shrink-0"
              style={{ 
                backgroundColor: '#06152B',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              
              {/* Teal angled bottom line accent */}
              <div 
                className="absolute -bottom-1 left-0 right-0 h-2.5" 
                style={{ backgroundColor: '#00A88B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              />
              <div 
                className="absolute bottom-1 left-0 w-3/5 h-1" 
                style={{ backgroundColor: '#38E1B7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              />
              
              <div className="flex items-center justify-between gap-2 relative z-10">
                {/* Left: Brand Logo & Title */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#00C9A7] to-[#0A2540] p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
                    <div 
                      className="w-full h-full rounded-full flex items-center justify-center text-[#00C9A7]"
                      style={{ backgroundColor: '#06152B' }}
                    >
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div>
                    <h1 className="font-display font-black text-sm sm:text-xl text-white tracking-wider leading-none uppercase">
                      TRADE NEXUS
                    </h1>
                    <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                      <span className="h-px w-3 sm:w-4 bg-[#00C9A7]" />
                      <span className="text-[7px] sm:text-[9px] font-extrabold tracking-[0.2em] text-[#00C9A7]">
                        TRADE SMART
                      </span>
                      <span className="h-px w-3 sm:w-4 bg-[#00C9A7]" />
                    </div>
                  </div>
                </div>

                {/* Right: Document Title */}
                <div className="text-right flex-shrink-0">
                  <h2 className="font-display font-black text-xs sm:text-lg text-white tracking-wider uppercase">
                    JOB OFFER LETTER
                  </h2>
                  <div className="h-0.5 w-full bg-[#00C9A7] mt-0.5" />
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-4 sm:p-7 space-y-4 sm:space-y-5 flex-1 relative">
              
              {/* Background Watermark (Bottom Right) */}
              <div className="absolute right-4 bottom-12 opacity-5 pointer-events-none select-none">
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border-8 border-[#0A2540] flex items-center justify-center">
                  <TrendingUp className="w-32 h-32 sm:w-40 sm:h-40 text-[#0A2540] stroke-[2]" />
                </div>
              </div>

              {/* Company Info & Issue Date */}
              <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 text-[11px] sm:text-xs">
                <div className="space-y-1 text-slate-700">
                  <p className="font-display font-extrabold text-xs sm:text-sm text-[#0A2540]">Trade Nexus</p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <span 
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[#00A88B]"
                      style={{ backgroundColor: '#E6FAF6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      <MapPin className="w-2.5 h-2.5" />
                    </span>
                    <span>123 Business Avenue, Financial District, Your City, 500001</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <span 
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[#00A88B]"
                      style={{ backgroundColor: '#E6FAF6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      <Phone className="w-2.5 h-2.5" />
                    </span>
                    <span>+91 98765 43210</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <span 
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[#00A88B]"
                      style={{ backgroundColor: '#E6FAF6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      <Mail className="w-2.5 h-2.5" />
                    </span>
                    <span>info@tradenexus.com</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <span 
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[#00A88B]"
                      style={{ backgroundColor: '#E6FAF6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      <Globe className="w-2.5 h-2.5" />
                    </span>
                    <span>www.tradenexus.com</span>
                  </p>
                </div>

                <div className="text-right font-semibold text-slate-700 text-[11px] sm:text-xs flex-shrink-0">
                  <span>{formData.issuedDate || '24 August 2025'}</span>
                </div>
              </div>

              {/* Recipient Address */}
              <div className="space-y-0.5 text-[11px] sm:text-xs">
                <p className="font-semibold text-slate-500">To,</p>
                <p className="font-display font-black text-xs sm:text-sm text-[#0A2540]">
                  {formData.candidateName}
                </p>
                <p className="text-slate-600 whitespace-pre-line">{address}</p>
              </div>

              {/* Salutation & Offer Letter Text (Exact Copy from 1.png) */}
              <div className="space-y-3 text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                <p>Dear <strong className="text-[#0A2540]">{firstName}</strong>,</p>

                <p>
                  We are pleased to offer you the position of{' '}
                  <strong className="text-[#00A88B] font-bold">{formData.roleTitle}</strong> at{' '}
                  <strong className="text-[#0A2540] font-bold">Trade Nexus</strong>, starting on{' '}
                  <strong className="text-[#00A88B] font-bold">{formData.joiningDate}</strong>. In this role, you will report to{' '}
                  <strong className="text-[#00A88B] font-bold">{formData.reportingManager}</strong> and will be based at our corporate office.
                </p>

                <p>
                  Your monthly salary will be <strong className="text-[#0A2540] font-bold">{formattedSalary}</strong>, along with benefits including health insurance, paid leave, internet allowance, and performance bonuses. Full details will be shared upon confirmation.
                </p>

                <p>
                  Please confirm your acceptance by signing and returning this letter by{' '}
                  <strong className="text-[#00A88B] font-bold">{deadline}</strong>.
                </p>

                <p>
                  We look forward to having you onboard and seeing your strategic ideas come to life!
                </p>

                <div className="space-y-0.5 font-bold text-slate-800 pt-1">
                  <p><strong>Employee Type:</strong> Full-Time</p>
                  <p><strong>Salary Type:</strong> Monthly Salary</p>
                </div>
              </div>

              {/* Sign-off & Authentic Handwritten Signature (Matching 1.png) */}
              <div className="pt-2 space-y-1">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-600">Warm Regards,</p>
                
                {/* Handwritten Cursive Signature matching 1.png */}
                <div className="py-1">
                  <span 
                    className="font-signature text-3xl sm:text-4xl inline-block font-semibold tracking-wide transform -rotate-3 select-none leading-tight"
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

                <div className="space-y-0.5 pt-0.5">
                  <p 
                    className="font-display font-black text-xs sm:text-sm"
                    style={{ color: '#00A88B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                  >
                    {signatory}
                  </p>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-700">{signatoryRole}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Trade Nexus</p>
                </div>
              </div>

            </div>

            {/* Bottom Navy Bar with Contact Links (Matching 1.png) */}
            <div 
              className="text-white px-4 sm:px-6 py-2.5 sm:py-3 border-t-2 border-[#00A88B] flex items-center justify-between text-[9px] sm:text-[11px] gap-2 font-medium flex-shrink-0"
              style={{ 
                backgroundColor: '#06152B',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              <span className="flex items-center gap-1 text-slate-200">
                <Phone className="w-3 h-3 text-[#00C9A7]" />
                +91 98765 43210
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-200">
                <Mail className="w-3 h-3 text-[#00C9A7]" />
                info@tradenexus.com
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-200 truncate">
                <Globe className="w-3 h-3 text-[#00C9A7]" />
                www.tradenexus.com
              </span>
            </div>

          </div>

        </div>

        {/* Modal Bottom Action Bar (Hidden on print) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsOfferLetterModalOpen(false)}
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
            <span>Download &amp; Dispatch PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
};
