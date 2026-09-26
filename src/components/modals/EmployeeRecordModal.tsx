import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TeamMember, UserRole } from '../../types';
import { api } from '../../services/api';
import {
  X,
  Phone,
  Mail,
  Users,
  CalendarCheck,
  PhoneCall,
  Save,
  UserMinus,
  UserCheck,
  MapPin,
  ShieldAlert,
  FileText,
  UploadCloud,
  Trash2,
  Download,
} from 'lucide-react';

interface Props {
  employee: TeamMember | null;
  onClose: () => void;
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const PORTAL_LABEL: Record<UserRole, string> = {
  telecaller: 'Employee',
  employee: 'Employee',
  team_leader: 'Team Leader',
  hr: 'HR',
  admin: 'Admin',
};

type Tab = 'details' | 'attendance' | 'work' | 'documents';

/**
 * Everything about one employee, opened by clicking their name.
 * Admin-only: the attendance tab shows the check-in photo and location, which
 * the server sends to nobody else.
 */
export const EmployeeRecordModal: React.FC<Props> = ({ employee, onClose }) => {
  const { teamGroups, attendanceLogs, updateEmployee, setEmployeeActive, deleteEmployee, currentUser } = useApp();

  const [tab, setTab] = useState<Tab>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<TeamMember>>({});
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [documents, setDocuments] = useState<any[]>([]);
  const [docCategory, setDocCategory] = useState('ID Proof');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const employeeId = employee?.id;
  useEffect(() => {
    if (!employeeId) return;
    api.getEmployeeDocuments(employeeId).then(setDocuments).catch(() => setDocuments([]));
  }, [employeeId]);

  const handleUpload = async (file: File) => {
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('That file is over 5 MB. Please upload a smaller one.');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const saved = await api.uploadEmployeeDocument({
          employeeId: employeeId!,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: docCategory,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          content: String(reader.result ?? ''),
        });
        setDocuments((prev) => [saved, ...prev]);
      } catch {
        setUploadError('Could not upload that file.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setUploadError('Could not read that file.');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const openDocument = async (id: string) => {
    try {
      const full = await api.getEmployeeDocument(id);
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${full.content}" style="width:100%;height:100%;border:0" title="${full.fileName}"></iframe>`
        );
      }
    } catch {
      setUploadError('Could not open that document.');
    }
  };

  const removeDocument = async (id: string) => {
    try {
      await api.deleteEmployeeDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setUploadError('Could not delete that document.');
    }
  };

  if (!employee) return null;

  const value = <K extends keyof TeamMember>(key: K): TeamMember[K] =>
    (draft[key] !== undefined ? draft[key] : employee[key]) as TeamMember[K];

  const isActive = employee.active !== 0;
  const initials = employee.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const myAttendance = attendanceLogs
    .filter((a) => a.employeeId === employee.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const save = async () => {
    await updateEmployee(employee.id, draft);
    setDraft({});
    setIsEditing(false);
  };

  const locationChip = (record: (typeof myAttendance)[number]) => {
    if (record.locationStatus === 'AT_OFFICE')
      return <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">At office</span>;
    if (record.locationStatus === 'AWAY')
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-700">
          {record.checkInDistanceM != null
            ? `${(record.checkInDistanceM / 1000).toFixed(1)} km away`
            : 'Away'}
        </span>
      );
    if (record.locationStatus === 'OFFICE_NOT_SET')
      return <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500">Office not set</span>;
    return <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500">Not shared</span>;
  };

