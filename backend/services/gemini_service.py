"""Centralized Gemini client factory."""

import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

MODEL = "gemini-3-flash-preview"


class GeminiService:
    @staticmethod
    def get_client() -> genai.Client:
        return genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    @staticmethod
    def get_model() -> str:
        return MODEL
