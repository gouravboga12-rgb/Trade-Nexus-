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
import { api } from '../../services/api';
import signatureVidhyaSagar from '../../assets/signature-vidhya-sagar.png';
import watermarkEmblem from '../../assets/watermark-emblem.png';
import headerOffer from '../../assets/header-offer.png';
import corporateFooter from '../../assets/corporate-footer.png';

export const OfferLetterModal: React.FC = () => {
  const { 
    currentRole,
    isOfferLetterModalOpen, 
    setIsOfferLetterModalOpen, 
    selectedOfferLetter,
    setSelectedOfferLetter,
    teamMembers,
    candidates,
    triggerToast
  } = useApp();

  const canEdit = currentRole === 'admin' || currentRole === 'hr';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<OfferLetterData | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

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
  const address = formData.candidateAddress || 'Bengaluru Corporate Office';
  const deadline = formData.acceptanceDeadline || 'Within 7 business days';
  const signatory = formData.signatoryName || 'T .Vidhya Sagar';
  const signatoryRole = formData.signatoryRole || 'Chief executive Officer';

  const handlePrint = () => {
    triggerToast('✓ Opening print dialog for Job Offer Letter...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = async () => {
    try {
      triggerToast(`⏳ Generating & downloading official Offer Letter PDF for ${formData.candidateName}...`);
      await api.downloadOfferLetter(formData);
      triggerToast(`✓ Official Offer Letter PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleSendEmail = async () => {
    if (!formData?.candidateEmail) {
      triggerToast('⚠️ Candidate email address is required to dispatch');
      return;
    }
    setIsSendingEmail(true);
    triggerToast(`Dispatching official Offer Letter PDF to ${formData.candidateEmail}...`);
    try {
      const res = await api.sendOnboardingEmail(
        {
          name: formData.candidateName,
          email: formData.candidateEmail,
          phone: formData.candidatePhone,
          address: formData.candidateAddress,
          role: formData.roleTitle,
        },
        formData
      );
      if (res.success) {
        triggerToast(`✓ Offer Letter PDF successfully dispatched to ${formData.candidateEmail}!`);
      } else {
        triggerToast(`⚠️ Failed to dispatch: ${(res as any).error || 'Server error'}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Email dispatch failed: ${err.message || 'Network error'}`);
    } finally {
      setIsSendingEmail(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh] printable-modal-dialog print:max-w-none print:rounded-none print:border-none print:shadow-none print:max-h-none">
        
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="bg-white px-4 sm:px-6 py-3 text-slate-800 flex items-center justify-between border-b border-slate-200 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7] animate-pulse" />
            <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-800">
              Official Job Offer Letter Document
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => {
                  if (isEditing && formData) {
                    setSelectedOfferLetter(formData);
                    triggerToast(`✓ Offer letter updated for ${formData.candidateName}`);
                  }
                  setIsEditing(!isEditing);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isEditing ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Save & Close' : 'Edit Fields'}</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-xs hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium transition-all flex items-center gap-1.5 shadow-2xs border border-slate-200 cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button 
              onClick={() => setIsOfferLetterModalOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors border border-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Edit Drawer */}
        {canEdit && isEditing && (
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
                <label className="text-[10px] font-bold text-slate-500 block">Candidate Address</label>
                <input 
                  type="text" 
                  value={formData.candidateAddress || ''} 
                  onChange={(e) => setFormData({ ...formData, candidateAddress: e.target.value })}
                  placeholder="e.g. HSR Layout, Bengaluru"
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
                  value={formData.acceptanceDeadline || 'Within 7 business days'} 
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
          className="overflow-y-auto flex-1 p-0 sm:p-5 bg-slate-50/60 flex justify-center printable-scroll-container print:p-0 print:bg-white"
        >
          
          {/* Printable Letter Sheet (Exact Template matching 1.png) */}
          <div 
            id="offer-letter-sheet"
            className="w-full bg-white text-slate-800 rounded-none overflow-hidden relative border-0 sm:border sm:border-slate-200/60 flex flex-col justify-between shadow-none sm:shadow-xs print:border-none print:shadow-none"
            style={{ 
              minHeight: '780px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            
            {/* Top Corporate Header Banner (Matching 1.png) */}
            <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
              <img src={headerOffer} alt="Trade Nexus Header" className="w-full object-cover select-none" />
            </div>

            {/* Center Background Watermark (Matching 1.png) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              <img src={watermarkEmblem} alt="Trade Nexus Watermark" className="w-72 h-72 object-contain opacity-[0.06]" />
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
                  <span>{formData.issuedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
                
                {/* Authentic Signature matching 1.png */}
                <div className="py-1">
                  <img
                    src={signatureVidhyaSagar}
                    alt="T. Vidhya Sagar"
                    className="h-8 w-auto object-contain select-none"
                  />
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

            {/* Bottom Corporate Footer (Matching 1.png) */}
            <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
              <img src={corporateFooter} alt="Trade Nexus Footer" className="w-full object-cover select-none" />
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
