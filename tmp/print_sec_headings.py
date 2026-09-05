with open(r'c:\Users\soni1\Desktop\AMD-Odoo\tmp\sections_list.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect all section headings
lines = text.split('\n')
for line in lines:
    if line.startswith('### FLOW / SECTION:'):
        print(line)
