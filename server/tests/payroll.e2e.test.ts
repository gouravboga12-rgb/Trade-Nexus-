/**
 * Phase 3 payroll end-to-end test.
 *   npx tsx server/tests/payroll.e2e.test.ts
 * Provisions HR / Team Leader / 2 Telecallers, runs the full draft → preview → dispatch flow,
 * verifies visibility + permissions per role, then removes every record it created.
 * Emails go to plus-addresses of SMTP_USER so delivery can be confirmed in that inbox.
 */
import dotenv from 'dotenv';
dotenv.config();
process.env.NODE_ENV = 'test';

import http from 'http';
import fs from 'fs';
import path from 'path';
import app from '../server.js';
import db from '../db/connection.js';

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: any) => {
  results.push({ name, ok, detail: ok ? undefined : typeof detail === 'string' ? detail : JSON.stringify(detail) });
};

let PORT = 0;
function call(method: string, p: string, body?: any, token?: string): Promise<{ status: number; data: any; buf: Buffer; type: string }> {
  return new Promise((resolve, reject) => {
    const json = body ? JSON.stringify(body) : undefined;
    const req = http.request({
      hostname: 'localhost', port: PORT, path: p, method,
      headers: {
        'Content-Type': 'application/json',
        ...(json ? { 'Content-Length': Buffer.byteLength(json) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const type = String(res.headers['content-type'] || '');
        let data: any = null;
        if (type.includes('json')) { try { data = JSON.parse(buf.toString()); } catch { data = buf.toString(); } }
        resolve({ status: res.statusCode || 0, data, buf, type });
      });
    });
    req.on('error', reject);
    if (json) req.write(json);
    req.end();
  });
}

async function main() {
  const server = app.listen(0);
  const addr = server.address();
  PORT = typeof addr === 'object' && addr ? addr.port : 5098;
  const uid = Date.now();
  const mailBase = (process.env.SMTP_USER || 'sagarsuchi26@gmail.com').split('@');
  const mail = (tag: string) => `${mailBase[0]}+tnx${tag}${uid}@${mailBase[1]}`;
  const created: string[] = [];
  const pw = 'Payroll!Test123';

  try {
    // ── Admin login ──
    const adminRow = db.prepare("SELECT email FROM users WHERE role = 'admin' LIMIT 1").get() as any;
    const adminEmail = adminRow?.email;
    const adminLogin = await call('POST', '/api/auth/login', { email: adminEmail, password: adminEmail === 'sagarsuchi26@gmail.com' ? 'Sagar@14326' : 'admin123' });
    check('Admin login', adminLogin.status === 200, adminLogin.data);
    const adminT = adminLogin.data?.token;

    // ── Onboard four employees ──
    const people = [
      { key: 'hr', portal: 'hr', role: 'HR Executive', group: 'Human Resources' },
      { key: 'tl', portal: 'team_leader', role: 'Team Leader & Sales Coach', group: 'Team A' },
      { key: 'tca', portal: 'telecaller', role: 'Senior Telecaller / SDR', group: 'Team A' },
      { key: 'tcb', portal: 'telecaller', role: 'Senior Telecaller / SDR', group: 'Team A' },
    ];
    const emp: Record<string, any> = {};
    const tok: Record<string, string> = {};
    for (const [i, p] of people.entries()) {
      const id = `tm-pay-${p.key}-${uid}`;
      const empCode = `TNX-P${String(uid).slice(-4)}${i}`;
      const res = await call('POST', '/api/team-members', {
        id, empCode, name: `Payroll ${p.key.toUpperCase()} ${uid}`, role: p.role, group: p.group,
        phone: `+91 98${String(uid + i).slice(-8)}`, email: mail(p.key), password: pw, portal: p.portal,
        salary: 40000, bankAccountNumber: `5020${String(uid).slice(-8)}${i}`, employeeType: 'Full - Time',
      }, adminT);
      check(`Onboard ${p.key}`, res.status === 201, res.data);
      created.push(id);
      emp[p.key] = { id, empCode, email: mail(p.key), name: `Payroll ${p.key.toUpperCase()} ${uid}`, role: p.role, group: p.group };
      const login = await call('POST', '/api/auth/login', { email: mail(p.key), password: pw });
      check(`Login ${p.key}`, login.status === 200, login.data);
      tok[p.key] = login.data?.token;
    }

    // ── Onboarding must NOT create payroll ──
    for (const k of ['hr', 'tl', 'tca', 'tcb']) {
      const n = (db.prepare('SELECT COUNT(*) c FROM payslips WHERE employeeId = ?').get(emp[k].id) as any).c;
      check(`No payroll auto-created on onboarding (${k})`, n === 0, `found ${n}`);
    }
    const tcaInitial = await call('GET', '/api/payslips', undefined, tok.tca);
    check('Telecaller sees empty payroll before dispatch', tcaInitial.status === 200 && tcaInitial.data.length === 0, tcaInitial.data);

    // ── Permissions: employees cannot customize ──
    const forbidden = await call('POST', '/api/payslips', { employeeId: emp.tca.id, month: 'September', year: 2026 }, tok.tca);
    check('Telecaller cannot create payroll (403)', forbidden.status === 403, forbidden.status);
    const tlForbidden = await call('POST', '/api/payslips/preview', { employeeId: emp.tca.id }, tok.tl);
    check('Team Leader cannot preview arbitrary payroll (403)', tlForbidden.status === 403, tlForbidden.status);

    // ── HR creates September draft with every template field ──
    const sigPng = 'data:image/png;base64,' + fs.readFileSync(path.resolve('server/assets/signature-vidhya-sagar.png')).toString('base64');
    const sept = {
      employeeId: emp.tca.id, empCode: emp.tca.empCode, employeeName: emp.tca.name, roleTitle: emp.tca.role,
      department: emp.tca.group, employeeType: 'Full - Time', email: emp.tca.email,
      month: 'September', year: 2026, payDate: '30 September 2026',
      basicSalary: 20000, housingAllowance: 8000, transportation: 2000, performanceBonus: 1500,
      taxDeduction: 1200, healthInsurance: 500, pensionContribution: 800,
      bankAccountNumber: '50200084920194', paymentMode: 'Bank Transfer',
      authorizedRole: 'Finance Manager – Trade Nexus', authorizedName: 'Muhammad Patel', authorizedSignature: sigPng,
    };
    const draft = await call('POST', '/api/payslips', sept, tok.hr);
    check('HR creates September draft', draft.status === 201 && draft.data.payrollStatus === 'DRAFT', draft.data);
    const septId = draft.data?.id;
    check('Net pay computed server-side', draft.data?.netPay === 31500 - 2500, draft.data?.netPay);

    const stillHidden = await call('GET', '/api/payslips', undefined, tok.tca);
    check('Draft NOT visible to employee', stillHidden.data.length === 0, stillHidden.data);
    const draftDl = await call('GET', `/api/payslips/${septId}/download`, undefined, tok.tca);
    check('Employee cannot download a draft (403)', draftDl.status === 403, draftDl.status);

    // ── HR edits every field, previews, corrects ──
    const edited = await call('PUT', `/api/payslips/${septId}`, { ...sept, performanceBonus: 2500, payDate: '01 October 2026', department: 'Team A – Inbound' }, tok.hr);
    check('HR edits draft', edited.status === 200 && edited.data.performanceBonus === 2500 && edited.data.department === 'Team A – Inbound', edited.data);
    const preview = await call('POST', '/api/payslips/preview', { ...sept, performanceBonus: 2500 }, tok.hr);
    check('HR preview renders PDF', preview.status === 200 && preview.type.includes('pdf') && preview.buf.slice(0, 4).toString() === '%PDF', preview.type);

    // ── Validation: missing required fields block dispatch ──
    const badDraft = await call('POST', '/api/payslips', { employeeId: emp.tcb.id, month: 'September', year: 2026, basicSalary: 0, bankAccountNumber: '' }, tok.hr);
    const badDispatch = await call('POST', `/api/payslips/${badDraft.data?.id}/dispatch`, {}, tok.hr);
    check('Dispatch blocked when required fields missing (400)', badDispatch.status === 400 && Array.isArray(badDispatch.data?.missing), badDispatch.data);
    await call('DELETE', `/api/payslips/${badDraft.data?.id}`, undefined, tok.hr);

    // ── Dispatch ──
    const disp = await call('POST', `/api/payslips/${septId}/dispatch`, {}, tok.hr);
    check('HR dispatches September', disp.status === 200 && disp.data?.payslip?.payrollStatus === 'DISPATCHED', disp.data);
    check('Dispatch records time + dispatcher + document', !!disp.data?.payslip?.dispatchedAt && !!disp.data?.payslip?.dispatchedBy && !!disp.data?.payslip?.documentId, disp.data?.payslip);
    check('Dispatch email sent', disp.data?.emailResult?.success !== false, disp.data?.emailResult);
    const docRow = db.prepare('SELECT employeeId, category, mimeType FROM employee_documents WHERE id = ?').get(disp.data?.payslip?.documentId) as any;
    check('Final PDF stored in employee documents', docRow?.employeeId === emp.tca.id && docRow?.category === 'Payslip', docRow);

    // ── Visibility ──
    const tcaAfter = await call('GET', '/api/payslips', undefined, tok.tca);
    check('Employee now sees dispatched September', tcaAfter.data.length === 1 && tcaAfter.data[0].id === septId, tcaAfter.data);
    const tcaDl = await call('GET', `/api/payslips/${septId}/download`, undefined, tok.tca);
    check('Employee downloads own payroll PDF', tcaDl.status === 200 && tcaDl.buf.slice(0, 4).toString() === '%PDF', tcaDl.status);
    fs.mkdirSync('scratch', { recursive: true });
    fs.writeFileSync('scratch/e2e_dispatched_payslip.pdf', tcaDl.buf);
    const tcbView = await call('GET', '/api/payslips', undefined, tok.tcb);
    check('Other telecaller cannot see it', tcbView.data.every((p: any) => p.employeeId !== emp.tca.id), tcbView.data);
    const tcbDl = await call('GET', `/api/payslips/${septId}/download`, undefined, tok.tcb);
    check('Other telecaller cannot download it (403)', tcbDl.status === 403, tcbDl.status);
    const tlView = await call('GET', '/api/payslips', undefined, tok.tl);
    check('Team Leader cannot see telecaller payroll', tlView.data.every((p: any) => p.employeeId !== emp.tca.id), tlView.data.length);

    // ── Duplicate protection ──
    const dup = await call('POST', `/api/payslips/${septId}/dispatch`, {}, tok.hr);
    check('Duplicate dispatch blocked (409)', dup.status === 409, dup.status);
    const dupCreate = await call('POST', '/api/payslips', sept, tok.hr);
    check('Re-creating a dispatched month blocked (409)', dupCreate.status === 409 && dupCreate.data?.alreadyDispatched, dupCreate.data);
    const lockedEdit = await call('PUT', `/api/payslips/${septId}`, { basicSalary: 1 }, tok.hr);
    check('Editing dispatched month needs confirmRevision (409)', lockedEdit.status === 409, lockedEdit.status);
    const resend = await call('POST', `/api/payslips/${septId}/send-email`, {}, tok.hr);
    check('HR can intentionally resend email', resend.status === 200, resend.data);

    // ── October (second month) keeps September intact ──
    const oct = await call('POST', '/api/payslips', { ...sept, month: 'October', payDate: '31 October 2026', performanceBonus: 0 }, tok.hr);
    check('HR creates October draft', oct.status === 201, oct.data);
    const octDisp = await call('POST', `/api/payslips/${oct.data?.id}/dispatch`, {}, tok.hr);
    check('HR dispatches October', octDisp.status === 200, octDisp.data);
    const tcaTwo = await call('GET', '/api/payslips', undefined, tok.tca);
    const septRow = tcaTwo.data.find((p: any) => p.id === septId);
    check('Employee sees both months', tcaTwo.data.length === 2, tcaTwo.data.map((p: any) => p.month));
    check('September unchanged after October dispatch', septRow?.performanceBonus === 2500 && septRow?.netPay === 30000, septRow);

    // ── HR & Team Leader as employees ──
    for (const k of ['hr', 'tl']) {
      const d = await call('POST', '/api/payslips', { ...sept, employeeId: emp[k].id, empCode: emp[k].empCode, employeeName: emp[k].name, roleTitle: emp[k].role, department: emp[k].group, email: emp[k].email }, tok.hr);
      const ds = await call('POST', `/api/payslips/${d.data?.id}/dispatch`, {}, tok.hr);
      check(`Dispatch payroll to ${k}`, ds.status === 200, ds.data);
    }
    const tlOwn = await call('GET', '/api/payslips', undefined, tok.tl);
    check('Team Leader sees only own dispatched payroll', tlOwn.data.length === 1 && tlOwn.data[0].employeeId === emp.tl.id, tlOwn.data.map((p: any) => p.employeeId));
    const hrAll = await call('GET', '/api/payslips', undefined, tok.hr);
    check('HR sees payroll history (incl. own)', hrAll.data.some((p: any) => p.employeeId === emp.hr.id) && hrAll.data.some((p: any) => p.employeeId === emp.tca.id), hrAll.data.length);

    // ── Admin keeps management access ──
    const adminAll = await call('GET', '/api/payslips', undefined, adminT);
    check('Admin sees all payroll records', adminAll.status === 200 && adminAll.data.some((p: any) => p.id === septId), adminAll.status);
  } finally {
    // ── Cleanup everything this test created ──
    const ids = created;
    for (const id of ids) {
      const docs = db.prepare('SELECT documentId FROM payslips WHERE employeeId = ?').all(id) as any[];
      docs.forEach(d => d.documentId && db.prepare('DELETE FROM employee_documents WHERE id = ?').run(d.documentId));
      db.prepare('DELETE FROM payslips WHERE employeeId = ?').run(id);
      db.prepare('DELETE FROM employee_documents WHERE employeeId = ?').run(id);
      try { db.prepare('DELETE FROM users WHERE employeeId = ?').run(id); } catch { /* column may differ */ }
      db.prepare('DELETE FROM team_members WHERE id = ?').run(id);
    }
    try { db.prepare("DELETE FROM users WHERE email LIKE ?").run(`%+tnx%${uid}@%`); } catch { /* ignore */ }
    server.close();
  }

  const failed = results.filter(r => !r.ok);
  results.forEach(r => console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.ok ? '' : `  → ${r.detail}`}`));
  console.log(`\n${results.length - failed.length}/${results.length} payroll checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
