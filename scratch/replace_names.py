import os
import re

directories = ['frontend/src', 'backend/src', 'backend/.env']

replacements = [
    (r'DevSync', 'MyDevice'),
    (r'devsync\.local', 'mydevice.site'),
    (r'devsync\.internal', 'mydevice.internal'),
    (r'DEVSYNC', 'MYDEVICE')
]

for d in directories:
    if os.path.isfile(d):
        files = [d]
    else:
        files = [os.path.join(dp, f) for dp, dn, filenames in os.walk(d) for f in filenames if f.endswith(('.js', '.jsx', '.css', '.html', '.env'))]
        
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for pattern, replacement in replacements:
            new_content = re.sub(pattern, replacement, new_content)
            
        if new_content != content:
            print(f"Updated {filepath}")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)

print("Done")
