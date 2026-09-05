import json
import re

file_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = [el for el in data.get('elements', []) if not el.get('isDeleted')]
texts = [el for el in elements if el.get('type') == 'text']

# Sort texts by y coordinate (page flows go from top to bottom)
texts.sort(key=lambda t: (t['y'], t['x']))

output_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\excalidraw_flows_summary.md'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write("# Excalidraw Content Summary\n\n")
    
    current_y_bucket = None
    for t in texts:
        txt = t.get('text', '').strip()
        y = t.get('y', 0)
        x = t.get('x', 0)
        size = t.get('fontSize', 0)
        
        # Check if high importance title
        if size >= 20:
            f.write(f"\n## [{size}pt] {txt} (y={y:.0f}, x={x:.0f})\n\n")
        elif '\n-' in txt or txt.startswith('-') or txt.startswith('•') or 'Requirement' in txt or 'Flow' in txt:
            f.write(f"### [Requirement / Note] (y={y:.0f}, x={x:.0f}, {size}pt)\n```\n{txt}\n```\n\n")
        else:
            # Check if button, label, menu, or form field
            f.write(f"- `{txt}` (y={y:.0f}, x={x:.0f})\n")

print(f"Summary written to {output_path}")
