from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class TranscriptionEvaluationInput(BaseModel):
    """Input model for transcription evaluation"""
    audioData: str = Field(..., description="Base64 encoded audio data")
    format: str = Field(default="webm", description="Audio format (webm, mp3, wav, etc.)")

class TextEvaluationInput(BaseModel):
    """Input model for text-only evaluation (faster, no audio processing)"""
    transcription: str = Field(..., description="Transcribed text to evaluate")

class TranscriptionEvaluationOutput(BaseModel):
    """Output model for transcription evaluation"""
    transcription: str = Field(..., description="Transcribed text from audio")
    clarity: int = Field(..., ge=0, le=100, description="Clarity score (0-100)")
    confidence: int = Field(..., ge=0, le=100, description="Confidence score (0-100)")
    articulation: Optional[int] = Field(None, ge=0, le=100, description="Articulation score (0-100)")
    feedback: str = Field(..., description="AI feedback on communication skills")
    suggestions: Optional[str] = Field(None, description="Suggestions for improvement")
    analysis: Optional[Dict[str, Any]] = Field(None, description="Detailed analysis data")

class CommunicationHistoryInput(BaseModel):
    """Input model for saving communication history"""
    student_register_number: str = Field(..., description="Student register number")
    transcription: str = Field(..., description="Transcribed text")
    clarity: int = Field(..., ge=0, le=100, description="Clarity score")
    confidence: int = Field(..., ge=0, le=100, description="Confidence score")
    articulation: Optional[int] = Field(None, ge=0, le=100, description="Articulation score")
    feedback: str = Field(..., description="AI feedback")
    suggestions: Optional[str] = Field(None, description="Improvement suggestions")
    analysis: Optional[Dict[str, Any]] = Field(None, description="Analysis data")
    timestamp: str = Field(..., description="ISO timestamp of the recording")
    type: str = Field(default="communication_skills", description="Type of evaluation")

class CommunicationHistoryOutput(BaseModel):
    """Output model for communication history operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    history_id: Optional[str] = Field(None, description="ID of the saved history entry")
