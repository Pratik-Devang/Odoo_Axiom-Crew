import json
import sys

file_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = [el for el in data.get('elements', []) if not el.get('isDeleted')]
texts = [el for el in elements if el.get('type') == 'text']
texts.sort(key=lambda t: (t['y'], t['x']))

out_file = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\excalidraw_full_breakdown.txt'
with open(out_file, 'w', encoding='utf-8') as out:
    current_flow = "Intro / Header"
    out.write(f"=== {current_flow} ===\n\n")
    for t in texts:
        txt = t.get('text', '').strip()
        y = t.get('y', 0)
        x = t.get('x', 0)
        size = t.get('fontSize', 0)
        
        # Major flow headings
        if (size >= 20 and any(kw in txt for kw in ['Flow', 'Hackathon', 'Dashboard', 'Reports', 'Payroll', 'Employee', 'Attendance', 'Time Off', 'Working Schedule', 'Settings'])) or \
           any(txt.startswith(f"{i})") for i in range(10)):
            out.write(f"\n\n{'#'*60}\n")
            out.write(f"### FLOW / SECTION: {txt} [y={y:.0f}, x={x:.0f}, {size}pt]\n")
            out.write(f"{'#'*60}\n\n")
        else:
            if '\n' in txt or len(txt) > 30:
                out.write(f"  [y={y:.0f}, x={x:.0f}, size={size}pt]:\n{txt}\n\n")
            else:
                out.write(f"  - {txt} (y={y:.0f}, x={x:.0f})\n")

print(f"Full breakdown written to {out_file}")
