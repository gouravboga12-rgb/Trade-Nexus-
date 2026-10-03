import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Save, Eye, Send, Mail, Upload, Trash2, AlertTriangle, CheckCircle2, Loader2,
  Edit3, Wallet, FileText, Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, ApiError } from '../../services/api';
import { PayslipItem, TeamMember } from '../../types';
import { PayslipDocument } from '../payroll/PayslipDocument';
import {
  MONTHS, PAYROLL_SECTIONS, PayrollField, buildDraftFromEmployee, computePayrollTotals,
  missingRequiredFields, toPayrollPayload, periodSortValue, formatINR, defaultPayDate,
  getPayrollAvailableYears,
} from '../payroll/payrollTemplate';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Open an existing payroll record (edit draft / view dispatched). */
  initialPayslip?: PayslipItem | null;
}

const MAX_SIGNATURE_BYTES = 300 * 1024;

const samePeriod = (p: PayslipItem, emp: TeamMember, month: string, year: number) =>
  (p.employeeId === emp.id || (!!emp.empCode && (p.empCode === emp.empCode || p.employeeCode === emp.empCode))) &&
  String(p.month || '').toLowerCase() === month.toLowerCase() &&
  Number(p.year) === Number(year);

const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const PayrollBuilderModal: React.FC<Props> = ({ isOpen, onClose, initialPayslip }) => {
  const { teamMembers, payslips, savePayrollDraft, dispatchPayroll, sendPayslipEmailToEmployee, triggerToast } = useApp();

  const now = new Date();
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const [form, setForm] = useState<Partial<PayslipItem>>({});
  const [record, setRecord] = useState<PayslipItem | null>(null);
  const [dirty, setDirty] = useState(false);
  const [revising, setRevising] = useState(false);
  const [busy, setBusy] = useState<null | 'save' | 'preview' | 'dispatch' | 'resend'>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [confirmDispatch, setConfirmDispatch] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const fileRef = useRef<HTMLInputElement>(null);

  const employees = useMemo(
    () => teamMembers.filter(m => m.active !== 0).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [teamMembers]
  );
  const employee = employees.find(e => e.id === employeeId) || teamMembers.find(e => e.id === employeeId);

  const isDispatched = record?.payrollStatus === 'DISPATCHED';
  const readOnly = isDispatched && !revising;
  const totals = computePayrollTotals(form);

  const availableYears = useMemo(
    () => getPayrollAvailableYears(year, payslips.map(p => Number(p.year))),
    [year, payslips]
  );

  /** Load the record for employee + period, or prefill a fresh draft from the employee master. */
  const loadPeriod = (empId: string, m: string, y: number) => {
    setMissing([]);
    setRevising(false);
    setDirty(false);
    const emp = teamMembers.find(e => e.id === empId);
    if (!emp) { setRecord(null); setForm({}); return; }
    const existing = payslips.find(p => samePeriod(p, emp, m, y));
    if (existing) {
      setRecord(existing);
      setForm({ ...existing, empCode: existing.empCode || existing.employeeCode });
      return;
    }
    const previous = payslips
      .filter(p => p.employeeId === emp.id || (!!emp.empCode && p.empCode === emp.empCode))
      .sort((a, b) => periodSortValue(b) - periodSortValue(a))[0];
    setRecord(null);
    setForm(buildDraftFromEmployee(emp, m, y, previous));
  };

  // Initialise whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setConfirmDispatch(false);
    setMobileTab('edit');
    if (initialPayslip) {
      const emp = teamMembers.find(e => e.id === initialPayslip.employeeId || (!!initialPayslip.empCode && e.empCode === initialPayslip.empCode));
      const m = initialPayslip.month;
      const y = Number(initialPayslip.year);
      setEmployeeId(emp?.id || initialPayslip.employeeId || '');
      setMonth(m);
      setYear(y);
      setRecord(initialPayslip);
      setForm({ ...initialPayslip, empCode: initialPayslip.empCode || initialPayslip.employeeCode });
      setDirty(false);
      setRevising(false);
      setMissing([]);
    } else {
      setEmployeeId('');
      setMonth(MONTHS[now.getMonth()]);
      setYear(now.getFullYear());
      setRecord(null);
      setForm({});
      setDirty(false);
      setRevising(false);
      setMissing([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPayslip?.id]);

  // Keep the open record in sync with context updates (e.g. after dispatch)
  useEffect(() => {
    if (!record) return;
    const fresh = payslips.find(p => p.id === record.id);
    if (fresh && fresh !== record && !dirty) {
      setRecord(fresh);
      setForm({ ...fresh, empCode: fresh.empCode || fresh.employeeCode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payslips]);

  if (!isOpen) return null;

  const confirmDiscard = () => !dirty || window.confirm('You have unsaved changes. Discard them?');

  const changeEmployee = (id: string) => {
    if (!confirmDiscard()) return;
    setEmployeeId(id);
    loadPeriod(id, month, year);
  };

  const changePeriod = (m: string, y: number) => {
    if (!confirmDiscard()) return;
    setMonth(m);
    setYear(y);
    if (employeeId) loadPeriod(employeeId, m, y);
  };

  const setField = (key: keyof PayslipItem, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setMissing(prev => prev.filter(label => label !== PAYROLL_SECTIONS.flatMap(s => s.fields).find(f => f.key === key)?.label));
  };

  const handleSignature = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) { triggerToast('⚠️ Signature must be a PNG or JPG image'); return; }
    if (file.size > MAX_SIGNATURE_BYTES) { triggerToast('⚠️ Signature image must be under 300 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => setField('authorizedSignature', String(reader.result));
    reader.readAsDataURL(file);
  };

  const payload = () => toPayrollPayload({ ...form, month, year, employeeId: employee?.id || form.employeeId });

  /** Persist the current form. Returns the saved record. */
  const persist = async (): Promise<PayslipItem> => {
    const data = payload();
    try {
      const saved = record
        ? await savePayrollDraft(data, { id: record.id, confirmRevision: revising })
        : await savePayrollDraft(data);
      setRecord(saved);
      setForm({ ...saved, empCode: saved.empCode || saved.employeeCode });
      setDirty(false);
      return saved;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.data?.existingId) {
        const existing = payslips.find(p => p.id === err.data.existingId);
        if (existing) { setRecord(existing); setForm(existing); setDirty(false); }
      }
      throw err;
    }
  };

  const handleSaveDraft = async () => {
    if (!employee) { triggerToast('⚠️ Select an employee first'); return; }
    setBusy('save');
    try {
      await persist();
      triggerToast(revising ? '✓ Revision saved — re-dispatch to update the employee copy' : `✓ ${month} ${year} payroll saved as draft`);
    } catch (err: any) {
      triggerToast(`✗ ${err.message || 'Could not save payroll'}`);
    } finally {
      setBusy(null);
    }
  };

  const handlePreviewPdf = async () => {
    if (!employee) { triggerToast('⚠️ Select an employee first'); return; }
    const win = window.open('', '_blank');
    setBusy('preview');
    try {
      const blob = await api.previewPayslipPdf(payload());
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url; else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      win?.close();
      triggerToast(`✗ ${err.message || 'Preview failed'}`);
    } finally {
      setBusy(null);
    }
  };

  const requestDispatch = () => {
    if (!employee) { triggerToast('⚠️ Select an employee first'); return; }
    const miss = missingRequiredFields(payload());
    setMissing(miss);
    if (miss.length) {
      setMobileTab('edit');
      triggerToast(`⚠️ Complete required fields: ${miss.join(', ')}`);
      return;
    }
    setConfirmDispatch(true);
  };

  const handleDispatch = async () => {
    setConfirmDispatch(false);
    setBusy('dispatch');
    const wasDispatched = isDispatched;
    try {
      const saved = await persist();
      const result = await dispatchPayroll(saved.id, { resend: wasDispatched });
      setRecord(result.payslip);
      setForm({ ...result.payslip, empCode: result.payslip.empCode || result.payslip.employeeCode });
      setRevising(false);
      setDirty(false);
      const emailed = result.emailResult && result.emailResult.success !== false;
      triggerToast(
        emailed
          ? `✓ ${month} ${year} payroll dispatched & emailed to ${result.payslip.email}`
          : `✓ Payroll dispatched to the employee account (email not delivered: ${result.emailResult?.error || 'mail service unavailable'})`
      );
    } catch (err: any) {
      if (err instanceof ApiError && Array.isArray(err.data?.missing)) setMissing(err.data.missing);
      triggerToast(`✗ ${err.message || 'Dispatch failed'}`);
    } finally {
      setBusy(null);
    }
  };

  const handleResend = async () => {
    if (!record) return;
    setBusy('resend');
    try {
      await sendPayslipEmailToEmployee(record.id, record.email);
    } finally {
      setBusy(null);
    }
  };

  const startRevision = () => {
    if (window.confirm(`${month} ${year} payroll was already dispatched to ${record?.employeeName}. Revise it? The employee copy updates only after you re-dispatch.`)) {
      setRevising(true);
    }
  };

  const inputCls = (f: PayrollField) =>
    `w-full rounded-xl border px-3 py-2 text-sm font-semibold text-[#0A2540] bg-white outline-none transition-all focus:border-[#00C9A7] focus:ring-2 focus:ring-[#00C9A7]/20 disabled:bg-slate-50 disabled:text-slate-500 ${
      missing.includes(f.label) ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
    }`;

  const renderField = (f: PayrollField) => {
    if (f.key === 'month' || f.key === 'year') return null; // period is chosen in the top selector
    const value = form[f.key] as any;
    const id = `payroll-field-${String(f.key)}`;
    const label = (
      <label htmlFor={id} className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
        {f.label}{f.required && <span className="text-rose-500">*</span>}
      </label>
    );

    if (f.type === 'signature') {
      return (
        <div key={String(f.key)} className="sm:col-span-2">
          {label}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-14 w-44 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
              {value ? <img src={value} alt="Signature" className="max-h-12 max-w-[10rem] object-contain" /> : <span className="text-[11px] text-slate-400">No signature</span>}
            </div>
            {!readOnly && (
              <>
                <input ref={fileRef} id={id} type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => { handleSignature(e.target.files?.[0]); e.target.value = ''; }} />
                <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#0A2540] hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
                {value && (
                  <button type="button" onClick={() => setField('authorizedSignature', null)} className="px-3 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </>
            )}
          </div>
          {f.hint && <p className="text-[10px] text-slate-400 mt-1">{f.hint}</p>}
        </div>
      );
    }

    return (
      <div key={String(f.key)} className={f.wide ? 'sm:col-span-2' : ''}>
        {label}
        {f.type === 'select' ? (
          <select id={id} disabled={readOnly} value={value ?? ''} onChange={e => setField(f.key, e.target.value)} className={inputCls(f)}>
            {value && !f.options?.includes(value) && <option value={value}>{value}</option>}
            {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : f.type === 'money' ? (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
            <input id={id} type="number" min={0} step="0.01" disabled={readOnly}
              value={value === undefined || value === null ? '' : value}
              onChange={e => setField(f.key, e.target.value === '' ? 0 : Number(e.target.value))}
              className={`${inputCls(f)} pl-7 font-mono`} />
          </div>
        ) : (
          <input id={id} type={f.type === 'email' ? 'email' : 'text'} disabled={readOnly} placeholder={f.placeholder}
            value={value ?? ''} onChange={e => setField(f.key, e.target.value)} className={inputCls(f)} />
        )}
        {f.hint && <p className="text-[10px] text-slate-400 mt-1">{f.hint}</p>}
      </div>
    );
  };

  const statusBadge = isDispatched
    ? <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Dispatched</span>
    : record
      ? <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider">Draft</span>
      : employee
        ? <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">New · Unsaved</span>
        : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020817]/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full h-full sm:h-[94vh] sm:max-w-7xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#06152B] to-[#0A2540] text-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#00C9A7]/15 border border-[#00C9A7]/30 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#00C9A7]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-black text-base sm:text-lg leading-tight truncate">Payroll Builder</h2>
              <p className="text-[11px] text-slate-300 truncate">Select employee → month → customize → preview → dispatch</p>
            </div>
            {statusBadge}
          </div>
          <button id="payroll-builder-close" onClick={() => { if (confirmDiscard()) onClose(); }} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Employee + period selector */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50 grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr] gap-3 flex-shrink-0">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="payroll-employee" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Employee <span className="text-rose-500">*</span></label>
            <select id="payroll-employee" value={employeeId} onChange={e => changeEmployee(e.target.value)} disabled={!!initialPayslip && isDispatched}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#0A2540] focus:border-[#00C9A7] outline-none">
              <option value="">— Select employee —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.empCode} • {e.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="payroll-month" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Month <span className="text-rose-500">*</span></label>
            <select id="payroll-month" value={month} onChange={e => changePeriod(e.target.value, year)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#0A2540] focus:border-[#00C9A7] outline-none">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="payroll-year" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Year <span className="text-rose-500">*</span></label>
            <select id="payroll-year" value={year} onChange={e => changePeriod(month, Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#0A2540] focus:border-[#00C9A7] outline-none">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="lg:hidden flex border-b border-slate-200 flex-shrink-0">
          {(['edit', 'preview'] as const).map(tab => (
            <button key={tab} onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer ${mobileTab === tab ? 'text-[#00A88B] border-b-2 border-[#00C9A7]' : 'text-slate-400'}`}>
              {tab === 'edit' ? 'Customize Fields' : 'Live Preview'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Form */}
          <div className={`overflow-y-auto p-4 sm:p-6 space-y-5 ${mobileTab === 'edit' ? 'block' : 'hidden'} lg:block`}>
            {!employee ? (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                <FileText className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-500">Select an employee and payroll month to begin</p>
                <p className="text-xs">Existing drafts or dispatched payroll for that month load automatically.</p>
              </div>
            ) : (
              <>
                {isDispatched && (
                  <div className={`rounded-2xl border p-3.5 text-xs flex items-start gap-3 ${revising ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                    {revising ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-black">{revising ? 'Revising a dispatched payroll' : `Dispatched on ${fmtDateTime(record?.dispatchedAt)} by ${record?.dispatchedBy || 'HR'}`}</p>
                      <p className="mt-0.5 opacity-80">
                        {revising
                          ? 'Edits are saved to this month only. Click "Save & Re-dispatch" to replace the employee copy and email it again.'
                          : 'This month is locked to prevent accidental changes. Use Resend Email or Revise.'}
                      </p>
                    </div>
                  </div>
                )}

                {missing.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div><p className="font-black">Complete these fields before dispatch</p><p className="mt-0.5">{missing.join(' · ')}</p></div>
                  </div>
                )}

                {PAYROLL_SECTIONS.map(section => {
                  const fields = section.fields.filter(f => f.key !== 'month' && f.key !== 'year');
                  return (
                    <section key={section.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-3">
                        <h3 className="font-display font-black text-sm text-[#0A2540] flex items-center gap-2">
                          {section.id === 'period' && <Calendar className="w-4 h-4 text-[#00A88B]" />}
                          {section.title}
                        </h3>
                        <p className="text-[11px] text-slate-400">{section.description}</p>
                      </div>
                      {section.id === 'period' && (
                        <p className="text-[11px] text-slate-500 mb-3">Payroll month: <strong className="text-[#0A2540]">{month} {year}</strong>
                          {!readOnly && form.payDate !== defaultPayDate(month, year) && (
                            <button type="button" onClick={() => setField('payDate', defaultPayDate(month, year))} className="ml-2 text-[#00A88B] font-bold hover:underline cursor-pointer">Use last day of month</button>
                          )}
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{fields.map(renderField)}</div>
                      {section.id === 'earnings' && <p className="mt-3 text-xs font-bold text-right text-[#00A88B]">Total Earnings: {formatINR(totals.totalEarnings)}</p>}
                      {section.id === 'deductions' && <p className="mt-3 text-xs font-bold text-right text-rose-600">Total Deductions: {formatINR(totals.totalDeductions)}</p>}
                      {section.id === 'payment' && (
                        <div className="mt-3 rounded-xl bg-[#E6FAF6] px-3 py-2 flex items-center justify-between">
                          <span className="text-xs font-black text-[#0A2540] uppercase">Net Pay (auto)</span>
                          <span className={`font-mono font-black ${totals.netPay < 0 ? 'text-rose-600' : 'text-[#00A88B]'}`}>{formatINR(totals.netPay)}</span>
                        </div>
                      )}
                    </section>
                  );
                })}
              </>
            )}
          </div>

          {/* Live preview — identical template to the dispatched PDF */}
          <div className={`overflow-y-auto bg-slate-100 p-3 sm:p-6 ${mobileTab === 'preview' ? 'block' : 'hidden'} lg:block`}>
            {employee ? (
              <div className="max-w-[640px] mx-auto">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Live preview · final document</p>
                <div className="rounded-xl overflow-hidden shadow-xl border border-slate-200 bg-white">
                  <PayslipDocument data={{ ...form, month, year }} />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Preview appears after selecting an employee</div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="text-[11px] text-slate-400 hidden md:block">
            {dirty ? <span className="text-amber-600 font-bold">● Unsaved changes</span> : record ? `Last saved ${fmtDateTime(record.modifiedAt)}` : 'Not saved yet'}
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button id="payroll-preview-pdf" type="button" disabled={!employee || !!busy} onClick={handlePreviewPdf}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#0A2540] hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              {busy === 'preview' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Preview PDF
            </button>

            {isDispatched && !revising ? (
              <>
                <button id="payroll-resend" type="button" disabled={!!busy} onClick={handleResend}
                  className="px-3.5 py-2 rounded-xl border border-[#00C9A7]/40 bg-[#E6FAF6] text-xs font-bold text-[#00897B] hover:bg-[#D0F7F0] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  {busy === 'resend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Resend Email
                </button>
                <button id="payroll-revise" type="button" disabled={!!busy} onClick={startRevision}
                  className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  <Edit3 className="w-3.5 h-3.5" /> Revise
                </button>
              </>
            ) : (
              <>
                <button id="payroll-save-draft" type="button" disabled={!employee || !!busy} onClick={handleSaveDraft}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#0A2540] hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {revising ? 'Save Revision' : 'Save Draft'}
                </button>
                <button id="payroll-dispatch" type="button" disabled={!employee || !!busy} onClick={requestDispatch}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] text-xs font-black shadow-sm hover:brightness-105 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  {busy === 'dispatch' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {revising ? 'Save & Re-dispatch' : 'Submit & Dispatch'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch confirmation */}
      {confirmDispatch && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#E6FAF6] flex items-center justify-center"><Send className="w-5 h-5 text-[#00A88B]" /></div>
              <div>
                <h3 className="font-display font-black text-[#0A2540]">{isDispatched ? 'Re-dispatch payroll?' : 'Dispatch payroll?'}</h3>
                <p className="text-xs text-slate-500">{form.employeeName} · {month} {year}</p>
              </div>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 bg-slate-50 rounded-2xl p-3.5">
              <li>• Net pay <strong className="text-[#00A88B]">{formatINR(totals.netPay)}</strong></li>
              <li>• Final PDF saved to the employee's documents</li>
              <li>• Visible in <strong>{form.employeeName}</strong>'s account → Payroll</li>
              <li>• Emailed to <strong>{form.email}</strong></li>
            </ul>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDispatch(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Back to edit</button>
              <button id="payroll-confirm-dispatch" onClick={handleDispatch} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] text-xs font-black cursor-pointer">Confirm & Dispatch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollBuilderModal;
