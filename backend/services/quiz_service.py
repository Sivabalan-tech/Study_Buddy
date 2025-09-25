# Quiz service functions
import json
import random
import asyncio
import anyio
from typing import List, Any, Optional
from services.ai_service import get_ai_model
from models.quiz_models import (
    GeneratePersonalizedQuizInput,
    GeneratePersonalizedQuizOutput,
    MCQQuestion,
    EvaluateQuizInput,
    EvaluateQuizOutput,
    Evaluation,
)

class QuizService:
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

    async def generate_personalized_quiz(self, input_data: GeneratePersonalizedQuizInput) -> GeneratePersonalizedQuizOutput:
        study_log = input_data.studyLog
        num_questions = 20  # Align with frontend request

        mcq_prompt = f"""You are an expert educator. Based on the study log below, generate a JSON object with a 'questions' array containing exactly {num_questions} multiple-choice questions. Each question must have:
- 'type': 'mcq'
- 'question': string
- 'options': array of exactly 4 strings
- 'answer': integer index (0-3)

Study Log:
{study_log}
"""
        
        mcqs = await self._generate_questions(mcq_prompt, num_questions, MCQQuestion)
        return GeneratePersonalizedQuizOutput(questions=mcqs)

    async def _generate_questions(self, prompt_text: str, expected_count: int, model_cls: Any) -> List[Any]:
        for attempt in range(3):
            try:
                data = self._extract_json(await self._call_model(prompt_text))
                questions_raw = data.get("questions", [])
                
                if len(questions_raw) >= expected_count:
                    # Validate and return the exact number of questions
                    questions = [model_cls(**q) for q in questions_raw[:expected_count]]
                    return questions
            except Exception as e:
                if attempt == 2:
                    raise RuntimeError(f"AI failed to generate {expected_count} questions: {e}")
                await asyncio.sleep(1)
        raise RuntimeError(f"Generation failed after multiple attempts for {expected_count} questions.")

    async def evaluate_quiz(self, input_data: EvaluateQuizInput) -> EvaluateQuizOutput:
        questions = input_data.questions
        answers = input_data.answers
        feedback: List[Optional[Evaluation]] = [None] * len(questions)
        
        for i, qd in enumerate(questions):
            qtype = qd.get("type")
            ans = answers[i] if i < len(answers) else None
            if qtype == "mcq":
                mcq = MCQQuestion(**qd)
                correct = mcq.answer == ans
                feedback[i] = Evaluation(
                    isCorrect=correct,
                    feedback="Correct! ✅" if correct else f"Incorrect ❌. Correct answer: {mcq.options[mcq.answer]}",
                    score=10 if correct else 0,
                )
        
        final_feedback = [fb if fb else Evaluation(isCorrect=False, feedback="Evaluation missing.", score=0) for fb in feedback]
        total_score = sum(fb.score for fb in final_feedback)
        overall_percentage = round((total_score / (len(questions) * 10)) * 100) if questions else 0
        
        return EvaluateQuizOutput(
            individualFeedback=final_feedback, 
            overallScore=overall_percentage, 
            suggestions="Great job! Keep practicing to reinforce your knowledge."
        )