import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\categorized_excalidraw.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Print the text of each flow
sections = text.split('=======================================================')
for s in sections:
    if s.strip():
        lines = s.strip().split('\n')
        header = lines[0]
        print(f"\n{header}")
        # print first few non-trivial lines
        for l in lines[1:]:
            if len(l.strip()) > 20 and not l.startswith('['):
                print(f"  • {l.strip()}")
