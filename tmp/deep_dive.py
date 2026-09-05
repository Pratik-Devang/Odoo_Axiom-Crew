import json

file_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = [el for el in data.get('elements', []) if not el.get('isDeleted')]
texts = [el for el in elements if el.get('type') == 'text']

# Sort texts by y coordinate then x coordinate
texts.sort(key=lambda t: (t['y'], t['x']))

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\excalidraw_deep_dive.txt', 'w', encoding='utf-8') as out:
    for t in texts:
        out.write(f"[{t.get('y'):.0f},{t.get('x'):.0f} | sz:{t.get('fontSize'):.0f}pt] {t.get('text')}\n---\n")

print("Deep dive written.")
