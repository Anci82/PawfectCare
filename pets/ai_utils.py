import requests
from decouple import config
import json

GEMINI_API_KEY = config("GEMINI_API_KEY")
GEMINI_MODEL_NAME = "gemini-2.0-flash"  # or gemini-2.0-flash for stability

def call_gemini_model(prompt: str) -> str:
    if not GEMINI_API_KEY:
        return "Error: GEMINI_API_KEY not configured."

    url = (
        f"https://generativelanguage.googleapis.com/v1/models/"
        f"{GEMINI_MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
    )

    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

    except requests.exceptions.RequestException as e:
        return f"API Request Error: {str(e)}"
    except Exception as e:
        return f"Unexpected API response: {str(e)}"
