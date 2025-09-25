# Coding service functions
import json
import asyncio
import anyio
from services.ai_service import get_ai_model
from models.coding_models import (
    GenerateCodingPracticeInput,
    GenerateCodingPracticeOutput,
    GeneratedCodingQuestion,
    EvaluateCodingPracticeInput,
    EvaluateCodingPracticeOutput,
)

class CodingService:
    def __init__(self):
        self.ai_model = get_ai_model()

    async def _call_model(self, prompt_text: str) -> str:
        def _task():
            resp = self.ai_model.generate_content(prompt_text)
            return (getattr(resp, "text", "") or "").strip()
        return await anyio.to_thread.run_sync(_task)

    @staticmethod
    def _extract_json(response_text: str) -> dict:
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:].strip()
        elif text.startswith("```"):
            text = text[3:].strip()
        if text.endswith("```"):
            text = text[:-3].strip()
        try:
            return json.loads(text)
        except Exception:
            start, end = text.find('{'), text.rfind('}')
            if start != -1 and end != -1:
                return json.loads(text[start:end+1])
            raise

    async def generate_coding_practice(self, input_data: GenerateCodingPracticeInput) -> GenerateCodingPracticeOutput:
        prompt_text = f"""You are a computer science educator. Generate a JSON object with a 'questions' array containing exactly 5 coding practice questions for:
Topic: {input_data.topic}
Difficulty: {input_data.level}

Each must have:
- 'type': 'coding'
- 'question': string
"""

        for attempt in range(3):
            try:
                data = self._extract_json(await self._call_model(prompt_text))
                questions_raw = data.get("questions", [])
                questions = [GeneratedCodingQuestion(**q) for q in questions_raw]
                if len(questions) == 5:
                    return GenerateCodingPracticeOutput(questions=questions)
            except Exception as e:
                if attempt == 2:
                    raise RuntimeError(f"AI failed to generate coding questions: {e}")
                await asyncio.sleep(1)

        raise RuntimeError("Failed to generate questions.")

    async def evaluate_coding_practice(self, input_data: EvaluateCodingPracticeInput) -> EvaluateCodingPracticeOutput:
        prompt_text = f"""You are a strict computer science professor. Evaluate this code in JSON with:
- isCorrect: bool
- feedback: str
- score: int (0-10)
- suggestions: str

Question:
{input_data.question}

User's Code:
{input_data.userCode}
"""
        try:
            data = self._extract_json(await self._call_model(prompt_text))
            return EvaluateCodingPracticeOutput(**data)
        except Exception as e:
            raise RuntimeError(f"Coding evaluation failed: {e}")
