# Study Logs models for user-specific study logs
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class StudyLogInput(BaseModel):
    title: str = Field(..., description="Title of the study log")
    content: str = Field(..., description="Content of the study log")
    user_id: str = Field(..., description="User ID who created the log")

class StudyLogOutput(BaseModel):
    id: str = Field(..., description="Unique identifier for the study log")
    title: str = Field(..., description="Title of the study log")
    content: str = Field(..., description="Content of the study log")
    user_id: str = Field(..., description="User ID who created the log")
    created_at: str = Field(..., description="Creation timestamp")

class StudyLogListOutput(BaseModel):
    logs: List[StudyLogOutput]
    total_count: int

class DeleteStudyLogInput(BaseModel):
    log_id: str = Field(..., description="ID of the log to delete")
    user_id: str = Field(..., description="User ID requesting deletion")
