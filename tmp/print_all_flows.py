import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in sorted(os.listdir(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp')):
    if fname.startswith('flow_') and fname.endswith('.txt'):
        fpath = os.path.join(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp', fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"================================================================================")
        print(f"FILE: {fname}")
        print(f"================================================================================")
        print(content)
        print("\n\n")
