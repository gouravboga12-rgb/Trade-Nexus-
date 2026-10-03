import React, { useEffect, useRef, useState } from 'react';
import { Calendar, User, IdCard, Building2, Target } from 'lucide-react';
import { PayslipItem } from '../../types';
import { computePayrollTotals } from './payrollTemplate';
import headerPayslip from '../../assets/header-payslip.png';
import watermarkEmblem from '../../assets/watermark-emblem.png';
import corporateFooter from '../../assets/corporate-footer.png';

/**
 * On-screen Payroll Slip that mirrors server/services/pdfGenerator.ts → generatePayslipPdf
 * coordinate-for-coordinate (CSS `pt` units == PDF points), so the HR preview, the employee
 * view and the dispatched PDF are the same document.
 */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const PX_PER_PT = 96 / 72;

const LABEL = '#0A2540';
const VALUE = '#1E293B';
const ICON = '#475569';

const pt = (n: number) => `${n}pt`;
const inr = (n: number) => `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Txt: React.FC<{
  x: number; y: number; size: number; bold?: boolean; color?: string; w?: number;
  align?: 'left' | 'right' | 'center'; children: React.ReactNode;
}> = ({ x, y, size, bold, color = VALUE, w, align = 'left', children }) => (
  <div
    style={{
      position: 'absolute', left: pt(x), top: pt(y), width: w !== undefined ? pt(w) : undefined,
      fontSize: pt(size), fontWeight: bold ? 700 : 400, color, lineHeight: 1.15, textAlign: align,
      whiteSpace: 'nowrap', overflow: w !== undefined ? 'hidden' : undefined, textOverflow: 'ellipsis',
    }}
  >
    {children}
  </div>
);

interface Props {
  data: Partial<PayslipItem>;
  className?: string;
}

export const PayslipDocument: React.FC<Props> = ({ data, className }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / (PAGE_W * PX_PER_PT));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const t = computePayrollTotals(data);
  const leftX = 42;
  const contentW = PAGE_W - leftX * 2;

  const metaRow = (Icon: React.ElementType, label: string, value: string, x: number, y: number, valueX: number, valueW: number) => (
    <React.Fragment key={label}>
      <Icon style={{ position: 'absolute', left: pt(x), top: pt(y - 1.5), width: pt(11), height: pt(11), color: ICON }} strokeWidth={2.2} />
      <Txt x={x + 21} y={y} size={8.5} bold color={LABEL}>{label}</Txt>
      <Txt x={valueX} y={y} size={8.5} w={valueW}>: {value || ''}</Txt>
    </React.Fragment>
  );

  // Table geometry identical to the PDF generator
  let y = 264;
  const earnTitleY = y; y += 15;
  const earnHeadY = y; y += 22;
  const earnRows = [
    { d: 'Basic Salary', a: t.basic },
    { d: 'Housing Allowance', a: t.housing },
    { d: 'Transportation', a: t.transport },
    { d: 'Performance Bonus', a: t.bonus },
  ].map((r, i) => ({ ...r, y: y + i * 20 }));
  y += earnRows.length * 20;
  const earnTotalY = y; y += 34;
  const dedTitleY = y; y += 15;
  const dedHeadY = y; y += 22;
  const dedRows = [
    { d: 'Tax (Federal + State)', a: t.tax },
    { d: 'Health Insurance', a: t.health },
    { d: 'Pension Contribution', a: t.pension },
  ].map((r, i) => ({ ...r, y: y + i * 20 }));
  y += dedRows.length * 20;
  const dedTotalY = y; y += 34;
  const sumY = y;
  const sigX = 370;

  const sig = data.authorizedSignature && /^data:image\//.test(data.authorizedSignature) ? data.authorizedSignature : null;

  const table = (titleY: number, title: string, headY: number, rows: { d: string; a: number; y: number }[], totalY: number, totalLabel: string, total: number, totalColor: string) => (
    <>
      <Txt x={leftX} y={titleY} size={9.5} bold color={LABEL}>{title}</Txt>
      <div style={{ position: 'absolute', left: pt(leftX), top: pt(headY), width: pt(contentW), height: pt(22), background: '#06152B' }} />
      <Txt x={leftX + 10} y={headY + 7} size={7.5} bold color="#FFFFFF">DESCRIPTION</Txt>
      <Txt x={leftX} y={headY + 7} size={7.5} bold color="#FFFFFF" w={contentW - 10} align="right">AMOUNT (INR)</Txt>
      {rows.map((r, i) => (
        <React.Fragment key={r.d}>
          <div style={{ position: 'absolute', left: pt(leftX), top: pt(r.y), width: pt(contentW), height: pt(20), background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }} />
          <Txt x={leftX + 10} y={r.y + 6} size={7.5} color="#334155">{r.d}</Txt>
          <Txt x={leftX} y={r.y + 6} size={7.5} bold color={LABEL} w={contentW - 10} align="right">{inr(r.a)}</Txt>
        </React.Fragment>
      ))}
      <div style={{ position: 'absolute', left: pt(leftX), top: pt(totalY), width: pt(contentW), height: pt(22), background: '#E6FAF6' }} />
      <Txt x={leftX + 10} y={totalY + 7} size={8} bold color={LABEL}>{totalLabel}</Txt>
      <Txt x={leftX} y={totalY + 6} size={8.5} bold color={totalColor} w={contentW - 10} align="right">{inr(total)}</Txt>
    </>
  );

  return (
    <div ref={wrapRef} className={className} style={{ width: '100%', height: PAGE_H * PX_PER_PT * scale, position: 'relative', overflow: 'hidden' }}>
      <div
        id="payslip-sheet"
        style={{
          width: pt(PAGE_W), height: pt(PAGE_H), position: 'absolute', left: 0, top: 0, background: '#FFFFFF',
          transform: `scale(${scale})`, transformOrigin: 'top left',
          fontFamily: 'Helvetica, Arial, sans-serif', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}
      >
        {/* Header artwork */}
        <img src={headerPayslip} alt="Trade Nexus Payroll Slip" draggable={false}
          style={{ position: 'absolute', left: 0, top: 0, width: pt(PAGE_W), height: pt(184) }} />
        {/* Mask the sample "Month : May 2027" baked into the artwork; real month drawn once in its slot */}
        <div style={{ position: 'absolute', left: pt(56), top: pt(161), width: pt(190), height: pt(23), background: '#FFFFFF' }} />
        <Txt x={57} y={168} size={8.5} bold color={LABEL}>Month</Txt>
        <Txt x={142} y={168} size={8.5} w={100}>: {[data.month, data.year].filter(Boolean).join(' ')}</Txt>

        {/* Watermark */}
        <img src={watermarkEmblem} alt="" draggable={false}
          style={{ position: 'absolute', left: pt((PAGE_W - 260) / 2), top: pt((PAGE_H - 260) / 2 + 30), width: pt(260), height: pt(260), opacity: 0.08 }} />

        {/* Employee information grid */}
        {metaRow(User, 'Employee Name', data.employeeName || '', 36, 194, 142, 170)}
        {metaRow(Target, 'Designation', data.roleTitle || '', 320, 194, 432, PAGE_W - 432 - 24)}
        {metaRow(IdCard, 'Employee ID', data.empCode || data.employeeCode || '', 36, 216, 142, 170)}
        {metaRow(IdCard, 'Employee Type', data.employeeType || '', 320, 216, 432, PAGE_W - 432 - 24)}
        {metaRow(Building2, 'Department', data.department || '', 36, 238, 142, 170)}
        {metaRow(Calendar, 'Pay Date', data.payDate || '', 320, 238, 432, PAGE_W - 432 - 24)}

        {table(earnTitleY, 'EARNINGS', earnHeadY, earnRows, earnTotalY, 'TOTAL EARNINGS', t.totalEarnings, '#00A88B')}
        {table(dedTitleY, 'DEDUCTIONS', dedHeadY, dedRows, dedTotalY, 'TOTAL DEDUCTIONS', t.totalDeductions, '#DC2626')}

        {/* Net pay & payment details */}
        <Txt x={leftX} y={sumY} size={9} bold color={LABEL}>NET PAY</Txt>
        <Txt x={leftX + 100} y={sumY} size={9} bold color={LABEL}>:</Txt>
        <Txt x={leftX + 112} y={sumY - 1} size={12} bold color="#00A88B">{inr(t.netPay)}</Txt>
        <Txt x={leftX} y={sumY + 20} size={8} bold color={LABEL}>Bank Account</Txt>
        <Txt x={leftX + 100} y={sumY + 20} size={8} bold color={LABEL}>:</Txt>
        <Txt x={leftX + 112} y={sumY + 20} size={8} color="#475569">{data.bankAccountNumber || ''}</Txt>
        <Txt x={leftX} y={sumY + 34} size={8} bold color={LABEL}>Payment Mode</Txt>
        <Txt x={leftX + 100} y={sumY + 34} size={8} bold color={LABEL}>:</Txt>
        <Txt x={leftX + 112} y={sumY + 34} size={8} color="#475569">{data.paymentMode || 'Bank Transfer'}</Txt>

        {/* Authorized by — role, optional signature image, name exactly once */}
        <Txt x={sigX} y={sumY + 34} size={8} color="#475569">Authorized by:</Txt>
        <Txt x={sigX} y={sumY + 50} size={8.5} color={LABEL} w={PAGE_W - sigX - leftX}>{data.authorizedRole || 'Finance Manager – Trade Nexus'}</Txt>
        {sig && (
          <img src={sig} alt="Authorized signature" draggable={false}
            style={{ position: 'absolute', left: pt(sigX + 20), top: pt(sumY + 66), width: pt(130), height: pt(34), objectFit: 'contain' }} />
        )}
        <Txt x={sigX + 20} y={sumY + 106} size={8.5} color={LABEL} w={130} align="center">{data.authorizedName || 'Muhammad Patel'}</Txt>

        {/* Footer artwork */}
        <img src={corporateFooter} alt="Trade Nexus contact details" draggable={false}
          style={{ position: 'absolute', left: 0, top: pt(PAGE_H - 53.5), width: pt(PAGE_W), height: pt(53.5) }} />
      </div>
    </div>
  );
};

export default PayslipDocument;
