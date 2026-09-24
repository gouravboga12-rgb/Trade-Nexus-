import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Printer, Download, Plus, TrendingUp, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { RelievingLetterData } from '../../types';

const EMPTY_FORM: Omit<RelievingLetterData, 'id'> = {
  issueDate: new Date().toLocaleDateString('en-IN'),
  employeeName: '',
  designation: '',
  department: '',
  employeeType: 'Full - Time',
  empCode: '',
  address: '',
  resignationDate: '',
  lastWorkingDate: '',
  joiningDate: '',
  signatoryName: 'T. Vidhya Sagar',
  signatoryRole: 'Chief Executive Officer',
};

export const RelievingLetterModal: React.FC = () => {
  const {
    isRelievingLetterModalOpen,
    setIsRelievingLetterModalOpen,
    selectedRelievingLetter,
    setSelectedRelievingLetter,
    relievingLetters,
    generateRelievingLetter,
    triggerToast,
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<RelievingLetterData, 'id'>>(EMPTY_FORM);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRelievingLetterModalOpen && scrollRef.current) scrollRef.current.scrollTop = 0;
    if (isRelievingLetterModalOpen && !selectedRelievingLetter && relievingLetters.length > 0) {
      setSelectedRelievingLetter(relievingLetters[0]);
    }
  }, [isRelievingLetterModalOpen]);

  if (!isRelievingLetterModalOpen) return null;

  const letter = selectedRelievingLetter;

  const handlePrint = () => {
    triggerToast('Opening print dialog...');
    setTimeout(() => window.print(), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeName.trim()) return;
    generateRelievingLetter(form);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  if (showForm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[96vh]">
          <div className="bg-[#06152B] px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
            <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00C9A7]" /> Generate Relieving Letter
            </span>
            <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Issue Date</label>
                <input value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Emp Code</label>
                <input value={form.empCode} onChange={e => setForm(p => ({ ...p, empCode: e.target.value }))} placeholder="TNX-204" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Employee Name *</label>
              <input required value={form.employeeName} onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} placeholder="Full Name" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Designation</label>
                <input value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} placeholder="BDE" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Department</label>
                <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Client Acquisition" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Address</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full Address" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Joining Date</label>
                <input value={form.joiningDate} onChange={e => setForm(p => ({ ...p, joiningDate: e.target.value }))} placeholder="1st June 2024" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Resignation Date</label>
                <input value={form.resignationDate} onChange={e => setForm(p => ({ ...p, resignationDate: e.target.value }))} placeholder="15th August 2026" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Last Working Date</label>
              <input value={form.lastWorkingDate} onChange={e => setForm(p => ({ ...p, lastWorkingDate: e.target.value }))} placeholder="20th September 2026" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
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
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black shadow-md hover:brightness-105 text-xs">Generate Letter</button>
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
            <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-200">Relieving Letter</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-xl bg-[#00C9A7]/20 hover:bg-[#00C9A7]/30 text-[#00C9A7] text-xs font-bold flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button onClick={handlePrint} className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-[#00C9A7]" />
              <span className="hidden xs:inline">Print / PDF</span>
            </button>
            <button onClick={() => { setIsRelievingLetterModalOpen(false); setSelectedRelievingLetter(null); }} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List Selector */}
        {relievingLetters.length > 1 && (
          <div className="print:hidden flex-shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-2 overflow-x-auto">
            <div className="flex gap-2 text-xs">
              {relievingLetters.map(l => (
                <button key={l.id} onClick={() => setSelectedRelievingLetter(l)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${letter?.id === l.id ? 'bg-[#0A2540] text-[#00C9A7]' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-400'}`}>
                  {l.employeeName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document Container */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 p-2 sm:p-5 bg-slate-100/70 flex justify-center">
          {!letter ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-slate-400 text-sm font-medium">No relieving letter to display.</p>
              <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl bg-[#00C9A7] text-[#0A2540] font-black text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Generate First Letter
              </button>
            </div>
          ) : (
            <div id="relieving-letter-sheet" className="w-full bg-white text-slate-800 shadow-md rounded-xl sm:rounded-2xl overflow-hidden relative border border-slate-200"
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
                    <h2 className="font-display font-black text-xs sm:text-lg text-white tracking-wider uppercase">RELIEVING LETTER</h2>
                    <div className="h-0.5 w-full bg-[#00C9A7] mt-0.5" />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-7 space-y-4 relative">
                {/* Watermark */}
                <div className="absolute right-4 bottom-12 opacity-5 pointer-events-none select-none">
                  <div className="w-48 h-48 rounded-full border-8 border-[#0A2540] flex items-center justify-center">
                    <TrendingUp className="w-32 h-32 text-[#0A2540] stroke-[2]" />
                  </div>
                </div>

                {/* Company info + Date */}
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3 text-[11px] sm:text-xs">
                  <div className="space-y-1 text-slate-700">
                    <p className="font-display font-extrabold text-xs sm:text-sm text-[#0A2540]">Trade Nexus</p>
                    <p className="flex items-center gap-1.5 text-slate-600"><MapPin className="w-2.5 h-2.5 text-[#00A88B]" /> 123 Business Avenue, Financial District, 500001</p>
                    <p className="flex items-center gap-1.5 text-slate-600"><Phone className="w-2.5 h-2.5 text-[#00A88B]" /> +91 98765 43210</p>
                    <p className="flex items-center gap-1.5 text-slate-600"><Mail className="w-2.5 h-2.5 text-[#00A88B]" /> info@tradenexus.com</p>
                  </div>
                  <div className="text-right text-slate-600 font-semibold text-[11px] sm:text-xs flex-shrink-0">
                    <p>{letter.issueDate}</p>
                  </div>
                </div>

                {/* Employee Details */}
                <div className="space-y-0.5 text-[11px] sm:text-xs">
                  <p className="font-semibold text-slate-500">To,</p>
                  <p className="font-display font-black text-xs sm:text-sm text-[#0A2540]">{letter.employeeName}</p>
                  {letter.empCode && <p className="text-slate-500 font-mono text-[10px]">{letter.empCode} • {letter.employeeType}</p>}
                  {letter.address && <p className="text-slate-600">{letter.address}</p>}
                </div>

                {/* Sub: line */}
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-800">
                    Sub: Acceptance of resignation and Relieving Letter
                  </p>
                </div>

                {/* Letter body */}
                <div className="text-[11px] sm:text-xs text-slate-700 leading-relaxed space-y-3">
                  <p>Dear <strong className="text-[#0A2540]">{letter.employeeName.split(' ')[0]}</strong>,</p>
                  <p>
                    With reference to your resignation letter dated <strong className="text-[#0A2540]">{letter.resignationDate}</strong>, we hereby accept your resignation from the position of{' '}
                    <strong className="text-[#00A88B]">{letter.designation}</strong> in the{' '}
                    <strong className="text-[#0A2540]">{letter.department}</strong> department with effect from{' '}
                    <strong className="text-[#0A2540]">{letter.lastWorkingDate}</strong>.
                  </p>
                  <p>
                    You joined us on <strong className="text-[#0A2540]">{letter.joiningDate}</strong> and we accept your resignation with effect from <strong className="text-[#0A2540]">{letter.lastWorkingDate}</strong>, which shall be treated as your last working day.
                  </p>
                  <p>
                    We appreciate your contributions during your tenure and wish you all the best in your future endeavors. You are hereby relieved from your responsibilities at Trade Nexus with immediate effect from the above-mentioned date.
                  </p>
                  <p>
                    This letter serves as an official confirmation of your relieving from Trade Nexus.
                  </p>
                </div>

                {/* Signature */}
                <div className="pt-4 space-y-1">
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-600">Yours Sincerely,</p>
                  <div className="py-1">
                    <span className="text-3xl sm:text-4xl text-[#0A2540] inline-block font-semibold tracking-wide transform -rotate-3 select-none leading-tight"
                      style={{ fontFamily: "'Caveat', 'Dancing Script', cursive", WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      {letter.signatoryName}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-display font-black text-xs sm:text-sm" style={{ color: '#00A88B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{letter.signatoryName}</p>
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-700">{letter.signatoryRole}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Trade Nexus</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-white px-4 sm:px-6 py-2.5 border-t-2 border-[#00A88B] flex items-center justify-between text-[9px] sm:text-[11px] gap-2 font-medium"
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
          <button type="button" onClick={() => { setIsRelievingLetterModalOpen(false); setSelectedRelievingLetter(null); }}
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
