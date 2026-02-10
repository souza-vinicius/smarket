
import os
from dotenv import load_dotenv

load_dotenv()

keys = [
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENROUTER_API_KEY"
]

print("Configured keys:")
for key in keys:
    value = os.getenv(key)
    if value:
        print(f"{key}: SET (length {len(value)})")
        # Check if it looks like a placeholder
        if "your-key" in value.lower() or value == "":
            print(f"  WARNING: {key} seems to be a placeholder")
    else:
        print(f"{key}: NOT SET")
