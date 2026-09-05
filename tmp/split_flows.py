import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\categorized_excalidraw.txt', 'r', encoding='utf-8') as f:
    text = f.read()

sections = text.split('=======================================================')
for i, s in enumerate(sections):
    if not s.strip():
        continue
    lines = s.strip().split('\n')
    header = lines[0].replace('### ', '').strip()
    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', header)[:40]
    filename = f"c:\\Users\\soni1\\Desktop\\AMD-Odoo\\tmp\\flow_{i}_{safe_name}.txt"
    with open(filename, 'w', encoding='utf-8') as out:
        out.write(s.strip())
    print(f"Wrote {filename}")
