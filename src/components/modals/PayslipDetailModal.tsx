import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Printer, 
  Download, 
  Calendar, 
  User, 
  BadgeCheck, 
  Building2, 
  Target, 
  Briefcase, 
  TrendingUp,
  Mail,
  Edit3,
  DollarSign,
  CreditCard,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { PayslipItem } from '../../types';
import { api } from '../../services/api';
import watermarkEmblem from '../../assets/watermark-emblem.png';
import headerPayslip from '../../assets/header-payslip.png';
import corporateFooter from '../../assets/corporate-footer.png';

interface PayslipDetailModalProps {
  payslip: PayslipItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({ payslip, isOpen, onClose }) => {
  const { profile, teamMembers, triggerToast, sendPayslipEmailToEmployee, updatePayslip, currentRole } = useApp();
  const [formData, setFormData] = useState<PayslipItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const canEdit = currentRole === 'admin' || currentRole === 'hr';

  useEffect(() => {
    if (payslip) {
      setFormData({
        ...payslip,
        employeeName: payslip.employeeName || profile.name || 'Avery Davis',
        empCode: payslip.empCode || payslip.employeeCode || profile.empCode || 'IC0123',
        roleTitle: payslip.roleTitle || profile.roleTitle || 'Digital Marketing Specialist',
        department: payslip.department || profile.department || 'Marketing',
        employeeType: payslip.employeeType || 'Full - Time',
        payDate: payslip.payDate || `31 ${payslip.month} ${payslip.year}`,
        basicSalary: Number(payslip.basicSalary) || 30000,
        housingAllowance: payslip.housingAllowance !== undefined ? Number(payslip.housingAllowance) : (Number(payslip.hra) || 5000),
        transportation: payslip.transportation !== undefined ? Number(payslip.transportation) : (Number(payslip.specialAllowance) || 2000),
        performanceBonus: payslip.performanceBonus !== undefined ? Number(payslip.performanceBonus) : (Number(payslip.incentives) || 3000),
        taxDeduction: Number(payslip.taxDeduction) || 3000,
        healthInsurance: payslip.healthInsurance !== undefined ? Number(payslip.healthInsurance) : (Number(payslip.pfDeduction) || 500),
        pensionContribution: payslip.pensionContribution !== undefined ? Number(payslip.pensionContribution) : 200,
        bankAccountNumber: payslip.bankAccountNumber || '123 4567 890',
        paymentMode: payslip.paymentMode || 'Bank Transfer',
        authorizedName: payslip.authorizedName || 'Muhammad Patel',
        authorizedRole: payslip.authorizedRole || 'Finance Manager – Trade Nexus',
      });
    }
  }, [payslip, profile]);

  if (!isOpen || !payslip || !formData) return null;

  const empName = formData.employeeName || 'Avery Davis';
  const empCode = formData.empCode || formData.employeeCode || 'TNX-042';
  const empRole = formData.roleTitle || 'Digital Marketing Specialist';
  const empDept = formData.department || 'Marketing';
  const empType = formData.employeeType || 'Full - Time';
  const payDate = formData.payDate || `31 ${formData.month} ${formData.year}`;

  const basic = Number(formData.basicSalary) || 0;
  const housing = Number(formData.housingAllowance ?? formData.hra) || 0;
  const transportation = Number(formData.transportation ?? formData.specialAllowance) || 0;
  const bonus = Number(formData.performanceBonus ?? formData.incentives) || 0;
  const totalEarnings = basic + housing + transportation + bonus;

  const tax = Number(formData.taxDeduction) || 0;
  const insurance = Number(formData.healthInsurance ?? formData.pfDeduction) || 0;
  const pension = Number(formData.pensionContribution) || 0;
  const totalDeductions = tax + insurance + pension;

  const netPay = totalEarnings - totalDeductions;

  const handleSaveChanges = async () => {
    if (!formData || !payslip) return;
    setIsSaving(true);
    try {
      const payload: Partial<PayslipItem> = {
        ...formData,
        netPay,
        basicSalary: basic,
        housingAllowance: housing,
        hra: housing,
        transportation: transportation,
        specialAllowance: transportation,
        performanceBonus: bonus,
        incentives: bonus,
        taxDeduction: tax,
        healthInsurance: insurance,
        pfDeduction: insurance,
        pensionContribution: pension,
        changeRemarks: formData.changeRemarks || 'Updated directly in Payslip Preview',
        modifiedAt: new Date().toISOString()
      };
      await updatePayslip(payslip.id, payload);
      setFormData(prev => prev ? { ...prev, ...payload } : null);
      setIsEditing(false);
      triggerToast(`✓ Official Payslip for ${empName} updated & saved to database!`);
    } catch (err: any) {
      triggerToast(`⚠️ Failed to persist: ${err.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    triggerToast(`✓ Printing official payroll slip for ${empName} (${formData.month} ${formData.year})`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = async () => {
    try {
      triggerToast(`⏳ Generating & downloading official Payslip PDF for ${empName}...`);
      await api.downloadPayslip({
        ...payslip,
        ...formData,
        netPay,
        basicSalary: basic,
        housingAllowance: housing,
        transportation: transportation,
        performanceBonus: bonus,
        taxDeduction: tax,
        healthInsurance: insurance,
        pensionContribution: pension
      });
      triggerToast(`✓ Official Payslip PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleSendEmail = async () => {
    const emp = teamMembers.find(m => m.name === empName || m.empCode === empCode);
    const targetEmail = formData.email || emp?.email || profile?.email;
    if (!targetEmail) {
      triggerToast('⚠️ No employee email address found to dispatch payslip');
      return;
    }
    setIsSendingEmail(true);
    triggerToast(`Dispatching official Payslip PDF to ${targetEmail}...`);
    try {
      const ok = await sendPayslipEmailToEmployee(payslip.id, targetEmail);
      if (ok) {
        triggerToast(`✓ Official Payslip PDF dispatched to ${targetEmail}!`);
      } else {
        triggerToast('⚠️ Failed to dispatch payslip email');
      }
    } catch (err: any) {
      triggerToast(`⚠️ Email dispatch failed: ${err.message || 'Error'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh] printable-modal-dialog print:max-w-none print:rounded-none print:border-none print:shadow-none print:max-h-none">
        
        {/* Header Bar */}
        <div className="bg-[#06152B] px-4 sm:px-6 py-3 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7] animate-pulse" />
            <h3 className="font-display font-bold text-xs sm:text-sm text-white">
              Official Payroll Slip Document
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    handleSaveChanges();
                  } else {
                    setIsEditing(true);
                  }
                }}
                disabled={isSaving}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isEditing ? 'bg-[#00C9A7] text-[#0A2540] shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? (isSaving ? 'Saving...' : 'Save & Close') : 'Edit Fields'}</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:brightness-105 cursor-pointer"
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
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Edit Drawer for HR / Admin */}
        {canEdit && isEditing && (
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs space-y-3 print:hidden max-h-56 overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="font-display font-black text-xs text-[#0A2540] uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#00A88B]" />
                <span>100% Dynamic Payroll Fields Editor (Persists to SQLite)</span>
              </span>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-3 py-1 rounded-lg bg-[#00A88B] hover:bg-[#00C9A7] text-white font-bold text-[11px] cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save & Update'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Month</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                >
                </input>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Pay Date</label>
                <input
                  type="text"
                  value={formData.payDate || ''}
                  onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
                  placeholder="e.g. 31 August 2025"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Employee Name</label>
                <input
                  type="text"
                  value={formData.employeeName || ''}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Employee Code / ID</label>
                <input
                  type="text"
                  value={formData.empCode || formData.employeeCode || ''}
                  onChange={(e) => setFormData({ ...formData, empCode: e.target.value, employeeCode: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Employee Type</label>
                <input
                  type="text"
                  value={formData.employeeType || 'Full - Time'}
                  onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                  placeholder="e.g. Full - Time"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Department</label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Designation</label>
                <input
                  type="text"
                  value={formData.roleTitle || ''}
                  onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Employee Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-xs"
                />
              </div>

              {/* Earnings Inputs */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Basic Salary (₹)</label>
                <input
                  type="number"
                  value={basic}
                  onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Housing Allowance (₹)</label>
                <input
                  type="number"
                  value={housing}
                  onChange={(e) => setFormData({ ...formData, housingAllowance: Number(e.target.value), hra: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Transportation (₹)</label>
                <input
                  type="number"
                  value={transportation}
                  onChange={(e) => setFormData({ ...formData, transportation: Number(e.target.value), specialAllowance: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Performance Bonus (₹)</label>
                <input
                  type="number"
                  value={bonus}
                  onChange={(e) => setFormData({ ...formData, performanceBonus: Number(e.target.value), incentives: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                />
              </div>

              {/* Deductions Inputs */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Tax (Federal + State) (₹)</label>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setFormData({ ...formData, taxDeduction: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-rose-600 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Health Insurance (₹)</label>
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setFormData({ ...formData, healthInsurance: Number(e.target.value), pfDeduction: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-rose-600 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Pension Contribution (₹)</label>
                <input
                  type="number"
                  value={pension}
                  onChange={(e) => setFormData({ ...formData, pensionContribution: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-rose-600 text-xs"
                />
              </div>

              {/* Bank & Signatory */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Bank Account</label>
                <input
                  type="text"
                  value={formData.bankAccountNumber || '123 4567 890'}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Payment Mode</label>
                <input
                  type="text"
                  value={formData.paymentMode || 'Bank Transfer'}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Authorized Role</label>
                <input
                  type="text"
                  value={formData.authorizedRole || 'Finance Manager – Trade Nexus'}
                  onChange={(e) => setFormData({ ...formData, authorizedRole: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Authorized Signatory Name</label>
                <input
                  type="text"
                  value={formData.authorizedName || 'Muhammad Patel'}
                  onChange={(e) => setFormData({ ...formData, authorizedName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Document Content (Scrollable) */}
        <div className="p-2 sm:p-6 pb-8 overflow-y-auto flex-1 bg-slate-100/80 flex justify-center printable-scroll-container print:p-0 print:bg-white">
          
          {/* Printable Payslip Sheet matching 4.png */}
          <div 
            id="payslip-sheet"
            className="w-full bg-white text-slate-800 shadow-none sm:shadow-xl rounded-none sm:rounded-2xl overflow-hidden relative border-0 sm:border sm:border-slate-200 flex flex-col justify-between print:border-none print:shadow-none"
            style={{ 
              minHeight: '780px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            
            {/* Top Corporate Header Banner (Matching 4.png) */}
            <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
              <img src={headerPayslip} alt="Trade Nexus Header" className="w-full object-cover select-none" />
            </div>

            {/* Center Background Watermark (Matching 4.png) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              <img src={watermarkEmblem} alt="Trade Nexus Watermark" className="w-72 h-72 object-contain opacity-[0.06]" />
            </div>

            <div className="p-4 sm:p-6 space-y-5 relative z-10 flex-1">
              {/* Employee & Month Metadata 2-Column Grid with Icons (Exact 4.png) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs sm:text-sm font-semibold text-slate-800">
                
                {/* Left Column */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span className="w-28 font-bold text-slate-900">Month</span>
                    <span className="text-slate-400 font-bold">:</span>
                    <span className="font-bold text-[#0A2540]">{formData.month} {formData.year}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="w-28 font-bold text-slate-900">Employee Name</span>
                    <span className="text-slate-400 font-bold">:</span>
                    <span className="font-bold text-[#0A2540]">{empName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="w-28 font-bold text-slate-900">Employee ID</span>
                    <span className="text-slate-400 font-bold">:</span>
                    <span className="font-mono font-bold text-[#0A2540]">{empCode}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="w-28 font-bold text-slate-900">Department</span>
                    <span className="text-slate-400 font-bold">:</span>
                    <span className="font-bold text-[#0A2540]">{empDept}</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <span className="w-28 font-bold text-slate-900">Designation</span>
                    <span className="text-slate-400 font-bold">:</span>
                    <span className="font-bold text-[#0A2540]">{empRole}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <span className="w-28 font-bold text-slate-900">Employee Type</span>
                    <span className="text-slate-400 font-bold">:</span>
                    <span className="font-bold text-[#0A2540]">{empType}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <span className="w-28 font-bold text-slate-900">Pay Date</span>
                    <span className="text-slate-400 font-bold">:</span>
                    <span className="font-mono font-bold text-[#0A2540]">{payDate}</span>
                  </div>
                </div>

              </div>

              {/* EARNINGS TABLE (Exact 4.png) */}
              <div className="space-y-2">
                <h3 className="font-display font-black text-sm sm:text-base text-[#0A2540] tracking-wider uppercase">
                  EARNINGS
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-300">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr 
                        className="text-white font-display font-black text-xs uppercase"
                        style={{ backgroundColor: '#06152B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      >
                        <th className="py-2.5 px-4">DESCRIPTION</th>
                        <th className="py-2.5 px-4 text-right">AMOUNT (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Basic Salary</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{basic.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Housing Allowance</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{housing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Transportation</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{transportation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Performance Bonus</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{bonus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr 
                        className="font-black text-[#0A2540]"
                        style={{ backgroundColor: '#E6FAF6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      >
                        <td className="py-2.5 px-4 uppercase tracking-wider font-bold">TOTAL EARNINGS</td>
                        <td className="py-2.5 px-4 text-right font-mono text-[#00A88B] text-sm sm:text-base">
                          ₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DEDUCTIONS TABLE (Exact 4.png) */}
              <div className="space-y-2">
                <h3 className="font-display font-black text-sm sm:text-base text-[#0A2540] tracking-wider uppercase">
                  DEDUCTIONS
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-300">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr 
                        className="text-white font-display font-black text-xs uppercase"
                        style={{ backgroundColor: '#06152B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      >
                        <th className="py-2.5 px-4">DESCRIPTION</th>
                        <th className="py-2.5 px-4 text-right">AMOUNT (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Tax (Federal + State)</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Health Insurance</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{insurance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Pension Contribution</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{pension.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr 
                        className="font-black text-[#0A2540]"
                        style={{ backgroundColor: '#E6FAF6', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                      >
                        <td className="py-2.5 px-4 uppercase tracking-wider font-bold">TOTAL DEDUCTIONS</td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-700 text-sm sm:text-base">
                          ₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks / Custom Adjustments Note if edited */}
              {formData.changeRemarks && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-slate-700">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    Salary Customization &amp; Adjustment Notes:
                  </span>
                  <p className="italic text-[11px] text-slate-600">
                    "{formData.changeRemarks}"
                  </p>
                  {formData.modifiedBy && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Customized by {formData.modifiedBy}
                    </span>
                  )}
                </div>
              )}

              {/* Bottom Summary & Authorized Signatory (Exact 4.png) */}
              <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs sm:text-sm font-semibold text-slate-800">
                
                {/* Left: Net Pay & Bank Details */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-5 font-black text-[#0A2540]">NET PAY</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-mono font-black text-[#00A88B] text-base">
                      ₹{netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-5 font-bold text-slate-800">Bank Account</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-mono font-bold text-slate-700">
                      {formData.bankAccountNumber || '123 4567 890'}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-5 font-bold text-slate-800">Payment Mode</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-bold text-slate-700">
                      {formData.paymentMode || 'Bank Transfer'}
                    </span>
                  </div>
                </div>

                {/* Right: Authorized By (Exact 4.png) */}
                <div className="text-right space-y-1">
                  <p className="text-xs text-slate-500 font-medium">Authorized by:</p>
                  <p className="text-xs font-bold text-[#0A2540]">
                    {formData.authorizedRole || 'Finance Manager – Trade Nexus'}
                  </p>
                  
                  <div className="h-8 flex items-center justify-end">
                    <p className="font-serif italic text-slate-700 text-sm tracking-wide select-none">
                      {formData.authorizedName || 'Muhammad Patel'}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-[#0A2540]">
                    {formData.authorizedName || 'Muhammad Patel'}
                  </p>
                </div>

              </div>

            </div>

            {/* Bottom Corporate Footer (Matching 4.png) */}
            <div className="w-full relative z-10 overflow-hidden flex-shrink-0">
              <img src={corporateFooter} alt="Trade Nexus Footer" className="w-full object-cover select-none" />
            </div>

          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex items-center justify-between print:hidden flex-shrink-0 relative z-20">
          <button
            type="button"
            onClick={onClose}
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
