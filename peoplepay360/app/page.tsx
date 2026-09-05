'use client';
import {useCallback,useEffect,useState} from 'react';
import {
  Layers,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Clock3,
  LayoutGrid,
  List,
  Download,
  ArrowLeft,
  Check,
  RefreshCw,
  FileText,
  Search,
  Users,
  Briefcase,
  CalendarDays,
  Wallet,
  Bell,
  HelpCircle,
  Sparkles,
  Mic,
  SlidersHorizontal,
  Calculator,
  Play,
  X
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Checkbox} from '@/components/ui/checkbox';
import {type Workspace,type Row,money,hours,activeContract,warnings,allocationBalance,monthEnd} from '@/lib/domain';
import {Avatar,Badge,DataTable,Field,Picker,niceMonth,downloadCsv} from '@/components/peoplepay-ui';
import Dashboard from '@/components/payroll-dashboard';
import RecordForm,{defaults,titles} from '@/components/record-form';

type Modal={kind:'form'|'request'|'allocation'|'wizard'|'slip'|'clock'|'about';collection?:string;record?:Row};
const descriptions:Record<string,string>={
  employees:'The people who make it all happen.',
  contracts:'Employment terms, current contracts, and the full history.',
  attendance:'Review presence, working hours, and attendance exceptions.',
  requests:'A little time away. A clear approval process.',
  allocations:'Leave entitlements, approvals, and available balances.',
  leaveTypes:'Set the policies behind every time off request.',
  schedules:'Define your team’s working week.',
  payruns:'From contract to payslip, one connected workflow.',
  payslips:'Every salary, with a clear breakdown.',
  structures:'Group the rules that shape employee pay.',
  rules:'Configure the calculation behind every salary component.'
};