  const Field: React.FC<{ label: string; k: keyof TeamMember; type?: string }> = ({ label, k, type = 'text' }) => (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {isEditing ? (
        <input
          type={type}
          value={String(value(k) ?? '')}
          onChange={(e) =>
            setDraft((d) => ({ ...d, [k]: type === 'number' ? Number(e.target.value) : e.target.value }))
          }
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
        />
      ) : (
        <span className="text-xs font-semibold text-[#0A2540]">{String(employee[k] ?? '—')}</span>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200">

        {/* Header */}
        <div className="bg-[#0A192F] px-5 py-4 text-white flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#00C9A7] text-[#0A2540] flex items-center justify-center font-black text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-white truncate flex items-center gap-2">
                {employee.name}
                {!isActive && (
                  <span className="text-[9px] bg-rose-500/30 text-rose-200 font-black px-1.5 py-0.5 rounded uppercase">
                    Deactivated
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {employee.role} · {employee.empCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-2">
          {([
            ['details', 'Details', Users],
            ['attendance', 'Attendance', CalendarCheck],
            ['work', 'Work', PhoneCall],
            ['documents', 'Documents', FileText],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                tab === id
                  ? 'border-[#00C9A7] text-[#0A2540]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">

          {tab === 'details' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" k="name" />
                <Field label="Employee code" k="empCode" />
                <Field label="Job title" k="role" />
                <Field label="Phone" k="phone" />
                <Field label="Email" k="email" type="email" />

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Team
                  </label>
                  {isEditing ? (
                    <select
                      value={String(value('group') ?? '')}
                      onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                    >
                      <option value="">— No team —</option>
                      {teamGroups.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-[#0A2540]">{employee.group || '—'}</span>
                  )}
                  {!isEditing && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Reports to {teamGroups.find((g) => g.name === employee.group)?.leaderName || '—'}
                    </span>
                  )}
                </div>

                {/* The portal decides which app opens when they log in */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Portal access
                  </label>
                  {isEditing ? (
                    <select
                      value={String(value('portal') ?? 'telecaller')}
                      onChange={(e) => setDraft((d) => ({ ...d, portal: e.target.value as UserRole }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                    >
                      <option value="telecaller">Telecaller</option>
                      <option value="team_leader">Team Leader</option>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-[#0A2540]">
                      {PORTAL_LABEL[(employee.portal as UserRole) ?? 'telecaller']}
                    </span>
                  )}
                  {!isEditing && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Decides which dashboard they see when they log in
                    </span>
                  )}
                </div>

                <Field label="Daily call goal" k="goalCalls" type="number" />
                <Field label="Monthly sales target" k="salesTarget" type="number" />
              </div>

              {!isEditing && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={`tel:${employee.phone}`}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{employee.phone}</span>
                  </a>
                  {employee.email && (
                    <a
                      href={`mailto:${employee.email}`}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{employee.email}</span>
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'attendance' && (
            <>
              <p className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>The photo and location below are visible to Admin only.</span>
              </p>

              {!myAttendance.length ? (
                <p className="text-center text-xs text-slate-400 font-semibold py-8">
                  No check-ins recorded for {employee.name.split(' ')[0]} yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {myAttendance.map((a) => (
                    <div
                      key={a.id || a.date}
                      className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3"
                    >
                      {a.checkInPhoto ? (
                        <img
                          src={a.checkInPhoto}
                          alt={`${employee.name} at check-in`}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-slate-500">No photo</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-[#0A2540] block">
                          {new Date(`${a.date}T00:00:00`).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          In {a.checkIn || '—'} · Out {a.checkOut || '—'}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {locationChip(a)}
                        </div>
                      </div>

                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 flex-shrink-0">
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'work' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Calls today', String(employee.dialsToday ?? 0)],
                ['Daily goal', String(employee.goalCalls ?? 0)],
                ['Connected', String(employee.connected ?? 0)],
                ['Interested', String(employee.interested ?? 0)],
                ['Conversion', `${employee.conversionRate ?? 0}%`],
                ['Attendance', employee.attendanceStatus.replace('_', ' ')],
                ['Sales achieved', inr(employee.salesAchieved ?? 0)],
                ['Sales target', inr(employee.salesTarget ?? 0)],
                [
                  'Target met',
                  `${Math.round(((employee.salesAchieved ?? 0) / Math.max(1, employee.salesTarget ?? 0)) * 100)}%`,
                ],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {label}
                  </span>
                  <span className="font-mono-nums font-black text-base text-[#0A2540] block mt-0.5">{val}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'documents' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                >
                  {['ID Proof', 'Certificate', 'Contract', 'Offer Letter', 'Bank Details', 'Other'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95">
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploading ? 'Uploading…' : 'Upload document'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(file);
                    }}
                  />
                </label>
              </div>

              {uploadError && (
                <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {uploadError}
                </p>
              )}

              {!documents.length ? (
                <p className="text-center text-xs text-slate-400 font-semibold py-8">
                  No documents stored for {employee.name.split(' ')[0]} yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-[#0A2540] block truncate">{d.title}</span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {d.category} · {d.fileName}
                          {d.sizeBytes ? ` · ${(d.sizeBytes / 1024).toFixed(0)} KB` : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => openDocument(d.id)}
                        title="Open"
                        className="p-2 rounded-lg text-slate-500 hover:text-[#00A88B] hover:bg-white transition-all flex-shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeDocument(d.id)}
                        title="Delete"
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
                PDF, image or Word files up to 5 MB. Stored with the employee record and visible to
                Admin and HR only.
              </p>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setDraft({});
                  setIsEditing(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="flex items-center gap-1.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save changes</span>
              </button>
            </>
          ) : confirmDeactivate ? (
            <>
              <span className="text-xs font-bold text-rose-700">
                Deactivate {employee.name}? Their records are kept.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeactivate(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await setEmployeeActive(employee.id, false);
                    setConfirmDeactivate(false);
                    onClose();
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-all"
                >
                  Yes, deactivate
                </button>
              </div>
            </>
          ) : confirmDelete ? (
            <>
              <div className="flex-1 min-w-[200px]">
                <span className="text-xs font-black text-rose-700 block">
                  Permanently delete {employee.name} ({employee.empCode})?
                </span>
                <span className="text-[10px] text-slate-500 block">
                  All credentials, attendance, biometrics, and documents will be purged.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setConfirmDelete(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      await deleteEmployee(employee.id);
                      setConfirmDelete(false);
                      onClose();
                    } catch (err) {
                      console.error('Delete failed:', err);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {isActive ? (
                  <button
                    onClick={() => setConfirmDeactivate(true)}
                    className="flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Deactivate</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setEmployeeActive(employee.id, true)}
                    className="flex items-center gap-1.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Reactivate</span>
                  </button>
                )}

                {/* Delete Employee - Admin only & Protected from Super Admin */}
                {currentUser?.role === 'admin' && employee.portal !== 'admin' && employee.empCode !== 'TNX-AD01' && !(employee.role || '').toLowerCase().includes('admin') && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#0A2540] hover:bg-[#0F3258] text-white font-black text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-all"
              >
                Edit details
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
