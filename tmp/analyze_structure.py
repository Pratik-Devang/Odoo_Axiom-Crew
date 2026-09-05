import json
from collections import defaultdict

file_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = data.get('elements', [])

# Check element types
type_counts = defaultdict(int)
for el in elements:
    if not el.get('isDeleted'):
        type_counts[el.get('type')] += 1

print("Element type counts:", dict(type_counts))

# Find frames if any
frames = [el for el in elements if el.get('type') == 'frame' and not el.get('isDeleted')]
print(f"Frames ({len(frames)}):")
for f in frames:
    print(f" - Frame ID: {f.get('id')}, name: {f.get('name')}, x: {f.get('x')}, y: {f.get('y')}, w: {f.get('width')}, h: {f.get('height')}")

# Large fonts / titles
large_texts = [el for el in elements if el.get('type') == 'text' and not el.get('isDeleted') and el.get('fontSize', 0) >= 20]
large_texts.sort(key=lambda t: (t.get('y', 0), t.get('x', 0)))
print(f"\nLarge text elements ({len(large_texts)}):")
for lt in large_texts:
    print(f"[{lt.get('fontSize')}pt @ ({lt.get('x'):.0f}, {lt.get('y'):.0f})] {lt.get('text')}")
