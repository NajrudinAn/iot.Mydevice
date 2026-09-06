import os
import re

directories = ['frontend', 'backend', 'docs']

replacements = [
    (r'DevSync', 'MyDevice'),
    (r'devsync\.local', 'mydevice.site'),
    (r'devsync\.internal', 'mydevice.internal'),
    (r'devsync', 'mydevice'),
    (r'DEVSYNC', 'MYDEVICE')
]

for d in directories:
    for dp, dn, filenames in os.walk(d):
        if 'node_modules' in dp or '.git' in dp or 'dist' in dp:
            continue
        for f in filenames:
            if f.endswith(('.js', '.jsx', '.css', '.html', '.env', '.md', '.py', '.sql')):
                filepath = os.path.join(dp, f)
                try:
                    with open(filepath, 'r', encoding='utf-8') as file:
                        content = file.read()
                        
                    new_content = content
                    for pattern, replacement in replacements:
                        new_content = re.sub(pattern, replacement, new_content)
                        
                    if new_content != content:
                        print(f"Updated {filepath}")
                        with open(filepath, 'w', encoding='utf-8') as file:
                            file.write(new_content)
                except Exception as e:
                    pass

print("Done")
