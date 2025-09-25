# Quiz-related database models
from pydantic import BaseModel, Field
from typing import List, Union, Literal

class Evaluation(BaseModel):
    isCorrect: bool = Field(..., description="Whether the user's answer is correct.")
    feedback: str = Field(..., description="Feedback for the user's answer.")
    score: int = Field(..., ge=0, le=10, description="Score from 0 to 10.")

class EvaluateQuizInput(BaseModel):
    questions: List[dict] = Field(..., description="The array of quiz questions with their content.")
    answers: List[Union[str, int]] = Field(..., description="The user's submitted answers.")

class EvaluateQuizOutput(BaseModel):
    individualFeedback: List[Evaluation]
    overallScore: int = Field(..., ge=0, le=100)
    suggestions: str

class MCQQuestion(BaseModel):
    type: Literal["mcq"] = "mcq"
    question: str
    options: List[str] = Field(..., min_length=4, max_length=4)
    answer: int = Field(..., ge=0, le=3)

class CodingQuestion(BaseModel):
    type: Literal["coding"] = "coding"
    question: str

QuizQuestion = Union[MCQQuestion, CodingQuestion]

class GeneratePersonalizedQuizInput(BaseModel):
    studyLog: str = Field(..., description='The study log to generate a quiz from.')

class GeneratePersonalizedQuizOutput(BaseModel):
    questions: List[QuizQuestion]
