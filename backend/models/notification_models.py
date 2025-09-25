# Notification models for student feedback notifications
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    FEEDBACK = "feedback"
    QUIZ_RESULT = "quiz_result"
    CODING_RESULT = "coding_result"
    COMMUNICATION_RESULT = "communication_result"

class NotificationStatus(str, Enum):
    UNREAD = "unread"
    READ = "read"

class NotificationInput(BaseModel):
    user_id: str = Field(..., description="User ID to receive the notification")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    type: NotificationType = Field(..., description="Type of notification")
    related_id: Optional[str] = Field(None, description="Related entity ID (e.g., feedback_id)")
    teacher_name: Optional[str] = Field(None, description="Teacher name who sent the notification")

class NotificationOutput(BaseModel):
    id: str = Field(..., description="Unique identifier for the notification")
    user_id: str = Field(..., description="User ID who received the notification")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    type: NotificationType = Field(..., description="Type of notification")
    status: NotificationStatus = Field(..., description="Notification status")
    related_id: Optional[str] = Field(None, description="Related entity ID")
    teacher_name: Optional[str] = Field(None, description="Teacher name")
    created_at: str = Field(..., description="Creation timestamp")
    read_at: Optional[str] = Field(None, description="Read timestamp")

class NotificationListOutput(BaseModel):
    notifications: List[NotificationOutput]
    unread_count: int
    total_count: int

class MarkNotificationReadInput(BaseModel):
    notification_id: str = Field(..., description="ID of the notification to mark as read")
    user_id: str = Field(..., description="User ID requesting to mark as read")
