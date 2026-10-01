import { getActiveAuthUser } from '@/lib/auth';
import { readWorkspace } from '@/db/store';
import { createPayslipPdf } from '@/lib/payslip-pdf';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getActiveAuthUser(request);
    if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });
    const { id } = await context.params;
    const { data } = await readWorkspace();
    const slip = data.payruns.flatMap((run) => run.slips).find((item) => item.id === id);
    if (!slip) return Response.json({ error: 'Payslip not found.' }, { status: 404 });
    const canRead = ['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(user.role) ||
      (user.role === 'Employee' && user.employeeId === slip.employeeId);
    if (!canRead) return Response.json({ error: 'You do not have permission to view this payslip.' }, { status: 403 });
    const employee = data.employees.find((item) => item.id === slip.employeeId);
    if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });
    const structure = data.structures.find((item) => item.id === slip.structureId);
    const pdf = await createPayslipPdf(employee, slip, structure?.name || 'Salary Structure');
    const safeName = employee.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslip-${safeName}-${slip.period}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to create payslip PDF.' }, { status: 500 });
  }
}
