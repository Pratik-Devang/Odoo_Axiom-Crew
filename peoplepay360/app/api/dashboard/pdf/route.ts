import { getActiveAuthUser } from '@/lib/auth';
import { readWorkspace } from '@/db/store';
import { exportDashboardPdf } from '@/lib/export';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getActiveAuthUser(request);
    if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const canExport = ['Admin', 'HR Payroll Manager', 'HR Payroll User', 'HR Manager'].includes(user.role);
    if (!canExport) return Response.json({ error: 'Permission denied.' }, { status: 403 });

    const url = new URL(request.url);
    const period = url.searchParams.get('period') ?? new Date().toISOString().slice(0, 7);
    const department = url.searchParams.get('department') ?? 'All';
    const employeeType = url.searchParams.get('employeeType') ?? 'All';

    const { data } = await readWorkspace();
    const pdf = await exportDashboardPdf(data, period, department, employeeType);

    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="peoplepay360-' + period + '.pdf"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to generate PDF report.' },
      { status: 500 }
    );
  }
}