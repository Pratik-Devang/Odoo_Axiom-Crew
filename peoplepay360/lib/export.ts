import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Workspace, Row } from './domain';
import { money, round } from './domain';

// ─────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────
function niceMonth(p: string) {
  try {
    return new Date(p + '-01T00:00:00Z').toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return p;
  }
}

function filtered(s: Workspace, period: string, department: string, employeeType: string) {
  const employees = s.employees.filter(
    (e) =>
      (department === 'All' || e.department === department) &&
      (employeeType === 'All' || e.type === employeeType)
  );
  const ids = new Set(employees.map((e) => e.id));
  const runs = s.payruns.filter((r) => r.period === period);
  const slips: Row[] = runs
    .flatMap((r) => r.slips.map((p: Row) => ({ ...p, runStatus: r.status })))
    .filter((p) => ids.has(p.employeeId));
  return { employees, ids, slips };
}

function escapeCsv(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: string[][]): Blob {
  const BOM = '\uFEFF';
  const content = BOM + rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}

// ─────────────────────────────────────────
//  CSV Export
// ─────────────────────────────────────────
export function exportDashboardCsv(
  s: Workspace,
  period: string,
  department: string,
  employeeType: string,
  mode: 'summary' | 'detail'
): Blob {
  const { employees, slips } = filtered(s, period, department, employeeType);

  if (mode === 'summary') {
    const depts = [...new Set(employees.map((e) => e.department))];
    const header = ['Department', 'Active Staff', 'Gross Salary (INR)', 'Deductions (INR)', 'Net Salary (INR)'];
    const dataRows = depts.map((d) => {
      const dSlips = slips.filter(
        (p) => employees.find((e) => e.id === p.employeeId)?.department === d
      );
      const count = employees.filter((e) => e.department === d && e.status === 'Active').length;
      const gross = round(dSlips.reduce((n, p) => n + (p.gross || 0), 0));
      const deductions = round(dSlips.reduce((n, p) => n + (p.deductions || 0), 0));
      const net = round(dSlips.reduce((n, p) => n + (p.net || 0), 0));
      return [d, String(count), String(gross), String(deductions), String(net)];
    });
    return buildCsv([header, ...dataRows]);
  }

  // Detail mode — one row per payslip
  const header = [
    'Employee Name', 'Department', 'Position', 'Type', 'Period',
    'Scheduled Days', 'Prorated Days', 'Payable Days', 'Worked Days',
    'Overtime Hours', 'OT Pay (INR)',
    'Gross Salary (INR)', 'Deductions (INR)', 'Net Salary (INR)',
    'Payrun Status',
  ];
  const dataRows = slips.map((p) => {
    const emp = employees.find((e) => e.id === p.employeeId);
    return [
      emp?.name ?? '',
      emp?.department ?? '',
      emp?.position ?? '',
      emp?.type ?? '',
      period,
      String(p.scheduledDays ?? ''),
      String(p.proratedDays ?? p.scheduledDays ?? ''),
      String(p.payableDays ?? ''),
      String(p.workedDays ?? ''),
      String(p.overtimeHours ?? 0),
      String(round(p.overtimePay ?? 0)),
      String(round(p.gross ?? 0)),
      String(round(p.deductions ?? 0)),
      String(round(p.net ?? 0)),
      p.runStatus ?? '',
    ];
  });
  return buildCsv([header, ...dataRows]);
}

// ─────────────────────────────────────────
//  PDF Export
// ─────────────────────────────────────────
export async function exportDashboardPdf(
  s: Workspace,
  period: string,
  department: string,
  employeeType: string
): Promise<Uint8Array> {
  const { employees, slips } = filtered(s, period, department, employeeType);
  const depts = [...new Set(employees.map((e) => e.department))].sort();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const dark = rgb(0.08, 0.1, 0.15);
  const gray = rgb(0.55, 0.5, 0.45);
  const gold = rgb(0.91, 0.72, 0.29);

  let y = 800;
  const lh = (size: number) => size + 7;

  const drawText = (text: string, size = 10, isBold = false, x = 48, color = dark) => {
    page.drawText(text, { x, y, size, font: isBold ? bold : regular, color });
    y -= lh(size);
  };

  const line = () => {
    page.drawLine({ start: { x: 48, y: y + 4 }, end: { x: 547, y: y + 4 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 8;
  };

  // Header
  drawText('PEOPLEPAY360', 10, true, 48, gold);
  drawText('Dashboard Summary Report', 18, true);
  y -= 4;
  drawText(`Period: ${niceMonth(period)}`, 10, false, 48, gray);
  drawText(`Department: ${department}  |  Employee Type: ${employeeType}`, 10, false, 48, gray);
  drawText(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 9, false, 48, gray);
  y -= 8;
  line();

  // KPIs
  const totalGross = round(slips.reduce((n, p) => n + (p.gross || 0), 0));
  const totalNet = round(slips.reduce((n, p) => n + (p.net || 0), 0));
  const totalDeductions = round(slips.reduce((n, p) => n + (p.deductions || 0), 0));
  const paid = round(slips.filter((p) => p.runStatus === 'Paid').reduce((n, p) => n + p.net, 0));
  const avgNet = slips.length ? round(totalNet / slips.length) : 0;

  drawText('KEY METRICS', 11, true);
  y -= 2;
  const kpis: [string, string][] = [
    ['Total Gross Salary', money(totalGross)],
    ['Total Deductions', money(totalDeductions)],
    ['Total Net Salary', money(totalNet)],
    ['Total Net Paid', money(paid)],
    [`Payslips Generated (${slips.length})`, `Avg Net: ${money(avgNet)}`],
    ['Active Employees', String(employees.filter((e) => e.status === 'Active').length)],
  ];
  kpis.forEach(([label, val]) => {
    page.drawText(label, { x: 48, y, size: 10, font: regular, color: dark });
    page.drawText(val, { x: 370, y, size: 10, font: bold, color: dark });
    y -= lh(10);
  });

  y -= 8;
  line();

  // Department breakdown table
  drawText('DEPARTMENT BREAKDOWN', 11, true);
  y -= 4;

  // Column headers
  const cols = [48, 200, 300, 390, 480];
  const colHdrs = ['Department', 'Staff', 'Gross (INR)', 'Deductions', 'Net (INR)'];
  colHdrs.forEach((h, i) => {
    page.drawText(h, { x: cols[i], y, size: 9, font: bold, color: gray });
  });
  y -= lh(9);
  line();

  depts.forEach((d) => {
    const dSlips = slips.filter((p) => employees.find((e) => e.id === p.employeeId)?.department === d);
    const count = employees.filter((e) => e.department === d && e.status === 'Active').length;
    const gross = round(dSlips.reduce((n, p) => n + (p.gross || 0), 0));
    const ded = round(dSlips.reduce((n, p) => n + (p.deductions || 0), 0));
    const net = round(dSlips.reduce((n, p) => n + (p.net || 0), 0));

    const rowData = [d, String(count), String(gross.toLocaleString('en-IN')), String(ded.toLocaleString('en-IN')), String(net.toLocaleString('en-IN'))];
    rowData.forEach((cell, i) => {
      page.drawText(cell, { x: cols[i], y, size: 9, font: regular, color: dark });
    });
    y -= lh(9);

    if (y < 80) return; // Prevent overflow for many depts
  });

  // Footer
  page.drawText('Generated by PeoplePay360 · Confidential', { x: 48, y: 40, size: 8, font: regular, color: gray });

  return pdf.save();
}
