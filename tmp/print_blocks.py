import sys
import os
sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\key_requirements.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's print out the sections cleanly
blocks = text.split('===================================================\n')
print(f"Total blocks: {len(blocks)}")
for i, b in enumerate(blocks):
    if b.strip():
        print(f"--- BLOCK {i} ---")
        print(b.strip())
        print()
