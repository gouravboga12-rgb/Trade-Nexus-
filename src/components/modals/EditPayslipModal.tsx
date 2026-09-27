import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  DollarSign, 
  Calculator, 
  Save, 
  FileEdit, 
  AlertCircle, 
  User, 
  Building2, 
  CheckCircle2,
  TrendingUp,
  History
} from 'lucide-react';
import { PayslipItem } from '../../types';

interface EditPayslipModalProps {
  payslip: PayslipItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditPayslipModal: React.FC<EditPayslipModalProps> = ({ payslip, isOpen, onClose }) => {
  const { updatePayslip, currentUser, profile, triggerToast } = useApp();

  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [hra, setHra] = useState<number>(0);
  const [specialAllowance, setSpecialAllowance] = useState<number>(0);
  const [incentives, setIncentives] = useState<number>(0);
  const [pfDeduction, setPfDeduction] = useState<number>(0);
  const [taxDeduction, setTaxDeduction] = useState<number>(0);
  const [changeRemarks, setChangeRemarks] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (payslip) {
      setBasicSalary(Number(payslip.basicSalary) || 0);
      setHra(Number(payslip.hra) || 0);
      setSpecialAllowance(Number(payslip.specialAllowance) || 0);
      setIncentives(Number(payslip.incentives) || 0);
      setPfDeduction(Number(payslip.pfDeduction) || 0);
      setTaxDeduction(Number(payslip.taxDeduction) || 0);
      setChangeRemarks(payslip.changeRemarks || '');
      setCustomNotes(payslip.customNotes || '');
    }
  }, [payslip]);

  if (!isOpen || !payslip) return null;

  const totalEarnings = (Number(basicSalary) || 0) + (Number(hra) || 0) + (Number(specialAllowance) || 0) + (Number(incentives) || 0);
  const totalDeductions = (Number(pfDeduction) || 0) + (Number(taxDeduction) || 0);
  const computedNetPay = totalEarnings - totalDeductions;

  const empName = payslip.employeeName || 'Staff Member';
  const empCode = payslip.empCode || payslip.employeeCode || 'N/A';
  const hrModifier = currentUser?.name || profile.name || 'HR Manager';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!changeRemarks.trim()) {
      triggerToast('⚠️ Please specify what changes were made in the Salary Change Remarks.');
      return;
    }

    setIsSaving(true);
    try {
      await updatePayslip(payslip.id, {
        basicSalary: Number(basicSalary) || 0,
        hra: Number(hra) || 0,
        specialAllowance: Number(specialAllowance) || 0,
        incentives: Number(incentives) || 0,
        pfDeduction: Number(pfDeduction) || 0,
        taxDeduction: Number(taxDeduction) || 0,
        netPay: computedNetPay,
        changeRemarks: changeRemarks.trim(),
        customNotes: customNotes.trim(),
        status: 'REVISED',
        modifiedBy: hrModifier,
        modifiedAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="bg-[#06152B] px-5 py-4 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-white">
                Customize Payroll &amp; Salary Structure
              </h3>
              <p className="text-[11px] text-slate-400">
                {empName} ({empCode}) • Period: <span className="text-[#00C9A7] font-bold">{payslip.month} {payslip.year}</span>
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-slate-800">
          
          {/* Employee Identity Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00A88B] to-[#00C9A7] text-[#0A2540] flex items-center justify-center font-bold text-sm shadow-xs">
                {empName.charAt(0)}
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#0A2540]">{empName}</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {payslip.roleTitle || 'Sales Executive'} • <span className="font-mono text-slate-600">{empCode}</span>
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
              {payslip.status || 'PAID'}
            </span>
          </div>

          {/* SECTION 1: Earnings Components */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="font-display font-black text-xs uppercase tracking-wider text-[#0A2540] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#00A88B]" />
                <span>Earnings &amp; Additions (₹)</span>
              </h4>
              <span className="text-[11px] font-mono font-bold text-emerald-600">
                Total: ₹{totalEarnings.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Basic Salary (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-[#0A2540] focus:bg-white focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  House Rent Allowance (HRA) (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={hra}
                  onChange={(e) => setHra(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-[#0A2540] focus:bg-white focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special / Transportation Allowance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={specialAllowance}
                  onChange={(e) => setSpecialAllowance(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-[#0A2540] focus:bg-white focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Incentives / Commission / Bonus (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={incentives}
                  onChange={(e) => setIncentives(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-emerald-300 font-mono text-xs font-bold text-emerald-700 focus:bg-white focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Deductions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="font-display font-black text-xs uppercase tracking-wider text-[#0A2540] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                <span>Statutory Deductions (₹)</span>
              </h4>
              <span className="text-[11px] font-mono font-bold text-rose-600">
                Total: ₹{totalDeductions.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Provident Fund (PF) (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={pfDeduction}
                  onChange={(e) => setPfDeduction(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-rose-600 focus:bg-white focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tax / TDS / Professional Tax (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={taxDeduction}
                  onChange={(e) => setTaxDeduction(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-rose-600 focus:bg-white focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Net Pay Calculation Highlight */}
          <div className="bg-gradient-to-r from-[#06152B] to-[#0A2540] text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider block">
                Calculated Net Take-Home Pay
              </span>
              <span className="text-xs text-slate-400">
                Earnings (₹{totalEarnings.toLocaleString()}) − Deductions (₹{totalDeductions.toLocaleString()})
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-2xl text-[#00C9A7]">
                ₹{computedNetPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* SECTION 3: Change Remarks & Audit Trail (Required) */}
          <div className="space-y-3 pt-1 border-t border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-[#0A2540]">
                  Reason for Salary Customization / Remarks <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">Audit trail logged</span>
              </div>
              <textarea
                rows={3}
                value={changeRemarks}
                onChange={(e) => setChangeRemarks(e.target.value)}
                placeholder="Mention clearly what was customized in the salary fields (e.g. Added ₹3,000 overtime incentive and adjusted TDS deduction as per tax slab revision)..."
                className="w-full p-3 rounded-xl bg-amber-50/50 border border-amber-300 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#00C9A7]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Internal HR Private Notes (Optional)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Approved by Branch Director on 15th"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>

            {payslip.modifiedBy && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <History className="w-3.5 h-3.5" />
                <span>Last modified by {payslip.modifiedBy} {payslip.modifiedAt ? `on ${new Date(payslip.modifiedAt).toLocaleDateString()}` : ''}</span>
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save & Publish Customized Payroll'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
