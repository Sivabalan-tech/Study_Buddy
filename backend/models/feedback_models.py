# Feedback-related database models
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum

class FeedbackType(str, Enum):
    QUIZ = "quiz"
    CODING = "coding"
    COMMUNICATION = "communication"
    GENERAL = "general"

class FeedbackInput(BaseModel):
    student_register_number: str = Field(..., description="Student's register number")
    teacher_id: str = Field(..., description="ID of the teacher providing feedback")
    feedback_text: str = Field(..., description="The actual feedback content")
    feedback_type: FeedbackType = Field(FeedbackType.GENERAL, description="Type of feedback (quiz/coding/communication/general)")
    score: Optional[int] = Field(None, ge=0, le=100, description="Score out of 100 (if applicable)")
    subject: Optional[str] = Field(None, description="Subject or topic this feedback relates to")
    related_id: Optional[str] = Field(None, description="ID of the related quiz/coding/communication session")

class FeedbackOutput(FeedbackInput):
    feedback_id: str = Field(..., description="Unique identifier for the feedback")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When the feedback was created")
    is_read: bool = Field(False, description="Whether the student has read the feedback")
    teacher_name: Optional[str] = Field(None, description="Name of the teacher who provided the feedback")

class GetStudentFeedbackInput(BaseModel):
    student_register_number: str = Field(..., description="Student's register number")
    feedback_type: Optional[FeedbackType] = Field(None, description="Filter by feedback type")

class GetStudentResultsInput(BaseModel):
    student_register_number: str = Field(..., description="Student's register number")
    result_type: Optional[Literal["quiz", "coding", "communication", "all"]] = Field("all", description="Type of results to retrieve")

class StudentResultsOutput(BaseModel):
    student_register_number: str = Field(..., description="Student's register number")
    quiz_results: List[dict] = Field(default_factory=list, description="List of quiz results")
    coding_results: List[dict] = Field(default_factory=list, description="List of coding challenge results")
    communication_results: List[dict] = Field(default_factory=list, description="List of communication assessment results")
    quiz_average: Optional[float] = Field(None, description="Average quiz score")
    coding_average: Optional[float] = Field(None, description="Average coding challenge score")
    communication_average: Optional[float] = Field(None, description="Average communication assessment score")
    total_quizzes: int = Field(0, description="Total number of quizzes taken")
    total_coding: int = Field(0, description="Total number of coding challenges attempted")
    total_communication: int = Field(0, description="Total number of communication assessments completed")

# Legacy models kept for backward compatibility with existing frontend calls
class GetStudentScoreInput(BaseModel):
    student_register_number: str

class StudentScoreOutput(BaseModel):
    student_register_number: str
    quiz_scores: List[dict]
    average_score: float
    total_quizzes: int
