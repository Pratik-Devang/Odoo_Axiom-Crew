import { randomBytes, scryptSync } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dbDir = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.resolve(dbDir, '../.env.local'));
} catch {
  // DATABASE_URL may already be supplied by the shell.
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined in .env.local.');

const SNAPSHOT_DATE = '2026-09-05';
let randomState = 0x3602026;
function random() {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 0x100000000;
}
const pick = (values) => values[Math.floor(random() * values.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const pad = (value, width = 2) => String(value).padStart(width, '0');
const iso = (date) => date.toISOString().slice(0, 10);
const dateUtc = (value) => new Date(`${value}T00:00:00Z`);
const addDays = (value, days) => {
  const date = dateUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return iso(date);
};
const round = (value) => Math.round(value * 100) / 100;
const moneyRound = (value) => Math.round(value / 500) * 500;
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

function randomDate(start, end) {
  const first = dateUtc(start).getTime();
  const last = dateUtc(end).getTime();
  return iso(new Date(first + Math.floor(random() * (last - first + 86400000))));
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

const departments = [
  { name: 'Management', count: 8, head: ['Rajesh Varma', 'Chief Executive Officer'], roles: ['Chief Operating Officer', 'Chief Technology Officer', 'Chief Financial Officer', 'Chief People Officer', 'VP Strategy', 'Executive Assistant', 'Business Operations Director'], salary: [180000, 420000] },
  { name: 'Engineering', count: 72, head: ['Rohan Patel', 'VP Engineering'], roles: ['Engineering Manager', 'Staff Backend Engineer', 'Senior Frontend Engineer', 'Backend Engineer', 'Frontend Engineer', 'QA Automation Engineer', 'DevOps Engineer', 'Site Reliability Engineer', 'Mobile Engineer', 'Junior Software Engineer'], salary: [55000, 245000] },
  { name: 'Sales', count: 42, head: ['Dev Shah', 'VP Sales'], roles: ['Regional Sales Manager', 'Enterprise Account Executive', 'Senior Account Executive', 'Account Executive', 'Sales Development Representative', 'Sales Operations Analyst'], salary: [45000, 230000] },
  { name: 'Operations', count: 38, head: ['Sunita Menon', 'Director of Operations'], roles: ['Operations Manager', 'Senior Operations Analyst', 'Process Excellence Analyst', 'Workplace Coordinator', 'Vendor Operations Specialist', 'Operations Associate'], salary: [38000, 190000] },
  { name: 'Support', count: 32, head: ['Ishaan Kapoor', 'Support Operations Manager'], roles: ['Customer Success Manager', 'Implementation Consultant', 'Senior Customer Success Specialist', 'Customer Success Specialist', 'Technical Support Specialist', 'Support Associate'], salary: [38000, 185000] },
  { name: 'Finance', count: 24, head: ['Nisha Rao', 'Director of Finance & Accounts'], roles: ['Finance Manager', 'Senior Payroll Manager', 'Financial Planning Analyst', 'Senior Accountant', 'Payroll Specialist', 'Accounts Payable Associate'], salary: [45000, 230000] },
  { name: 'Product', count: 24, head: ['Ananya Iyer', 'VP Product'], roles: ['Principal Product Manager', 'Product Manager', 'Senior UX Researcher', 'Product Designer', 'Visual Designer', 'Product Analyst'], salary: [52000, 230000] },
  { name: 'HR', count: 18, head: ['Sara Khan', 'Head of People & Culture'], roles: ['HR Business Partner', 'Talent Acquisition Lead', 'Compensation & Benefits Analyst', 'HR Operations Specialist', 'Recruiter', 'People Operations Coordinator'], salary: [42000, 200000] },
  { name: 'Marketing', count: 18, head: ['Aditi Malhotra', 'VP Marketing'], roles: ['Growth Marketing Manager', 'Product Marketing Manager', 'Content Strategist', 'Performance Marketing Specialist', 'Brand Designer', 'Marketing Coordinator'], salary: [40000, 205000] },
  { name: 'IT', count: 16, head: ['Vikram Bhat', 'Director of IT'], roles: ['IT Operations Manager', 'Cloud Security Specialist', 'Systems Administrator', 'Network Engineer', 'IT Support Engineer', 'Helpdesk Analyst'], salary: [40000, 190000] },
  { name: 'Legal', count: 8, head: ['Meera Krishnan', 'General Counsel'], roles: ['Senior Legal Counsel', 'Compliance Manager', 'Privacy Counsel', 'Contracts Specialist', 'Compliance Analyst', 'Legal Operations Associate'], salary: [55000, 260000] },
];

// Keep the login screen's named demo staff inside the larger generated company.
const featuredEmployees = {
  Management: [['Rajesh Varma','Chief Executive Officer'],['Sunita Menon','Chief Operating Officer'],['Vikramaditya Rao','VP of Technology & Operations']],
  Engineering: [['Rohan Patel','Engineering Director'],['Aditya Sen','Senior Backend Engineer'],['Anik Dutta','Cloud Infrastructure Intern'],['Arun Bhatia','Staff Backend Architect'],['Deepak Chopra','Senior DevOps / SRE'],['Divya Sundaram','Frontend Engineer'],['John Dsouza','Frontend Lead Developer'],['Kabir Sethi','Software Engineering Intern'],['Karthik Raja','Full Stack Engineer'],['Naveen Kumar','QA Automation Engineer'],['Pallavi Rao','Junior Frontend Developer'],['Pooja Hegde','Principal QA Engineer'],['Rahul Bose','Junior Backend Developer'],['Shreya Ghosh','Database Reliability Engineer'],['Shruti Bhatt','UI/UX Mobile Developer'],['Sneha Chawla','Cloud Security Specialist'],['Varun Reddy','Data Platform Engineer']],
  Sales: [['Dev Shah','Head of Enterprise Sales'],['Abhishek Roy','Business Development Representative'],['Bhavna Parekh','Client Solutions Consultant'],['Kunal Kapoor','Regional Sales Manager (North)'],['Maya Shah','Senior Account Executive'],['Sameer Qureshi','Sales Operations Coordinator'],['Zoya Khan','Inbound Sales Associate']],
  Support: [['Ishaan Kapoor','Support Operations Manager'],['Chetan Bhagat','Technical Support Specialist'],['Monika Sehgal','Client Care Associate'],['Nikhil Mathur','Helpdesk Analyst'],['Pooja Bhatt','Customer Success Associate'],['Priya Nair','Customer Success Team Lead']],
  Finance: [['Nisha Rao','Director of Finance & Accounts'],['Aarav Mehta','Senior Payroll Manager'],['Manish Tiwari','Payroll Specialist'],['Meera Nambiar','Compensation & Benefits Analyst'],['Ritu Kulkarni','Senior Staff Accountant'],['Siddharth Roy','Accounts Payable Associate']],
  Product: [['Ananya Iyer','Head of Product Design'],['Natasha Thomas','Visual Designer'],['Prashant Verma','Principal Product Manager'],['Sanya Mirza','Senior UX Researcher'],['Tarun Saxena','Product Analyst']],
  HR: [['Sara Khan','Head of People & Culture'],['Ananya Deshmukh','HR Business Partner'],['Gautam Singhania','HR Operations Specialist'],['Kavita Joshi','Recruiting Coordinator'],['Neha Patel','Talent Acquisition Lead'],['Tanvi Agarwal','People Operations Intern']],
};

const firstNames = [
  'Aarav', 'Aanya', 'Abhishek', 'Aditya', 'Akash', 'Akshay', 'Amara', 'Amit', 'Ananya', 'Aniket', 'Anjali', 'Ankit', 'Arjun', 'Arnav',
  'Bhavna', 'Chetan', 'Deepak', 'Devika', 'Divya', 'Farhan', 'Gautam', 'Harini', 'Ira', 'Ishaan', 'Jai', 'Janvi', 'Kabir', 'Karan',
  'Karthik', 'Kavita', 'Khushi', 'Krishna', 'Kunal', 'Lakshmi', 'Manish', 'Maya', 'Meera', 'Mohit', 'Monika', 'Naveen', 'Neha', 'Nikhil',
  'Nisha', 'Pallavi', 'Pooja', 'Pranav', 'Prashant', 'Priya', 'Rahul', 'Rajiv', 'Rhea', 'Rishi', 'Ritu', 'Rohan', 'Saanvi', 'Sameer',
  'Sanya', 'Sara', 'Shreya', 'Shruti', 'Siddharth', 'Sneha', 'Tanvi', 'Tanya', 'Varun', 'Ved', 'Vidya', 'Vivek', 'Yash', 'Zoya',
];
const lastNames = [
  'Agarwal', 'Bajaj', 'Banerjee', 'Bhat', 'Bhatt', 'Bose', 'Chandra', 'Chawla', 'Chopra', 'Desai', 'Deshmukh', 'Dutta', 'George',
  'Ghosh', 'Gupta', 'Hegde', 'Iyer', 'Jain', 'Joshi', 'Kapoor', 'Khan', 'Khanna', 'Krishnan', 'Kulkarni', 'Kumar', 'Malhotra',
  'Mathur', 'Mehta', 'Menon', 'Mirza', 'Nair', 'Nambiar', 'Narayan', 'Parekh', 'Patel', 'Qureshi', 'Rao', 'Reddy', 'Roy', 'Sen',
  'Sethi', 'Shah', 'Sharma', 'Singh', 'Sundaram', 'Thomas', 'Tiwari', 'Varma', 'Verma', 'Yadav',
];
const cityWeights = [['Mumbai', 36], ['Bengaluru', 28], ['Delhi NCR', 14], ['Pune', 11], ['Hyderabad', 7], ['Chennai', 4]];
function weightedCity() {
  const value = random() * 100;
  let total = 0;
  for (const [city, weight] of cityWeights) {
    total += weight;
    if (value < total) return city;
  }
  return 'Mumbai';
}

function weeklyRows(start, end, breakHours, saturday = false) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => ({
    id: day, day, working: day !== 'Sunday' && (saturday || day !== 'Saturday'), start, end, breakHours,
  }));
}
const schedules = [
  ['sch_standard', 'Standard Office Hours', 'Fixed', '09:00', '18:00', 1, false, 40],
  ['sch_flexible', 'Flexible Workday', 'Flexible', '10:00', '19:00', 1, false, 40],
  ['sch_support', 'Customer Operations Shift', 'Shift', '08:00', '16:30', 0.5, true, 48],
].map(([id, name, type, start, end, breakHours, saturday, weeklyHours]) => {
  const rows = weeklyRows(start, end, breakHours, saturday);
  return { id, name, schedule_type: type, days: rows.filter((row) => row.working).map((row) => row.day), work_rows: rows, start_time: start, end_time: end, break_hours: breakHours, weekly_hours: weeklyHours };
});

function createEmployees() {
  const employees = [];
  const contracts = [];
  const usedEmails = new Set();
  let number = 1;
  for (const department of departments) {
    const departmentStart = number;
    const managerCount = Math.max(1, Math.floor(department.count / 10));
    for (let index = 0; index < department.count; index += 1) {
      const id = `emp_${pad(number, 3)}`;
      let name;
      let position;
      const featured = featuredEmployees[department.name]?.[index];
      if (featured) [name, position] = featured;
      else if (index === 0) [name, position] = department.head;
      else {
        name = `${firstNames[(number * 17 + index * 7) % firstNames.length]} ${lastNames[(number * 23 + index * 11) % lastNames.length]}`;
        position = department.roles[Math.min(department.roles.length - 1, Math.floor((index - 1) * department.roles.length / Math.max(1, department.count - 1)))];
      }
      const emailBase = slug(name);
      let email = name === 'Vikramaditya Rao' ? 'vikram.rao@oxp.example' : `${emailBase}@oxp.example`;
      let suffix = 2;
      while (usedEmails.has(email)) email = `${emailBase}${suffix++}@oxp.example`;
      usedEmails.add(email);

      const isHead = index === 0;
      const isManager = index > 0 && index <= managerCount;
      const isIntern = !isHead && (/Intern/.test(position) || index >= department.count - Math.max(1, Math.floor(department.count * 0.05)));
      const employeeType = isIntern ? 'Intern' : (!isHead && random() < 0.08 ? 'Contract' : 'Full-time');
      const status = !isHead && index === department.count - 1 && department.name !== 'Executive' ? 'Archived' : 'Active';
      const dateRange = isHead ? ['2017-01-01', '2020-12-31'] : isManager ? ['2019-01-01', '2023-12-31'] : isIntern ? ['2026-01-01', '2026-08-15'] : ['2020-01-01', '2026-08-15'];
      const startDate = randomDate(...dateRange);
      const endDate = status === 'Archived' ? randomDate(startDate > '2026-05-01' ? startDate : '2026-05-01', '2026-08-31') : null;
      const progress = isHead ? 0.88 + random() * 0.12 : isManager ? 0.62 + random() * 0.2 : 0.08 + random() * 0.58;
      let wage = moneyRound(department.salary[0] + (department.salary[1] - department.salary[0]) * progress);
      if (employeeType === 'Intern') wage = moneyRound(between(22000, 38000));
      if (employeeType === 'Contract') wage = moneyRound(wage * 1.12);
      const scheduleId = ['Support', 'Operations'].includes(department.name) && random() < 0.42 ? 'sch_support'
        : ['Management', 'Sales', 'Marketing', 'Product'].includes(department.name) && random() < 0.48 ? 'sch_flexible' : 'sch_standard';
      const managerNumber = isHead ? (department.name === 'Management' ? null : 1)
        : index > managerCount ? departmentStart + 1 + ((index - 1) % managerCount) : departmentStart;
      const managerId = managerNumber ? `emp_${pad(managerNumber, 3)}` : null;
      const location = weightedCity();
      employees.push({
        id, name, email, phone: `+91 ${between(70000, 99999)} ${between(10000, 99999)}`, department: department.name,
        position: isIntern ? `${department.name} Intern` : position, type: employeeType, status, manager_employee_id: managerId,
        location, schedule_id: scheduleId, bank: random() < 0.035 ? null : `HDFC-${String(8400000000 + number * 7919).slice(-10)}`,
        personal_email: `${emailBase}${number}@${pick(['gmail.com', 'outlook.com', 'proton.me'])}`,
        personal_phone: `+91 ${between(60000, 89999)} ${between(10000, 99999)}`,
        address: `${between(1, 402)}, ${pick(['Lake View', 'MG Road', 'Park Street', 'Palm Grove', 'Station Road', 'Green Enclave'])}, ${location}`,
        emergency_contact_name: `${pick(firstNames)} ${lastNames[(number * 13) % lastNames.length]}`,
        emergency_contact_phone: `+91 ${between(70000, 99999)} ${between(10000, 99999)}`,
        government_id_type: number % 3 === 0 ? 'PAN' : 'Employee-verified ID', government_id_number: `REF-${300000 + number * 97}`,
        startDate, endDate, wage,
      });
      contracts.push({ id: `contract_${pad(number, 3)}`, employee_id: id, start_date: startDate, end_date: endDate, wage, structure_id: employeeType === 'Intern' ? 'intern' : 'regular', schedule_id: scheduleId, status: status === 'Archived' ? 'Expired' : 'Running' });
      number += 1;
    }
  }
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  for (const employee of employees) employee.manager = employee.manager_employee_id ? byId.get(employee.manager_employee_id)?.name ?? null : null;
  return { employees, contracts };
}

function scheduledOn(employee, value) {
  const day = dateUtc(value).getUTCDay();
  return day !== 0 && (employee.schedule_id === 'sch_support' || day !== 6);
}
function timeFromMinutes(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
function createAttendance(employees) {
  const rows = [];
  const day = dateUtc('2026-04-01');
  const end = dateUtc(SNAPSHOT_DATE);
  while (day <= end) {
    const value = iso(day);
    for (const employee of employees) {
      if (value < employee.startDate || (employee.endDate && value > employee.endDate) || !scheduledOn(employee, value)) continue;
      const profile = Number(employee.id.slice(-3));
      if (random() < 0.012 + (profile % 9) * 0.002) {
        rows.push({ id: `att_${employee.id}_${value.replaceAll('-', '')}`, employee_id: employee.id, date: value, check_in: null, check_out: null, worked_hours: 0, overtime: 0, edited: false });
        continue;
      }
      const scheduledStart = employee.schedule_id === 'sch_support' ? 480 : employee.schedule_id === 'sch_flexible' ? 600 : 540;
      const scheduledEnd = employee.schedule_id === 'sch_support' ? 990 : employee.schedule_id === 'sch_flexible' ? 1140 : 1080;
      const checkInMinutes = scheduledStart + between(-24, 28) + (profile % 7 === 0 ? between(8, 18) : 0);
      const missingCheckout = random() < 0.009;
      const earlyOut = !missingCheckout && random() < 0.035;
      const overtimeMinutes = !missingCheckout && !earlyOut && random() < 0.14 ? between(30, 150) : 0;
      const checkOutMinutes = scheduledEnd - (earlyOut ? between(35, 120) : between(-12, 12)) + overtimeMinutes;
      const breakMinutes = employee.schedule_id === 'sch_support' ? 30 : 60;
      rows.push({ id: `att_${employee.id}_${value.replaceAll('-', '')}`, employee_id: employee.id, date: value, check_in: timeFromMinutes(checkInMinutes), check_out: missingCheckout ? null : timeFromMinutes(checkOutMinutes), worked_hours: missingCheckout ? 0 : round(Math.max(0, checkOutMinutes - checkInMinutes - breakMinutes) / 60), overtime: round(overtimeMinutes / 60), edited: random() < 0.018 });
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return rows;
}

function nextWorkingDay(employee, value) {
  let result = value;
  while (!scheduledOn(employee, result)) result = addDays(result, 1);
  return result;
}
function createLeave(employees) {
  const allocations = [];
  const requests = [];
  const reasons = ['Family commitment', 'Medical appointment', 'Personal work', 'Family vacation', 'Rest and recovery', 'Home relocation', 'Professional examination'];
  for (const employee of employees) {
    allocations.push({ id: `alloc_paid_${employee.id}`, employee_id: employee.id, type_id: 'paid', amount: employee.type === 'Intern' ? 10 : 20, start_date: '2026-01-01', end_date: '2026-12-31', status: 'Approved', approver: 'People Operations' });
    allocations.push({ id: `alloc_comp_${employee.id}`, employee_id: employee.id, type_id: 'comp', amount: between(4, 12), start_date: '2026-01-01', end_date: '2026-12-31', status: 'Approved', approver: 'People Operations' });
    for (let index = 0; index < between(0, 3); index += 1) {
      const typeId = pick(['paid', 'paid', 'paid', 'sick', 'sick', 'comp', 'unpaid']);
      const requestStart = employee.startDate > '2026-01-10' ? employee.startDate : '2026-01-10';
      const requestEnd = employee.endDate || '2026-10-20';
      const start = nextWorkingDay(employee, randomDate(requestStart, requestEnd));
      const duration = typeId === 'comp' ? pick([2, 4, 8]) : between(1, 3);
      let end = start;
      if (typeId !== 'comp') {
        let remaining = duration - 1;
        while (remaining > 0) {
          end = addDays(end, 1);
          if (scheduledOn(employee, end)) remaining -= 1;
        }
      }
      const roll = random();
      const status = start > SNAPSHOT_DATE ? (roll < 0.72 ? 'Pending' : roll < 0.92 ? 'Approved' : 'Refused') : (roll < 0.84 ? 'Approved' : 'Refused');
      requests.push({ id: `leave_${employee.id}_${index + 1}`, employee_id: employee.id, type_id: typeId, start_date: start, end_date: end, duration, reason: pick(reasons), status, approver: status === 'Pending' ? null : status === 'Refused' ? 'People Operations - declined' : employee.manager || 'People Operations', allocation_id: status === 'Approved' && typeId === 'paid' ? `alloc_paid_${employee.id}` : status === 'Approved' && typeId === 'comp' ? `alloc_comp_${employee.id}` : null });
    }
  }
  return { allocations, requests };
}

function reflectApprovedLeaveInAttendance(attendance, requests) {
  const attendanceByDay = new Map(attendance.map((row) => [`${row.employee_id}:${row.date}`, row]));
  for (const request of requests) {
    if (request.status !== 'Approved' || request.type_id === 'comp') continue;
    let day = request.start_date;
    while (day <= request.end_date && day <= SNAPSHOT_DATE) {
      const row = attendanceByDay.get(`${request.employee_id}:${day}`);
      if (row) {
        row.check_in = null;
        row.check_out = null;
        row.worked_hours = 0;
        row.overtime = 0;
      }
      day = addDays(day, 1);
    }
  }
}

function workingDays(employee, start, end) {
  let count = 0;
  const day = dateUtc(start);
  const last = dateUtc(end);
  while (day <= last) {
    if (scheduledOn(employee, iso(day))) count += 1;
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return count;
}
function createPayroll(employees, attendance, leaveRequests) {
  const payruns = [];
  const memberships = [];
  const payslips = [];
  for (const period of ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']) {
    const first = `${period}-01`;
    const monthEnd = iso(new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)));
    const through = period === '2026-09' ? SNAPSHOT_DATE : monthEnd;
    for (const structureId of ['regular', 'intern']) {
      const runId = `run_${period.replace('-', '')}_${structureId}`;
      const eligible = employees.filter((employee) => (employee.type === 'Intern' ? 'intern' : 'regular') === structureId && employee.startDate <= monthEnd && (!employee.endDate || employee.endDate >= first));
      if (!eligible.length) continue;
      payruns.push({ id: runId, name: `${structureId === 'intern' ? 'Interns - ' : ''}${new Date(`${first}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`, period, structure_id: structureId, status: period === '2026-09' ? 'Computed' : 'Paid', paid_at: period === '2026-09' ? null : `${monthEnd}T10:30:00Z` });
      for (const employee of eligible) {
        memberships.push({ payrun_id: runId, employee_id: employee.id, period });
        const effectiveStart = employee.startDate > first ? employee.startDate : first;
        const effectiveEnd = employee.endDate && employee.endDate < monthEnd ? employee.endDate : monthEnd;
        const scheduledDays = workingDays(employee, first, monthEnd);
        const contractDays = workingDays(employee, effectiveStart, effectiveEnd);
        const basic = round(employee.wage * (scheduledDays ? contractDays / scheduledDays : 1));
        const employeeAttendance = attendance.filter((row) => row.employee_id === employee.id && row.date >= first && row.date <= through);
        const workedDays = employeeAttendance.filter((row) => row.check_in).length;
        const overtimeHours = round(employeeAttendance.reduce((sum, row) => sum + Number(row.overtime || 0), 0));
        const overtimePay = round(contractDays ? overtimeHours * (basic / contractDays / 8) * 1.5 : 0);
        const unpaidDays = leaveRequests.filter((row) => row.employee_id === employee.id && row.type_id === 'unpaid' && row.status === 'Approved' && row.start_date <= monthEnd && row.end_date >= first).reduce((sum, row) => sum + Number(row.duration), 0);
        const hra = round(basic * 0.2);
        const meal = employee.type === 'Intern' ? 1000 : 2000;
        const gross = round(basic + hra + meal + overtimePay);
        const pf = round(basic * 0.12);
        const tax = round(basic * 0.05);
        const unpaidDeduction = round(scheduledDays ? gross * Math.min(unpaidDays, scheduledDays) / scheduledDays : 0);
        const deductions = round(pf + tax + 200 + unpaidDeduction);
        const lines = [
          { code: 'BASIC', name: 'Basic Salary', category: 'Basic', amount: basic },
          { code: 'HRA', name: 'House Rent Allowance', category: 'Allowance', amount: hra },
          { code: 'MEAL', name: 'Meal Allowance', category: 'Allowance', amount: meal },
          ...(overtimePay ? [{ code: 'OVERTIME', name: 'Overtime Earnings', category: 'Allowance', amount: overtimePay }] : []),
          { code: 'PF', name: 'Provident Fund', category: 'Deduction', amount: pf },
          { code: 'PT', name: 'Professional Tax', category: 'Deduction', amount: 200 },
          { code: 'TDS', name: 'Tax Deducted at Source', category: 'Deduction', amount: tax },
          ...(unpaidDeduction ? [{ code: 'UNPAID_LEAVE', name: 'Unpaid Leave', category: 'Deduction', amount: unpaidDeduction }] : []),
        ];
        payslips.push({ id: `slip_${period.replace('-', '')}_${employee.id}`, payrun_id: runId, employee_id: employee.id, period, structure_id: structureId, contract_id: `contract_${employee.id.slice(-3)}`, basic, gross, deductions, net: round(gross - deductions), worked_days: workedDays, scheduled_days: scheduledDays, unpaid_leave_days: unpaidDays, payable_days: Math.max(0, contractDays - unpaidDays), lines: JSON.stringify(lines) });
      }
    }
  }
  return { payruns, memberships, payslips };
}

async function insertRows(client, table, columns, rows, chunkSize = 500) {
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, rowIndex) => `(${columns.map((column, columnIndex) => {
      values.push(row[column]);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    }).join(', ')})`);
    await client.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`, values);
  }
}

async function seedDatabase() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const { employees, contracts } = createEmployees();
    const attendance = createAttendance(employees);
    const { allocations, requests } = createLeave(employees);
    reflectApprovedLeaveInAttendance(attendance, requests);
    const { payruns, memberships, payslips } = createPayroll(employees, attendance, requests);
    await client.query('BEGIN');
    await client.query(`
      DELETE FROM password_reset_tokens; DELETE FROM user_roles; DELETE FROM users; DELETE FROM audit_logs;
      DELETE FROM payslips; DELETE FROM payrun_employees; DELETE FROM payruns; DELETE FROM leave_requests;
      DELETE FROM leave_allocations; DELETE FROM attendance; DELETE FROM contracts; DELETE FROM employees;
    `);
    for (const schedule of schedules) {
      await client.query(
        `INSERT INTO schedules (id,name,schedule_type,days,work_rows,start_time,end_time,break_hours,weekly_hours)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
         schedule_type=EXCLUDED.schedule_type,days=EXCLUDED.days,work_rows=EXCLUDED.work_rows,start_time=EXCLUDED.start_time,
         end_time=EXCLUDED.end_time,break_hours=EXCLUDED.break_hours,weekly_hours=EXCLUDED.weekly_hours`,
        [schedule.id, schedule.name, schedule.schedule_type, JSON.stringify(schedule.days), JSON.stringify(schedule.work_rows), schedule.start_time, schedule.end_time, schedule.break_hours, schedule.weekly_hours]
      );
    }
    await client.query(`
      INSERT INTO leave_types (id,name,unit,requires_allocation,approval_workflow,payroll_impact,payroll_work_entry,display_color,active) VALUES
      ('paid','Paid Time Off','Days',true,'HR Approval','Paid','Leave Work Entry','Blue',true),
      ('sick','Sick Leave','Days',false,'HR Approval','Paid','Sick Work Entry','Red',true),
      ('comp','Comp Off','Hours',true,'Manager Approval','Paid','Compensatory Work Entry','Green',true),
      ('unpaid','Unpaid Leave','Days',false,'HR Approval','Unpaid','Unpaid Leave Work Entry','Orange',true)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,unit=EXCLUDED.unit,requires_allocation=EXCLUDED.requires_allocation,
      approval_workflow=EXCLUDED.approval_workflow,payroll_impact=EXCLUDED.payroll_impact,payroll_work_entry=EXCLUDED.payroll_work_entry,
      display_color=EXCLUDED.display_color,active=true
    `);
    await insertRows(client, 'employees', ['id','name','email','phone','department','position','type','status','manager','manager_employee_id','location','schedule_id','bank','personal_email','personal_phone','address','emergency_contact_name','emergency_contact_phone','government_id_type','government_id_number'], employees);
    await insertRows(client, 'contracts', ['id','employee_id','start_date','end_date','wage','structure_id','schedule_id','status'], contracts);
    await insertRows(client, 'attendance', ['id','employee_id','date','check_in','check_out','worked_hours','overtime','edited'], attendance);
    await insertRows(client, 'leave_allocations', ['id','employee_id','type_id','amount','start_date','end_date','status','approver'], allocations);
    await insertRows(client, 'leave_requests', ['id','employee_id','type_id','start_date','end_date','duration','reason','status','approver','allocation_id'], requests);
    await insertRows(client, 'payruns', ['id','name','period','structure_id','status','paid_at'], payruns);
    await insertRows(client, 'payrun_employees', ['payrun_id','employee_id','period'], memberships);
    await insertRows(client, 'payslips', ['id','payrun_id','employee_id','period','structure_id','contract_id','basic','gross','deductions','net','worked_days','scheduled_days','unpaid_leave_days','payable_days','lines'], payslips);

    const managerEmployeeIds = new Set(employees.map((employee) => employee.manager_employee_id).filter(Boolean));
    const roleFor = (employee) => managerEmployeeIds.has(employee.id) ? 'hr_manager'
      : employee.department === 'Finance' && /Director|Manager|Payroll/.test(employee.position) ? 'payroll_user' : 'employee';
    // Sara's named demo account is the canonical account for her employee row.
    // Excluding a second generated account prevents duplicate manager cards.
    const demoLinkedEmployeeNames = new Set(['Rajesh Varma', 'Nisha Rao', 'Sara Khan', 'John Dsouza']);
    const users = employees
      .filter((employee) => !demoLinkedEmployeeNames.has(employee.name))
      .map((employee) => ({ id: `user_${employee.id}`, email: employee.email, name: employee.name, role_id: roleFor(employee), employee_id: employee.id, password: hashPassword('welcome123'), active: employee.status === 'Active' }));
    const employeeByName = new Map(employees.map((employee) => [employee.name, employee]));
    const demoUsers = [
      ['u_admin','admin@oxp.example','PeoplePay360 Administrator','admin','Rajesh Varma','admin123'],
      ['u_payroll_manager','nisha@oxp.example','Nisha Rao','payroll_manager','Nisha Rao','payrollmgr123'],
      ['u_payroll_user','payroll.user@oxp.example','Payroll Operations User','payroll_user',null,'payroll123'],
      ['u_hr_manager','sara@oxp.example','Sara Khan','hr_manager','Sara Khan','hrmanager123'],
      ['u_employee','john@oxp.example','John Dsouza','employee','John Dsouza','employee123'],
    ].map(([id,email,name,roleId,employeeName,password]) => ({ id,email,name,role_id:roleId,employee_id:employeeName ? employeeByName.get(employeeName)?.id ?? null : null,password:hashPassword(password),active:true }));
    users.push(...demoUsers);
    await insertRows(client, 'users', ['id','email','name','role_id','employee_id','password','active'], users);
    await insertRows(client, 'user_roles', ['user_id','role_id'], users.map((user) => ({ user_id: user.id, role_id: user.role_id })));
    const managerUserByEmployeeId = new Map(
      users
        .filter((user) => user.role_id === 'hr_manager' && user.employee_id)
        .map((user) => [user.employee_id, user.id]),
    );
    const managerAssignments = employees
      .filter((employee) => managerUserByEmployeeId.has(employee.manager_employee_id))
      .map((employee) => ({
        manager_user_id: managerUserByEmployeeId.get(employee.manager_employee_id),
        employee_id: employee.id,
      }));
    await insertRows(client, 'manager_employee_assignments', ['manager_user_id','employee_id'], managerAssignments);
    const integrity = (await client.query(`SELECT
      (SELECT count(*)::int FROM employees) AS employees,
      (SELECT count(*)::int FROM employees WHERE manager_employee_id = id) AS self_managers,
      (SELECT count(*)::int FROM employees e WHERE e.manager_employee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM employees m WHERE m.id=e.manager_employee_id)) AS missing_managers,
      (SELECT count(*)::int FROM contracts WHERE end_date IS NOT NULL AND end_date < start_date) AS invalid_contract_dates,
      (SELECT count(*)::int FROM (SELECT employee_id,date FROM attendance GROUP BY employee_id,date HAVING count(*) > 1) duplicates) AS duplicate_attendance,
      (SELECT count(*)::int FROM users WHERE role_id='hr_manager') AS managers,
      (SELECT count(*)::int FROM manager_employee_assignments) AS manager_assignments,
      (SELECT count(*)::int FROM users GROUP BY employee_id HAVING employee_id IS NOT NULL AND count(*) > 1 LIMIT 1) AS duplicate_employee_accounts
    `)).rows[0];
    if (integrity.employees !== 300 || integrity.self_managers || integrity.missing_managers || integrity.invalid_contract_dates || integrity.duplicate_attendance || !integrity.managers || !integrity.manager_assignments || integrity.duplicate_employee_accounts) {
      throw new Error(`Generated data failed integrity checks: ${JSON.stringify(integrity)}`);
    }
    await client.query(`INSERT INTO audit_logs (id,action,at,actor) VALUES ('audit_company_seed','seedCompany300',CURRENT_TIMESTAMP,'Database Seeder')`);
    await client.query(`INSERT INTO workspace (id,data,revision) VALUES ('demo','{}',1) ON CONFLICT (id) DO UPDATE SET data='{}',revision=workspace.revision+1`);
    await client.query('COMMIT');
    const summary = await client.query(`SELECT (SELECT count(*)::int FROM employees) employees,
      (SELECT count(DISTINCT department)::int FROM employees) departments,(SELECT count(*)::int FROM contracts) contracts,
      (SELECT count(*)::int FROM attendance) attendance,(SELECT count(*)::int FROM leave_requests) leave_requests,
      (SELECT count(*)::int FROM leave_allocations) leave_allocations,(SELECT count(*)::int FROM payruns) payruns,
      (SELECT count(*)::int FROM payslips) payslips,(SELECT count(*)::int FROM users) users`);
    console.log('PeoplePay360 company dataset seeded successfully.');
    console.table(summary.rows);
    const departmentSummary = await client.query(`SELECT e.department, count(*)::int AS people,
      round(min(c.wage))::int AS min_salary, round(avg(c.wage))::int AS avg_salary, round(max(c.wage))::int AS max_salary
      FROM employees e JOIN contracts c ON c.employee_id=e.id GROUP BY e.department ORDER BY people DESC, e.department`);
    console.table(departmentSummary.rows);
    const variation = await client.query(`SELECT
      (SELECT min(start_date) FROM contracts) AS earliest_start,
      (SELECT max(start_date) FROM contracts) AS latest_start,
      (SELECT count(*)::int FROM attendance WHERE check_in IS NULL) AS absences,
      (SELECT count(*)::int FROM attendance WHERE check_in IS NOT NULL AND check_out IS NULL) AS missing_checkouts,
      (SELECT count(*)::int FROM attendance WHERE overtime > 0) AS overtime_days,
      (SELECT count(*)::int FROM employees WHERE status='Archived') AS archived_people`);
    console.table(variation.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch((error) => {
  console.error('Company seed failed:', error);
  process.exitCode = 1;
});
