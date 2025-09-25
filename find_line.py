from pathlib import Path
text = Path('src/app/signin/page.tsx').read_text(encoding='utf-8').splitlines()
for i, line in enumerate(text, 1):
    if '\\u7ee7\\u7eed\\u6211\\u7684\\u5b66\\u4e60\\u65c5\\u7a0b' in line:
        print(i)
        print(line)
