# Coding-related database models
from pydantic import BaseModel, Field
from typing import List, Literal

class GenerateCodingPracticeInput(BaseModel):
    topic: str = Field(..., description='The topic to generate coding questions for.', min_length=2, max_length=50)
    level: Literal["Beginner", "Intermediate", "Advanced"] = Field(..., description="The difficulty level for the questions.")

class GeneratedCodingQuestion(BaseModel):
    type: Literal["coding"] = "coding"
    question: str = Field(..., description="The coding challenge or question.")

class GenerateCodingPracticeOutput(BaseModel):
    questions: List[GeneratedCodingQuestion]

class EvaluateCodingPracticeInput(BaseModel):
    question: str = Field(..., description="The original coding question that was asked.")
    userCode: str = Field(..., description="The user's submitted code solution.")

class EvaluateCodingPracticeOutput(BaseModel):
    isCorrect: bool = Field(..., description="Whether the user's code correctly solves the problem.")
    feedback: str = Field(..., description="Constructive feedback on the user's code.")
    score: int = Field(..., ge=0, le=10, description="Score from 0 to 10.")
    suggestions: str = Field(..., description="Suggestions for improvement.")
