import json
import sys

file_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = [el for el in data.get('elements', []) if not el.get('isDeleted')]
texts = [el for el in elements if el.get('type') == 'text']
texts.sort(key=lambda t: (t['y'], t['x']))

# Let's extract distinct flow sections based on major headers
# Main headers seem to start around:
# 0) Login & User Access Flow
# 1) Employee & Contract Flow
# 2) Attendance Flow
# 3) Time Off Flow
# 4) Payroll - Payrun & Payslips
# 5) Bonus / Salary Rules / Dashboard etc.

# Let's group texts by flows:
flows = []
current_flow = {"title": "Header / Intro", "texts": [], "y_min": -99999}

for t in texts:
    txt = t.get('text', '').strip()
    size = t.get('fontSize', 0)
    y = t.get('y', 0)
    
    # Check if a numbered flow header or main section title
    if any(txt.startswith(prefix) for prefix in ['0)', '1)', '2)', '3)', '4)', '5)', '6)', '7)', '8)', '9)']) or \
       any(keyword in txt for keyword in ['Hackathon', 'Functional Screen Flow', 'Dashboard', 'Reports', 'Settings']):
        if current_flow["texts"]:
            flows.append(current_flow)
        current_flow = {"title": txt, "texts": [], "y_min": y}
    current_flow["texts"].append(t)

if current_flow["texts"]:
    flows.append(current_flow)

print(f"Identified {len(flows)} flow sections:")
for i, f in enumerate(flows):
    print(f"\n--- FLOW {i}: {f['title']} (y_min={f['y_min']:.0f}, count={len(f['texts'])}) ---")
    req_texts = [t['text'] for t in f['texts'] if '\n' in t['text'] or len(t['text']) > 40 or t['fontSize'] >= 20]
    for rt in req_texts:
        print(f"  * [size {t.get('fontSize', 0)}]: {rt}\n")
