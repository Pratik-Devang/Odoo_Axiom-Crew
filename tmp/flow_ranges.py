import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\excalidraw_full_breakdown.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's group into the numbered flows
flows = [
    ("Flow 0: Login & User Access Flow", 0, 1400),
    ("Flow 1: Employee & Contract Flow", 1400, 3300),
    ("Flow 2: Attendance Flow", 3300, 4000),
    ("Flow 3: Time Off Flow", 4000, 5600),
    ("Flow 4: Payroll — Payrun & Payslips", 5600, 7400),
    ("Flow 5: Payroll Configuration (Salary Structures & Rules)", 7400, 8200),
    ("Flow 6: Payroll Dashboard", 8200, 10000),
]

for fname, ymin, ymax in flows:
    print(f"\n{'='*70}\n{fname}\n{'='*70}")
    # find texts between ymin and ymax
    # from analyzed_flows or excalidraw_full_breakdown
    # let's extract all texts in that y-range
    with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\dump_texts.py', 'r') as _:
        pass

