import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\HRMS OXP - 24 hours.excalidraw', 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = [el for el in data.get('elements', []) if not el.get('isDeleted') and el.get('type') == 'text']
elements.sort(key=lambda t: (t['y'], t['x']))

def inspect_range(y_start, y_end, title):
    print(f"\n{'='*60}\n{title}\n{'='*60}")
    sub = [e for e in elements if y_start <= e['y'] < y_end]
    for e in sub:
        print(f"({e['x']:.0f}, {e['y']:.0f}, sz={e.get('fontSize',0)}): {e['text']}")

inspect_range(-1000, 1400, "FLOW 0: Login & User Access Flow")
