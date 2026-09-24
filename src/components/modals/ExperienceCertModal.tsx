import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Printer, Download, Plus, TrendingUp, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { ExperienceCertificateData } from '../../types';

const EMPTY_FORM: Omit<ExperienceCertificateData, 'id'> = {
  refNumber: '',
  issueDate: new Date().toLocaleDateString('en-IN'),
  employeeName: '',
  fatherName: '',
  designation: '',
  companyName: 'Trade Nexus',
  startDate: '',
  endDate: '',
  responsibilities: '',
  signatoryName: 'T. Vidhya Sagar',
  signatoryRole: 'Chief Executive Officer',
};

export const ExperienceCertModal: React.FC = () => {
  const {
    isExperienceCertModalOpen,
    setIsExperienceCertModalOpen,
    selectedExperienceCert,
    setSelectedExperienceCert,
    experienceCertificates,
    generateExperienceCert,
    triggerToast,
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<ExperienceCertificateData, 'id'>>(EMPTY_FORM);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExperienceCertModalOpen && scrollRef.current) scrollRef.current.scrollTop = 0;
    if (isExperienceCertModalOpen && !selectedExperienceCert && experienceCertificates.length > 0) {
      setSelectedExperienceCert(experienceCertificates[0]);
    }
  }, [isExperienceCertModalOpen]);

  if (!isExperienceCertModalOpen) return null;

  const cert = selectedExperienceCert;

  const handlePrint = () => {
    triggerToast('Opening print dialog...');
    setTimeout(() => window.print(), 100);
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeName.trim() || !form.designation.trim()) return;
    generateExperienceCert(form);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  if (showForm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[96vh]">
          <div className="bg-[#06152B] px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
            <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00C9A7]" /> Generate Experience Certificate
            </span>
            <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleGenerateSubmit} className="overflow-y-auto flex-1 p-5 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ref Number</label>
                <input value={form.refNumber} onChange={e => setForm(p => ({ ...p, refNumber: e.target.value }))} placeholder="TNX/EXP/2026/001" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Issue Date</label>
                <input value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Employee Name *</label>
              <input required value={form.employeeName} onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} placeholder="Full Name" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Father's Name (optional)</label>
              <input value={form.fatherName} onChange={e => setForm(p => ({ ...p, fatherName: e.target.value }))} placeholder="S/o ..." className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Designation *</label>
              <input required value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} placeholder="Senior Trading Strategist" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Start Date</label>
                <input value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} placeholder="1st June 2023" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">End Date</label>
                <input value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} placeholder="20th September 2026" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Key Responsibilities</label>
              <textarea rows={3} value={form.responsibilities} onChange={e => setForm(p => ({ ...p, responsibilities: e.target.value }))} placeholder="Describe main duties..." className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Signatory Name</label>
                <input value={form.signatoryName} onChange={e => setForm(p => ({ ...p, signatoryName: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Signatory Role</label>
                <input value={form.signatoryRole} onChange={e => setForm(p => ({ ...p, signatoryRole: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 text-xs">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black shadow-md hover:brightness-105 text-xs">Generate Certificate</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh]">

        {/* Top Control Bar */}
        <div className="bg-[#06152B] px-4 sm:px-6 py-3 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7] animate-pulse" />
            <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-200">Experience Certificate</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-xl bg-[#00C9A7]/20 hover:bg-[#00C9A7]/30 text-[#00C9A7] text-xs font-bold flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button onClick={handlePrint} className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-[#00C9A7]" />
              <span className="hidden xs:inline">Print / PDF</span>
            </button>
            <button onClick={() => { setIsExperienceCertModalOpen(false); setSelectedExperienceCert(null); }} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List Selector */}
        {experienceCertificates.length > 1 && (
          <div className="print:hidden flex-shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-2 overflow-x-auto">
            <div className="flex gap-2 text-xs">
              {experienceCertificates.map(c => (
                <button key={c.id} onClick={() => setSelectedExperienceCert(c)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${cert?.id === c.id ? 'bg-[#0A2540] text-[#00C9A7]' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-400'}`}>
                  {c.employeeName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document Container */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 p-2 sm:p-5 bg-slate-100/70 flex justify-center">
          {!cert ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-slate-400 text-sm font-medium">No certificate to display.</p>
              <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-[#00C9A7] text-[#0A2540] font-black text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Generate First Certificate
              </button>
            </div>
          ) : (
            <div id="exp-cert-sheet" className="w-full bg-white text-slate-800 shadow-md rounded-xl sm:rounded-2xl overflow-hidden relative border border-slate-200"
              style={{ minHeight: '780px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>

              {/* Header */}
              <div className="relative text-white px-5 sm:px-7 pt-5 pb-4 overflow-hidden" style={{ backgroundColor: '#06152B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <div className="absolute -bottom-1 left-0 right-0 h-2.5" style={{ backgroundColor: '#00A88B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                <div className="absolute bottom-1 left-0 w-3/5 h-1" style={{ backgroundColor: '#38E1B7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00C9A7] to-[#0A2540] p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
                      <div className="w-full h-full rounded-full flex items-center justify-center text-[#00C9A7]" style={{ backgroundColor: '#06152B' }}>
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                      </div>
                    </div>
                    <div>
                      <h1 className="font-display font-black text-sm sm:text-xl text-white tracking-wider leading-none">TRADE NEXUS</h1>
                      <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                        <span className="h-px w-3 sm:w-4 bg-[#00C9A7]" />
                        <span className="text-[7px] sm:text-[9px] font-extrabold tracking-[0.2em] text-[#00C9A7]">TRADE SMART</span>
                        <span className="h-px w-3 sm:w-4 bg-[#00C9A7]" />
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <h2 className="font-display font-black text-xs sm:text-lg text-white tracking-wider uppercase">EXPERIENCE CERTIFICATE</h2>
                    <div className="h-0.5 w-full bg-[#00C9A7] mt-0.5" />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-7 space-y-4 flex-1 relative">
                <div className="absolute right-4 bottom-12 opacity-5 pointer-events-none select-none">
                  <div className="w-48 h-48 rounded-full border-8 border-[#0A2540] flex items-center justify-center">
                    <TrendingUp className="w-32 h-32 text-[#0A2540] stroke-[2]" />
                  </div>
                </div>

                {/* Company info & Date */}
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 text-[11px] sm:text-xs">
                  <div className="space-y-1 text-slate-700">
                    <p className="font-display font-extrabold text-xs sm:text-sm text-[#0A2540]">Trade Nexus</p>
                    <p className="flex items-center gap-1.5 text-slate-600"><MapPin className="w-2.5 h-2.5 text-[#00A88B]" /> 123 Business Avenue, Financial District, 500001</p>
                    <p className="flex items-center gap-1.5 text-slate-600"><Phone className="w-2.5 h-2.5 text-[#00A88B]" /> +91 98765 43210</p>
                    <p className="flex items-center gap-1.5 text-slate-600"><Mail className="w-2.5 h-2.5 text-[#00A88B]" /> info@tradenexus.com</p>
                  </div>
                  <div className="text-right text-slate-600 font-semibold text-[11px] sm:text-xs space-y-1 flex-shrink-0">
                    {cert.refNumber && <p className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px]">{cert.refNumber}</p>}
                    <p>{cert.issueDate}</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center">
                  <h3 className="font-display font-black text-sm sm:text-base text-[#0A2540] underline underline-offset-4 decoration-[#00C9A7]">TO WHOM IT MAY CONCERN</h3>
                </div>

                {/* Certificate text */}
                <div className="text-[11px] sm:text-xs text-slate-700 leading-relaxed space-y-3">
                  <p>
                    This is to certify that <strong className="text-[#0A2540]">{cert.employeeName}</strong>
                    {cert.fatherName && <>, S/o <strong className="text-[#0A2540]">{cert.fatherName}</strong>,</>}
                    {' '}was employed with <strong className="text-[#0A2540]">Trade Nexus</strong> as a{' '}
                    <strong className="text-[#00A88B]">{cert.designation}</strong> from{' '}
                    <strong className="text-[#0A2540]">{cert.startDate}</strong> to{' '}
                    <strong className="text-[#0A2540]">{cert.endDate}</strong>.
                  </p>
                  {cert.responsibilities && (
                    <p>During their tenure, {cert.employeeName.split(' ')[0]} was primarily responsible for {cert.responsibilities}.</p>
                  )}
                  <p>During their employment, they demonstrated exemplary professionalism, commitment to excellence, and a strong work ethic. Their contributions significantly enhanced our operational efficiency and business outcomes.</p>
                  <p>We wish them the very best in all their future endeavors and wholeheartedly recommend them for any position that aligns with their experience and capabilities.</p>
                </div>

                {/* Signature */}
                <div className="pt-4 space-y-1">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-600">Yours Sincerely,</p>
                  <div className="py-1">
                    <span className="text-3xl sm:text-4xl text-[#0A2540] inline-block font-semibold tracking-wide transform -rotate-3 select-none leading-tight"
                      style={{ fontFamily: "'Caveat', 'Dancing Script', cursive", WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      {cert.signatoryName}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-display font-black text-xs sm:text-sm" style={{ color: '#00A88B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{cert.signatoryName}</p>
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-700">{cert.signatoryRole}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Trade Nexus</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-white px-4 sm:px-6 py-2.5 border-t-2 border-[#00A88B] flex items-center justify-between text-[9px] sm:text-[11px] gap-2 font-medium flex-shrink-0"
                style={{ backgroundColor: '#06152B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span className="flex items-center gap-1 text-slate-200"><Phone className="w-3 h-3 text-[#00C9A7]" /> +91 98765 43210</span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1 text-slate-200"><Mail className="w-3 h-3 text-[#00C9A7]" /> info@tradenexus.com</span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1 text-slate-200 truncate"><Globe className="w-3 h-3 text-[#00C9A7]" /> www.tradenexus.com</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden flex-shrink-0">
          <button type="button" onClick={() => { setIsExperienceCertModalOpen(false); setSelectedExperienceCert(null); }}
            className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs">Close</button>
          <button type="button" onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-sm hover:brightness-105 flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};
