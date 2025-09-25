# Notification service for managing student notifications
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from models.notification_models import (
    NotificationInput, NotificationOutput, NotificationListOutput, 
    MarkNotificationReadInput, NotificationType, NotificationStatus
)

class NotificationService:
    def __init__(self):
        self.notifications_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data/notifications.json")
        self._ensure_data_directory()

    def _ensure_data_directory(self):
        """Ensure data directory exists"""
        os.makedirs(os.path.dirname(self.notifications_file), exist_ok=True)
        if not os.path.exists(self.notifications_file):
            with open(self.notifications_file, 'w') as f:
                json.dump([], f, indent=2)

    def _load_notifications(self) -> List[Dict[str, Any]]:
        """Load all notifications from file"""
        try:
            with open(self.notifications_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_notifications(self, notifications: List[Dict[str, Any]]):
        """Save notifications to file"""
        with open(self.notifications_file, 'w') as f:
            json.dump(notifications, f, indent=2)

    def create_notification(self, input_data: NotificationInput) -> NotificationOutput:
        """Create a new notification for a user"""
        notifications = self._load_notifications()
        new_notification = {
            "id": str(uuid.uuid4()),
            "user_id": input_data.user_id,
            "title": input_data.title,
            "message": input_data.message,
            "type": input_data.type.value,
            "status": NotificationStatus.UNREAD.value,
            "related_id": input_data.related_id,
            "teacher_name": input_data.teacher_name,
            "created_at": datetime.now().isoformat(),
            "read_at": None
        }
        notifications.append(new_notification)
        self._save_notifications(notifications)
        return NotificationOutput(
            id=new_notification["id"],
            user_id=new_notification["user_id"],
            title=new_notification["title"],
            message=new_notification["message"],
            type=new_notification["type"],
            status=new_notification["status"],
            related_id=new_notification["related_id"],
            teacher_name=new_notification["teacher_name"],
            created_at=new_notification["created_at"],
            read_at=new_notification["read_at"]
        )

    def get_user_notifications(self, user_id: str, unread_only: bool = False) -> NotificationListOutput:
        """Get all notifications for a specific user"""
        notifications = self._load_notifications()
        user_notifications = [n for n in notifications if n.get("user_id") == user_id]
        
        if unread_only:
            user_notifications = [n for n in user_notifications if n.get("status") == NotificationStatus.UNREAD.value]
        
        user_notifications.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        notification_outputs = [
            NotificationOutput(
                id=n["id"],
                user_id=n["user_id"],
                title=n["title"],
                message=n["message"],
                type=n["type"],
                status=n["status"],
                related_id=n.get("related_id"),
                teacher_name=n.get("teacher_name"),
                created_at=n["created_at"],
                read_at=n.get("read_at")
            )
            for n in user_notifications
        ]
        
        unread_count = len([n for n in user_notifications if n.get("status") == NotificationStatus.UNREAD.value])
        
        return NotificationListOutput(
            notifications=notification_outputs,
            unread_count=unread_count,
            total_count=len(notification_outputs)
        )

    def mark_notification_as_read(self, input_data: MarkNotificationReadInput) -> bool:
        """Mark a notification as read"""
        notifications = self._load_notifications()
        notification_found = False
        
        for notification in notifications:
            if (notification.get("id") == input_data.notification_id and 
                notification.get("user_id") == input_data.user_id and
                notification.get("status") == NotificationStatus.UNREAD.value):
                
                notification["status"] = NotificationStatus.READ.value
                notification["read_at"] = datetime.now().isoformat()
                notification_found = True
                break
        
        if notification_found:
            self._save_notifications(notifications)
            return True
        return False

    def mark_all_notifications_as_read(self, user_id: str) -> int:
        """Mark all notifications for a user as read, returns count of marked notifications"""
        notifications = self._load_notifications()
        marked_count = 0
        
        for notification in notifications:
            if (notification.get("user_id") == user_id and 
                notification.get("status") == NotificationStatus.UNREAD.value):
                
                notification["status"] = NotificationStatus.READ.value
                notification["read_at"] = datetime.now().isoformat()
                marked_count += 1
        
        if marked_count > 0:
            self._save_notifications(notifications)
        
        return marked_count

    def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification"""
        notifications = self._load_notifications()
        original_length = len(notifications)
        notifications = [n for n in notifications if not (n.get("id") == notification_id and n.get("user_id") == user_id)]
        
        if len(notifications) < original_length:
            self._save_notifications(notifications)
            return True
        return False

    def create_feedback_notification(self, user_id: str, teacher_name: str, feedback_type: str) -> NotificationOutput:
        """Create a notification for new feedback"""
        return self.create_notification(NotificationInput(
            user_id=user_id,
            title="New Feedback Received",
            message=f"Teacher {teacher_name} has provided {feedback_type} feedback for you.",
            type=NotificationType.FEEDBACK,
            teacher_name=teacher_name
        ))