export default function Home(){
  const [s,setS]=useState<Workspace|null>(null);
  const [revision,setRevision]=useState(0);
  const [view,setView]=useState('overview');
  const [activeId,setActiveId]=useState('');
  const [filterId,setFilterId]=useState('');
  const [query,setQuery]=useState('');
  const [moduleSearch,setModuleSearch]=useState('');
  const [mode,setMode]=useState('grid');
  const [period,setPeriod]=useState('2026-09');
  const [department,setDepartment]=useState('All');
  const [employeeType,setEmployeeType]=useState('All');
  const [modal,setModal]=useState<Modal|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [clockNow,setClockNow]=useState(new Date());

  const load=useCallback(async()=>{
    try{
      setError('');
      const r=await fetch('/api/workspace',{cache:'no-store'});
      const body=(await r.json()) as any;
      if(!r.ok)throw new Error(body.error);
      setS(body.data);
      setRevision(body.revision);
    }catch(e){
      setError((e as Error).message);
    }
  },[]);

  useEffect(()=>{
    void load();
    const timer=setInterval(()=>setClockNow(new Date()),30000);
    return()=>clearInterval(timer);
  },[load]);

  useEffect(()=>{
    const read=()=>{
      const [v,id]=window.location.hash.slice(1).split('/');
      if(v&&(titles[v]||v==='overview'||v==='employee'||v==='run')){
        setView(v);
        setActiveId(decodeURIComponent(id||''));
        setFilterId('');
      }
    };
    read();
    window.addEventListener('hashchange',read);
    return()=>window.removeEventListener('hashchange',read);
  },[]);

  function navigate(v:string,id?:string){
    setView(v);
    setActiveId(id||'');
    setFilterId('');
    setQuery('');
    setModal(null);
    setError('');
    setMessage('');
    window.history.replaceState(null,'','#'+v+(id?'/'+encodeURIComponent(id):''));
  }

  function related(v:string,id:string){
    navigate(v);
    setFilterId(id);
  }

  async function act(action:string,payload:Record<string,any>={},success='Changes saved'):Promise<Workspace|null>{
    if(busy)return null;
    setBusy(true);
    setError('');
    setMessage('');
    try{
      const r=await fetch('/api/workspace',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action,payload,revision})
      });
      const b=(await r.json()) as any;
      if(!r.ok)throw new Error(b.error||'Unable to save.');
      setS(b.data);
      setRevision(b.revision);
      setMessage(success);
      return b.data;
    }catch(e){
      setError((e as Error).message);
      return null;
    }finally{
      setBusy(false);
    }
  }

  const employee=(id:string)=>s?.employees.find(e=>e.id===id);
  const empName=(id:string)=>employee(id)?.name||'Unknown employee';
  const structure=(id:string)=>s?.structures.find(t=>t.id===id)?.name||'Unknown structure';
  const leaveType=(id:string)=>s?.leaveTypes.find(t=>t.id===id);

  function openForm(collection:string,record?:Row){
    if(!s)return;
    setError('');
    setModal({kind:'form',collection,record:record?structuredClone(record):defaults(collection,s,filterId||undefined)});
  }

  const saveRecord=async(record:Row)=>{
    const result=await act('save',{collection:modal!.collection,record});
    if(result)setModal(null);
  };

  const filtered=(list:Row[])=>list.filter(r=>
    (!filterId||r.employeeId===filterId)&&
    (!query||[r.name,r.email,r.department,r.position,r.code,empName(r.employeeId)].some(x=>String(x||'').toLowerCase().includes(query.toLowerCase())))
  );

  const activeEmployee=employee(activeId);
  const run=s?.payruns.find(r=>r.id===activeId);
  const reviewedRecord=modal?.kind==='request'?s?.requests.find(r=>r.id===modal.record?.id):modal?.kind==='allocation'?s?.allocations.find(r=>r.id===modal.record?.id):null;
  const currentClock=s?.attendance.find(a=>a.employeeId==='e6'&&a.date===clockNow.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}));
  const signedIn=!!currentClock?.checkIn&&!currentClock?.checkOut;
  const allSlips=s?.payruns.flatMap(r=>r.slips.map((p:Row)=>({...p,runId:r.id,status:r.status})))||[];

  const cellEmployee=(r:Row)=>(
    <button className="flex items-center gap-2 text-left hover:underline" onClick={()=>navigate('employee',r.employeeId)}>
      <Avatar name={empName(r.employeeId)}/>
      <span>
        <span className="font-semibold text-slate-900 block leading-tight">{empName(r.employeeId)}</span>
        <span className="text-[11px] text-slate-400 block">{employee(r.employeeId)?.department}</span>
      </span>
    </button>
  );

  const attendanceStatus=(a:Row)=>!a.checkIn?'Absent':!a.checkOut?'Missing check-out':a.checkIn>(s?.schedules.find(sc=>sc.id===employee(a.employeeId)?.scheduleId)?.start||'09:00')?'Late':'Present';

  const runSlipColumns=[
    {title:'Employee',render:cellEmployee},
    {title:'Recorded days',render:(p:Row)=>p.workedDays},
    {title:'Basic',render:(p:Row)=>money(p.basic)},
    {title:'Gross',render:(p:Row)=>money(p.gross)},
    {title:'Deductions',render:(p:Row)=>money(p.deductions)},
    {title:'Net salary',render:(p:Row)=><b className="text-slate-900 font-bold">{money(p.net)}</b>},
    {title:'Payslip',render:(p:Row)=><button className="inline-flex items-center gap-1 text-slate-900 hover:underline font-semibold" onClick={()=>setModal({kind:'slip',record:p})}><FileText size={14}/> View</button>}
  ];

  const exportPayroll=()=>{
    if(!s)return;
    downloadCsv('peoplepay-payroll.csv',[
      ['Period','Employee','Department','Gross','Deductions','Net','Status'],
      ...allSlips.filter(p=>p.period===period).map(p=>[p.period,empName(p.employeeId),employee(p.employeeId)?.department,p.gross,p.deductions,p.net,p.status])
    ]);
  };

  const libraryModules = [
    {
      category: 'PEOPLE',
      items: [
        { id: 'employees', title: 'Employees', desc: 'Team directory & profiles', icon: Users },
        { id: 'contracts', title: 'Contracts', desc: 'Terms & salary structures', icon: Briefcase },
        { id: 'schedules', title: 'Schedules', desc: 'Working hours & shifts', icon: Clock3 },
      ]
    },
    {
      category: 'TIME OFF',
      items: [
        { id: 'requests', title: 'Leave Requests', desc: 'Review & approval process', icon: CalendarDays },
        { id: 'allocations', title: 'Allocations', desc: 'Entitlements & pool balances', icon: Layers },
        { id: 'leaveTypes', title: 'Leave Policies', desc: 'Paid & unpaid policy types', icon: Sparkles },
      ]
    },
    {
      category: 'PAYROLL',
      items: [
        { id: 'payruns', title: 'Payruns', desc: 'Compute & validate monthly runs', icon: Play },
        { id: 'payslips', title: 'Payslips', desc: 'Generated salary breakdowns', icon: FileText },
        { id: 'structures', title: 'Salary Structures', desc: 'Rule groups & blueprints', icon: SlidersHorizontal },
        { id: 'rules', title: 'Salary Rules', desc: 'Formula & calculation logic', icon: Calculator },
      ]
    }
  ];

  return (
    <div className="workora-shell">
      {/* ─── Workora Top Navigation Bar ─── */}
      <header className="workora-topbar">
        <a
          href="#overview"
          className="workora-brand"
          onClick={e=>{
            e.preventDefault();
            navigate('overview');
          }}
        >
          <span className="workora-brand-dot"/>
          peoplepay360
        </a>

        {/* Center Pill Tabs (Workora style) */}
        <nav className="workora-nav-pills" aria-label="Main Navigation">
          <button
            className={'nav-pill '+(view==='overview'?'active':'')}
            onClick={()=>navigate('overview')}
          >
            <LayoutGrid size={15}/>
            Overview
          </button>
          <button
            className={'nav-pill '+((view==='employees'||view==='employee')?'active':'')}
            onClick={()=>navigate('employees')}
          >
            <Users size={15}/>
            Employees
          </button>
          <button
            className={'nav-pill '+((view==='contracts'||view==='schedules')?'active':'')}
            onClick={()=>navigate('contracts')}
          >
            <Briefcase size={15}/>
            Contracts
          </button>
          <button
            className={'nav-pill '+(view==='attendance'?'active':'')}
            onClick={()=>navigate('attendance')}
          >
            <Clock3 size={15}/>
            Attendance
          </button>
          <button
            className={'nav-pill '+(['requests','allocations','leaveTypes'].includes(view)?'active':'')}
            onClick={()=>navigate('requests')}
          >
            <CalendarDays size={15}/>
            Time Off
          </button>
          <button
            className={'nav-pill '+(['payruns','run','payslips','structures','rules'].includes(view)?'active':'')}
            onClick={()=>navigate('payruns')}
          >
            <Wallet size={15}/>
            Payroll
          </button>
        </nav>

        {/* Right Utility Buttons */}
        <div className="workora-top-actions">
          <button
            className={'circle-btn '+(signedIn?'clock-active':'')}
            title={signedIn?'Checked in · Click to manage':'Check in to attendance'}
            aria-label="Attendance check-in"
            onClick={()=>setModal({kind:'clock'})}
          >
            <Clock3 size={17}/>
          </button>
          <button
            className="circle-btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={()=>setMessage('Workspace synced and operational.')}
          >
            <Bell size={17}/>
          </button>
          <button
            className="circle-btn"
            title="About PeoplePay360"
            aria-label="About prototype"
            onClick={()=>setModal({kind:'about'})}
          >
            <HelpCircle size={17}/>
          </button>
          <button
            className="circle-avatar"
            title="Nisha Rao · Demo Administrator"
            aria-label="User profile"
            onClick={()=>setModal({kind:'about'})}
          >
            NR
          </button>
        </div>
      </header>

      {/* ─── Workora Main Layout (Left Node Library + Center Workspace) ─── */}
      <div className="workora-layout">
        {/* Left Module Library Panel (Workora Node Library style) */}
        <aside className="workora-left-panel">
          <div>
            <h3 className="panel-section-title">MODULE LIBRARY</h3>
            <div className="pill-search">
              <Search size={14} className="text-slate-400 shrink-0"/>
              <input
                placeholder="Search modules…"
                value={moduleSearch}
                onChange={e=>setModuleSearch(e.target.value)}
              />
            </div>
          </div>

          {libraryModules.map(group=>{
            const visibleItems = group.items.filter(item=>
              !moduleSearch ||
              item.title.toLowerCase().includes(moduleSearch.toLowerCase()) ||
              item.desc.toLowerCase().includes(moduleSearch.toLowerCase())
            );
            if(!visibleItems.length) return null;

            return (
              <div key={group.category} className="library-group">
                <h4 className="panel-section-title">{group.category}</h4>
                {visibleItems.map(item=>(
                  <button
                    key={item.id}
                    className={'library-card-item '+(view===item.id?'active':'')}
                    onClick={()=>navigate(item.id)}
                  >
                    <div className="library-icon-box">
                      <item.icon size={16}/>
                    </div>
                    <div className="library-item-content">
                      <p className="library-item-title">{item.title}</p>
                      <p className="library-item-desc">{item.desc}</p>
                    </div>
                    <ChevronRight size={14} className="library-item-arrow"/>
                  </button>
                ))}
              </div>
            );
          })}
        </aside>

        {/* Center Workspace ─── */}
        <main className="workora-main">
          {/* Sub-Header Action Bar (Workora style) */}
          <div className="workora-subbar">
            <div className="subbar-left">
              {['employee','run'].includes(view)&&(
                <button
                  className="subbar-back"
                  onClick={()=>navigate(view==='employee'?'employees':'payruns')}
                  title="Go back"
                >
                  <ArrowLeft size={16}/>
                </button>
              )}
              <h1 className="subbar-title">
                {view==='overview'
                  ?'People & Operations Workflow'
                  :view==='employee'
                  ?activeEmployee?.name||'Employee Profile'
                  :view==='run'
                  ?run?.name||'Payrun Workflow'
                  :titles[view]}
              </h1>
              <span className="status-pill-badge">
                <span className="status-dot"/>
                Live Workspace
              </span>
            </div>

            <div className="subbar-right">
              {['attendance','payslips','payruns'].includes(view)&&(
                <Input
                  type="month"
                  aria-label="Payroll period"
                  className="h-9 px-3 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 w-36 shadow-2xs"
                  value={period}
                  onChange={e=>setPeriod(e.target.value)}
                />
              )}
              <button className="pill-btn" onClick={exportPayroll} disabled={!s}>
                <Download size={14}/>
                Export
              </button>
              {view==='overview'?(
                <button
                  className="pill-btn pill-btn-black"
                  disabled={!s}
                  onClick={()=>{setError('');setModal({kind:'wizard'});}}
                >
                  <Plus size={14}/>
                  New Payrun
                  <ChevronDown size={13} className="ml-1 opacity-70"/>
                </button>
              ):view==='employee'?(
                <button
                  className="pill-btn pill-btn-black"
                  onClick={()=>activeEmployee&&openForm('employees',activeEmployee)}
                >
                  Edit Employee
                </button>
              ):view==='run'?(
                <button
                  className="pill-btn"
                  onClick={()=>navigate('payruns')}
                >
                  All Payruns
                </button>
              ):(
                <button
                  className="pill-btn pill-btn-black"
                  disabled={!s}
                  onClick={()=>view==='payruns'?setModal({kind:'wizard'}):openForm(view)}
                >
                  <Plus size={14}/>
                  {view==='payruns'?'New Payrun':'New Record'}
                </button>
              )}
            </div>
          </div>

          {error&&!modal&&<div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 shadow-2xs flex items-center justify-between"><span>{error}</span> <button className="font-semibold underline ml-2 text-slate-900" onClick={()=>void load()}>Reload</button></div>}
          {message&&!modal&&<div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 shadow-2xs font-medium">{message}</div>}

          {!s?(
            <div className="workora-card text-center py-16">
              <RefreshCw className="size-8 text-slate-400 mx-auto animate-spin mb-3"/>
              <h2 className="text-base font-semibold text-slate-900">{error?'Workspace connection unavailable':'Opening your workspace…'}</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error?'Verify that the database is running, then reload.':'Loading employees, attendance, and payroll records.'}</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={()=>void load()}>Reload</Button>
            </div>
          ):(
            <>
              {view==='overview'&&(
                <Dashboard
                  s={s}
                  period={period}
                  setPeriod={setPeriod}
                  department={department}
                  setDepartment={setDepartment}
                  employeeType={employeeType}
                  setEmployeeType={setEmployeeType}
                  navigate={(v,id)=>id&&v==='employees'?navigate('employee',id):navigate(v,id)}
                />
              )}

              {/* Data Views (Cards or Execution Logs Table) */}
              {!['overview','employee','run'].includes(view)&&(
                <div className="workora-table-container">
                  <div className="table-tab-strip flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <button className="table-tab-item active">
                        {titles[view]||'Records'}
                      </button>
                      <button className="table-tab-muted">
                        Data Preview
                      </button>
                      <button className="table-tab-muted">
                        Variables
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="pill-search !py-1 !px-3">
                        <Search size={13} className="text-slate-400 shrink-0"/>
                        <input
                          aria-label="Filter records"
                          placeholder="Filter records…"
                          value={query}
                          onChange={e=>setQuery(e.target.value)}
                        />
                      </div>
                      {view==='employees'&&(
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
                          <button
                            className={'px-2.5 py-1 rounded-full text-xs font-medium '+(mode==='grid'?'bg-white text-slate-900 shadow-2xs':'text-slate-500')}
                            onClick={()=>setMode('grid')}
                          >
                            <LayoutGrid size={13}/>
                          </button>
                          <button
                            className={'px-2.5 py-1 rounded-full text-xs font-medium '+(mode==='list'?'bg-white text-slate-900 shadow-2xs':'text-slate-500')}
                            onClick={()=>setMode('list')}
                          >
                            <List size={13}/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {view==='employees'&&(
                    mode==='grid'?(
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered(s.employees).map(e=>(
                          <button
                            key={e.id}
                            className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition-all text-left flex flex-col justify-between"
                            onClick={()=>navigate('employee',e.id)}
                          >
                            <div className="flex items-start justify-between">
                              <Avatar name={e.name}/>
                              <Badge value={e.status}/>
                            </div>
                            <div className="mt-3">
                              <h3 className="text-sm font-semibold text-slate-900">{e.name}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{e.position}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{e.email}</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium text-[11px] text-slate-700">{e.department}</span>
                              <span className="text-slate-400">{e.type}</span>
                            </div>
                          </button>
                        ))}
                        {!filtered(s.employees).length&&<div className="col-span-full py-10 text-center text-xs text-slate-400">No employees match your search.</div>}
                      </div>
                    ):(
                      <DataTable
                        rows={filtered(s.employees)}
                        columns={[
                          {title:'Employee',render:e=><button className="flex items-center gap-2 text-left font-semibold text-slate-900 hover:underline" onClick={()=>navigate('employee',e.id)}><Avatar name={e.name}/>{e.name}</button>},
                          {title:'Work email',render:e=>e.email},
                          {title:'Job position',render:e=>e.position},
                          {title:'Department',render:e=>e.department},
                          {title:'Status',render:e=><Badge value={e.status}/>}
                        ]}
                      />
                    )
                  )}

                  {view==='contracts'&&(
                    <DataTable
                      rows={filtered(s.contracts)}
                      columns={[
                        {title:'Contract',render:c=><button className="font-semibold text-slate-900 hover:underline" onClick={()=>openForm('contracts',c)}>{c.id.startsWith('c')&&c.id.length<5?'CON/2026/'+String(+c.id.slice(1)+1).padStart(4,'0'):c.id.slice(0,8).toUpperCase()}</button>},
                        {title:'Employee',render:cellEmployee},
                        {title:'Start date',render:c=>c.start},
                        {title:'End date',render:c=>c.end||'Open-ended'},
                        {title:'Monthly wage',render:c=>money(c.wage)},
                        {title:'Structure',render:c=>structure(c.structureId)},
                        {title:'Status',render:c=><Badge value={c.end&&c.end<clockNow.toISOString().slice(0,10)?'Expired':c.start>clockNow.toISOString().slice(0,10)?'Upcoming':'Running'}/>}
                      ]}
                    />
                  )}

                  {view==='attendance'&&(
                    <DataTable
                      rows={filtered(s.attendance).filter(a=>!period||a.date.startsWith(period)).sort((a,b)=>b.date.localeCompare(a.date))}
                      columns={[
                        {title:'Employee',render:cellEmployee},
                        {title:'Date',render:a=><button className="font-semibold text-slate-900 hover:underline" onClick={()=>openForm('attendance',a)}>{a.date}</button>},
                        {title:'Check-in',render:a=>a.checkIn||'—'},
                        {title:'Check-out',render:a=>a.checkOut||'—'},
                        {title:'Worked hours',render:a=>hours(a).toFixed(2)},
                        {title:'Status',render:a=><Badge value={attendanceStatus(a)}/>},
                        {title:'Source',render:a=>a.edited?'Manually edited':'Shift entry'}
                      ]}
                    />
                  )}

                  {view==='requests'&&(
                    <DataTable
                      rows={filtered(s.requests)}
                      columns={[
                        {title:'Employee',render:cellEmployee},
                        {title:'Time off type',render:r=><button className="font-semibold text-slate-900 hover:underline" onClick={()=>{setError('');setModal({kind:'request',record:r});}}>{leaveType(r.typeId)?.name}</button>},
                        {title:'Dates',render:r=>r.start+' – '+r.end},
                        {title:'Duration',render:r=>r.duration+' '+leaveType(r.typeId)?.unit.toLowerCase()},
                        {title:'Status',render:r=><Badge value={r.status}/>},
                        {title:'Review',render:r=><button className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline" onClick={()=>{setError('');setModal({kind:'request',record:r});}}>Open <ArrowUpRight size={13}/></button>}
                      ]}
                    />
                  )}

                  {view==='allocations'&&(
                    <DataTable
                      rows={filtered(s.allocations)}
                      columns={[
                        {title:'Employee',render:cellEmployee},
                        {title:'Type',render:r=><button className="font-semibold text-slate-900 hover:underline" onClick={()=>setModal({kind:'allocation',record:r})}>{leaveType(r.typeId)?.name}</button>},
                        {title:'Allocated',render:r=>r.amount+' '+leaveType(r.typeId)?.unit.toLowerCase()},
                        {title:'Taken',render:r=>r.status==='Approved'?r.amount-allocationBalance(s,r):0},
                        {title:'Remaining',render:r=>allocationBalance(s,r)},
                        {title:'Validity',render:r=>r.start+' – '+r.end},
                        {title:'Status',render:r=><Badge value={r.status}/>}
                      ]}
                    />
                  )}

                  {view==='leaveTypes'&&(
                    <DataTable
                      rows={filtered(s.leaveTypes)}
                      columns={[
                        {title:'Type',render:r=><button className="font-semibold text-slate-900 hover:underline" onClick={()=>openForm('leaveTypes',r)}>{r.name}</button>},
                        {title:'Unit',render:r=>r.unit},
                        {title:'Allocation',render:r=>r.requiresAllocation?'Required':'Not required'},
                        {title:'Approval',render:()=>'HR approval'},
                        {title:'Status',render:()=><Badge value="Active"/>}
                      ]}
                    />
                  )}

                  {view==='schedules'&&(
                    <DataTable
                      rows={filtered(s.schedules)}
                      columns={[
                        {title:'Schedule',render:r=><button className="font-semibold text-slate-900 hover:underline" onClick={()=>openForm('schedules',r)}>{r.name}</button>},
                        {title:'Working days',render:r=>r.days.map((d:string)=>d.slice(0,3)).join(', ')},
                        {title:'Hours',render:r=>r.start+' – '+r.end},
                        {title:'Daily break',render:r=>r.breakHours+' hr'},
                        {title:'Weekly hours',render:r=>((hours({id:r.id,checkIn:r.start,checkOut:r.end})-r.breakHours)*r.days.length).toFixed(1)}
                      ]}
                    />
                  )}

                  {view==='rules'&&(
                    <DataTable
                      rows={filtered(s.rules).sort((a,b)=>a.sequence-b.sequence)}
                      columns={[
                        {title:'Rule name',render:r=><button className="font-semibold text-slate-900 hover:underline" onClick={()=>openForm('rules',r)}>{r.name}</button>},
                        {title:'Code',render:r=><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px]">{r.code}</span>},
                        {title:'Category',render:r=>r.category},
                        {title:'Sequence',render:r=>r.sequence},
                        {title:'Method',render:r=>r.method},
                        {title:'Calculation',render:r=>r.method==='Formula'?r.expression:r.method==='Percentage'?r.value+'% × '+r.base:money(r.value)}
                      ]}
                    />
                  )}

                  {view==='structures'&&(
                    <DataTable
                      rows={filtered(s.structures)}
                      columns={[
                        {title:'Structure name',render:r=><button className="font-semibold text-slate-900 hover:underline" onClick={()=>openForm('structures',r)}>{r.name}</button>},
                        {title:'Rules',render:r=>r.ruleIds.length+' rules'},
                        {title:'Employees',render:r=>new Set(s.contracts.filter(c=>c.structureId===r.id&&c.start<=monthEnd(period)&&(!c.end||c.end>=period+'-01')).map(c=>c.employeeId)).size},
                        {title:'Status',render:r=><Badge value={r.active?'Active':'Archived'}/>}
                      ]}
                    />
                  )}

                  {view==='payruns'&&(
                    <DataTable
                      rows={filtered(s.payruns).filter(r=>!period||r.period===period).slice().reverse()}
                      columns={[
                        {title:'Payrun',render:r=><button className="font-semibold text-slate-900 hover:underline flex items-center gap-1" onClick={()=>navigate('run',r.id)}>{r.name}<ArrowUpRight size={13}/></button>},
                        {title:'Period',render:r=>r.period+'-01 – '+monthEnd(r.period)},
                        {title:'Structure',render:r=>structure(r.structureId)},
                        {title:'Employees',render:r=>r.employeeIds.length},
                        {title:'Net salary',render:r=>money(r.slips.reduce((n:number,p:Row)=>n+p.net,0))},
                        {title:'Status',render:r=><Badge value={r.status}/>},
                        {title:'Warnings',render:r=>r.status==='Paid'?'Finalized':warnings(s,r).length||'None'}
                      ]}
                    />
                  )}

                  {view==='payslips'&&(
                    <DataTable
                      rows={filtered(allSlips).filter(p=>!period||p.period===period)}
                      columns={[
                        {title:'Period',render:p=>niceMonth(p.period)},
                        ...runSlipColumns.slice(0,-1),
                        {title:'Status',render:p=><Badge value={p.status}/>},
                        runSlipColumns.at(-1)!
                      ]}
                    />
                  )}
                </div>
              )}

              {/* Employee Detail Profile */}
              {view==='employee'&&(
                activeEmployee?(
                  <div className="workora-card space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <Avatar name={activeEmployee.name}/>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">{activeEmployee.name}</h2>
                          <p className="text-xs text-slate-500">{activeEmployee.position} · {activeEmployee.email} · {activeEmployee.phone||'No phone added'}</p>
                        </div>
                      </div>
                      <Badge value={activeEmployee.status}/>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        ['contracts','Contracts'],
                        ['attendance','Attendance'],
                        ['requests','Time off'],
                        ['allocations','Allocations']
                      ].map(([v,label])=>(
                        <button key={v} className="pill-btn !py-1.5 !px-3.5 text-xs" onClick={()=>related(v,activeEmployee.id)}>
                          {label} <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">{s[v as keyof Workspace].filter(r=>r.employeeId===activeEmployee.id).length}</span>
                        </button>
                      ))}
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Work Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          ['Department',activeEmployee.department],
                          ['Manager',activeEmployee.manager],
                          ['Working Schedule',s.schedules.find(sc=>sc.id===activeEmployee.scheduleId)?.name],
                          ['Work Location',activeEmployee.location],
                          ['Employee Type',activeEmployee.type],
                          ['Company','OXP Pvt Ltd'],
                          ['Bank Reference',activeEmployee.bank||'Missing — required to validate payroll']
                        ].map(([label,value])=>(
                          <div key={label} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                            <span className="text-[11px] font-medium text-slate-400 block">{label}</span>
                            <span className="text-xs font-semibold text-slate-800 mt-1 block">{value||'Not set'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ):<div className="workora-card text-center text-xs text-slate-400 py-10">Employee not found.</div>
              )}

              {/* Payrun Processing View */}
              {view==='run'&&(
                run?(
                  <div className="space-y-4">
                    <div className="workora-card space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">{run.name}</h2>
                          <p className="text-xs text-slate-500 mt-0.5">Disbursement workflow for {run.period}</p>
                        </div>
                        <Badge value={run.status}/>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[11px] text-slate-400">Period</span>
                          <span className="text-xs font-bold text-slate-900 block mt-0.5">{run.period+'-01'} — {monthEnd(run.period)}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[11px] text-slate-400">Salary Structure</span>
                          <span className="text-xs font-bold text-slate-900 block mt-0.5">{structure(run.structureId)}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[11px] text-slate-400">Employees</span>
                          <span className="text-xs font-bold text-slate-900 block mt-0.5">{run.employeeIds.length} Staff</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 text-white">
                          <span className="text-[11px] text-slate-400">Total Net Salary</span>
                          <span className="text-base font-bold text-white block mt-0.5">{money(run.slips.reduce((n:number,p:Row)=>n+p.net,0))}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button className="pill-btn pill-btn-black !py-1.5" disabled={busy||!['Draft','Computed'].includes(run.status)} onClick={()=>void act('compute',{id:run.id},'Payslips computed.')}>
                          <RefreshCw size={13}/> Compute Slips
                        </button>
                        <button className="pill-btn !py-1.5" disabled={busy||run.status!=='Computed'} onClick={()=>void act('validate',{id:run.id},'Payrun validated.')}>
                          <Check size={13}/> Validate Run
                        </button>
                        <button className="pill-btn !py-1.5" disabled={busy||run.status!=='Validated'} onClick={()=>void act('markPaid',{id:run.id},'Payrun marked paid.')}>
                          Mark Paid
                        </button>
                        <button className="pill-btn !py-1.5" disabled={!run.slips.length} onClick={()=>downloadCsv('payslips-'+run.period+'.csv',[['Employee','Period','Basic','Gross','Deductions','Net'],...run.slips.map((p:Row)=>[empName(p.employeeId),p.period,p.basic,p.gross,p.deductions,p.net])])}>
                          <Download size={13}/> Export Payslips
                        </button>
                      </div>
                    </div>

                    <div className="workora-table-container">
                      <div className="table-tab-strip">
                        <button className="table-tab-item active">Generated Payslips ({run.slips.length})</button>
                      </div>
                      <DataTable rows={run.slips} columns={runSlipColumns} empty="Click Compute to generate payslips from contracts and rules."/>
                    </div>
                  </div>
                ):<div className="workora-card text-center text-xs text-slate-400 py-10">Payrun not found.</div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ─── Workora Floating Assistant Bar (Center Bottom) ─── */}
      <div
        className="floating-assistant-bar"
        onClick={()=>setModal({kind:'clock'})}
        title="Open Attendance & Quick Actions"
      >
        <Sparkles size={16} className="floating-sparkle"/>
        <span className="floating-text">How can I help you?</span>
        <Mic size={15} className="floating-mic ml-2"/>
      </div>

      {/* ─── Workora Modal / Inspector Panels ─── */}
      <Dialog open={!!modal} onOpenChange={open=>{if(!open&&!busy){setModal(null);setError('');}}}>
        <DialogContent className="workora-modal">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {modal?.kind==='form'?(modal.record?.id?'Edit ':'New ')+(titles[modal.collection!]||'Record'):modal?.kind==='wizard'?'New Payrun Workflow':modal?.kind==='slip'?'Employee Payslip':modal?.kind==='clock'?'Attendance Check-in':modal?.kind==='about'?'About PeoplePay360':modal?.kind==='allocation'?'Leave Allocation':'Time Off Request'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                {modal?.kind==='about'?'PeoplePay360 · Workora Design System':modal?.kind==='clock'?'Nisha Rao · Finance Manager · Live Shift':'Connected records. One unified workspace.'}
              </DialogDescription>
            </div>
          </div>

          <div className="inspector-pills mt-3">
            <button className="inspector-pill active">Setting</button>
            <button className="inspector-pill">Output</button>
          </div>

          {error&&<div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-3">{error}</div>}

          {modal?.kind==='form'&&s&&(
            <RecordForm
              key={modal.collection+modal.record!.id}
              collection={modal.collection!}
              initial={modal.record!}
              s={s}
              busy={busy}
              onSave={saveRecord}
              onCancel={()=>setModal(null)}
            />
          )}

          {modal?.kind==='wizard'&&s&&(
            <PayrunWizard
              s={s}
              busy={busy}
              onCancel={()=>setModal(null)}
              onCreate={async p=>{
                const result=await act('createPayrun',p,'Payrun created.');
                if(result){
                  const created=result.payruns.at(-1)!;
                  setPeriod(created.period);
                  navigate('run',created.id);
                }
              }}
            />
          )}

          {(modal?.kind==='request'||modal?.kind==='allocation')&&reviewedRecord&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Avatar name={empName(reviewedRecord.employeeId)}/>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{empName(reviewedRecord.employeeId)}</span>
                    <span className="text-[11px] text-slate-400 block">{leaveType(reviewedRecord.typeId)?.name}</span>
                  </div>
                </div>
                <Badge value={reviewedRecord.status}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Start Date',reviewedRecord.start],
                  ['End Date',reviewedRecord.end],
                  ['Duration / Amount',(reviewedRecord.duration||reviewedRecord.amount)+' '+leaveType(reviewedRecord.typeId)?.unit.toLowerCase()],
                  ['Reviewer',reviewedRecord.approver||'Awaiting approval']
                ].map(([k,v])=>(
                  <div key={k} className="p-3 rounded-xl bg-white border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">{k}</span>
                    <span className="text-xs font-semibold text-slate-800 block mt-0.5">{v}</span>
                  </div>
                ))}
              </div>

              {reviewedRecord.reason&&<p className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-100">{reviewedRecord.reason}</p>}
              {modal.kind==='allocation'&&s&&(
                <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center text-xs">
                  <span>Available Balance</span>
                  <span className="font-bold text-sm">{allocationBalance(s,reviewedRecord)}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                {reviewedRecord.status==='Pending'&&(
                  <>
                    <button className="pill-btn !py-1.5" disabled={busy} onClick={()=>openForm(modal.kind==='request'?'requests':'allocations',reviewedRecord)}>Edit</button>
                    {modal.kind==='request'&&<button className="pill-btn !py-1.5" disabled={busy} onClick={()=>void act('refuseLeave',{id:reviewedRecord.id},'Request refused.')}>Refuse</button>}
                    <button className="pill-btn pill-btn-black !py-1.5" disabled={busy} onClick={()=>void act(modal.kind==='request'?'approveLeave':'approveAllocation',{id:reviewedRecord.id},'Approved.')}>Approve</button>
                  </>
                )}
                <button className="pill-btn !py-1.5" onClick={()=>setModal(null)}>Close</button>
              </div>
            </div>
          )}

          {modal?.kind==='slip'&&modal.record&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">OXP PVT LTD</span>
                  <h3 className="text-base font-bold text-slate-900">{empName(modal.record.employeeId)}</h3>
                  <p className="text-xs text-slate-500">{niceMonth(modal.record.period)} · {structure(modal.record.structureId)}</p>
                </div>
                <Badge value={modal.record.status||'Computed'}/>
              </div>

              <DataTable
                rows={modal.record.lines?.map((l:any)=>({...l,id:l.code}))||[]}
                columns={[
                  {title:'Salary Component',render:l=>l.name},
                  {title:'Category',render:l=>l.category},
                  {title:'Amount',render:l=>(l.category==='Deduction'?'- ':'')+money(l.amount)}
                ]}
              />

              <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center text-sm">
                <span>Net Salary</span>
                <span className="text-lg font-bold">{money(modal.record.net)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button className="pill-btn !py-1.5" onClick={()=>setModal(null)}>Close</button>
                <button className="pill-btn pill-btn-black !py-1.5" onClick={()=>window.print()}><Download size={13}/> Print / PDF</button>
              </div>
            </div>
          )}

          {modal?.kind==='clock'&&s&&(
            <div className="space-y-4 text-center py-2">
              <div className="text-4xl font-extrabold tracking-tight text-slate-900">
                {clockNow.toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'})}
              </div>
              <p className="text-xs text-slate-400">
                Today · {clockNow.toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'long'})} · Asia/Kolkata
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {signedIn?'Checked in at '+currentClock?.checkIn:currentClock?.checkOut?'Today’s shift completed':'You are not checked in'}
                </span>
                <Badge value={signedIn?'Present':currentClock?.checkOut?'Completed':'Not checked in'}/>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button className="pill-btn" onClick={()=>{setModal(null);navigate('attendance');}}>
                  View Records
                </button>
                <button
                  className="pill-btn pill-btn-black"
                  disabled={busy||!!currentClock?.checkOut}
                  onClick={()=>void act('clock',{employeeId:'e6'},signedIn?'Checked out.':'Checked in.')}
                >
                  {signedIn?'Check out':'Check in'}
                </button>
              </div>
            </div>
          )}

          {modal?.kind==='about'&&(
            <div className="space-y-3 text-xs text-slate-600">
              <p className="p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed">
                PeoplePay360 features an interconnected People & Operations engine for attendance, leave policies, contracts, and payroll calculations.
              </p>
              <div className="flex justify-end pt-2">
                <button className="pill-btn pill-btn-black !py-1.5" onClick={()=>setModal(null)}>
                  Back to Workspace
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayrunWizard({s,busy,onCreate,onCancel}:{s:Workspace;busy:boolean;onCreate:(p:Record<string,any>)=>Promise<void>;onCancel:()=>void}){
  const [step,setStep]=useState(1);
  const [period,setPeriod]=useState('2026-10');
  const [structureId,setStructureId]=useState(s.structures[0]?.id||'');
  const [ids,setIds]=useState<string[]>([]);
  const [search,setSearch]=useState('');

  const eligible=s.employees.filter(e=>{
    if(e.status!=='Active'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))return false;
    try{
      const c=activeContract(s,e.id,period);
      return c.structureId===structureId&&!s.payruns.some(r=>r.period===period&&r.employeeIds.includes(e.id));
    }catch{
      return false;
    }
  });

  const toggle=(id:string,checked:boolean)=>setIds(x=>checked?[...x,id]:x.filter(i=>i!==id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs font-semibold pb-2 border-b border-slate-100">
        <span className={step===1?'text-slate-900 border-b-2 border-slate-900 pb-1':'text-slate-400'}>01 · Scope & Period</span>
        <span className={step===2?'text-slate-900 border-b-2 border-slate-900 pb-1':'text-slate-400'}>02 · Select Employees</span>
      </div>

      {step===1?(
        <div className="space-y-3">
          <Field label="Salary Structure">
            <Picker label="Salary structure" value={structureId} onChange={setStructureId} options={s.structures.filter(st=>st.active).map(st=>({value:st.id,label:st.name}))}/>
          </Field>
          <Field label="Payroll Month">
            <Input type="month" required aria-label="Payroll month" value={period} onChange={e=>setPeriod(e.target.value)} className="h-9 rounded-xl"/>
          </Field>
          <p className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-500 border border-slate-100">
            Only active employees with a contract covering this month matching the selected structure are eligible.
          </p>
        </div>
      ):(
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="pill-search flex-1 !py-1">
              <Search size={13} className="text-slate-400 shrink-0"/>
              <input aria-label="Search eligible employees" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search eligible employees…"/>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{ids.length} selected</span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2">
            <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
              <Checkbox checked={eligible.length>0&&ids.length===eligible.length} onCheckedChange={v=>setIds(v?eligible.map(e=>e.id):[])}/>
              Select all eligible employees ({eligible.length})
            </label>
            {eligible.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())).map(e=>(
              <label key={e.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700">
                <Checkbox checked={ids.includes(e.id)} onCheckedChange={v=>toggle(e.id,!!v)}/>
                <Avatar name={e.name}/>
                <span className="font-medium">{e.name}</span>
                <span className="text-[11px] text-slate-400 ml-auto">{e.department}{!e.bank?' · Bank missing':''}</span>
              </label>
            ))}
            {!eligible.length&&<div className="py-6 text-center text-xs text-slate-400">No eligible employees found.</div>}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button className="pill-btn !py-1.5" onClick={step===1?onCancel:()=>setStep(1)}>{step===1?'Cancel':'Back'}</button>
        {step===1?(
          <button className="pill-btn pill-btn-black !py-1.5" disabled={!structureId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)} onClick={()=>{setIds([]);setStep(2);}}>Continue <ArrowUpRight size={13}/></button>
        ):(
          <button className="pill-btn pill-btn-black !py-1.5" disabled={busy||!ids.length} onClick={()=>void onCreate({period,structureId,employeeIds:ids})}>{busy?'Creating…':'Create payrun'}</button>
        )}
      </div>
    </div>
  );
}
