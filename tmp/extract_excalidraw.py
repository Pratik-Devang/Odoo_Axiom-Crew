import json

file_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = data.get('elements', [])
print(f"Total elements: {len(elements)}")

texts = []
for el in elements:
    if el.get('type') == 'text' and not el.get('isDeleted'):
        text = el.get('text', '').strip()
        if text:
            texts.append({
                'id': el.get('id'),
                'x': el.get('x', 0),
                'y': el.get('y', 0),
                'width': el.get('width', 0),
                'height': el.get('height', 0),
                'fontSize': el.get('fontSize', 0),
                'text': text
            })

print(f"Active text elements: {len(texts)}")

# Group or sort by coordinates
texts_sorted = sorted(texts, key=lambda item: (round(item['y'] / 100), item['x']))

output_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\extracted_texts.txt'
with open(output_path, 'w', encoding='utf-8') as out:
    for t in texts:
        out.write(f"=== [ID: {t['id']}, Pos: ({t['x']:.0f}, {t['y']:.0f}), Size: {t['fontSize']}pt] ===\n{t['text']}\n\n")

print(f"Written all {len(texts)} text blocks to {output_path}")
