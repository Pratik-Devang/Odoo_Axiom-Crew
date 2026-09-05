import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\analyzed_flows.txt', 'r', encoding='utf-8') as f:
    text = f.read()

sections = text.split('================================================================================\n')

for sec in sections:
    if not sec.strip() or 'SECTION 0' in sec:
        continue
    lines = [l for l in sec.strip().split('\n') if l.strip()]
    header = [l for l in lines if '### FLOW / SECTION:' in l]
    h_text = header[0] if header else lines[0]
    print(f"\n>>> {h_text}")
    
    # Print requirement notes and major blocks
    for l in lines:
        if any(keyword in l for keyword in ['•', '-', 'Requirement', 'Flow', 'Note', 'Rules', 'Formula', 'Select', 'Click', 'Status', 'Draft', 'Validate', 'Paid', 'Wizard', 'Gross', 'Net', 'Deduction', 'Structure', 'Tax', 'Overtime', 'Unpaid', 'Allocation', 'Role', 'Password', 'Reset', 'SSO', 'Invitation', 'Print', 'Export', 'Send', 'Email', 'Batch', 'Smart Button', 'Quick']):
            if not l.startswith('  -') or len(l) > 25:
                print(f"    {l[:120]}")
