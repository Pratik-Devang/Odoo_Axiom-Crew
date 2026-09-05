import json
import os

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\excalidraw_full_breakdown.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's also inspect what is implemented in peoplepay360
# Let's list all files in peoplepay360
src_files = []
for root, dirs, files in os.walk(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360'):
    if any(ignore in root for ignore in ['.next', 'node_modules', '.vite', '.vinext', 'dist']):
        continue
    for file in files:
        src_files.append(os.path.relpath(os.path.join(root, file), r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360'))

print(f"Total source files in peoplepay360: {len(src_files)}")
print("\nSource files:")
for sf in sorted(src_files):
    print(f" - {sf}")
