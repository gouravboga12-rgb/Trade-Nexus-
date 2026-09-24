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

interface PayslipDetailModalProps {
  payslip: PayslipItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipDetailModal: React.FC<PayslipDetailModalProps> = ({ payslip, isOpen, onClose }) => {
  const { profile, teamMembers, triggerToast } = useApp();
  const [isEditing, setIsEditing] = useState(false);

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

  const handleDownload = () => {
    triggerToast(`✓ Payroll slip for ${empName} ready for PDF save`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh]">
        
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
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-100/80 flex justify-center">
          
          {/* Printable Payslip Sheet matching 4.png */}
          <div 
            id="payslip-sheet"
            className="printable-document-sheet w-full bg-white text-slate-800 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden relative border border-slate-200 flex flex-col justify-between"
            style={{ 
              minHeight: '780px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            
            {/* Top Navy Header Banner with Diagonal Teal Accent (Matching 4.png) */}
            <div 
              className="relative text-white px-5 sm:px-7 pt-5 sm:pt-6 pb-4 sm:pb-5 overflow-hidden flex-shrink-0"
              style={{ 
                backgroundColor: '#06152B',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              {/* Teal Accent Lines */}
              <div 
                className="absolute -bottom-1 left-0 right-0 h-2.5" 
                style={{ backgroundColor: '#00A88B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              />
              <div 
                className="absolute bottom-1 left-0 w-3/5 h-1" 
                style={{ backgroundColor: '#38E1B7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              />

              <div className="flex items-center justify-between gap-3 relative z-10">
                {/* Brand Logo & Name */}
                <div className="flex items-center gap-2.5 sm:gap-3">
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

                {/* Right Document Title */}
                <div className="text-right flex-shrink-0">
                  <h2 className="font-display font-black text-xs sm:text-lg text-white tracking-wider uppercase">
                    PAYROLL SLIP
                  </h2>
                  <div className="h-0.5 w-full bg-[#00C9A7] mt-0.5" />
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-5 sm:p-8 space-y-6 flex-1 relative text-xs sm:text-sm">
              
              {/* Background Watermark */}
              <div className="absolute right-6 bottom-20 opacity-5 pointer-events-none select-none">
                <div className="w-56 h-56 rounded-full border-8 border-[#0A2540] flex items-center justify-center">
                  <TrendingUp className="w-36 h-36 text-[#0A2540] stroke-[2]" />
                </div>
              </div>

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

                {/* Right: Authorized By */}
                <div className="text-right space-y-1">
                  <p className="text-xs text-slate-500 font-medium">Authorized by:</p>
                  <p className="text-xs font-bold text-[#0A2540]">Finance Manager – Trade Nexus</p>
                  
                  <div className="py-1">
                    <span 
                      className="font-signature text-2xl text-[#0A2540] inline-block font-semibold tracking-wide select-none"
                      style={{ 
                        fontFamily: "'Caveat', 'Great Vibes', 'Dancing Script', cursive"
                      }}
                    >
                      Muhammad Patel
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0A2540]">Muhammad Patel</p>
                </div>

              </div>

            </div>

            {/* Bottom Footer Bar (Matching 4.png) */}
            <div 
              className="text-white px-4 sm:px-6 py-2.5 sm:py-3 border-t-2 border-[#00A88B] flex items-center justify-between text-[9px] sm:text-[11px] gap-2 font-medium flex-shrink-0"
              style={{ 
                backgroundColor: '#06152B',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              <span className="flex items-center gap-1.5 text-slate-200">
                <Phone className="w-3.5 h-3.5 text-[#00C9A7]" />
                +91 98765 43210
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <Mail className="w-3.5 h-3.5 text-[#00C9A7]" />
                info@tradenexus.com
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <Globe className="w-3.5 h-3.5 text-[#00C9A7]" />
                www.tradenexus.com
              </span>
            </div>

          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
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
            <span>Download Payslip PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
};
