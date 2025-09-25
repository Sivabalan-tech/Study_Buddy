# Feedback service for managing teacher-student feedback
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from models.feedback_models import (
    FeedbackInput, FeedbackOutput, GetStudentFeedbackInput,
    GetStudentResultsInput, StudentResultsOutput, FeedbackType,
    GetStudentScoreInput, StudentScoreOutput,
)

class ResultType:
    QUIZ = "quiz"
    CODING = "coding"
    COMMUNICATION = "communication"

class FeedbackService:
    def __init__(self):
        self.feedback_file = "data/feedback.json"
        self.quiz_history_file = "data/quiz_history.json"
        self.coding_history_file = "data/coding_history.json"
        self.communication_history_file = "data/communication_history.json"
        self._ensure_data_directory()
    
    def _ensure_data_directory(self):
        """Ensure data directory and data files exist"""
        os.makedirs("data", exist_ok=True)
        
        # Initialize data files if they don't exist
        for file_path in [self.feedback_file, self.quiz_history_file, self.coding_history_file, self.communication_history_file]:
            if not os.path.exists(file_path):
                with open(file_path, 'w') as f:
                    json.dump([], f)
    
    def _load_feedback(self) -> List[dict]:
        """Load feedback from JSON file"""
        try:
            with open(self.feedback_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_feedback(self, feedback_list: List[dict]):
        """Save feedback to JSON file"""
        with open(self.feedback_file, 'w') as f:
            json.dump(feedback_list, f, indent=2, default=str)
    
    def _load_data(self, file_path: str) -> List[dict]:
        """Generic method to load JSON data from a file"""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_data(self, file_path: str, data: List[dict]):
        """Generic method to save JSON data to a file"""
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def _load_quiz_history(self) -> List[dict]:
        """Load quiz history from JSON file"""
        return self._load_data(self.quiz_history_file)
    
    def _save_quiz_history(self, history_list: List[dict]):
        """Save quiz history to JSON file"""
        self._save_data(self.quiz_history_file, history_list)
    
    def _load_coding_history(self) -> List[dict]:
        """Load coding challenge history from JSON file"""
        return self._load_data(self.coding_history_file)
    
    def _save_coding_history(self, history_list: List[dict]):
        """Save coding challenge history to JSON file"""
        self._save_data(self.coding_history_file, history_list)
    
    def _load_communication_history(self) -> List[dict]:
        """Load communication history from JSON file"""
        return self._load_data(self.communication_history_file)
    
    def _save_communication_history(self, history_list: List[dict]):
        """Save communication history to JSON file"""
        self._save_data(self.communication_history_file, history_list)
    
    async def create_feedback(self, feedback_input: FeedbackInput) -> FeedbackOutput:
        """Create new feedback from teacher to student"""
        feedback_list = self._load_feedback()
        
        # Generate unique feedback ID
        feedback_id = f"fb_{len(feedback_list) + 1}_{int(datetime.now().timestamp())}"
        
        # Create feedback object with new fields
        feedback = {
            "feedback_id": feedback_id,
            "student_register_number": feedback_input.student_register_number.upper().strip(),
            "teacher_id": feedback_input.teacher_id,
            "feedback_text": feedback_input.feedback_text,
            "feedback_type": feedback_input.feedback_type.value,
            "score": feedback_input.score,
            "subject": feedback_input.subject,
            "related_id": feedback_input.related_id,
            "created_at": datetime.utcnow().isoformat(),
            "is_read": False,
        }
        
        feedback_list.append(feedback)
        self._save_feedback(feedback_list)
        
        return FeedbackOutput(**feedback)
    
    async def get_student_feedback(self, input_data: GetStudentFeedbackInput) -> List[FeedbackOutput]:
        """Get all feedback for a specific student"""
        feedback_list = self._load_feedback()
        
        student_feedback = [
            feedback for feedback in feedback_list
            if feedback.get("student_register_number", "").upper() == input_data.student_register_number.upper().strip()
        ]
        
        return [FeedbackOutput(**feedback) for feedback in student_feedback]
    
    async def clear_student_feedback(self, input_data: GetStudentFeedbackInput) -> dict:
        """Clear all feedback for a specific student"""
        feedback_list = self._load_feedback()
        
        # Filter out feedback for the specific student
        original_count = len(feedback_list)
        feedback_list = [
            feedback for feedback in feedback_list
            if feedback.get("student_register_number", "").upper() != input_data.student_register_number.upper().strip()
        ]
        
        cleared_count = original_count - len(feedback_list)
        
        # Save the updated feedback list
        self._save_feedback(feedback_list)
        
        return {
            "message": f"Cleared {cleared_count} feedback entries for student {input_data.student_register_number}",
            "cleared_count": cleared_count
        }
    
    async def get_student_scores(self, input_data: GetStudentScoreInput) -> StudentScoreOutput:
        """Get quiz scores for a specific student"""
        try:
            if not input_data.student_register_number:
                print("No student_register_number provided")
                return StudentScoreOutput(
                    student_register_number="",
                    quiz_scores=[],
                    average_score=0.0,
                    total_quizzes=0
                )
                
            quiz_history = self._load_quiz_history()
            print(f"Loaded quiz history: {len(quiz_history)} entries")
            
            # Normalize the register number for comparison
            target_register = input_data.student_register_number.upper().strip()
            print(f"Searching for student: {target_register}")
            
            # Filter quiz history for the specific student (case-insensitive)
            student_quizzes = [
                quiz for quiz in quiz_history
                if quiz.get("student_register_number", "").upper().strip() == target_register
            ]
            
            print(f"Found {len(student_quizzes)} quizzes for student {target_register}")
            
            if not student_quizzes:
                # Try to find any quizzes with similar register numbers
                print("No exact matches, checking for similar register numbers...")
                student_quizzes = [
                    quiz for quiz in quiz_history
                    if target_register in quiz.get("student_register_number", "").upper()
                ]
                print(f"Found {len(student_quizzes)} quizzes with similar register numbers")
            
            if not student_quizzes:
                return StudentScoreOutput(
                    student_register_number=target_register,
                    quiz_scores=[],
                    average_score=0.0,
                    total_quizzes=0
                )
            
            # Calculate average score
            scores = [quiz.get("score", 0) for quiz in student_quizzes]
            average_score = sum(scores) / len(scores) if scores else 0.0
            
            print(f"Returning {len(student_quizzes)} quizzes with average score {average_score}")
            
            return StudentScoreOutput(
                student_register_number=target_register,
                quiz_scores=student_quizzes,
                average_score=average_score,
                total_quizzes=len(student_quizzes)
            )
            
        except Exception as e:
            print(f"Error in get_student_scores: {str(e)}")
            return StudentScoreOutput(
                student_register_number=input_data.student_register_number,
                quiz_scores=[],
                average_score=0.0,
                total_quizzes=0
            )
    
    async def mark_feedback_as_read(self, feedback_id: str) -> bool:
        """Mark feedback as read by student"""
        feedback_list = self._load_feedback()
        
        for feedback in feedback_list:
            if feedback["feedback_id"] == feedback_id:
                feedback["is_read"] = True
                self._save_feedback(feedback_list)
                return True
        
        return False
    
    async def save_quiz_result(self, student_register_number: str, quiz_data: dict) -> bool:
        """Save quiz result to history"""
        try:
            quiz_history = self._load_quiz_history()
            
            # Ensure the student_register_number is properly formatted
            if not student_register_number or not isinstance(student_register_number, str):
                print(f"Invalid student_register_number: {student_register_number}")
                return False
                
            # Create quiz result with all required fields
            quiz_result = {
                "student_register_number": student_register_number.upper().strip(),
                "score": quiz_data.get("score", 0),
                "total_questions": quiz_data.get("total_questions", 0),
                "time_taken": quiz_data.get("time_taken", "00:00"),
                "subject": quiz_data.get("subject", "General"),
                "date": datetime.now().isoformat(),
                "quiz_id": f"quiz_{len(quiz_history) + 1}_{int(datetime.now().timestamp())}"
            }
            
            print(f"Saving quiz result for student {student_register_number}: {quiz_result}")
            
            # Add to history and save
            quiz_history.append(quiz_result)
            self._save_quiz_history(quiz_history)
            
            # Verify the save was successful
            updated_history = self._load_quiz_history()
            if not any(q.get('quiz_id') == quiz_result['quiz_id'] for q in updated_history):
                print("Failed to verify quiz result was saved")
                return False
                
            return True
            
        except Exception as e:
            print(f"Error saving quiz result: {str(e)}")
            return False

    async def save_coding_result(self, student_register_number: str, coding_data: dict) -> bool:
        """Save coding result to history"""
        try:
            coding_history = self._load_coding_history()
            
            if not student_register_number or not isinstance(student_register_number, str):
                print(f"Invalid student_register_number: {student_register_number}")
                return False
            
            coding_result = {
                "student_register_number": student_register_number.upper().strip(),
                "question": coding_data.get("question", ""),
                "score": coding_data.get("score", 0),  # expected 0-100
                "is_correct": coding_data.get("is_correct", False),
                "time_taken": coding_data.get("time_taken", "N/A"),
                "subject": coding_data.get("subject", "Coding"),
                "date": datetime.now().isoformat(),
                "coding_id": f"code_{len(coding_history) + 1}_{int(datetime.now().timestamp())}"
            }
            
            print(f"Saving coding result for student {student_register_number}: {coding_result}")
            coding_history.append(coding_result)
            self._save_coding_history(coding_history)
            
            updated = self._load_coding_history()
            if not any(c.get('coding_id') == coding_result['coding_id'] for c in updated):
                print("Failed to verify coding result was saved")
                return False
            return True
        except Exception as e:
            print(f"Error saving coding result: {str(e)}")
            return False

    async def save_communication_result(self, student_register_number: str, communication_data: dict) -> bool:
        """Save communication result to history"""
        try:
            communication_history = self._load_communication_history()
            
            if not student_register_number or not isinstance(student_register_number, str):
                print(f"Invalid student_register_number: {student_register_number}")
                return False
            
            communication_result = {
                "student_register_number": student_register_number.upper().strip(),
                "transcription": communication_data.get("transcription", ""),
                "overall_score": communication_data.get("overall_score", 0),  # expected 0-100
                "clarity": communication_data.get("clarity", 0),
                "confidence": communication_data.get("confidence", 0),
                "articulation": communication_data.get("articulation", 0),
                "feedback": communication_data.get("feedback", ""),
                "suggestions": communication_data.get("suggestions", ""),
                "analysis": communication_data.get("analysis", {}),
                "time_taken": communication_data.get("time_taken", "N/A"),
                "subject": communication_data.get("subject", "Communication"),
                "date": datetime.now().isoformat(),
                "communication_id": f"comm_{len(communication_history) + 1}_{int(datetime.now().timestamp())}"
            }
            
            print(f"Saving communication result for student {student_register_number}: {communication_result}")
            communication_history.append(communication_result)
            self._save_communication_history(communication_history)
            
            updated = self._load_communication_history()
            if not any(c.get('communication_id') == communication_result['communication_id'] for c in updated):
                print("Failed to verify communication result was saved")
                return False
            return True
        except Exception as e:
            print(f"Error saving communication result: {str(e)}")
            return False

    async def get_student_results(self, input_data: GetStudentResultsInput) -> StudentResultsOutput:
        """Get combined quiz and coding results for a student"""
        try:
            reg = (input_data.student_register_number or "").upper().strip()
            if not reg:
                return StudentResultsOutput(
                    student_register_number="",
                    quiz_results=[], coding_results=[], communication_results=[],
                    quiz_average=0.0, coding_average=0.0, communication_average=0.0,
                    total_quizzes=0, total_coding=0, total_communication=0,
                )
            quiz_history = self._load_quiz_history()
            coding_history = self._load_coding_history()
            communication_history = self._load_communication_history()
            
            quiz_results = [q for q in quiz_history if (q.get("student_register_number", "").upper().strip() == reg)]
            coding_results = [c for c in coding_history if (c.get("student_register_number", "").upper().strip() == reg)]
            communication_results = [cm for cm in communication_history if (cm.get("student_register_number", "").upper().strip() == reg)]
            
            # Optionally filter by type
            if getattr(input_data, 'result_type', 'all') == 'quiz':
                coding_results = []
                communication_results = []
            elif getattr(input_data, 'result_type', 'all') == 'coding':
                quiz_results = []
                communication_results = []
            elif getattr(input_data, 'result_type', 'all') == 'communication':
                quiz_results = []
                coding_results = []
            
            q_scores = [q.get('score', 0) for q in quiz_results]
            c_scores = [c.get('score', 0) for c in coding_results]
            quiz_avg = (sum(q_scores) / len(q_scores)) if q_scores else 0.0
            coding_avg = (sum(c_scores) / len(c_scores)) if c_scores else 0.0
            # For communication, prefer overall_score if present, else average of clarity & confidence
            comm_scores: list[float] = []
            for cm in communication_results:
                if isinstance(cm, dict):
                    if 'overall_score' in cm and isinstance(cm.get('overall_score'), (int, float)):
                        comm_scores.append(float(cm.get('overall_score') or 0))
                    else:
                        clarity = float(cm.get('clarity') or 0)
                        confidence = float(cm.get('confidence') or 0)
                        # avoid division by zero; just average the two metrics
                        comm_scores.append(round((clarity + confidence) / 2.0, 2))
            communication_avg = (sum(comm_scores) / len(comm_scores)) if comm_scores else 0.0
            
            return StudentResultsOutput(
                student_register_number=reg,
                quiz_results=quiz_results,
                coding_results=coding_results,
                communication_results=communication_results,
                quiz_average=quiz_avg,
                coding_average=coding_avg,
                communication_average=communication_avg,
                total_quizzes=len(quiz_results),
                total_coding=len(coding_results),
                total_communication=len(communication_results),
            )
        except Exception as e:
            print(f"Error in get_student_results: {str(e)}")
            return StudentResultsOutput(
                student_register_number=input_data.student_register_number,
                quiz_results=[], coding_results=[], communication_results=[],
                quiz_average=0.0, coding_average=0.0, communication_average=0.0,
                total_quizzes=0, total_coding=0, total_communication=0,
            )
