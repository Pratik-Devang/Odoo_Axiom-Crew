import json

file_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = [el for el in data.get('elements', []) if not el.get('isDeleted')]
texts = [el for el in elements if el.get('type') == 'text']

# Find all blocks of text with bullets or multi-line descriptions or titles
flow_titles = []
for t in texts:
    txt = t.get('text', '').strip()
    size = t.get('fontSize', 0)
    # Check if this text is a section title or requirement box
    if any(header in txt for header in ['Flow', 'Hackathon', 'Employee & Contract', 'Working Schedule', 'Attendances', 'Time Off', 'Payroll', 'Dashboard', 'Bonus', 'Salary Structure', 'Payrun', 'Payslip', 'Requirement', 'Note', 'Rules', 'Formula']):
        flow_titles.append((t.get('y', 0), t.get('x', 0), size, txt))
    elif '\n-' in txt or '\n•' in txt or txt.startswith('-') or txt.startswith('•') or '\n1.' in txt:
        flow_titles.append((t.get('y', 0), t.get('x', 0), size, txt))

flow_titles.sort(key=lambda x: (x[0], x[1]))

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\key_requirements.txt', 'w', encoding='utf-8') as f:
    for y, x, size, txt in flow_titles:
        f.write(f"===================================================\n")
        f.write(f"POS: y={y:.0f}, x={x:.0f} | SIZE: {size:.0f}pt\n")
        f.write(f"===================================================\n")
        f.write(f"{txt}\n\n")

print(f"Saved {len(flow_titles)} key requirement/structure blocks to tmp/key_requirements.txt")
