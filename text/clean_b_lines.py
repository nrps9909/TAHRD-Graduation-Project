import os
import re
import sys

# List of unwanted Unicode characters that might interfere with pattern matching
UNWANTED_CHARS = [
    '\u2068', '\u2069',  # FSI, PDI
    '\u202a', '\u202b',  # LRE, RLE
    '\u202c', '\u202d',  # PDF, LRO
    '\u202e',  # RLO
    '\u2066', '\u2067',  # LRI, RLI
    '\u2060', # WJ
    '\ufeff'  # BOM
]

def clean_text(text):
    """Removes unwanted Unicode characters from a string."""
    for char in UNWANTED_CHARS:
        text = text.replace(char, '')
    return text

def is_b_line(line):
    """
    Determines if a line is spoken by 'B'.
    This is a heuristic based on observed patterns in the chat logs.
    It checks for lines starting with "B:".
    """
    cleaned_line = clean_text(line).strip()
    # Regex Explanation:
    # ^B:      - Matches lines that start with "B" followed by a colon.
    if re.search(r'^B:', cleaned_line):
        return True
    return False

def process_file(filepath):
    """
    Reads a file, removes lines by 'B', and overwrites the file.
    """
    if not os.path.exists(filepath):
        print(f"Error: File not found at '{filepath}'")
        return

    print(f"Processing file: {filepath}")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        original_line_count = len(lines)
        # Keep lines that are NOT identified as B's lines
        lines_to_keep = [line for line in lines if not is_b_line(line)]
        new_line_count = len(lines_to_keep)

        if new_line_count < original_line_count:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(lines_to_keep)
            removed_count = original_line_count - new_line_count
            print(f"  -> Removed {removed_count} lines from {os.path.basename(filepath)}")
        else:
            print(f"  -> No lines were removed from {os.path.basename(filepath)}")

    except Exception as e:
        print(f"Error processing file {filepath}: {e}")

def main():
    """
    Main function to process a single file provided as a command-line argument.
    """
    if len(sys.argv) != 2:
        print("Usage: python3 clean_b_lines.py <path_to_your_file.txt>")
        sys.exit(1)
    
    target_file = sys.argv[1]
    process_file(target_file)
    print("\nScript finished.")

if __name__ == "__main__":
    main()