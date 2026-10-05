import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { 
  X, 
  Download, 
  Printer, 
  Upload, 
  Edit3,
  Check,
  Building,
  UserCheck,
  Mail,
} from 'lucide-react';
import idCardTemplateFrame from '../../assets/id-card-template-frame.png';
import defaultIdAvatar from '../../assets/default-id-avatar.png';
import idCardFooterClean from '../../assets/id-card-footer-clean.png';

const DEFAULT_COMPANY_ADDRESS = '123 Business Avenue, Financial District, Your City, 500001';
const DEFAULT_COMPANY_EMAIL = 'info@tradenexus.com';
const DEFAULT_COMPANY_WEBSITE = 'www.tradenexus.com';
const DEFAULT_COMPANY_PHONE = '+91 98765 43210';
const DEFAULT_SIGNATORY_NAME = 'T.Vidhya Sagar';
const DEFAULT_SIGNATORY_ROLE = 'Chief executive Officer';

export const DigitalIdCardModal: React.FC = () => {
  const { 
    isIdCardModalOpen, 
    setIsIdCardModalOpen, 
    profile, 
    teamMembers, 
    triggerToast, 
    selectedIdCardEmpId, 
    updateEmployeeAvatar, 
    updateEmployee, 
    currentRole,
    currentUser,
  } = useApp();

  // Only Admin and HR can edit/upload/switch employees on ID cards
  const canEditIdCard = currentRole === 'admin' || currentRole === 'hr';

  const defaultEmpId = selectedIdCardEmpId || (canEditIdCard && teamMembers.length > 0 ? teamMembers[0].id : (profile.id || currentUser?.employeeId || currentUser?.id || teamMembers[0]?.id || ''));
  const [selectedEmpId, setSelectedEmpId] = useState<string>(defaultEmpId);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable employee fields
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [customEmpCode, setCustomEmpCode] = useState('');
  const [customEmpType, setCustomEmpType] = useState('Full - Time');
  const [customBloodGroup, setCustomBloodGroup] = useState('O+ ve');
  const [customDob, setCustomDob] = useState('05/11/1997');
  const [customPhone, setCustomPhone] = useState('0000XXXX97');

  // Editable company contact & signatory fields (cached in localStorage + saved in SQLite)
  const [customCompanyAddress, setCustomCompanyAddress] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('tnx_idCard_companyAddress')) || DEFAULT_COMPANY_ADDRESS;
  });
  const [customCompanyEmail, setCustomCompanyEmail] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('tnx_idCard_companyEmail')) || DEFAULT_COMPANY_EMAIL;
  });
  const [customCompanyWebsite, setCustomCompanyWebsite] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('tnx_idCard_companyWebsite')) || DEFAULT_COMPANY_WEBSITE;
  });
  const [customCompanyPhone, setCustomCompanyPhone] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('tnx_idCard_companyPhone')) || DEFAULT_COMPANY_PHONE;
  });
  const [customSignatoryName, setCustomSignatoryName] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('tnx_idCard_signatoryName')) || DEFAULT_SIGNATORY_NAME;
  });
  const [customSignatoryRole, setCustomSignatoryRole] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('tnx_idCard_signatoryRole')) || DEFAULT_SIGNATORY_ROLE;
  });

  useEffect(() => {
    if (selectedIdCardEmpId) {
      setSelectedEmpId(selectedIdCardEmpId);
    } else if (canEditIdCard && teamMembers.length > 0 && !selectedEmpId) {
      setSelectedEmpId(teamMembers[0].id);
    }
  }, [selectedIdCardEmpId, isIdCardModalOpen, canEditIdCard, teamMembers, selectedEmpId]);

  useEffect(() => {
    if (isEditing) return; // Prevent background updates from overwriting uncommitted edits
    const matched = teamMembers.find(m => m.id === selectedEmpId || m.empCode === selectedEmpId);
    if (matched) {
      setCustomName(matched.name || '');
      setCustomRole(matched.role || '');
      setCustomEmpCode(matched.empCode || '');
      setCustomEmpType((matched as any).employeeType || (matched as any).empType || 'Full - Time');
      setCustomBloodGroup((matched as any).bloodGroup || 'O+ ve');
      setCustomDob((matched as any).dob || '05/11/1997');
      setCustomPhone((matched as any).emergencyPhone || matched.phone || '0000XXXX97');
      setCustomPhotoUrl(matched.avatar ? matched.avatar : null);
      if ((matched as any).companyAddress) setCustomCompanyAddress((matched as any).companyAddress);
      if ((matched as any).companyEmail) setCustomCompanyEmail((matched as any).companyEmail);
      if ((matched as any).companyWebsite) setCustomCompanyWebsite((matched as any).companyWebsite);
      if ((matched as any).companyPhone) setCustomCompanyPhone((matched as any).companyPhone);
      if ((matched as any).signatoryName) setCustomSignatoryName((matched as any).signatoryName);
      if ((matched as any).signatoryRole) setCustomSignatoryRole((matched as any).signatoryRole);
    } else if (profile) {
      setCustomName(profile.name || 'Employee');
      setCustomRole(profile.roleTitle || 'Sales Executive');
      setCustomEmpCode(profile.empCode || '001');
      setCustomEmpType('Full - Time');
      setCustomBloodGroup(profile.bloodGroup || 'O+ ve');
      setCustomDob('05/11/1997');
      setCustomPhone(profile.phone || '0000XXXX97');
      setCustomPhotoUrl(profile.avatar || null);
    }
  }, [selectedEmpId, teamMembers, profile, isIdCardModalOpen, isEditing]);

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const matched = teamMembers.find(m => m.id === empId || m.empCode === empId);
    if (matched) {
      setCustomName(matched.name || '');
      setCustomRole(matched.role || '');
      setCustomEmpCode(matched.empCode || '');
      setCustomEmpType((matched as any).employeeType || (matched as any).empType || 'Full - Time');
      setCustomBloodGroup((matched as any).bloodGroup || 'O+ ve');
      setCustomDob((matched as any).dob || '05/11/1997');
      setCustomPhone((matched as any).emergencyPhone || matched.phone || '0000XXXX97');
      setCustomPhotoUrl(matched.avatar ? matched.avatar : null);
      if ((matched as any).companyAddress) setCustomCompanyAddress((matched as any).companyAddress);
      if ((matched as any).companyEmail) setCustomCompanyEmail((matched as any).companyEmail);
      if ((matched as any).companyWebsite) setCustomCompanyWebsite((matched as any).companyWebsite);
      if ((matched as any).companyPhone) setCustomCompanyPhone((matched as any).companyPhone);
      if ((matched as any).signatoryName) setCustomSignatoryName((matched as any).signatoryName);
      if ((matched as any).signatoryRole) setCustomSignatoryRole((matched as any).signatoryRole);
    }
  };

  if (!isIdCardModalOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        setCustomPhotoUrl(dataUrl);
        if (selectedEmpId) {
          updateEmployeeAvatar(selectedEmpId, dataUrl);
        }
        triggerToast(`✓ Photo updated for ${customName}'s ID card`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    triggerToast('✓ Opening print dialogue for ID Card...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const cardPayload = {
    name: customName,
    role: customRole,
    empCode: customEmpCode,
    empType: customEmpType,
    bloodGroup: customBloodGroup,
    dob: customDob,
    phone: customPhone,
    address: customCompanyAddress,
    email: customCompanyEmail,
    website: customCompanyWebsite,
    companyPhone: customCompanyPhone,
    signatoryName: customSignatoryName,
    signatoryRole: customSignatoryRole,
    avatar: customPhotoUrl || undefined,
  };

  const handleDownload = async () => {
    try {
      triggerToast(`⏳ Generating & downloading official ID Card PDF for ${customName}...`);
      await api.downloadIdCard(
        { id: selectedEmpId, email: profile.email },
        cardPayload
      );
      triggerToast(`✓ Official Digital ID Card PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleSendEmail = async () => {
    const matched = teamMembers.find(m => m.id === selectedEmpId || m.empCode === selectedEmpId);
    const targetEmail = matched?.email || profile.email;
    if (!targetEmail) {
      triggerToast('⚠️ No registered email address found for this employee');
      return;
    }
    setIsSendingEmail(true);
    triggerToast(`Dispatching official ID Card PDF to ${targetEmail}...`);
    try {
      if (isEditing && selectedEmpId) {
        await updateEmployee(selectedEmpId, {
          name: customName,
          role: customRole,
          empCode: customEmpCode,
          bloodGroup: customBloodGroup,
          phone: customPhone,
          emergencyPhone: customPhone,
          dob: customDob,
          employeeType: customEmpType,
          empType: customEmpType,
          avatar: customPhotoUrl || undefined,
        } as any);
      }
      const res = await api.sendIdCardEmail(
        { id: selectedEmpId, email: targetEmail, name: customName, empCode: customEmpCode, role: customRole, phone: customPhone, bloodGroup: customBloodGroup, dob: customDob, avatar: customPhotoUrl || undefined },
        { ...cardPayload, email: targetEmail }
      );
      if (res.success) {
        triggerToast(`✓ Official ID Card PDF successfully dispatched to ${targetEmail}!`);
      } else {
        triggerToast(`⚠️ Failed to dispatch: ${(res as any).error || 'Server error'}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Email dispatch failed: ${err.message || 'Network error'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSaveAndGenerate = async () => {
    if (!selectedEmpId) return;
    setIsSaving(true);
    try {
      // 1. Update SQLite employee profile and AppContext state
      await updateEmployee(selectedEmpId, {
        name: customName,
        role: customRole,
        empCode: customEmpCode,
        bloodGroup: customBloodGroup,
        phone: customPhone,
        emergencyPhone: customPhone,
        dob: customDob,
        employeeType: customEmpType,
        empType: customEmpType,
        avatar: customPhotoUrl || undefined,
        companyAddress: customCompanyAddress,
        companyEmail: customCompanyEmail,
        companyWebsite: customCompanyWebsite,
        companyPhone: customCompanyPhone,
        signatoryName: customSignatoryName,
        signatoryRole: customSignatoryRole,
      } as any);

      // 2. Cache in localStorage for immediate client hydration
      try {
        localStorage.setItem('tnx_idCard_companyAddress', customCompanyAddress);
        localStorage.setItem('tnx_idCard_companyEmail', customCompanyEmail);
        localStorage.setItem('tnx_idCard_companyWebsite', customCompanyWebsite);
        localStorage.setItem('tnx_idCard_companyPhone', customCompanyPhone);
        localStorage.setItem('tnx_idCard_signatoryName', customSignatoryName);
        localStorage.setItem('tnx_idCard_signatoryRole', customSignatoryRole);
      } catch {}

      // 3. Generate canonical PDF and store into employee_documents table
      await api.generateIdCard(selectedEmpId, cardPayload);

      triggerToast(`✓ Official ID Card & Address saved to Employee Documents!`);
      setIsEditing(false);
    } catch (err: any) {
      console.warn('Failed to save & generate ID card:', err);
      triggerToast(`⚠️ Failed to save: ${err.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[96vh] printable-modal-dialog print:max-w-none print:rounded-none print:border-none print:shadow-none print:max-h-none">
        
        {/* Top Header */}
        <div className="bg-[#010D35] px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C2CB] animate-pulse" />
            <h3 className="font-display font-bold text-sm text-white">Official Identity Card Studio</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C2CB] text-[#010D35] text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:brightness-105 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            {canEditIdCard && (
              <button
                onClick={() => {
                  if (isEditing) {
                    handleSaveAndGenerate();
                  } else {
                    setIsEditing(true);
                  }
                }}
                disabled={isSaving}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSaving 
                    ? 'bg-amber-400 text-slate-900 opacity-90' 
                    : isEditing 
                    ? 'bg-[#00C2CB] text-[#010D35] hover:bg-[#00b093]' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : isEditing ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Edit3 className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? 'Generating...' : isEditing ? 'Save & Generate' : 'Edit Fields'}</span>
              </button>
            )}

            <button 
              onClick={() => setIsIdCardModalOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Employee Switcher & Photo Upload Controls (Admin/HR only) */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs print:hidden flex-shrink-0">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {canEditIdCard ? (
              <div className="w-full flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Employee:</span>
                <select
                  value={selectedEmpId}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-[#0A2540] text-xs focus:outline-none focus:border-[#00C2CB] truncate cursor-pointer"
                >
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.empCode} • {m.role})</option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs font-bold text-[#0A2540] px-1">{customName} — {customEmpCode}</span>
            )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
            accept="image/*" 
            className="hidden" 
          />

          {canEditIdCard && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-[#00C2CB] text-slate-700 font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all flex-shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#00A88B]" />
              <span>Upload Photo</span>
            </button>
          )}
        </div>

        {/* Comprehensive Edit Fields Collapsible Drawer */}
        {isEditing && (
          <div className="p-3.5 bg-slate-100 border-b border-slate-200 text-xs space-y-3 max-h-56 overflow-y-auto print:hidden">
            {/* Section 1: Employee Credentials */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Employee Information
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block">Name</label>
                  <input 
                    type="text" 
                    value={customName} 
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block">Designation</label>
                  <input 
                    type="text" 
                    value={customRole} 
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block">Emp. ID</label>
                  <input 
                    type="text" 
                    value={customEmpCode} 
                    onChange={(e) => setCustomEmpCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block">Emp. Type</label>
                  <input 
                    type="text" 
                    value={customEmpType} 
                    onChange={(e) => setCustomEmpType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block">Blood Group</label>
                  <input 
                    type="text" 
                    value={customBloodGroup} 
                    onChange={(e) => setCustomBloodGroup(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block">D.O.B.</label>
                  <input 
                    type="text" 
                    value={customDob} 
                    onChange={(e) => setCustomDob(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 block">Cell</label>
                  <input 
                    type="text" 
                    value={customPhone} 
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Company Contact & Signatory Customization */}
            <div className="pt-2.5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-teal-600" />
                  <span>ID Card Footer &amp; Badge Address (Live Editable)</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400">Updates bottom white badge section in real time</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    Corporate Address (Printed beside 📍 Pin Icon)
                  </label>
                  <input 
                    type="text" 
                    value={customCompanyAddress} 
                    onChange={(e) => setCustomCompanyAddress(e.target.value)}
                    placeholder="123 Business Avenue, Financial District, Your City, 500001"
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-lg px-2.5 py-1 text-slate-800 text-xs font-semibold shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    Company Email (beside ✉️ Mail)
                  </label>
                  <input 
                    type="text" 
                    value={customCompanyEmail} 
                    onChange={(e) => setCustomCompanyEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-lg px-2.5 py-1 text-slate-800 text-xs shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    Website (beside 🌐 Globe)
                  </label>
                  <input 
                    type="text" 
                    value={customCompanyWebsite} 
                    onChange={(e) => setCustomCompanyWebsite(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-lg px-2.5 py-1 text-slate-800 text-xs shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    Official Phone (beside 📞 Phone)
                  </label>
                  <input 
                    type="text" 
                    value={customCompanyPhone} 
                    onChange={(e) => setCustomCompanyPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-lg px-2.5 py-1 text-slate-800 text-xs shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    Signatory Name
                  </label>
                  <input 
                    type="text" 
                    value={customSignatoryName} 
                    onChange={(e) => setCustomSignatoryName(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-lg px-2.5 py-1 font-bold text-slate-800 text-xs shadow-2xs"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    Signatory Role
                  </label>
                  <input 
                    type="text" 
                    value={customSignatoryRole} 
                    onChange={(e) => setCustomSignatoryRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-teal-500 rounded-lg px-2.5 py-1 text-slate-800 text-xs shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions of Drawer */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomCompanyAddress(DEFAULT_COMPANY_ADDRESS);
                    setCustomCompanyEmail(DEFAULT_COMPANY_EMAIL);
                    setCustomCompanyWebsite(DEFAULT_COMPANY_WEBSITE);
                    setCustomCompanyPhone(DEFAULT_COMPANY_PHONE);
                    setCustomSignatoryName(DEFAULT_SIGNATORY_NAME);
                    setCustomSignatoryRole(DEFAULT_SIGNATORY_ROLE);
                    triggerToast('✓ Reset address & contact to defaults');
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-colors cursor-pointer"
                  title="Reset corporate address and contact to defaults"
                >
                  Reset Defaults
                </button>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check className="w-3 h-3 text-teal-600" />
                  Address Live-Synced
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveAndGenerate}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl bg-[#00C2CB] hover:bg-[#00b093] text-[#010D35] font-black text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Generating & Storing PDF...' : 'Save & Generate ID Card'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Vertical Printable ID Card (Exact Template matching tradenexus-id.png) */}
        <div id="digital-id-card-print-container" className="p-4 sm:p-6 overflow-y-auto bg-slate-100/60 flex flex-col justify-center items-center flex-1 printable-scroll-container print:p-0 print:bg-white">
          
          {/* Print-Only Official Document Header */}
          <div className="hidden print:flex flex-col items-center justify-center text-center pb-6 pt-2">
            <h1 className="font-display font-black text-xl text-[#010D35] tracking-widest uppercase">TRADE NEXUS</h1>
            <p className="text-[11px] font-bold text-[#00A88B] tracking-wider mt-0.5 uppercase">Official Employee Identity Card</p>
            <p className="text-[9px] text-slate-400 mt-1">Authorized personnel badge · Dimensions: 591 × 1004 canonical</p>
          </div>

          <div 
            id="digital-id-card-sheet"
            className="w-[340px] sm:w-[355px] text-white rounded-[28px] overflow-hidden shadow-2xl print:shadow-none relative print:border print:border-slate-300 print:my-0 flex-shrink-0"
            style={{ 
              backgroundImage: `url(${idCardTemplateFrame})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#020E37',
              aspectRatio: '591 / 1004',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            {/* Circular Photo with Concentric Glowing Cyan Ring */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 z-10"
              style={{ top: '26.8%', width: '37%', aspectRatio: '1 / 1' }}
            >
              <div 
                onClick={() => canEditIdCard && fileInputRef.current?.click()}
                title={canEditIdCard ? "Click to change or upload employee photo" : customName}
                className={`w-full h-full rounded-full p-[3px] shadow-2xl flex items-center justify-center relative ${canEditIdCard ? 'cursor-pointer group' : 'cursor-default'}`}
                style={{ 
                  background: 'linear-gradient(135deg, #00C2CB 0%, #00E5FF 50%, #020E37 100%)',
                  boxShadow: '0 8px 24px rgba(0, 194, 203, 0.35)'
                }}
              >
                <div 
                  className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative bg-[#020E37]"
                >
                  <img 
                    src={customPhotoUrl || defaultIdAvatar} 
                    alt={customName} 
                    className="w-full h-full object-cover" 
                  />

                  {/* Hover Upload Overlay — Admin/HR only */}
                  {canEditIdCard && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold">
                      <Upload className="w-4 h-4 text-[#00C2CB] mb-0.5" />
                      <span>Change</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Employee Name & Designation */}
            <div 
              className="absolute left-0 right-0 text-center px-4 space-y-0.5 z-10"
              style={{ top: '49.8%' }}
            >
              <h3 className="font-display font-black text-base sm:text-lg text-white tracking-wider uppercase leading-tight truncate px-2">
                {customName || 'NAME'}
              </h3>
              <p 
                className="text-[10.5px] sm:text-[11px] font-extrabold tracking-[0.16em] uppercase truncate px-2"
                style={{ color: '#00C2CB' }}
              >
                {customRole || 'DESIGNATION'}
              </p>
              <div 
                className="w-9 h-0.5 mx-auto rounded-full mt-1"
                style={{ backgroundColor: '#00C2CB' }}
              />
            </div>

            {/* Clean Key Details Matrix (Exact tradenexus-id.png, tightly spaced cleanly above wave at 73%) */}
            <div 
              className="absolute left-0 right-0 px-8 py-0 text-slate-200 z-10 space-y-0.5"
              style={{ top: '58.5%' }}
            >
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-medium text-[10.5px] leading-tight">Emp. ID</span>
                <span className="col-span-1 text-white font-bold text-center text-[10.5px] leading-tight">:</span>
                <span className="col-span-6 font-mono font-bold text-white text-[11px] leading-tight truncate">{customEmpCode || '001'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-medium text-[10.5px] leading-tight">Emp. Type</span>
                <span className="col-span-1 text-white font-bold text-center text-[10.5px] leading-tight">:</span>
                <span className="col-span-6 font-bold text-white text-[11px] leading-tight truncate">{customEmpType || 'Full - Time'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-medium text-[10.5px] leading-tight">Blood Group</span>
                <span className="col-span-1 text-white font-bold text-center text-[10.5px] leading-tight">:</span>
                <span className="col-span-6 font-bold text-white text-[11px] leading-tight truncate">{customBloodGroup || 'O+ ve'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-medium text-[10.5px] leading-tight">D.O.B.</span>
                <span className="col-span-1 text-white font-bold text-center text-[10.5px] leading-tight">:</span>
                <span className="col-span-6 font-mono font-bold text-white text-[11px] leading-tight truncate">{customDob || '05/11/1997'}</span>
              </div>
              <div className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-5 text-slate-300 font-medium text-[10.5px] leading-tight">Cell</span>
                <span className="col-span-1 text-white font-bold text-center text-[10.5px] leading-tight">:</span>
                <span className="col-span-6 font-mono font-bold text-white text-[11px] leading-tight truncate">
                  {customPhone || '0000XXXX97'}
                </span>
              </div>
            </div>

            {/* Bottom Footer Area - Always rendered with live dynamic text and address */}
            <div 
              onClick={() => canEditIdCard && setIsEditing(true)}
              title={canEditIdCard ? "Click to edit badge address, email, phone & signatory" : undefined}
              className={`absolute bottom-0 left-0 right-0 z-10 select-none overflow-hidden h-[25.8%] ${canEditIdCard ? 'cursor-pointer group' : ''}`}
            >
              <img src={idCardFooterClean} alt="Trade Nexus Footer" className="w-full h-full object-cover" />
              
              {/* Overlaid dynamic contact details matching exact icon positions */}
              <div className="absolute left-[17%] top-[27.7%] right-[38%] text-[7.5px] sm:text-[8px] font-bold text-[#041026] leading-tight line-clamp-2">
                {customCompanyAddress}
              </div>
              <div className="absolute left-[17%] top-[46.2%] right-[38%] text-[8px] sm:text-[8.5px] font-bold text-[#041026] truncate">
                {customCompanyEmail}
              </div>
              <div className="absolute left-[17%] top-[60.4%] right-[38%] text-[8px] sm:text-[8.5px] font-bold text-[#041026] truncate">
                {customCompanyWebsite}
              </div>
              <div className="absolute left-[17%] top-[74.6%] right-[38%] text-[8px] sm:text-[8.5px] font-bold text-[#041026] truncate">
                {customCompanyPhone}
              </div>

              {/* Overlaid dynamic signatory - sits immediately beneath handwritten signature with no gap */}
              <div className="absolute right-[5%] top-[56.5%] w-[33%] text-center">
                <div className="font-bold text-[8.5px] sm:text-[9px] text-[#041026] leading-tight truncate">
                  {customSignatoryName}
                </div>
                <div className="text-[7.5px] sm:text-[8px] text-[#041026] leading-tight truncate">
                  {customSignatoryRole}
                </div>
              </div>
            </div>

          </div>

          {/* Print-Only Official Verification Notice */}
          <div className="hidden print:block text-center pt-6 text-[10px] text-slate-400 tracking-wide">
            Trade Nexus Corporate HQ · {customCompanyAddress} · Verification: {customCompanyWebsite}
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsIdCardModalOpen(false)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSendingEmail}
              onClick={handleSendEmail}
              className="px-3.5 py-2 rounded-xl border border-[#00C2CB]/40 bg-[#E6FAF6] hover:bg-[#D0F7F0] font-bold text-[#00897B] text-xs flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
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
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C2CB] text-[#010D35] font-black text-xs shadow-sm hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
