import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read all flow files and gather full text
flow_files = [f for f in sorted(os.listdir(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp')) if f.startswith('flow_') and f.endswith('.txt')]

flows_data = {}
for ff in flow_files:
    with open(os.path.join(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp', ff), 'r', encoding='utf-8') as f:
        flows_data[ff] = f.read()

# Let's inspect the entire codebase files
codebase_files = {
    'domain.ts': open(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360\lib\domain.ts', 'r', encoding='utf-8').read(),
    'actions.ts': open(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360\lib\actions.ts', 'r', encoding='utf-8').read(),
    'schema.ts': open(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360\db\schema.ts', 'r', encoding='utf-8').read(),
    'store.ts': open(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360\db\store.ts', 'r', encoding='utf-8').read(),
    'page.tsx': open(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360\app\page.tsx', 'r', encoding='utf-8').read(),
    'peoplepay-ui.tsx': open(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360\components\peoplepay-ui.tsx', 'r', encoding='utf-8').read(),
    'payroll-dashboard.tsx': open(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360\components\payroll-dashboard.tsx', 'r', encoding='utf-8').read(),
    'record-form.tsx': open(r'c:\Users\soni1\Desktop\AMD-Odoo\peoplepay360\components\record-form.tsx', 'r', encoding='utf-8').read(),
}

print("Codebase files loaded successfully.")
