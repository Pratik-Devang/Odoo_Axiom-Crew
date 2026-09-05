import re

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\excalidraw_full_breakdown.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

sections = []
current_sec = None
current_body = []

for line in lines:
    if line.startswith('### FLOW / SECTION:'):
        if current_sec:
            sections.append((current_sec, ''.join(current_body)))
        current_sec = line.strip()
        current_body = []
    else:
        current_body.append(line)

if current_sec:
    sections.append((current_sec, ''.join(current_body)))

print(f"Total sections found: {len(sections)}")
with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\sections_list.txt', 'w', encoding='utf-8') as f_out:
    for title, body in sections:
        f_out.write(f"\n=========================================\n{title}\n=========================================\n")
        # Print requirement notes and major elements
        for block in body.split('\n\n'):
            if any(k in block for k in ['\n-', '•', 'Requirement', 'Flow', 'Rules', 'Formula', 'Note', 'Status', 'Structure', 'Step', 'Smart Button', 'Filters']):
                f_out.write(f"{block.strip()}\n---\n")

print("Section list written to tmp/sections_list.txt")
