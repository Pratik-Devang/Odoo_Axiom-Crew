import json
import sys

file_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = data.get('elements', [])

# Filter active text elements
texts = []
for el in elements:
    if el.get('type') == 'text' and not el.get('isDeleted'):
        text = el.get('text', '').strip()
        if text:
            texts.append({
                'id': el.get('id'),
                'x': el.get('x', 0),
                'y': el.get('y', 0),
                'w': el.get('width', 0),
                'h': el.get('height', 0),
                'fontSize': el.get('fontSize', 0),
                'text': text
            })

# Sort vertically then horizontally
texts.sort(key=lambda t: (t['y'], t['x']))

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\all_excalidraw_texts.txt', 'w', encoding='utf-8') as f:
    for t in texts:
        f.write(f"--- [y={t['y']:.0f}, x={t['x']:.0f}, size={t['fontSize']:.0f}pt] ---\n{t['text']}\n\n")

print(f"Total texts: {len(texts)} written.")
