# Study Logs service for managing user-specific study logs
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from models.study_logs_models import StudyLogInput, StudyLogOutput, StudyLogListOutput, DeleteStudyLogInput

class StudyLogsService:
    def __init__(self):
        self.study_logs_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data/study_logs.json")
        self._ensure_data_directory()
    
    def _ensure_data_directory(self):
        """Ensure data directory exists"""
        os.makedirs(os.path.dirname(self.study_logs_file), exist_ok=True)
        
        # Initialize study logs file if it doesn't exist
        if not os.path.exists(self.study_logs_file):
            with open(self.study_logs_file, 'w') as f:
                json.dump([], f, indent=2)
    
    def _load_study_logs(self) -> List[Dict[str, Any]]:
        """Load all study logs from file"""
        try:
            with open(self.study_logs_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_study_logs(self, logs: List[Dict[str, Any]]):
        """Save study logs to file"""
        with open(self.study_logs_file, 'w') as f:
            json.dump(logs, f, indent=2)
    
    def create_study_log(self, input_data: StudyLogInput) -> StudyLogOutput:
        """Create a new study log for a specific user"""
        logs = self._load_study_logs()
        
        # Create new log entry
        new_log = {
            "id": str(uuid.uuid4()),
            "title": input_data.title,
            "content": input_data.content,
            "user_id": input_data.user_id,
            "created_at": datetime.now().isoformat()
        }
        
        logs.append(new_log)
        self._save_study_logs(logs)
        
        return StudyLogOutput(
            id=new_log["id"],
            title=new_log["title"],
            content=new_log["content"],
            user_id=new_log["user_id"],
            created_at=new_log["created_at"]
        )
    
    def get_user_study_logs(self, user_id: str) -> StudyLogListOutput:
        """Get all study logs for a specific user"""
        logs = self._load_study_logs()
        
        # Filter logs by user_id and sort by creation date (newest first)
        user_logs = [
            log for log in logs 
            if log.get("user_id") == user_id
        ]
        user_logs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Convert to StudyLogOutput objects
        log_outputs = [
            StudyLogOutput(
                id=log["id"],
                title=log["title"],
                content=log["content"],
                user_id=log["user_id"],
                created_at=log["created_at"]
            )
            for log in user_logs
        ]
        
        return StudyLogListOutput(
            logs=log_outputs,
            total_count=len(log_outputs)
        )
    
    def get_study_log_by_id(self, log_id: str, user_id: str) -> Optional[StudyLogOutput]:
        """Get a specific study log by ID, ensuring it belongs to the user"""
        logs = self._load_study_logs()
        
        for log in logs:
            if log.get("id") == log_id and log.get("user_id") == user_id:
                return StudyLogOutput(
                    id=log["id"],
                    title=log["title"],
                    content=log["content"],
                    user_id=log["user_id"],
                    created_at=log["created_at"]
                )
        
        return None
    
    def delete_study_log(self, input_data: DeleteStudyLogInput) -> bool:
        """Delete a study log, ensuring it belongs to the user"""
        logs = self._load_study_logs()
        
        # Find and remove the log if it belongs to the user
        original_length = len(logs)
        logs = [
            log for log in logs 
            if not (log.get("id") == input_data.log_id and log.get("user_id") == input_data.user_id)
        ]
        
        if len(logs) < original_length:
            self._save_study_logs(logs)
            return True
        
        return False
