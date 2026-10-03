import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { 
  X, 
  FileText, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Sparkles,
  ArrowRight,
  Eye
} from 'lucide-react';

const MONTH_ORDER: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12
};

export const RecentPayslipsModal: React.FC = () => {
  const { 
    isRecentPayslipsModalOpen, 
    setIsRecentPayslipsModalOpen, 
    myPayslips, 
    openPayslipModal,
    triggerToast
  } = useApp();

  // Only payroll HR has dispatched to this employee — one entry per month, newest first.
  const rollingPayslips = useMemo(() => {
    const seen = new Set<string>();
    const unique = myPayslips.filter((p) => {
      const key = `${p.month.toLowerCase()}-${p.year}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const aM = MONTH_ORDER[a.month.toLowerCase()] || 0;
      const bM = MONTH_ORDER[b.month.toLowerCase()] || 0;
      return bM - aM;
    });

    return unique;
  }, [myPayslips]);

  if (!isRecentPayslipsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="bg-[#0A2540] px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00C9A7]/20 border border-[#00C9A7]/30 flex items-center justify-center text-[#00C9A7]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-base text-white tracking-tight">
                  Salary Statements
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-[#00C9A7]/20 text-[#38E1B7] px-2 py-0.5 rounded-full border border-[#00C9A7]/30">
                  {rollingPayslips.length} Issued
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Official statements for banking, loan approvals & IT filing
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsRecentPayslipsModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Informational Policy Banner */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-teal-100 text-[#00A88B] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-600 space-y-0.5">
              <p className="font-bold text-slate-800">
                Issued by HR
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Each month's payroll appears here once HR has finalised and dispatched it. A copy is also emailed to you.
              </p>
            </div>
          </div>

          {/* Payslip Cards List */}
          <div className="space-y-3">
            {rollingPayslips.map((pay, index) => {
              const isLatest = index === 0;
              return (
                <div
                  key={pay.id || `${pay.month}-${pay.year}`}
                  className={`rounded-2xl p-4 border transition-all ${
                    isLatest
                      ? 'bg-gradient-to-br from-white to-[#F2FCF9] border-[#00C9A7]/40 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${isLatest ? 'text-[#00A88B]' : 'text-slate-400'}`} />
                      <h4 className="font-display font-black text-sm text-[#0A2540]">
                        {pay.month} {pay.year}
                      </h4>
                      {isLatest && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-[#00C9A7]/15 text-[#00897B] px-2 py-0.5 rounded-full border border-[#00C9A7]/30">
                          Latest
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Paid
                    </span>
                  </div>

                  <div className="flex items-end justify-between bg-slate-50/80 p-3 rounded-xl border border-slate-100 mb-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                        Net Take-Home
                      </span>
                      <span className="font-mono-nums font-black text-xl text-[#0A2540]">
                        ₹{Number(pay.netPay || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Issued: {pay.dispatchedAt ? new Date(pay.dispatchedAt).toLocaleDateString('en-IN') : pay.generatedDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecentPayslipsModalOpen(false);
                        openPayslipModal(pay);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Statement</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          triggerToast(`⏳ Downloading salary payslip for ${pay.month} ${pay.year}...`);
                          await api.downloadPayslip(pay);
                          triggerToast(`✓ Payslip PDF downloaded successfully!`);
                        } catch (err: any) {
                          triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {rollingPayslips.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No payroll has been issued yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Your payroll will appear here once HR dispatches it.</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted & Verified by Trade Nexus HRMS</span>
          </div>
          <button
            onClick={() => setIsRecentPayslipsModalOpen(false)}
            className="font-bold text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
