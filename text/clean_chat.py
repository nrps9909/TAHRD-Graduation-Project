import re
import sys
import os

if len(sys.argv) < 2:
    print("請提供輸入檔案路徑")
    sys.exit(1)

input_file = sys.argv[1]

if not os.path.exists(input_file):
    print(f"錯誤：找不到檔案 {input_file}")
    sys.exit(1)

file_dir, file_name = os.path.split(input_file)
file_base_name, file_ext = os.path.splitext(file_name)
output_file = os.path.join(file_dir, f"{file_base_name}_cleaned{file_ext}")

with open(input_file, 'r', encoding='utf-8') as infile, \
     open(output_file, 'w', encoding='utf-8') as outfile:
    for line in infile:
        # Skip header
        if line.startswith('[LINE]'):
            continue

        # Clean up timestamp
        processed_line = re.sub(r'^(上午|下午)[0-9]{2}:[0-9]{2}\t', '', line).strip()

        # Skip empty lines or date lines
        if not processed_line or re.match(r'^[0-9]{4}/[0-9]{2}/[0-9]{2}', processed_line):
            continue

        # Remove URLs, stickers, files, system messages, etc.
        processed_line = re.sub(r'\[(貼圖|檔案|照片|影片|投票|語音訊息)\]|'  # Stickers, files, etc.
                                r'[（\(].*?[）\)]|'  # Parenthetical remarks
                                r'https?:\/\/\S+|'  # http/https URLs
                                r'line:..\S+|'  # line URLs
                                r'\[Duck_.*?\].*?|'  # LINE Duck stickers
                                r'.*?已收回訊息|'  # Retracted messages
                                r'☎ .*|'  # Phone call logs
                                r'WOW！快來看看.*?|' # Shopee etc.
                                r'快來看看.*?https?:\/\/\S+|' # Shopee etc.
                                r'我發現超棒的東西.*?https?:\/\/\S+|' # Shopee etc.
                                r'蝦蝦果園全新種子.*?https?:\/\/\S+', # Shopee etc.
                                '', processed_line)

        # Anonymize names
        names = [
            "楊", "盧盧", "厚道", "張陣雨", "澤魚", "土申", "芷", "鄧", "陳", "安",
            "劉", "簡", "ken", "翠", "邱毅風", "詹", "櫟騫", "邱胖", "盧", "陳奕聞",
            "吳卓源", "韋禮安", "周", "永威", "維", "蚵", "鄧", "安誼", "簡", "雲詞"
        ]
        pattern = r'(' + '|'.join(re.escape(name) for name in names) + r')'
        anonymized_line = re.sub(pattern, '[PERSON]', processed_line)

        # Final cleanup
        final_line = anonymized_line.replace('*', '').replace('$', '').replace('👇', '').replace('=', '').strip()

        # Skip if line is empty after cleaning
        if not final_line:
            continue

        # Skip if line only contains speaker ID (e.g., "A", "B")
        if re.fullmatch(r'[A-Z]', final_line):
            continue
            
        # Skip if line only contains punctuation or meaningless characters
        if re.fullmatch(r'[\s\W_]+', final_line):
            continue

        # Handle lines with speaker and message separated by a tab
        parts = final_line.split('\t', 1)
        if len(parts) > 1 and not parts[1].strip():
            continue

        outfile.write(final_line + '\n')