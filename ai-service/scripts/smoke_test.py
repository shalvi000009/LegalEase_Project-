import os
import sys
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from openai import OpenAI
# pyrefly: ignore [missing-import]
from anthropic import Anthropic


load_dotenv()

def test_openai():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found in environment or .env file.")
        return False
        
    print("Testing OpenAI API...")
    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": "Return the single word 'Success'."}
            ],
            max_tokens=10
        )
        result = response.choices[0].message.content.strip()
        print(f"OpenAI GPT-4o response: '{result}'")
        return "success" in result.lower()
    except Exception as e:
        print(f"OpenAI test failed: {e}")
        return False

def test_anthropic():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not found in environment or .env file.")
        return False
        
    print("Testing Anthropic API...")
    try:
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=10,
            messages=[
                {"role": "user", "content": "Return the single word 'Success'."}
            ]
        )
        result = response.content[0].text.strip()
        print(f"Anthropic Claude response: '{result}'")
        return "success" in result.lower()
    except Exception as e:
        print(f"Anthropic test failed: {e}")
        return False

def main():
    print("--- starting smoke tests ---")
    openai_ok = test_openai()
    anthropic_ok = test_anthropic()
    
    print("\n--- Summary ---")
    print(f"OpenAI GPT-4o: {'PASS' if openai_ok else 'FAIL'}")
    print(f"Anthropic Claude: {'PASS' if anthropic_ok else 'FAIL'}")
    
    if not (openai_ok and anthropic_ok):
        sys.exit(1)
    else:
        print("All API tests passed successfully!")

if __name__ == "__main__":
    main()
