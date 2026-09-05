import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw', 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = [el for el in data.get('elements', []) if not el.get('isDeleted') and el.get('type') == 'text']
elements.sort(key=lambda t: (t['y'], t['x']))

flows = [
    ("Flow 0: Login & User Access Flow", -1000, 1400),
    ("Flow 1: Employee & Contract Flow", 1400, 3300),
    ("Flow 2: Attendance Flow", 3300, 4000),
    ("Flow 3: Time Off Flow", 4000, 5600),
    ("Flow 4: Payroll — Payrun & Payslips", 5600, 7400),
    ("Flow 5: Payroll Configuration (Salary Structures & Rules)", 7400, 8200),
    ("Flow 6: Payroll Dashboard", 8200, 10000),
]

for name, y_min, y_max in flows:
    print(f"\n=======================================================================")
    print(f"*** {name} ***")
    print(f"=======================================================================\n")
    flow_els = [e for e in elements if y_min <= e['y'] < y_max]
    
    # Print distinct text elements
    for e in flow_els:
        txt = e['text'].strip()
        if '\n' in txt or e.get('fontSize', 0) >= 18 or any(kw in txt for kw in ['Note', 'Requirement', 'Flow', 'Rule', 'Role', 'Status', 'Formula', 'Select', 'Click']):
            print(f"[{e['y']:.0f},{e['x']:.0f} | {e.get('fontSize', 0)}pt] -> {txt}\n")
