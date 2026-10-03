import React, { useState } from 'react';
import { X, Download, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PayslipItem } from '../../types';
import { api } from '../../services/api';
import { PayslipDocument } from '../payroll/PayslipDocument';

interface PayslipDetailModalProps {
  payslip: PayslipItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Read-only view of a payroll slip. Uses the same template renderer as the HR builder and the
 * dispatched PDF. Customization happens only in the HR Payroll Builder.
 */
export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({ payslip, isOpen, onClose }) => {
  const { triggerToast, sendPayslipEmailToEmployee, currentRole } = useApp();
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  if (!isOpen || !payslip) return null;

  const isHr = currentRole === 'admin' || currentRole === 'hr';
  const isDispatched = payslip.payrollStatus === 'DISPATCHED';

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await api.downloadPayslip(payslip);
      triggerToast('✓ Payroll slip PDF downloaded');
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleResend = async () => {
    setSending(true);
    try {
      await sendPayslipEmailToEmployee(payslip.id, payslip.email);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[96vh]">
        <div className="bg-[#06152B] px-4 sm:px-6 py-3 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7]" />
            <h3 className="font-display font-bold text-xs sm:text-sm truncate">
              Payroll Slip · {payslip.month} {payslip.year}
            </h3>
            {isHr && (
              isDispatched
                ? <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Dispatched</span>
                : <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase">Draft</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2 sm:p-6 overflow-y-auto flex-1 bg-slate-100/80">
          <div className="rounded-none sm:rounded-xl overflow-hidden shadow-none sm:shadow-xl border-0 sm:border sm:border-slate-200 bg-white">
            <PayslipDocument data={payslip} />
          </div>
          {isHr && isDispatched && payslip.dispatchedAt && (
            <p className="text-[11px] text-slate-500 text-center mt-3">
              Dispatched {new Date(payslip.dispatchedAt).toLocaleString('en-IN')} by {payslip.dispatchedBy || 'HR'}
              {payslip.emailedAt ? ' · emailed' : ''}
            </p>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs cursor-pointer">
            Close
          </button>
          <div className="flex items-center gap-2">
            {isHr && isDispatched && (
              <button type="button" disabled={sending} onClick={handleResend}
                className="px-3.5 py-2 rounded-xl border border-[#00C9A7]/40 bg-[#E6FAF6] hover:bg-[#D0F7F0] font-bold text-[#00897B] text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Resend Email
              </button>
            )}
            <button type="button" disabled={downloading} onClick={handleDownload}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-sm hover:brightness-105 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
