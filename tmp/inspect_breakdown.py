import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\excalidraw_full_breakdown.txt', 'r', encoding='utf-8') as f:
    full_text = f.read()

# Let's inspect each flow section in excalidraw_full_breakdown.txt
sections = full_text.split('############################################################\n')
print(f"Total sections: {len(sections)}")

out_path = r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\analyzed_flows.txt'
with open(out_path, 'w', encoding='utf-8') as out:
    for i, sec in enumerate(sections):
        out.write(f"\n================================================================================\n")
        out.write(f"SECTION {i}\n")
        out.write(f"================================================================================\n")
        out.write(sec.strip() + "\n")

print(f"Written analyzed sections to {out_path}")
