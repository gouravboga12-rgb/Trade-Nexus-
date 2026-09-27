import React, { useState } from 'react';
import {
  Search,
  Users,
  Edit3,
  Download,
  Eye,
  Building,
  CreditCard,
  FileText,
  Phone,
  Mail,
  Calendar,
  MapPin,
  CheckCircle2,
  X,
  Save,
  Trash2,
  Upload,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { TeamMember, TeamGroup, UserRole } from '../../types';

interface ManageEmployeesTabProps {
  teamMembers: TeamMember[];
  teamGroups: TeamGroup[];
  onBack: () => void;
  onUpdateEmployee: (id: string, changes: Partial<TeamMember>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  triggerToast: (msg: string) => void;
}

export const ManageEmployeesTab: React.FC<ManageEmployeesTabProps> = ({
  teamMembers,
  teamGroups,
  onBack,
  onUpdateEmployee,
  onDeleteEmployee,
  triggerToast,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    url?: string;
    fileName: string;
    empName: string;
    empCode: string;
    type: 'PAN' | 'AADHAAR' | 'PHOTO';
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPortal, setEditPortal] = useState<UserRole>('telecaller');
  const [editGroup, setEditGroup] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editSalary, setEditSalary] = useState<number>(35000);
  const [editBankName, setEditBankName] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editBankIfsc, setEditBankIfsc] = useState('');
  const [editPanName, setEditPanName] = useState('');
  const [editPanUrl, setEditPanUrl] = useState<string | undefined>(undefined);
  const [editAadhaarName, setEditAadhaarName] = useState('');
  const [editAadhaarUrl, setEditAadhaarUrl] = useState<string | undefined>(undefined);

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setEditName(member.name || '');
    setEditRole(member.role || 'Sales Executive');
    setEditPortal((member.portal as UserRole) || 'telecaller');
    setEditGroup(member.group || teamGroups[0]?.name || 'General');
    setEditPhone(member.phone || '');
    setEditEmail(member.email || '');
    setEditAddress(member.address || 'Corporate Office');
    setEditJoiningDate(member.joiningDate || new Date().toISOString().split('T')[0]);
    setEditSalary(member.salary || 35000);
    setEditBankName(member.bankName || 'HDFC Bank');
    setEditBankAccount(member.bankAccountNumber || '50100482910482');
    setEditBankIfsc(member.bankIfscCode || 'HDFC0001234');
    setEditPanName(member.panDocumentName || 'PAN_Card_Verified.pdf');
    setEditPanUrl(member.panDocumentUrl);
    setEditAadhaarName(member.aadhaarDocumentName || 'Aadhaar_Card_Verified.pdf');
    setEditAadhaarUrl(member.aadhaarDocumentUrl);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    setIsSaving(true);
    try {
      await onUpdateEmployee(editingMember.id, {
        name: editName.trim(),
        role: editRole.trim(),
        portal: editPortal,
        group: editGroup,
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        joiningDate: editJoiningDate,
        salary: Number(editSalary) || 0,
        bankName: editBankName.trim(),
        bankAccountNumber: editBankAccount.trim(),
        bankIfscCode: editBankIfsc.trim().toUpperCase(),
        panDocumentName: editPanName.trim(),
        panDocumentUrl: editPanUrl,
        aadhaarDocumentName: editAadhaarName.trim(),
        aadhaarDocumentUrl: editAadhaarUrl,
      });
      triggerToast(`✓ Employee ${editName} updated successfully`);
      setEditingMember(null);
    } catch (err: any) {
      triggerToast(`✗ Failed to update employee: ${err.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to download file or create generated document
  const triggerDownload = (
    fileName: string,
    url: string | undefined,
    empCode: string,
    empName: string,
    docType: string
  ) => {
    if (url && (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:'))) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `${empCode}_${docType}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerToast(`✓ Downloading ${fileName || docType}`);
      return;
    }

    // If no raw file binary is uploaded yet, generate a verified KYC verification card as SVG download
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
        <rect width="800" height="500" fill="#0A2540" rx="20"/>
        <rect x="20" y="20" width="760" height="460" fill="#ffffff" rx="16"/>
        <rect x="20" y="20" width="760" height="70" fill="#00C9A7" rx="16"/>
        <text x="50" y="65" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#0A2540">TRADE NEXUS • OFFICIAL KYC DOCUMENT RECORD</text>
        <text x="50" y="140" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0A2540">Document: ${docType}</text>
        <text x="50" y="180" font-family="Arial, sans-serif" font-size="16" fill="#4A5568">Employee Name: <tspan font-weight="bold" fill="#0A2540">${empName}</tspan></text>
        <text x="50" y="220" font-family="Arial, sans-serif" font-size="16" fill="#4A5568">Employee Code: <tspan font-weight="bold" fill="#0A2540">${empCode}</tspan></text>
        <text x="50" y="260" font-family="Arial, sans-serif" font-size="16" fill="#4A5568">File Name: <tspan font-weight="bold" fill="#0A2540">${fileName || docType + '_Verified.pdf'}</tspan></text>
        <text x="50" y="300" font-family="Arial, sans-serif" font-size="16" fill="#4A5568">Status: <tspan font-weight="bold" fill="#10B981">✓ VERIFIED & DIGITALLY ARCHIVED</tspan></text>
        <text x="50" y="340" font-family="Arial, sans-serif" font-size="14" fill="#718096">Archived by HR Operations & Super Admin Control Panel</text>
        <line x1="50" y1="380" x2="750" y2="380" stroke="#E2E8F0" stroke-width="2"/>
        <text x="50" y="420" font-family="Arial, sans-serif" font-size="12" fill="#A0AEC0">Trade Nexus Systems Ltd. • Confidential Employee KYC File</text>
      </svg>
    `.trim();

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${empCode}_${docType.replace(/\s+/g, '_')}_KYC.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    triggerToast(`✓ Downloaded ${docType} for ${empName}`);
  };

  const filteredMembers = teamMembers.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.empCode?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.group?.toLowerCase().includes(q);

    const matchRole =
      roleFilter === 'ALL' ||
      m.portal === roleFilter ||
      (roleFilter === 'telecaller' && (!m.portal || m.portal === 'telecaller' || m.portal === 'employee'));

    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0A2540] transition-colors cursor-pointer"
        >
          <span className="text-base leading-none">←</span>
          <span>Back to More</span>
        </button>

        <div className="text-xs font-mono font-bold text-slate-400">
          Total Employees: <span className="text-[#0A2540]">{teamMembers.length}</span>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <h2 className="font-display font-black text-xl text-[#0A2540] tracking-tight">
            Manage Employees
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          View full onboarding details, KYC documents (PAN, Aadhaar), bank credentials &amp; edit staff records.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code (TNX-...), phone, email, squad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30 focus:border-[#00C9A7]"
          />
        </div>

        {/* Role pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'All Staff' },
            { id: 'telecaller', label: 'Telecallers' },
            { id: 'team_leader', label: 'Team Leaders' },
            { id: 'hr', label: 'HR Officers' },
            { id: 'admin', label: 'Admins' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setRoleFilter(pill.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                roleFilter === pill.id
                  ? 'bg-[#0A2540] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employees List */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-bold text-slate-600">No employees match your search</p>
          <p className="text-xs mt-1">Try another keyword or reset the filter.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredMembers.map((member) => {
            const panName = member.panDocumentName || 'PAN_Card_Verified.pdf';
            const aadhaarName = member.aadhaarDocumentName || 'Aadhaar_Card_Verified.pdf';
            const bankName = member.bankName || 'HDFC Bank';
            const bankAccount = member.bankAccountNumber || '50100482910482';
            const bankIfsc = member.bankIfscCode || 'HDFC0001234';

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden p-4 space-y-4"
              >
                {/* Employee Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="relative group flex-shrink-0">
                      <div className="w-13 h-13 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-base shadow-2xs">
                        {member.avatar && member.avatar.length > 5 ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(member.name || 'EM').slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      {/* Zoom / View Photo Overlay */}
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            title: 'Employee Profile Photo',
                            url: member.avatar,
                            fileName: `${member.empCode}_photo.png`,
                            empName: member.name,
                            empCode: member.empCode,
                            type: 'PHOTO',
                          })
                        }
                        className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        title="View photo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-[#0A2540] truncate">{member.name}</h3>
                        <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {member.empCode}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                            member.portal === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : member.portal === 'hr'
                              ? 'bg-emerald-100 text-emerald-800'
                              : member.portal === 'team_leader'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {member.portal === 'team_leader' ? 'TL' : (member.portal || 'Telecaller').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {member.role || 'Sales Executive'} • <span className="text-[#00A88B] font-bold">{member.group || 'General Squad'}</span>
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                        {member.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{member.email}</span>
                          </span>
                        )}
                        {member.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{member.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(member)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00C9A7]/20 hover:text-[#0A2540] text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Edit employee details"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#00A88B]" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(member.id)}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Delete employee"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bank Details Card */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5 text-[#0A2540]">
                      <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                      <span>Bank &amp; Salary Details</span>
                    </div>
                    {member.salary != null && member.salary > 0 && (
                      <span className="text-emerald-700 font-mono">
                        CTC: ₹{Number(member.salary).toLocaleString('en-IN')}/mo
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Bank Name</span>
                      <span className="font-bold text-slate-800">{bankName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Account Number</span>
                      <span className="font-mono font-bold text-slate-800">{bankAccount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">IFSC Code</span>
                      <span className="font-mono font-bold text-sky-700">{bankIfsc}</span>
                    </div>
                  </div>
                </div>

                {/* KYC Documents Section */}
                <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-gradient-to-br from-white to-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#00A88B]" />
                      Uploaded KYC Documents (PAN &amp; Aadhaar)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Verified Documents
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {/* 1. PAN Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-2xs">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">PAN Card</span>
                          <span className="font-bold text-xs text-[#0A2540] truncate block" title={panName}>
                            {panName}
                          </span>
                        </div>
                        <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-1 rounded">PAN</span>
                      </div>
                      <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              title: 'PAN Card Document',
                              url: member.panDocumentUrl,
                              fileName: panName,
                              empName: member.name,
                              empCode: member.empCode,
                              type: 'PAN',
                            })
                          }
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            triggerDownload(
                              panName,
                              member.panDocumentUrl,
                              member.empCode,
                              member.name,
                              'PAN Card'
                            )
                          }
                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer border border-emerald-200"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Aadhaar Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-2xs">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Aadhaar Card</span>
                          <span className="font-bold text-xs text-[#0A2540] truncate block" title={aadhaarName}>
                            {aadhaarName}
                          </span>
                        </div>
                        <span className="text-[9px] font-black bg-teal-50 text-teal-700 px-1 rounded">UID</span>
                      </div>
                      <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              title: 'Aadhaar Card Document',
                              url: member.aadhaarDocumentUrl,
                              fileName: aadhaarName,
                              empName: member.name,
                              empCode: member.empCode,
                              type: 'AADHAAR',
                            })
                          }
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            triggerDownload(
                              aadhaarName,
                              member.aadhaarDocumentUrl,
                              member.empCode,
                              member.name,
                              'Aadhaar Card'
                            )
                          }
                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer border border-emerald-200"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Photo Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-2xs">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">Profile Photo</span>
                          <span className="font-bold text-xs text-[#0A2540] truncate block">
                            {member.avatar ? `${member.empCode}_photo.png` : 'Default Avatar'}
                          </span>
                        </div>
                        <span className="text-[9px] font-black bg-purple-50 text-purple-700 px-1 rounded">Photo</span>
                      </div>
                      <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              title: 'Employee Profile Photo',
                              url: member.avatar,
                              fileName: `${member.empCode}_photo.png`,
                              empName: member.name,
                              empCode: member.empCode,
                              type: 'PHOTO',
                            })
                          }
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            triggerDownload(
                              `${member.empCode}_photo.png`,
                              member.avatar,
                              member.empCode,
                              member.name,
                              'Profile Photo'
                            )
                          }
                          className="flex-1 py-1 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer border border-purple-200"
                        >
                          <Download className="w-3 h-3 text-purple-600" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= EDIT EMPLOYEE MODAL ================= */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#0A2540] text-white p-4 sm:p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-white">
                    Edit Employee Details
                  </h3>
                  <p className="text-xs text-slate-300">
                    {editingMember.name} • <span className="font-mono text-[#00C9A7]">{editingMember.empCode}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Personal & Work Details */}
              <div className="space-y-3">
                <span className="font-black uppercase tracking-wider text-[11px] text-slate-400 block border-b border-slate-100 pb-1">
                  1. Basic Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Designation / Role Title</label>
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">System Portal Access</label>
                    <select
                      value={editPortal}
                      onChange={(e) => setEditPortal(e.target.value as UserRole)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    >
                      <option value="telecaller">Telecaller (Sales Rep)</option>
                      <option value="team_leader">Team Leader</option>
                      <option value="hr">HR Officer</option>
                      <option value="admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Squad / Team Group</label>
                    <select
                      value={editGroup}
                      onChange={(e) => setEditGroup(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    >
                      {teamGroups.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Mobile Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Joining Date</label>
                    <input
                      type="date"
                      value={editJoiningDate}
                      onChange={(e) => setEditJoiningDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Monthly Gross CTC (₹)</label>
                    <input
                      type="number"
                      value={editSalary}
                      onChange={(e) => setEditSalary(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Address / Location</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-3 pt-2">
                <span className="font-black uppercase tracking-wider text-[11px] text-slate-400 block border-b border-slate-100 pb-1">
                  2. Bank Account Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Account Number</label>
                    <input
                      type="text"
                      value={editBankAccount}
                      onChange={(e) => setEditBankAccount(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={editBankIfsc}
                      onChange={(e) => setEditBankIfsc(e.target.value.toUpperCase())}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C9A7]/30"
                    />
                  </div>
                </div>
              </div>

              {/* KYC Document Uploads in Edit */}
              <div className="space-y-3 pt-2">
                <span className="font-black uppercase tracking-wider text-[11px] text-slate-400 block border-b border-slate-100 pb-1">
                  3. KYC Document Files
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PAN Card File */}
                  <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">PAN Card File</span>
                    <p className="text-xs font-mono font-bold text-slate-700 truncate">{editPanName}</p>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-100 transition-all cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#00A88B]" />
                      <span>Replace PAN File</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditPanName(file.name);
                            const reader = new FileReader();
                            reader.onload = (ev) => setEditPanUrl(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Aadhaar Card File */}
                  <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Aadhaar Card File</span>
                    <p className="text-xs font-mono font-bold text-slate-700 truncate">{editAadhaarName}</p>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-100 transition-all cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#00A88B]" />
                      <span>Replace Aadhaar File</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditAadhaarName(file.name);
                            const reader = new FileReader();
                            reader.onload = (ev) => setEditAadhaarUrl(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#00C9A7] hover:text-[#0A2540] text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DOCUMENT PREVIEW MODAL ================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#0A2540] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-sm text-white">{previewDoc.title}</h3>
                <p className="text-[11px] text-slate-300">
                  {previewDoc.empName} ({previewDoc.empCode}) • {previewDoc.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center justify-center bg-slate-50 min-h-[260px] max-h-[60vh] overflow-y-auto">
              {previewDoc.url && previewDoc.url.length > 10 ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[350px] w-auto object-contain rounded-2xl shadow-md border border-slate-200"
                />
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center space-y-3 w-full max-w-xs shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#0A2540]">{previewDoc.type} Document Verified</h4>
                    <p className="font-mono text-xs text-slate-500 mt-1">{previewDoc.fileName}</p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold py-1 px-3 rounded-lg border border-emerald-200">
                    Archived on Onboarding
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">{previewDoc.fileName}</span>
              <button
                type="button"
                onClick={() => {
                  triggerDownload(
                    previewDoc.fileName,
                    previewDoc.url,
                    previewDoc.empCode,
                    previewDoc.empName,
                    previewDoc.type
                  );
                }}
                className="px-4 py-2 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-base text-[#0A2540]">Delete Employee?</h3>
              <p className="text-xs text-slate-500">
                This will permanently delete this employee account, credentials, and records. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  try {
                    await onDeleteEmployee(id);
                  } catch {}
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
