import React from 'react';
import { useApp } from '../../context/AppContext';
import { useScreenData } from '../../hooks/useScreenData';
import { api } from '../../services/api';
import { 
  CreditCard, 
  Download, 
  FileText, 
  QrCode, 
  Briefcase, 
  Calendar, 
  ShieldCheck, 
  Mail, 
  Phone,
  CheckCircle2,
  Clock,
  Award,
  Video,
  Eye
} from 'lucide-react';
import { OfferLetterData, ExperienceCertData, RelievingLetterData } from '../../types';
import { computePayrollTotals } from '../../components/payroll/payrollTemplate';

export const DesktopProfile: React.FC = () => {
  const { 
    profile, 
    myPayslips: payslips, 
    teamTasks, 
    teamMeetings, 
    joinMeeting,
    toggleTaskStatus, 
    setIsIdCardModalOpen,
    setSelectedIdCardEmpId, 
    openPayslipModal, 
    openOfferLetterModal,
    openExperienceCertModal,
    openRelievingLetterModal,
    offerLetters,
    experienceCerts,
    relievingLetters,
    triggerToast
  } = useApp();

  const myOfferLetter = offerLetters.find(o => 
    (o.candidateName && o.candidateName.toLowerCase() === profile.name.toLowerCase()) ||
    (o.candidateEmail && o.candidateEmail.toLowerCase() === (profile.email || '').toLowerCase())
  );

  const effectiveOfferLetter: OfferLetterData = myOfferLetter || {
    id: `off-${profile.empCode || '001'}`,
    candidateName: profile.name || 'Trade Nexus Employee',
    candidateEmail: profile.email || 'employee@tradenexus.com',
    candidatePhone: profile.phone || '+91 98765 43210',
    roleTitle: profile.roleTitle || (profile as any).role || 'Sales Executive',
    department: profile.department || 'Client Acquisition',
    annualCtc: 420000,
    monthlyGross: 35000,
    joiningDate: profile.joinDate || '01 Jan 2024',
    reportingManager: profile.teamLeaderName || 'Ramesh Sharma (TL)',
    location: 'Bengaluru Corporate HQ',
    issuedDate: profile.joinDate || '01 Jan 2024',
  };

  const myExperienceCert = experienceCerts.find(c => 
    (c.employeeId && profile.id && c.employeeId === profile.id) ||
    (c.empCode && profile.empCode && c.empCode.toLowerCase() === profile.empCode.toLowerCase()) || 
    (c.employeeName && profile.name && c.employeeName.toLowerCase() === profile.name.toLowerCase())
  );

  const effectiveExperienceCert: ExperienceCertData | null = myExperienceCert || null;

  const myRelievingLetter = relievingLetters.find(r => 
    (r.empCode && r.empCode.toLowerCase() === profile.empCode.toLowerCase()) || 
    (r.employeeName && r.employeeName.toLowerCase() === profile.name.toLowerCase())
  );

  const effectiveRelievingLetter: RelievingLetterData | null = myRelievingLetter || null;

  const handleDirectDownloadIdCard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      triggerToast(`⏳ Generating & downloading official ID Card PDF for ${profile.name}...`);
      await api.downloadIdCard(
        { id: profile.id, email: profile.email },
        {
          name: profile.name,
          role: profile.roleTitle || (profile as any).role || 'Sales Executive',
          empCode: profile.empCode,
          bloodGroup: profile.bloodGroup || 'O+ ve',
          dob: (profile as any).dob || '05/11/1997',
          empType: 'Full - Time',
          phone: profile.phone || '9876543210',
          avatar: profile.avatar,
        }
      );
      triggerToast(`✓ Official ID Card PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleDirectDownloadOfferLetter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      triggerToast(`⏳ Generating & downloading official Offer Letter PDF for ${profile.name}...`);
      await api.downloadOfferLetter(effectiveOfferLetter);
      triggerToast(`✓ Official Offer Letter PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleDirectDownloadExperienceCert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!effectiveExperienceCert) return;
    try {
      triggerToast(`⏳ Generating & downloading official Experience Certificate PDF for ${profile.name}...`);
      await api.downloadExperienceCert({ name: profile.name, email: profile.email }, effectiveExperienceCert);
      triggerToast(`✓ Official Experience Certificate PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleDirectDownloadRelievingLetter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!effectiveRelievingLetter) return;
    try {
      triggerToast(`⏳ Generating & downloading official Relieving Letter PDF for ${profile.name}...`);
      await api.downloadRelievingLetter({ name: profile.name, email: profile.email }, effectiveRelievingLetter);
      triggerToast(`✓ Official Relieving Letter PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleDirectDownloadPayslip = async (pay: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      triggerToast(`⏳ Generating & downloading official Payslip PDF for ${pay.month} ${pay.year}...`);
      await api.downloadPayslip(pay);
      triggerToast(`✓ Official Payslip PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  useScreenData('profileSelfService');

  const myTasks = (teamTasks || []).filter(
    (t) =>
      !t.assignedTo ||
      t.assignedTo.toLowerCase() === (profile.name || '').toLowerCase() ||
      (profile.name && t.assignedTo.toLowerCase().includes(profile.name.toLowerCase())) ||
      t.assignedTo === 'All'
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl text-[#0A2540] tracking-tight">
            Employee Profile, Digital ID & Payslips Vault
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Official Trade Nexus credentials, salary statements, and compliance locker
          </p>
        </div>

        <button
          onClick={() => setIsIdCardModalOpen(true)}
          className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#00C9A7]/20 transition-all active:scale-95"
        >
          <QrCode className="w-4 h-4" />
          <span>View Full Digital ID Card</span>
        </button>
      </div>

      {/* Main 2-Column Split: ID Card & Profile Card (Left 4 Cols) + Payslips & Documents (Right 8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Profile Summary Card */}
        <div className="lg:col-span-4 space-y-5">
          {/* Executive ID Badge Preview */}
          <div className="nexus-card p-6 bg-gradient-to-b from-[#0A2540] to-[#0F3258] text-white shadow-lg space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00C9A7] to-[#38E1B7] p-0.5 shadow-md flex-shrink-0">
                <div className="w-full h-full rounded-[14px] bg-[#0A2540] flex items-center justify-center font-display font-black text-2xl text-[#00C9A7]">{(profile.name || 'Employee').trim().split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-white">{profile.name || 'Employee Profile'}</h3>
                <span className="text-xs font-bold text-[#38E1B7] block mt-0.5">{profile.roleTitle || 'Sales Executive'}</span>
                <span className="text-[11px] font-mono text-slate-300 font-semibold">{profile.empCode || '—'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/10 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-white">{profile.department || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reporting To:</span>
                <span className="font-semibold text-white">{profile.teamLeaderName ? `${profile.teamLeaderName} (TL)` : 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Joining Date:</span>
                <span className="font-semibold text-white">{profile.joinDate || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Shift Timings:</span>
                <span className="font-semibold text-[#00C9A7]">09:00 AM - 06:30 PM</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedIdCardEmpId(profile.id || profile.empCode);
                  setIsIdCardModalOpen(true);
                }}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-[#00C9A7]" />
                <span>View Badge</span>
              </button>
              <button
                type="button"
                onClick={handleDirectDownloadIdCard}
                className="py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Payslips Breakdown & Document Vault */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Monthly Payslips Table */}
          <div className="nexus-card bg-white border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-base text-[#0A2540]">Monthly Salary Payslips (PDF)</h3>
                <p className="text-xs text-slate-500">Official digitally verified salary slips</p>
              </div>
              <FileText className="w-5 h-5 text-[#00C9A7]" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="pb-3 px-3">Pay Period</th>
                    <th className="pb-3 px-3">Total Earnings</th>
                    <th className="pb-3 px-3">Total Deductions</th>
                    <th className="pb-3 px-3">Net Pay</th>
                    <th className="pb-3 px-3">Issued On</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {payslips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-medium text-xs">
                        No payroll has been issued yet.
                      </td>
                    </tr>
                  ) : (
                    payslips.map((pay) => {
                    const t = computePayrollTotals(pay);
                    return (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-display font-bold text-sm text-[#0A2540]">
                        {pay.month} {pay.year}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">
                        ₹{t.totalEarnings.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-rose-500">
                        -₹{t.totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-extrabold text-sm text-[#0A2540]">
                        ₹{t.netPay.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {pay.dispatchedAt ? new Date(pay.dispatchedAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPayslipModal(pay)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDirectDownloadPayslip(pay, e)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E6FAF6] hover:bg-[#00C9A7] text-[#00A88B] hover:text-[#0A2540] font-black text-xs transition-all active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );}))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance & Document Vault */}
          <div className="nexus-card bg-white border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-black text-base text-[#0A2540]">Official Employee Document Vault</h4>
                <p className="text-xs text-slate-500">Official verified credentials, contracts, and HR certificates</p>
              </div>
              <span className="text-xs font-bold text-[#00A88B] bg-[#E6FAF6] px-3 py-1 rounded-lg border border-[#00C9A7]/30">
                Verified Records
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              {/* Card 1: ID Card */}
              <div 
                onClick={() => {
                  setSelectedIdCardEmpId(profile.id || profile.empCode);
                  setIsIdCardModalOpen(true);
                }}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex flex-col justify-between cursor-pointer transition-all group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#06152B] text-[#00C9A7] border border-[#00C9A7]/30 flex items-center justify-center mb-3">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-[#0A2540] block">Digital ID Card</span>
                  <span className="text-[10px] text-slate-400 font-mono">Badge: {profile.empCode} • Dual-Sided QR</span>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#00A88B] group-hover:underline">View ID Card</span>
                  <button
                    type="button"
                    onClick={handleDirectDownloadIdCard}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-[#0A2540] transition-colors cursor-pointer"
                    title="Download Official ID Card PDF"
                  >
                    <Download className="w-4 h-4 text-[#00A88B]" />
                  </button>
                </div>
              </div>

              {/* Card 2: Offer Letter */}
              <div 
                onClick={() => openOfferLetterModal(effectiveOfferLetter)}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex flex-col justify-between cursor-pointer transition-all group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5B3DF5] border border-indigo-100 flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs text-[#0A2540] block">Job Offer Letter</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {effectiveOfferLetter.issuedDate ? `Issued: ${effectiveOfferLetter.issuedDate}` : 'Official Appointment'}
                  </span>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#5B3DF5] group-hover:underline">View Letter</span>
                  <button
                    type="button"
                    onClick={handleDirectDownloadOfferLetter}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-[#0A2540] transition-colors cursor-pointer"
                    title="Download Official Offer Letter PDF"
                  >
                    <Download className="w-4 h-4 text-[#5B3DF5]" />
                  </button>
                </div>
              </div>

              {/* Card 3: Experience Certificate (Visible ONLY when issued by HR) */}
              {effectiveExperienceCert && (
                <div 
                  onClick={() => openExperienceCertModal(effectiveExperienceCert)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex flex-col justify-between cursor-pointer transition-all group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mb-3">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xs text-[#0A2540] block">Experience Certificate</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Ref: {effectiveExperienceCert.refNumber}
                    </span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-amber-600 group-hover:underline">View Certificate</span>
                    <button
                      type="button"
                      onClick={handleDirectDownloadExperienceCert}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-[#0A2540] transition-colors cursor-pointer"
                      title="Download Official Experience Certificate PDF"
                    >
                      <Download className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* Card 4: Relieving Letter (Visible ONLY when issued by HR) */}
              {effectiveRelievingLetter && (
                <div 
                  onClick={() => openRelievingLetterModal(effectiveRelievingLetter)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex flex-col justify-between cursor-pointer transition-all group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00A88B] border border-teal-100 flex items-center justify-center mb-3">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xs text-[#0A2540] block">Relieving Letter</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      LWD: {effectiveRelievingLetter.lastWorkingDate}
                    </span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#00A88B] group-hover:underline">View Relieving</span>
                    <button
                      type="button"
                      onClick={handleDirectDownloadRelievingLetter}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-[#0A2540] transition-colors cursor-pointer"
                      title="Download Official Relieving Letter PDF"
                    >
                      <Download className="w-4 h-4 text-[#00A88B]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Tasks & Team Standups */}
          <div className="nexus-card bg-white border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-black text-base text-[#0A2540]">Assigned Tasks & Action Items</h4>
                <p className="text-xs text-slate-500">Tasks allocated to you by your Team Leader</p>
              </div>
              <span className="text-xs font-bold text-[#00A88B] bg-[#E6FAF6] px-3 py-1 rounded-lg border border-[#00C9A7]/30">
                {myTasks.filter((t) => t.status !== 'COMPLETED').length} Action Items Pending
              </span>
            </div>

            {myTasks.length > 0 ? (
              <div className="space-y-2.5">
                {myTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskStatus(task.id)}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStatus(task.id);
                        }}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'border-slate-300 hover:border-[#00C9A7]'
                        }`}
                      >
                        {task.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        ) : task.status === 'IN_PROGRESS' ? (
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                        ) : null}
                      </button>
                      <div>
                        <h5 className={`text-xs font-bold ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-[#0A2540]'}`}>
                          {task.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Due: {task.dueDate} {task.group && `• ${task.group}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        task.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-200/70 text-slate-600'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`text-xs font-extrabold ${
                        task.status === 'COMPLETED' ? 'text-emerald-600' : task.status === 'IN_PROGRESS' ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {task.status === 'COMPLETED' ? 'Completed' : task.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">No pending tasks currently assigned.</p>
            )}

            {/* Team Meetings */}
            {teamMeetings.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h5 className="font-display font-bold text-xs text-slate-500">Upcoming Team Meetings & Coaching</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamMeetings.map((mtg) => (
                    <div key={mtg.id} className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h6 className="font-display font-bold text-xs text-[#0A2540] truncate">{mtg.title}</h6>
                            {mtg.zoomMeetingId && (
                              <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-1 rounded">
                                Zoom ID: {mtg.zoomMeetingId}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{mtg.dateTime}</p>
                          <p className="text-[10px] text-sky-700 font-semibold">{mtg.location}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => joinMeeting(mtg)}
                        className="px-3 py-1.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 flex-shrink-0"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
