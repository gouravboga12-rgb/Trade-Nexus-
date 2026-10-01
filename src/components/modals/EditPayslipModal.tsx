import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  DollarSign, 
  Save, 
  FileEdit, 
  User, 
  Building2, 
  TrendingUp,
  History,
  CreditCard,
  Mail,
  Calendar,
  Briefcase
} from 'lucide-react';
import { PayslipItem } from '../../types';

interface EditPayslipModalProps {
  payslip: PayslipItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditPayslipModal: React.FC<EditPayslipModalProps> = ({ payslip, isOpen, onClose }) => {
  const { updatePayslip, sendPayslipEmailToEmployee, currentUser, profile, triggerToast } = useApp();

  // Employee Identity & Contact
  const [employeeName, setEmployeeName] = useState<string>('');
  const [empCode, setEmpCode] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [roleTitle, setRoleTitle] = useState<string>('');
  const [department, setDepartment] = useState<string>('');

  // Pay Period & Status
  const [month, setMonth] = useState<string>('August');
  const [year, setYear] = useState<number>(2025);
  const [status, setStatus] = useState<'PAID' | 'PROCESSED' | 'PENDING' | 'REVISED'>('PAID');

  // Banking Details
  const [bankName, setBankName] = useState<string>('HDFC Bank');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('50200084920194');
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');

  // Earnings
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [hra, setHra] = useState<number>(0);
  const [specialAllowance, setSpecialAllowance] = useState<number>(0);
  const [incentives, setIncentives] = useState<number>(0);

  // Deductions
  const [pfDeduction, setPfDeduction] = useState<number>(0);
  const [taxDeduction, setTaxDeduction] = useState<number>(0);

  // Notes & Audit
  const [changeRemarks, setChangeRemarks] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAndEmailing, setIsSavingAndEmailing] = useState(false);

  useEffect(() => {
    if (payslip) {
      setEmployeeName(payslip.employeeName || '');
      setEmpCode(payslip.empCode || payslip.employeeCode || '');
      setEmail(payslip.email || '');
      setRoleTitle(payslip.roleTitle || '');
      setDepartment(payslip.department || 'Client Acquisition');
      setMonth(payslip.month || 'August');
      setYear(Number(payslip.year) || new Date().getFullYear());
      setStatus(payslip.status || 'PAID');
      setBankName(payslip.bankName || 'HDFC Bank');
      setBankAccountNumber(payslip.bankAccountNumber || '50200084920194');
      setPaymentMode(payslip.paymentMode || 'Bank Transfer');
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
  const hrModifier = currentUser?.name || profile.name || 'HR Manager';

  const preparePayload = () => ({
    employeeName: employeeName.trim(),
    empCode: empCode.trim(),
    email: email.trim(),
    roleTitle: roleTitle.trim(),
    department: department.trim(),
    month,
    year: Number(year) || new Date().getFullYear(),
    status,
    bankName: bankName.trim(),
    bankAccountNumber: bankAccountNumber.trim(),
    paymentMode: paymentMode.trim(),
    basicSalary: Number(basicSalary) || 0,
    hra: Number(hra) || 0,
    specialAllowance: Number(specialAllowance) || 0,
    incentives: Number(incentives) || 0,
    pfDeduction: Number(pfDeduction) || 0,
    taxDeduction: Number(taxDeduction) || 0,
    netPay: computedNetPay,
    changeRemarks: changeRemarks.trim() || 'Payroll customized by HR',
    customNotes: customNotes.trim(),
    modifiedBy: hrModifier,
    modifiedAt: new Date().toISOString()
  });

  const handleSaveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updatePayslip(payslip.id, preparePayload());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndEmail = async () => {
    if (!email.trim()) {
      triggerToast('⚠️ Please enter employee email address before dispatching');
      return;
    }
    setIsSavingAndEmailing(true);
    try {
      const payload = preparePayload();
      await updatePayslip(payslip.id, payload);
      triggerToast(`Dispatching official Payslip PDF to ${email.trim()}...`);
      const ok = await sendPayslipEmailToEmployee(payslip.id, email.trim());
      if (ok) {
        triggerToast(`✓ Payslip updated and dispatched to ${email.trim()}!`);
      } else {
        triggerToast(`⚠️ Payroll updated, but email dispatch failed`);
      }
      onClose();
    } catch (err: any) {
      triggerToast(`⚠️ Error: ${err.message || 'Operation failed'}`);
    } finally {
      setIsSavingAndEmailing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="bg-[#06152B] px-5 py-4 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-white">
                Edit &amp; Customize All Payslip Details
              </h3>
              <p className="text-[11px] text-slate-400">
                Full HR Payroll Management • Period: <span className="text-[#00C9A7] font-bold">{month} {year}</span>
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
        <form onSubmit={handleSaveOnly} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-slate-800">
          
          {/* SECTION 1: Employee Identity & Contact */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <h4 className="font-display font-black text-xs uppercase tracking-wider text-[#0A2540] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <User className="w-3.5 h-3.5 text-[#00A88B]" />
              <span>Employee Information &amp; Dispatch Email</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee Code / ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs font-bold text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee Email (for PDF dispatch) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@tradenexus.com"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
                    required
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-[#0A2540] focus:outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-[#0A2540]"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs font-bold text-[#0A2540]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Banking & Disbursement Details */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <h4 className="font-display font-black text-xs uppercase tracking-wider text-[#0A2540] flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#00A88B]" />
              <span>Banking &amp; Settlement Info (Printed on Slip)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-[#0A2540]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g. 50200084920194"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs font-bold text-[#0A2540]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-[#0A2540]"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="IMPS">Direct IMPS</option>
                  <option value="Company Cheque">Company Cheque</option>
                  <option value="UPI Corporate">UPI Corporate</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Earnings Components */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="font-display font-black text-xs uppercase tracking-wider text-[#0A2540] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#00A88B]" />
                <span>Earnings &amp; Additions (₹)</span>
              </h4>
              <span className="text-[11px] font-mono font-bold text-emerald-600">
                Total Earnings: ₹{totalEarnings.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Basic Salary (₹) <span className="text-rose-500">*</span>
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

          {/* SECTION 4: Deductions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="font-display font-black text-xs uppercase tracking-wider text-[#0A2540] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                <span>Statutory Deductions (₹)</span>
              </h4>
              <span className="text-[11px] font-mono font-bold text-rose-600">
                Total Deductions: ₹{totalDeductions.toLocaleString('en-IN')}
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

          {/* SECTION 5: Change Remarks & Audit Trail */}
          <div className="space-y-3 pt-1 border-t border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Reason for Salary Customization / Remarks (Optional)
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">Audit trail</span>
              </div>
              <textarea
                rows={2}
                value={changeRemarks}
                onChange={(e) => setChangeRemarks(e.target.value)}
                placeholder="Mention reasons for revision (e.g. Incentive bonus update, revised tax deduction, etc.)..."
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#00C9A7]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Internal HR Private Notes (Optional)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Approved by HR Director"
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
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSavingAndEmailing || isSaving}
                onClick={handleSaveAndEmail}
                className="px-4 py-2.5 rounded-xl border border-[#00A88B]/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isSavingAndEmailing ? 'Dispatching...' : 'Save & Email Employee'}</span>
              </button>

              <button
                type="submit"
                disabled={isSaving || isSavingAndEmailing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Payroll Changes'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
