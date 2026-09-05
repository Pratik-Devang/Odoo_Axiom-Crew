import nodemailer from 'nodemailer';
import { getActiveAuthUser } from '@/lib/auth';
import { readWorkspace } from '@/db/store';
import { createPayslipPdf } from '@/lib/payslip-pdf';
import type { Row } from '@/lib/domain';
import { isAllowedOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAllowedOrigin(request)) return Response.json({ error: 'Cross-origin changes are not allowed.' }, { status: 403 });
  try {
    const user = await getActiveAuthUser(request);
    if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
    if (!['Admin', 'HR Payroll Manager'].includes(user.role)) {
      return Response.json({ error: 'Payroll Manager permission is required.' }, { status: 403 });
    }
    if (!process.env.SMTP_HOST) {
      return Response.json({ error: 'SMTP is not configured. Set SMTP_HOST and SMTP_FROM.' }, { status: 503 });
    }
    const { id } = await context.params;
    const { data } = await readWorkspace();
    const run = data.payruns.find((item) => item.id === id);
    if (!run) return Response.json({ error: 'Payrun not found.' }, { status: 404 });
    if (!['Validated', 'Paid'].includes(run.status)) {
      return Response.json({ error: 'Validate the payrun before sending payslips.' }, { status: 409 });
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
    });
    const structure = data.structures.find((item) => item.id === run.structureId);
    const deliveries = await Promise.allSettled(run.slips.map(async (slip: Row) => {
      const employee = data.employees.find((item) => item.id === slip.employeeId);
      if (!employee?.email) throw new Error(`Missing email for employee ${slip.employeeId}`);
      const pdf = await createPayslipPdf(employee, slip, structure?.name || 'Salary Structure');
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'payroll@peoplepay360.local',
        to: employee.email,
        subject: `Payslip for ${slip.period}`,
        text: `Hello ${employee.name},\n\nYour payslip for ${slip.period} is attached.\n\nPeoplePay360`,
        attachments: [{ filename: `payslip-${slip.period}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' }],
      });
      return employee.email;
    }));
    const sent = deliveries.filter((item) => item.status === 'fulfilled').length;
    const failed = deliveries.length - sent;
    return Response.json({ sent, failed }, { status: failed ? 207 : 200 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to send payslips.' }, { status: 500 });
  }
}
