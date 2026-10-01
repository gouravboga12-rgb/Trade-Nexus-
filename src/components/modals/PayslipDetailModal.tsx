import React, { useState } from 'react';
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
  Phone,
  Mail,
  Globe,
  Edit3
} from 'lucide-react';
import { PayslipItem } from '../../types';
import { api } from '../../services/api';
import signatureVidhyaSagar from '../../assets/signature-vidhya-sagar.png';
import watermarkEmblem from '../../assets/watermark-emblem.png';
import headerPayslip from '../../assets/header-payslip.png';
import corporateFooter from '../../assets/corporate-footer.png';

interface PayslipDetailModalProps {
  payslip: PayslipItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({ payslip, isOpen, onClose }) => {
  const { profile, teamMembers, triggerToast, sendPayslipEmailToEmployee } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  if (!isOpen || !payslip) return null;

  const empName = payslip.employeeName || profile.name || 'Avery Davis';
  const empCode = payslip.employeeCode || profile.empCode || 'IC0123';
  const empRole = (teamMembers.find(m => m.name === empName)?.role) || profile.roleTitle || 'Digital Marketing Specialist';
  const empDept = (teamMembers.find(m => m.name === empName)?.group) || profile.department || 'Marketing';
  const payDate = `31 ${payslip.month} ${payslip.year}`;

  const basic = payslip.basicSalary || 30000;
  const hra = payslip.hra || 5000;
  const transportation = payslip.specialAllowance || 2000;
  const incentives = payslip.incentives || 3000;
  const totalEarnings = basic + hra + transportation + incentives;

  const tax = payslip.taxDeduction || 3000;
  const insurance = payslip.pfDeduction || 500;
  const pension = 200;
  const totalDeductions = tax + insurance + pension;

  const netPay = totalEarnings - totalDeductions;

  const handlePrint = () => {
    triggerToast(`✓ Printing official payroll slip for ${empName} (${payslip.month} ${payslip.year})`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = async () => {
    try {
      triggerToast(`⏳ Generating & downloading official Payslip PDF for ${empName}...`);
      await api.downloadPayslip(payslip);
      triggerToast(`✓ Official Payslip PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleSendEmail = async () => {
    const emp = teamMembers.find(m => m.name === empName || m.empCode === empCode);
    const targetEmail = emp?.email || (payslip as any).email || profile?.email;
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
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#00C9A7]" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Content (Scrollable) */}
        <div className="p-0 sm:p-6 overflow-y-auto flex-1 bg-slate-100/80 flex justify-center printable-scroll-container print:p-0 print:bg-white">
          
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
                    <span className="font-bold text-[#0A2540]">{payslip.month} {payslip.year}</span>
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
                    <span className="font-bold text-[#0A2540]">Full - Time</span>
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
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Transportation</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{transportation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-slate-800">Performance Bonus</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">₹{incentives.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
              {payslip.changeRemarks && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-slate-700">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    Salary Customization &amp; Adjustment Notes:
                  </span>
                  <p className="italic text-[11px] text-slate-600">
                    "{payslip.changeRemarks}"
                  </p>
                  {payslip.modifiedBy && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Customized by {payslip.modifiedBy}
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
                    <span className="col-span-6 font-mono font-bold text-slate-700">123 4567 890</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <span className="col-span-5 font-bold text-slate-800">Payment Mode</span>
                    <span className="col-span-1 text-slate-400">:</span>
                    <span className="col-span-6 font-bold text-slate-700">Bank Transfer</span>
                  </div>
                </div>

                {/* Right: Authorized By (Matching 4.png) */}
                <div className="text-right space-y-0.5">
                  <p className="text-xs text-slate-500 font-medium">Authorized by:</p>
                  <p className="text-xs font-bold text-[#0A2540]">Finance Manager – Trade Nexus</p>
                  
                  <div className="py-1 flex justify-end">
                    <img
                      src={signatureVidhyaSagar}
                      alt="T. Vidhya Sagar"
                      className="h-8 w-auto object-contain select-none"
                    />
                  </div>
                  <p className="text-xs font-bold text-[#0A2540]">T. Vidhya Sagar</p>
                  <p className="text-[10px] text-slate-500 font-semibold">Authorized Signatory</p>
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
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden flex-shrink-0">
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
