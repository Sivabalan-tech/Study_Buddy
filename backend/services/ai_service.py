# AI-related functions
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    raise RuntimeError("Missing GOOGLE_API_KEY in environment (.env).")

genai.configure(api_key=API_KEY)

# Singleton Gemini model (sync client)
_model = genai.GenerativeModel('gemini-1.5-flash')

def get_ai_model():
    return _model
