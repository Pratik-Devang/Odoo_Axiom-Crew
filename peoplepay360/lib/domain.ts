export type Row = { id: string; [key: string]: any };
export type Workspace = { employees: Row[]; contracts: Row[]; attendance: Row[]; requests: Row[]; allocations: Row[]; leaveTypes: Row[]; rules: Row[]; structures: Row[]; schedules: Row[]; payruns: Row[]; audit: Row[] };
export const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
export const uid=()=>crypto.randomUUID();
export const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export const monthEnd=(p:string)=>new Date(Date.UTC(+p.slice(0,4),+p.slice(5,7),0)).toISOString().slice(0,10);
export const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export function scheduleRows(schedule:Row|undefined):Row[]{
 if(!schedule)return[];
 if(Array.isArray(schedule.workRows)&&schedule.workRows.length)return schedule.workRows;
 return WEEKDAYS.map(day=>({id:day,day,working:(schedule.days||[]).includes(day),start:schedule.start||'09:00',end:schedule.end||'18:00',breakHours:+schedule.breakHours||0}));
}
export function scheduleRowForDate(schedule:Row|undefined,date:string):Row|undefined{return scheduleRows(schedule).find(row=>row.day===WEEKDAYS[new Date(date+'T00:00:00Z').getUTCDay()]&&row.working);}
export function scheduleDayHours(row:Row|undefined):number{return row?round(Math.max(0,((+row.end.slice(0,2)*60 + +row.end.slice(3))-(+row.start.slice(0,2)*60 + +row.start.slice(3)))/60-(+row.breakHours||0))):0;}
export function scheduleWeeklyHours(schedule:Row|undefined):number{return round(scheduleRows(schedule).filter(row=>row.working).reduce((total,row)=>total+scheduleDayHours(row),0));}
export function employeeSchedule(s:Workspace,employeeId:string,date:string):Row|undefined{const contract=s.contracts.filter(c=>c.employeeId===employeeId&&c.start<=date&&(!c.end||c.end>=date)).sort((a,b)=>b.start.localeCompare(a.start))[0],employee=s.employees.find(e=>e.id===employeeId);return s.schedules.find(row=>row.id===(contract?.scheduleId||employee?.scheduleId));}
export function workingDaysBetween(s:Workspace,employeeId:string,start:string,end:string):number{let count=0,cursor=new Date(start+'T00:00:00Z'),last=new Date(end+'T00:00:00Z');while(cursor<=last){const date=cursor.toISOString().slice(0,10);if(scheduleRowForDate(employeeSchedule(s,employeeId,date),date))count++;cursor.setUTCDate(cursor.getUTCDate()+1);}return count;}
export function activeContract(s:Workspace,id:string,p:string){const cs=s.contracts.filter(c=>c.employeeId===id&&c.start<=monthEnd(p)&&(!c.end||c.end>=p+'-01'));if(cs.length!==1)throw new Error(cs.length?'Overlapping contracts in this period.':'No contract applies to this period.');if(cs[0].start>p+'-01'||(cs[0].end&&cs[0].end<monthEnd(p)))throw new Error('Prototype requires a full-period contract.');return cs[0];}
export function formula(expression:string,values:Record<string,number>):number{
 const ts=expression.match(/[A-Za-z_][A-Za-z_0-9]*|\d+(?:\.\d+)?|[()+\-*/]/g)||[];if(ts.join('')!==expression.replace(/\s/g,''))throw new Error('Use numbers, rule codes, arithmetic and parentheses only.');let i=0;
 function atom():number{const t=ts[i++];if(t==='-')return -atom();if(t==='+')return atom();if(t==='('){const v=add();if(ts[i++]!==')')throw new Error('Unclosed parenthesis.');return v;}if(t&&/^\d/.test(t))return +t;if(t&&Object.hasOwn(values,t))return values[t];throw new Error('Unknown or out-of-order rule: '+t);}
 function mul():number{let v=atom();while(ts[i]==='*'||ts[i]==='/'){const op=ts[i++],b=atom();if(op==='/'&&b===0)throw new Error('Division by zero.');v=op==='*'?v*b:v/b;}return v;}
 function add():number{let v=mul();while(ts[i]==='+'||ts[i]==='-'){const op=ts[i++],b=mul();v=op==='+'?v+b:v-b;}return v;}
 const v=add();if(i!==ts.length||!Number.isFinite(v))throw new Error('Invalid formula.');return v;
}
export function computeSlip(s:Workspace,id:string,period:string,structureId:string):Row{const c=activeContract(s,id,period),st=s.structures.find(x=>x.id===structureId);if(!st)throw new Error('Select a salary structure.');const values:Record<string,number>={WAGE:c.wage};const lines=s.rules.filter(r=>st.ruleIds.includes(r.id)).sort((a,b)=>a.sequence-b.sequence).map(r=>{const amount=round(r.method==='Fixed'?+r.value:r.method==='Percentage'?formula(r.base||'WAGE',values)*r.value/100:formula(r.expression,values));if(amount<0)throw new Error('Rule amounts must be non-negative.');values[r.code]=amount;return{code:r.code,name:r.name,category:r.category,amount};});const gross=round(lines.filter(l=>['Basic','Allowance'].includes(l.category)).reduce((n,l)=>n+l.amount,0));const first=period+'-01',last=monthEnd(period),scheduledDays=workingDaysBetween(s,id,first,last),unpaidLeaveDays=round(s.requests.filter(request=>request.employeeId===id&&request.status==='Approved'&&request.start<=last&&request.end>=first&&s.leaveTypes.find(type=>type.id===request.typeId)?.payrollImpact==='Unpaid').reduce((total,request)=>{const type=s.leaveTypes.find(item=>item.id===request.typeId);if(type?.unit==='Hours'){const shiftHours=scheduleDayHours(scheduleRowForDate(employeeSchedule(s,id,request.start),request.start));return total+(+request.duration||0)/Math.max(1,shiftHours);}return total+workingDaysBetween(s,id,request.start<first?first:request.start,request.end>last?last:request.end);},0));const unpaidDeduction=round(scheduledDays?gross*Math.min(unpaidLeaveDays,scheduledDays)/scheduledDays:0);if(unpaidDeduction)lines.push({code:'UNPAID_LEAVE',name:'Unpaid Leave',category:'Deduction',amount:unpaidDeduction});const deductions=round(lines.filter(l=>l.category==='Deduction').reduce((n,l)=>n+l.amount,0));if(deductions>gross)throw new Error('Deductions exceed gross salary.');return{id:uid(),employeeId:id,period,structureId,contractId:c.id,lines,basic:values.BASIC||0,gross,deductions,net:round(gross-deductions),scheduledDays,unpaidLeaveDays,payableDays:round(Math.max(0,scheduledDays-unpaidLeaveDays)),workedDays:s.attendance.filter(a=>a.employeeId===id&&a.date.startsWith(period)&&a.checkIn).length};}
export function seed():Workspace{
 const ps=[['Aarav Mehta','Finance','Payroll Specialist',85000],['Sara Khan','HR','HR Manager',95000],['John Dsouza','Engineering','Frontend Developer',90000],['Neha Patel','HR','Talent Acquisition',65000],['Maya Shah','Sales','Account Executive',72000],['Rohan Patel','Engineering','Backend Developer',105000],['Nisha Rao','Finance','Finance Manager',110000],['Ishaan Kapoor','Support','Customer Success',58000],['Ananya Iyer','Engineering','Product Designer',88000],['Dev Shah','Sales','Sales Manager',98000],['Priya Nair','Support','Support Specialist',52000],['Kabir Sethi','Engineering','Engineering Intern',25000]];
 const defaultRows=WEEKDAYS.map(day=>({id:day,day,working:['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(day),start:'09:00',end:'18:00',breakHours:1}));const s:Workspace={employees:ps.map((p,i)=>({id:'e'+i,name:p[0],department:p[1],position:p[2],email:String(p[0]).split(' ')[0].toLowerCase()+'@oxp.example',phone:'+91 90000 '+(10000+i),type:i===11?'Intern':'Full-time',status:'Active',manager:'Sara Khan',location:'Mumbai',scheduleId:'sch1',bank:i===3?'':'DEMO-'+(1000+i)})),contracts:ps.map((p,i)=>({id:'c'+i,employeeId:'e'+i,start:'2026-01-01',end:i===11?'2026-09-30':'',wage:p[3],structureId:i===11?'intern':'regular',scheduleId:'sch1',status:'Running'})),attendance:[],requests:[],allocations:[],leaveTypes:[{id:'paid',name:'Paid Time Off',unit:'Days',requiresAllocation:true,approvalWorkflow:'HR Approval',payrollImpact:'Paid'},{id:'sick',name:'Sick Leave',unit:'Days',requiresAllocation:false,approvalWorkflow:'HR Approval',payrollImpact:'Paid'},{id:'comp',name:'Comp Off',unit:'Hours',requiresAllocation:true,approvalWorkflow:'Manager Approval',payrollImpact:'Paid'},{id:'unpaid',name:'Unpaid Leave',unit:'Days',requiresAllocation:false,approvalWorkflow:'HR Approval',payrollImpact:'Unpaid'}],rules:[{id:'basic',name:'Basic Salary',code:'BASIC',category:'Basic',sequence:1,method:'Percentage',base:'WAGE',value:100,expression:''},{id:'hra',name:'House Rent Allowance',code:'HRA',category:'Allowance',sequence:10,method:'Percentage',base:'BASIC',value:20,expression:''},{id:'meal',name:'Meal Allowance',code:'MEAL',category:'Allowance',sequence:20,method:'Fixed',base:'WAGE',value:2000,expression:''},{id:'deduct',name:'Example deduction',code:'DEDUCT',category:'Deduction',sequence:30,method:'Percentage',base:'BASIC',value:5,expression:''}],structures:[{id:'regular',name:'Regular Salary',ruleIds:['basic','hra','meal','deduct'],active:true},{id:'intern',name:'Intern Salary',ruleIds:['basic','meal'],active:true}],schedules:[{id:'sch1',name:'Standard workweek',type:'Fixed',days:['Monday','Tuesday','Wednesday','Thursday','Friday'],start:'09:00',end:'18:00',breakHours:1,workRows:defaultRows,weeklyHours:40}],payruns:[],audit:[]};
 for(let m=4;m<=9;m++)for(let d=1;d<=(m===9?4:20);d++){const date=`2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if([0,6].includes(new Date(date).getUTCDay()))continue;s.employees.forEach((e,i)=>s.attendance.push({id:`a${m}-${d}-${i}`,employeeId:e.id,date,checkIn:(i+d)%13===0?'':(i+d)%5===0?'09:22':'08:55',checkOut:(i+d)%13===0?'':(i+d)%17===0?'':'18:00',edited:false}));}
 s.employees.forEach(e=>s.allocations.push({id:'al'+e.id,employeeId:e.id,typeId:'paid',amount:20,start:'2026-01-01',end:'2026-12-31',status:'Approved'}));
 s.requests=[{id:'r1',employeeId:'e2',typeId:'paid',start:'2026-09-07',end:'2026-09-09',duration:3,reason:'Family vacation',status:'Pending'},{id:'r2',employeeId:'e4',typeId:'sick',start:'2026-09-03',end:'2026-09-03',duration:1,reason:'Medical appointment',status:'Approved'},{id:'r3',employeeId:'e8',typeId:'paid',start:'2026-09-10',end:'2026-09-11',duration:2,reason:'Personal time',status:'Pending'},{id:'r4',employeeId:'e0',typeId:'paid',start:'2026-09-01',end:'2026-09-02',duration:2,reason:'Family visit',status:'Approved'}];
 for(let m=4;m<=8;m++){const period=`2026-0${m}`,ids=s.employees.filter(e=>e.type!=='Intern'&&(m>=7||+e.id.slice(1)<9)).map(e=>e.id);s.payruns.push({id:'run'+m,name:new Date(period+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}),period,structureId:'regular',employeeIds:ids,status:'Paid',slips:ids.map(id=>computeSlip(s,id,period,'regular'))});}
 const septemberIds=s.employees.filter(e=>e.type!=='Intern').map(e=>e.id);
 s.payruns.push({id:'run9',name:'September 2026',period:'2026-09',structureId:'regular',employeeIds:septemberIds,status:'Computed',slips:septemberIds.map(id=>computeSlip(s,id,'2026-09','regular'))});return s;
}
export const hours=(a:Row)=>a.checkIn&&a.checkOut?round(Math.max(0,(+a.checkOut.slice(0,2)*60 + +a.checkOut.slice(3))-(+a.checkIn.slice(0,2)*60 + +a.checkIn.slice(3)))/60):0;
export function allocationBalance(s:Workspace,a:Row){return a.status==='Approved'?a.amount-s.requests.filter(r=>r.employeeId===a.employeeId&&r.typeId===a.typeId&&r.status==='Approved'&&r.start>=a.start&&r.end<=a.end).reduce((n,r)=>n+r.duration,0):0;}
export function warnings(s:Workspace,run:Row):string[]{return run.employeeIds.flatMap((id:string)=>{const e=s.employees.find(e=>e.id===id),out:string[]=[];if(!e?.bank)out.push(`${e?.name}: missing bank details`);try{activeContract(s,id,run.period);}catch(err){out.push(`${e?.name}: ${(err as Error).message}`);}if(s.payruns.some(r=>r.id!==run.id&&r.period===run.period&&r.slips.some((p:Row)=>p.employeeId===id)))out.push(`${e?.name}: duplicate payslip in this period`);return out;});}

export type UserRole = 'Admin' | 'HR Payroll Manager' | 'HR Payroll User' | 'HR Manager' | 'Employee';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  employeeId?: string;
}

export function canView(role: string | undefined | null, section: string): boolean {
  if (!role) return false;
  const r = role.trim();
  const s = section.replace(/^#/, '');

  if (r === 'Admin') return true;

  if (r === 'HR Payroll Manager') {
    return [
      'employees',
      'contracts',
      'attendance',
      'time-off',
      'payroll/dashboard',
      'payroll/payruns',
      'payroll/payslips',
      'payroll/structures',
      'payroll/rules',
      'overview',
      'payruns',
      'payslips',
      'structures',
      'rules',
      'requests',
      'allocations',
      'leaveTypes',
      'schedules',
    ].includes(s);
  }

  if (r === 'HR Payroll User') {
    return [
      'employees',
      'contracts',
      'attendance',
      'time-off',
      'payroll/dashboard',
      'payroll/payruns',
      'payroll/payslips',
      'payroll/structures',
      'payroll/rules',
      'overview',
      'payruns',
      'payslips',
      'structures',
      'rules',
      'requests',
      'allocations',
      'leaveTypes',
      'schedules',
    ].includes(s);
  }

  if (r === 'HR Manager') {
    return [
      'employees',
      'contracts',
      'attendance',
      'time-off',
      'requests',
      'allocations',
      'leaveTypes',
      'schedules',
    ].includes(s);
  }

  if (r === 'Employee') {
    return [
      'attendance',
      'time-off',
      'payroll/payslips',
      'requests',
      'payslips',
      'employee',
      'profile',
    ].includes(s);
  }

  return false;
}
