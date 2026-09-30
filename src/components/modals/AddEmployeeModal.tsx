import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useListDefault } from '../../hooks/useListDefault';
import { 
  X, 
  UserPlus, 
  Building, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  Users, 
  Sparkles,
  Shield,
  FileText,
  UploadCloud,
  CheckCircle2,
  Landmark,
  MapPin,
  Briefcase,
  Hash,
  Camera,
  User,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { UserRole } from '../../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose }) => {
  const { teamMembers, teamGroups, createNewEmployee, triggerToast } = useApp();

  // 1. Name
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // 2. Contact
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');

  // 3. Position & Role
  const [position, setPosition] = useState('Senior Telecaller / SDR');
  const [role, setRole] = useState<UserRole>('telecaller');
  const [department, setDepartment] = useState('Sales & Client Acquisition');
  // Filled from the real team list once it loads, so a new employee is never
  // filed under a hardcoded team/leader that may not exist.
  const [teamGroup, setTeamGroup] = useState('');
  const [teamLeaderName, setTeamLeaderName] = useState('');

  // 4. Address & Blood Group
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');

  // 5. Salary & Employee Type
  const [salary, setSalary] = useState<number>(35000);
  const [employeeType, setEmployeeType] = useState<'Full Time' | 'Intern' | 'Contract'>('Full Time');

  // 6. Documents (PAN & Aadhaar) & Profile Photo
  const [panFile, setPanFile] = useState<string | null>(null);
  const [panFileData, setPanFileData] = useState<string | null>(null);
  const [isReadingPan, setIsReadingPan] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState<string | null>(null);
  const [aadhaarFileData, setAadhaarFileData] = useState<string | null>(null);
  const [isReadingAadhaar, setIsReadingAadhaar] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // 7. Bank Details
  const [bankName, setBankName] = useState('HDFC Bank');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');

  // 8. Identity & Dates
  const [employeeId, setEmployeeId] = useState(`TNX-${Math.floor(8000 + Math.random() * 999)}`);
  const [dateOfJoining, setDateOfJoining] = useState('2025-06-01');
  const [salaryDate, setSalaryDate] = useState('1st of every month');

  // 9. Login Credentials & Success Modal State
  const [password, setPassword] = useState(`TNX@${Math.floor(1000 + Math.random() * 9000)}`);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
    empCode: string;
    position: string;
  } | null>(null);

  useListDefault(teamGroup, setTeamGroup, teamGroups, (g) => g.name);

  // The reporting leader logic: TLs report to Branch Head/Admin, Telecallers report to their TL
  const leaderOfChosenTeam = teamGroups.find((g) => g.name === teamGroup)?.leaderName ?? '';
  useEffect(() => {
    if (role === 'team_leader') {
      setTeamLeaderName('Branch Head / Operations Director');
    } else if (role === 'hr') {
      setTeamLeaderName('Super Admin / Executive Management');
    } else if (role === 'admin') {
      setTeamLeaderName('Executive Board');
    } else {
      setTeamLeaderName(leaderOfChosenTeam || 'Branch Team Leader');
    }
  }, [role, leaderOfChosenTeam]);

  // Live duplicate checking against active team members
  const trimmedEmail = emailAddress.trim().toLowerCase();
  const rawDigitsPhone = mobileNumber.replace(/[^0-9]/g, '');
  const last10Phone = rawDigitsPhone.length >= 10 ? rawDigitsPhone.slice(-10) : '';

  const emailInUseMember = trimmedEmail
    ? teamMembers.find((m) => m.email && m.email.trim().toLowerCase() === trimmedEmail)
    : null;

  const phoneInUseMember = last10Phone
    ? teamMembers.find((m) => {
        const mDigits = (m.phone || '').replace(/[^0-9]/g, '');
        return mDigits.length >= 10 && mDigits.slice(-10) === last10Phone;
      })
    : null;

  // Optimized file reader for documents & photos (handles images with canvas downscaling and PDFs cleanly)
  const processDocumentFile = (file: File, targetMaxDim = 1200): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const maxDim = targetMaxDim;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', targetMaxDim <= 500 ? 0.82 : 0.85));
          } else {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        };
        img.src = objectUrl;
      } else {
        // PDF or other documents
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  };

  const handlePanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        triggerToast('✗ PAN file is too large. Maximum allowed size is 12MB.');
        return;
      }
      setPanFile(file.name);
      setIsReadingPan(true);
      try {
        const dataUrl = await processDocumentFile(file);
        setPanFileData(dataUrl);
        triggerToast(`✓ PAN Card loaded: ${file.name}`);
      } catch {
        triggerToast('✗ Failed to process PAN file');
        setPanFile(null);
        setPanFileData(null);
      } finally {
        setIsReadingPan(false);
      }
    }
  };

  const handleAadhaarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        triggerToast('✗ Aadhaar file is too large. Maximum allowed size is 12MB.');
        return;
      }
      setAadhaarFile(file.name);
      setIsReadingAadhaar(true);
      try {
        const dataUrl = await processDocumentFile(file);
        setAadhaarFileData(dataUrl);
        triggerToast(`✓ Aadhaar Card loaded: ${file.name}`);
      } catch {
        triggerToast('✗ Failed to process Aadhaar file');
        setAadhaarFile(null);
        setAadhaarFileData(null);
      } finally {
        setIsReadingAadhaar(false);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await processDocumentFile(file, 400);
        setPhotoUrl(dataUrl);
        triggerToast(`✓ Profile Photo loaded`);
      } catch {
        triggerToast('✗ Failed to process Profile Photo');
      }
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'telecaller') {
      setPosition('Telecaller Executive / SDR');
      setDepartment('Sales & Client Acquisition');
    } else if (newRole === 'team_leader') {
      setPosition('Team Leader & Sales Coach');
      setDepartment('Sales & Operations');
    } else if (newRole === 'hr') {
      setPosition('HR & People Operations Specialist');
      setDepartment('Human Resources');
    } else {
      setPosition('Operations Administrator');
      setDepartment('Executive Operations');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    if (emailInUseMember) {
      triggerToast(`✗ Cannot create employee: Email "${emailAddress}" is already registered to ${emailInUseMember.name} (${emailInUseMember.empCode}). Please use another email.`);
      return;
    }

    if (phoneInUseMember) {
      triggerToast(`✗ Cannot create employee: Phone "${mobileNumber}" is already registered to ${phoneInUseMember.name} (${phoneInUseMember.empCode}). Please use another phone number.`);
      return;
    }

    if (isReadingPan || isReadingAadhaar) {
      triggerToast('Please wait for document files to finish loading...');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const finalEmail = emailAddress.trim() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@tradenexus.io`;
    const basic = Math.round(salary * 0.5);
    const hra = Math.round(salary * 0.3);
    const allowance = salary - (basic + hra);

    const finalPanUrl = panFileData || (panFile ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
        <rect width="600" height="380" fill="#0A2540" rx="16"/>
        <rect x="15" y="15" width="570" height="350" fill="#ffffff" rx="12"/>
        <rect x="15" y="15" width="570" height="60" fill="#00C9A7" rx="12"/>
        <text x="35" y="52" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0A2540">TRADE NEXUS • OFFICIAL PAN CARD RECORD</text>
        <text x="35" y="120" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Card Holder: <tspan fill="#0A2540">${fullName}</tspan></text>
        <text x="35" y="160" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Employee Code: <tspan fill="#0A2540">${employeeId}</tspan></text>
        <text x="35" y="200" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">File Name: <tspan fill="#0A2540">${panFile}</tspan></text>
        <text x="35" y="240" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Status: <tspan fill="#059669">DIGITALLY ATTACHED KYC</tspan></text>
        <line x1="35" y1="280" x2="565" y2="280" stroke="#E2E8F0" stroke-width="1.5"/>
        <text x="35" y="320" font-family="Arial, sans-serif" font-size="11" fill="#718096">Official Onboarding Document Record • Trade Nexus Systems Ltd.</text>
      </svg>
    `.trim())}` : undefined);

    const finalAadhaarUrl = aadhaarFileData || (aadhaarFile ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
        <rect width="600" height="380" fill="#0A2540" rx="16"/>
        <rect x="15" y="15" width="570" height="350" fill="#ffffff" rx="12"/>
        <rect x="15" y="15" width="570" height="60" fill="#00C9A7" rx="12"/>
        <text x="35" y="52" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0A2540">TRADE NEXUS • OFFICIAL AADHAAR CARD RECORD</text>
        <text x="35" y="120" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Card Holder: <tspan fill="#0A2540">${fullName}</tspan></text>
        <text x="35" y="160" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Employee Code: <tspan fill="#0A2540">${employeeId}</tspan></text>
        <text x="35" y="200" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">File Name: <tspan fill="#0A2540">${aadhaarFile}</tspan></text>
        <text x="35" y="240" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#4A5568">Status: <tspan fill="#059669">DIGITALLY ATTACHED KYC</tspan></text>
        <line x1="35" y1="280" x2="565" y2="280" stroke="#E2E8F0" stroke-width="1.5"/>
        <text x="35" y="320" font-family="Arial, sans-serif" font-size="11" fill="#718096">Official Onboarding Document Record • Trade Nexus Systems Ltd.</text>
      </svg>
    `.trim())}` : undefined);

    createNewEmployee({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName,
      email: finalEmail,
      phone: mobileNumber.trim() || '+91 98450 12345',
      role,
      roleTitle: position,
      department,
      teamGroup,
      teamLeaderName,
      address: address.trim() || 'Bangalore Corporate HQ',
      employeeType,
      salary,
      basicSalary: basic,
      hra,
      specialAllowance: allowance,
      panDocumentName: panFile || undefined,
      panDocumentUrl: finalPanUrl,
      aadhaarDocumentName: aadhaarFile || undefined,
      aadhaarDocumentUrl: finalAadhaarUrl,
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim() || '50100482910482',
      bankIfscCode: bankIfscCode.trim() || 'HDFC0001234',
      empCode: employeeId,
      password,
      joiningDate: dateOfJoining,
      salaryDate,
      avatar: photoUrl || undefined,
      bloodGroup,
    });

    setCreatedCredentials({
      name: fullName,
      email: finalEmail,
      password,
      role,
      empCode: employeeId,
      position,
    });
  };

  if (!isOpen) return null;

  // If credentials just generated, render the Dispatch Card
  if (createdCredentials) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
          <div className="bg-[#0A192F] px-6 py-5 text-white text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-display font-black text-lg text-white">Employee Onboarded!</h3>
            <p className="text-xs text-slate-300">Login credentials generated &amp; welcome email dispatched</p>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Employee Name</span>
                <span className="font-sans font-bold text-sm text-[#0A2540]">{createdCredentials.name}</span>
                <span className="text-[11px] text-slate-500 font-sans block">{createdCredentials.position} ({createdCredentials.empCode})</span>
              </div>

              <div className="border-t border-slate-200 pt-2.5 space-y-1">
                <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Assigned Portal Role</span>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold font-sans text-xs inline-block border border-teal-200 uppercase">
                  {createdCredentials.role.replace('_', ' ')}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2.5 space-y-1">
                <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Login Email</span>
                <span className="text-slate-800 font-bold block bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">{createdCredentials.email}</span>
              </div>

              <div className="border-t border-slate-200 pt-2.5 space-y-1">
                <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Initial Password</span>
                <span className="text-emerald-700 font-bold block bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">{createdCredentials.password}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              ✓ An automated welcome email containing these credentials and a direct portal access link has been dispatched to <strong>{createdCredentials.email}</strong>.
            </p>

            <button
              onClick={() => {
                setCreatedCredentials(null);
                onClose();
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-md hover:brightness-105 transition-all"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-[#0A192F] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-[#00C9A7] border border-teal-500/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                Create Employee
                <span className="text-[10px] bg-teal-500/30 text-teal-300 font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">
                  HR Onboarding
                </span>
              </h3>
              <p className="text-xs text-slate-400">Complete verification, payroll mapping, and document upload</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs sm:text-sm font-sans">
          
          {/* SECTION 1: Personal & Contact Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span>1. Personal & Contact Details</span>
            </div>

            {/* Profile Photo Upload for Official Digital ID Card */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-200 border-2 border-[#00C9A7]/40 flex items-center justify-center shadow-xs">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Employee Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6 text-slate-400" />
                      <span className="text-[9px] font-bold mt-1 text-slate-400">ID Photo</span>
                    </div>
                  )}
                </div>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-xs"
                    title="Remove Photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold text-[#0A2540]">Employee Profile Photo</span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded-full">For ID Card</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Upload a clear portrait photo. This photo will be rendered on the employee's official Digital ID Card and company profile.
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                  <label className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-[#0A2540] border border-slate-300 font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-2xs">
                    <UploadCloud className="w-3.5 h-3.5 text-[#00A88B]" />
                    <span>{photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {photoUrl && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Photo Attached</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">FIRST NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Srihari"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">LAST NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nair"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">MOBILE NUMBER *</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98450 12345"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className={`w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 font-mono ${
                      phoneInUseMember
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/40 text-rose-900'
                        : 'border-slate-300 focus:ring-teal-500'
                    }`}
                  />
                </div>
                {phoneInUseMember && (
                  <div className="mt-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-medium leading-tight flex items-start gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Phone Already In Use:</strong> Registered to <strong>{phoneInUseMember.name}</strong> ({phoneInUseMember.empCode} • {phoneInUseMember.role}). Please enter a different phone number.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">EMAIL ADDRESS *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="srihari.n@tradenexus.io"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className={`w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 ${
                      emailInUseMember
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/40 text-rose-900'
                        : 'border-slate-300 focus:ring-teal-500'
                    }`}
                  />
                </div>
                {emailInUseMember && (
                  <div className="mt-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-medium leading-tight flex items-start gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Email Already In Use:</strong> Registered to <strong>{emailInUseMember.name}</strong> ({emailInUseMember.empCode} • {emailInUseMember.role}). Please use a different email address.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Login Password Field */}
            <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-[#0A2540]">
                  INITIAL LOGIN PASSWORD *
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(`TNX@${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="text-[10px] font-bold text-[#00A88B] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>🎲 Generate Password</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set initial password (e.g. TNX@8492)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-[10px] font-bold text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Employee can log in immediately with their email and this password, or use "Forgot Password" on the login screen.
              </p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">EMPLOYEE ADDRESS *</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <textarea
                  rows={2}
                  required
                  placeholder="Flat / House No, Street, Landmark, City, State, Pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Role, Designation & Employment Type */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-1.5">
              <Briefcase className="w-4 h-4 text-teal-600" />
              <span>2. Position & Employment Type</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">EMPLOYEE POSITION *</label>
                <input
                  type="text"
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Telecaller Executive"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">EMPLOYEE TYPE *</label>
                <select
                  value={employeeType}
                  onChange={(e) => setEmployeeType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Intern">Intern</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">SYSTEM ROLE</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="telecaller">Telecaller (Calling CRM)</option>
                  <option value="team_leader">Team Leader (TL Supervisor)</option>
                  <option value="hr">HR Specialist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {role === 'team_leader' ? 'SQUAD / TEAM NAME TO LEAD *' : 'ASSIGN SQUAD / TEAM *'}
                </label>
                {role === 'team_leader' ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      value={teamGroup}
                      onChange={(e) => setTeamGroup(e.target.value)}
                      placeholder="e.g. Alpha Growth Team"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-teal-600 font-medium">
                      ✓ This Team Leader will be assigned as Head of this Squad.
                    </p>
                  </div>
                ) : teamGroups.length > 0 ? (
                  <select
                    value={teamGroup}
                    onChange={(e) => setTeamGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {teamGroups.map((grp) => (
                      <option key={grp.id} value={grp.name}>
                        {grp.name} (TL: {grp.leaderName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      value={teamGroup}
                      onChange={(e) => setTeamGroup(e.target.value)}
                      placeholder="e.g. Alpha Growth Squad"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-[10px] text-amber-600 font-medium">
                      No squads created yet. Type a squad name to initialize one.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {role === 'team_leader' ? 'REPORTING AUTHORITY' : 'REPORTING TEAM LEADER'}
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700">
                  {teamLeaderName}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {role === 'team_leader'
                    ? 'Team Leaders report directly to Executive Operations & Branch Management.'
                    : 'Follows whoever leads the selected team.'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Salary, Salary Date & Employee ID */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>3. Compensation & Identification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">EMPLOYEE SALARY (₹ Monthly) *</label>
                <input
                  type="number"
                  required
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value) || 0)}
                  placeholder="e.g. 35000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">SALARY DISBURSEMENT DATE *</label>
                <select
                  value={salaryDate}
                  onChange={(e) => setSalaryDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="1st of every month">1st of every month</option>
                  <option value="5th of every month">5th of every month</option>
                  <option value="7th of every month">7th of every month</option>
                  <option value="10th of every month">10th of every month</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">EMPLOYEE ID *</label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">DATE OF JOINING *</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={dateOfJoining}
                    onChange={(e) => setDateOfJoining(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">BLOOD GROUP (FOR ID BADGE) *</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                >
                  <option value="O+">O+ Positive</option>
                  <option value="O-">O- Negative</option>
                  <option value="A+">A+ Positive</option>
                  <option value="A-">A- Negative</option>
                  <option value="B+">B+ Positive</option>
                  <option value="B-">B- Negative</option>
                  <option value="AB+">AB+ Positive</option>
                  <option value="AB-">AB- Negative</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: PAN & Aadhaar Upload */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-1.5">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>4. KYC Document Uploads (PAN & Aadhaar)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PAN Upload */}
              <div className={`border-2 rounded-2xl p-3.5 transition-all ${
                panFileData 
                  ? 'border-emerald-400 bg-emerald-50/30' 
                  : isReadingPan 
                  ? 'border-teal-300 bg-teal-50/20' 
                  : 'border-dashed border-slate-300 bg-slate-50/80 hover:border-teal-500'
              }`}>
                {panFileData ? (
                  <div className="flex items-center gap-3">
                    {panFileData.startsWith('data:image/') ? (
                      <img src={panFileData} alt="PAN Preview" className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-2xs" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex flex-col items-center justify-center font-bold text-[9px] shadow-2xs">
                        <FileText className="w-5 h-5 mb-0.5 text-red-600" />
                        <span>PDF</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase text-emerald-700 block">✓ PAN ATTACHED</span>
                      <p className="text-xs font-bold text-[#0A2540] truncate" title={panFile || ''}>{panFile}</p>
                      <span className="text-[10px] text-slate-500">Ready to save with employee profile</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPanFile(null); setPanFileData(null); }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove PAN"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handlePanUpload} />
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      {isReadingPan ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-slate-800 block">PAN CARD UPLOAD</span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {isReadingPan ? 'Processing document...' : 'Upload PDF / PNG / JPG'}
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* Aadhaar Upload */}
              <div className={`border-2 rounded-2xl p-3.5 transition-all ${
                aadhaarFileData 
                  ? 'border-emerald-400 bg-emerald-50/30' 
                  : isReadingAadhaar 
                  ? 'border-teal-300 bg-teal-50/20' 
                  : 'border-dashed border-slate-300 bg-slate-50/80 hover:border-teal-500'
              }`}>
                {aadhaarFileData ? (
                  <div className="flex items-center gap-3">
                    {aadhaarFileData.startsWith('data:image/') ? (
                      <img src={aadhaarFileData} alt="Aadhaar Preview" className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-2xs" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex flex-col items-center justify-center font-bold text-[9px] shadow-2xs">
                        <FileText className="w-5 h-5 mb-0.5 text-red-600" />
                        <span>PDF</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase text-emerald-700 block">✓ AADHAAR ATTACHED</span>
                      <p className="text-xs font-bold text-[#0A2540] truncate" title={aadhaarFile || ''}>{aadhaarFile}</p>
                      <span className="text-[10px] text-slate-500">Ready to save with employee profile</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAadhaarFile(null); setAadhaarFileData(null); }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Aadhaar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleAadhaarUpload} />
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      {isReadingAadhaar ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-slate-800 block">AADHAAR CARD UPLOAD</span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {isReadingAadhaar ? 'Processing document...' : 'Upload PDF / PNG / JPG'}
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: Bank Details */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-1.5">
              <Landmark className="w-4 h-4 text-teal-600" />
              <span>5. Employee Bank Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">BANK NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC / ICICI / SBI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ACCOUNT NUMBER *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50100482910482"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">IFSC CODE *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC0001234"
                  value={bankIfscCode}
                  onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions with CREATE EMPLOYEE button */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 flex items-center justify-between gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 transition-colors text-xs"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={!!emailInUseMember || !!phoneInUseMember || isReadingPan || isReadingAadhaar}
              className={`flex-1 max-w-sm flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-black shadow-lg transition-all text-xs active:scale-98 uppercase tracking-wider ${
                emailInUseMember || phoneInUseMember
                  ? 'bg-slate-400 cursor-not-allowed shadow-none opacity-60'
                  : isReadingPan || isReadingAadhaar
                  ? 'bg-teal-500 cursor-wait opacity-80'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-600/25 cursor-pointer'
              }`}
            >
              {isReadingPan || isReadingAadhaar ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Files...</span>
                </>
              ) : emailInUseMember || phoneInUseMember ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Duplicate Email/Phone</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>CREATE EMPLOYEE</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
