import re

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\excalidraw_deep_dive.txt', 'r', encoding='utf-8') as f:
    raw = f.read()

items = raw.split('---\n')

# Let's group by Flow sections
flows = {
    "Flow 0: Login & User Access Flow": [],
    "Flow 1: Employee & Contract Flow": [],
    "Flow 1.1: Working Schedule": [],
    "Flow 2: Attendance Flow": [],
    "Flow 3: Time Off Flow (Requests, Allocations, Types)": [],
    "Flow 4: Payroll (Payrun & Payslips, 2-Step Wizard)": [],
    "Flow 5: Payroll Configuration (Salary Structures & Rules)": [],
    "Flow 6: Payroll Dashboard (Charts, KPIs, Alerts, Headcount, Cost)": [],
    "Flow Other / General": []
}

current_key = "Flow Other / General"
for item in items:
    if not item.strip():
        continue
    # Check if section header
    if '0) Login & User Access' in item:
        current_key = "Flow 0: Login & User Access Flow"
    elif '1) Employee & Contract' in item:
        current_key = "Flow 1: Employee & Contract Flow"
    elif 'Working Schedule' in item and 'Flow 1' in current_key:
        current_key = "Flow 1.1: Working Schedule"
    elif '2) Attendance' in item:
        current_key = "Flow 2: Attendance Flow"
    elif '3) Time Off' in item:
        current_key = "Flow 3: Time Off Flow (Requests, Allocations, Types)"
    elif '4) Payroll' in item:
        current_key = "Flow 4: Payroll (Payrun & Payslips, 2-Step Wizard)"
    elif '5) Payroll Configuration' in item:
        current_key = "Flow 5: Payroll Configuration (Salary Structures & Rules)"
    elif '6) Payroll Dashboard' in item:
        current_key = "Flow 6: Payroll Dashboard (Charts, KPIs, Alerts, Headcount, Cost)"
    
    flows[current_key].append(item.strip())

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\categorized_excalidraw.txt', 'w', encoding='utf-8') as out:
    for k, v in flows.items():
        out.write(f"\n=======================================================\n")
        out.write(f"### {k} (Total items: {len(v)})\n")
        out.write(f"=======================================================\n")
        for item in v:
            out.write(f"{item}\n")

print("Categorized flows saved to tmp/categorized_excalidraw.txt")
