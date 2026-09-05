import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw', 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = [el for el in data.get('elements', []) if not el.get('isDeleted') and el.get('type') == 'text']
elements.sort(key=lambda t: (t['y'], t['x']))

def inspect_flow(y_min, y_max, name):
    print(f"\n=======================================================================")
    print(f"*** {name} ({y_min} <= y < {y_max}) ***")
    print(f"=======================================================================")
    sub = [e for e in elements if y_min <= e['y'] < y_max]
    for e in sub:
        print(f"[{e['x']:.0f}, {e['y']:.0f}, {e.get('fontSize',0)}pt]: {e['text']}")

inspect_flow(5600, 7400, "FLOW 4: Payroll — Payrun & Payslips")
inspect_flow(7400, 8200, "FLOW 5: Payroll Configuration")
inspect_flow(8200, 10000, "FLOW 6: Payroll Dashboard")
