# Entry point for backend
from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
import os, uvicorn

from services.quiz_service import QuizService
from services.coding_service import CodingService
from services.feedback_service import FeedbackService
from services.auth_service import AuthService
from services.transcription_service import TranscriptionService
from services.study_logs_service import StudyLogsService
from services.notification_service import NotificationService
from models.quiz_models import (
    GeneratePersonalizedQuizInput, GeneratePersonalizedQuizOutput,
    EvaluateQuizInput, EvaluateQuizOutput,
)
from models.coding_models import (
    GenerateCodingPracticeInput, GenerateCodingPracticeOutput,
    EvaluateCodingPracticeInput, EvaluateCodingPracticeOutput,
)
from models.feedback_models import (
    FeedbackInput, FeedbackOutput, GetStudentFeedbackInput,
    GetStudentScoreInput, StudentScoreOutput,
    GetStudentResultsInput, StudentResultsOutput,
)
from models.auth_models import (
    LoginInput, LoginOutput, UserRegistrationInput, UserRegistrationOutput
)
from models.transcription_models import (
    TranscriptionEvaluationInput, TranscriptionEvaluationOutput,
    CommunicationHistoryInput, CommunicationHistoryOutput,
    TextEvaluationInput
)
from models.study_logs_models import (
    StudyLogInput, StudyLogOutput, StudyLogListOutput, DeleteStudyLogInput
)
from models.notification_models import (
    NotificationInput, NotificationOutput, NotificationListOutput, MarkNotificationReadInput
)

app = FastAPI(title="SRM Study Buddy AI Backend", version="1.0.0")

quiz_service = QuizService()
coding_service = CodingService()
feedback_service = FeedbackService()
auth_service = AuthService()
transcription_service = TranscriptionService()
study_logs_service = StudyLogsService()
notification_service = NotificationService()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000", "null"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add middleware to handle CORS preflight requests
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    # Handle preflight requests
    if request.method == "OPTIONS":
        response = Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Accept-Encoding, Origin, User-Agent",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "600",  # 10 minutes
            }
        )
        return response
    
    # Process the request
    response = await call_next(request)
    
    # Add CORS headers to the response
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Accept-Encoding, Origin, User-Agent"
    
    return response

@app.get("/")
async def read_root():
    return {"message": "Welcome to the SRM Study Buddy AI Backend!"}

# Test endpoint for CORS
@app.get("/test-cors")
async def test_cors():
    return {"message": "CORS test successful"}

# Quiz endpoints
@app.post("/quiz/generate", response_model=GeneratePersonalizedQuizOutput)
async def generate_quiz_endpoint(input_data: GeneratePersonalizedQuizInput):
    try:
        return await quiz_service.generate_personalized_quiz(input_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@app.post("/quiz/evaluate", response_model=EvaluateQuizOutput)
async def evaluate_quiz_endpoint(input_data: EvaluateQuizInput):
    try:
        return await quiz_service.evaluate_quiz(input_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"AI evaluation failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

# Coding endpoints
@app.post("/coding/generate", response_model=GenerateCodingPracticeOutput)
async def generate_coding_practice_endpoint(input_data: GenerateCodingPracticeInput):
    try:
        return await coding_service.generate_coding_practice(input_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@app.post("/coding/evaluate", response_model=EvaluateCodingPracticeOutput)
async def evaluate_coding_practice_endpoint(input_data: EvaluateCodingPracticeInput):
    try:
        return await coding_service.evaluate_coding_practice(input_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"AI evaluation failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

# Authentication endpoints
@app.post("/auth/login", response_model=LoginOutput)
async def login_endpoint(login_data: LoginInput):
    try:
        print(f"Login attempt for user: {login_data.username}, type: {login_data.user_type}")
        result = await auth_service.authenticate_user(login_data)

        # Generate a dummy token (replace with JWT later)
        token_value = f"token-{login_data.username}"

        login_output = {
            "success": True,
            "user_type": result.user_type,
            "user_id": result.user_id,
            "username": result.username,
            "message": "Login successful",
            "token": token_value
        }

        print(f"Login result: {login_output}")
        return login_output
    except Exception as e:
        import traceback
        error_details = {
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }
        print(f"Login error: {error_details}")
        raise HTTPException(status_code=500, detail=error_details)


@app.post("/auth/register", response_model=UserRegistrationOutput)
async def register_endpoint(registration_data: UserRegistrationInput):
    try:
        return await auth_service.register_user(registration_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {e}")

# Feedback endpoints
@app.post("/feedback/create", response_model=FeedbackOutput)
async def create_feedback_endpoint(feedback_data: FeedbackInput):
    try:
        return await feedback_service.create_feedback(feedback_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback creation error: {e}")

@app.post("/feedback/student")
async def get_student_feedback_endpoint(input_data: GetStudentFeedbackInput):
    try:
        return await feedback_service.get_student_feedback(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback retrieval error: {e}")

@app.delete("/feedback/student")
async def clear_student_feedback_endpoint(input_data: GetStudentFeedbackInput):
    try:
        return await feedback_service.clear_student_feedback(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback clearing error: {e}")

@app.post("/feedback/student-scores", response_model=StudentScoreOutput)
async def get_student_scores_endpoint(input_data: GetStudentScoreInput):
    try:
        return await feedback_service.get_student_scores(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Score retrieval error: {e}")

@app.post("/feedback/student-results", response_model=StudentResultsOutput)
async def get_student_results_endpoint(input_data: GetStudentResultsInput):
    try:
        return await feedback_service.get_student_results(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Results retrieval error: {e}")

@app.post("/feedback/mark-read/{feedback_id}")
async def mark_feedback_read_endpoint(feedback_id: str):
    try:
        success = await feedback_service.mark_feedback_as_read(feedback_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mark read error: {e}")

@app.post("/quiz/save-result")
async def save_quiz_result_endpoint(data: dict):
    try:
        student_register_number = data.get("student_register_number")
        quiz_data = data.get("quiz_data", {})
        success = await feedback_service.save_quiz_result(student_register_number, quiz_data)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save result error: {e}")

@app.post("/coding/save-result")
async def save_coding_result_endpoint(data: dict):
    try:
        student_register_number = data.get("student_register_number")
        coding_data = data.get("coding_data", {})
        success = await feedback_service.save_coding_result(student_register_number, coding_data)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save coding result error: {e}")

@app.post("/feedback/save-communication-result")
async def save_communication_result_endpoint(data: dict):
    try:
        student_register_number = data.get("student_register_number")
        communication_data = data.get("communication_data", {})
        success = await feedback_service.save_communication_result(student_register_number, communication_data)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save communication result error: {e}")

# Transcription endpoints
@app.post("/transcription/evaluate", response_model=TranscriptionEvaluationOutput)
async def evaluate_transcription_endpoint(input_data: TranscriptionEvaluationInput):
    """Evaluate audio transcription and provide communication analysis"""
    try:
        return await transcription_service.evaluate_transcription(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription evaluation error: {e}")

@app.post("/transcription/evaluate-text", response_model=TranscriptionEvaluationOutput)
async def evaluate_text_endpoint(input_data: TextEvaluationInput):
    """Evaluate text-only transcription and provide communication analysis (faster, no audio processing)"""
    try:
        return await transcription_service.evaluate_text_only(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text evaluation error: {e}")

@app.post("/api/communication/save-history", response_model=CommunicationHistoryOutput)
async def save_communication_history_endpoint(input_data: CommunicationHistoryInput):
    """Save communication evaluation history"""
    try:
        return await transcription_service.save_communication_history(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save communication history error: {e}")

@app.post("/api/communication/get-history")
async def get_communication_history_endpoint(request: Request):
    """Get communication evaluation history for a student"""
    try:
        data = await request.json()
        student_register_number = data.get('student_register_number')
        
        if not student_register_number:
            raise HTTPException(status_code=400, detail="Student register number is required")
        
        return await transcription_service.get_communication_history(student_register_number)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get communication history error: {e}")

@app.post("/api/communication/delete-item")
async def delete_communication_history_endpoint(request: Request):
    """Delete a communication history item"""
    try:
        data = await request.json()
        item_id = data.get('id')
        
        if not item_id:
            raise HTTPException(status_code=400, detail="Item ID is required")
        
        return await transcription_service.delete_communication_history_item(item_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete communication history error: {e}")

# Study Logs endpoints
@app.post("/api/study-logs/create", response_model=StudyLogOutput)
async def create_study_log_endpoint(input_data: StudyLogInput):
    """Create a new study log for a user"""
    try:
        return study_logs_service.create_study_log(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Create study log error: {e}")

@app.get("/api/study-logs/user/{user_id}", response_model=StudyLogListOutput)
async def get_user_study_logs_endpoint(user_id: str):
    """Get all study logs for a specific user"""
    try:
        return study_logs_service.get_user_study_logs(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get user study logs error: {e}")

@app.get("/api/study-logs/{log_id}/user/{user_id}", response_model=StudyLogOutput)
async def get_study_log_endpoint(log_id: str, user_id: str):
    """Get a specific study log by ID for a user"""
    try:
        log = study_logs_service.get_study_log_by_id(log_id, user_id)
        if not log:
            raise HTTPException(status_code=404, detail="Study log not found")
        return log
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get study log error: {e}")

@app.delete("/api/study-logs/delete")
async def delete_study_log_endpoint(input_data: DeleteStudyLogInput):
    """Delete a study log"""
    try:
        success = study_logs_service.delete_study_log(input_data)
        if not success:
            raise HTTPException(status_code=404, detail="Study log not found or access denied")
        return {"success": True, "message": "Study log deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete study log error: {e}")

# Notification endpoints
@app.post("/api/notifications/create", response_model=NotificationOutput)
async def create_notification_endpoint(input_data: NotificationInput):
    """Create a new notification"""
    try:
        return notification_service.create_notification(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Create notification error: {e}")

@app.get("/api/notifications/user/{user_id}", response_model=NotificationListOutput)
async def get_user_notifications_endpoint(user_id: str, unread_only: bool = False):
    """Get all notifications for a specific user"""
    try:
        return notification_service.get_user_notifications(user_id, unread_only)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get user notifications error: {e}")

@app.post("/api/notifications/mark-read", response_model=dict)
async def mark_notification_read_endpoint(input_data: MarkNotificationReadInput):
    """Mark a notification as read"""
    try:
        success = notification_service.mark_notification_as_read(input_data)
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found or already read")
        return {"success": True, "message": "Notification marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mark notification read error: {e}")

@app.post("/api/notifications/mark-all-read/{user_id}", response_model=dict)
async def mark_all_notifications_read_endpoint(user_id: str):
    """Mark all notifications for a user as read"""
    try:
        marked_count = notification_service.mark_all_notifications_as_read(user_id)
        return {"success": True, "message": f"Marked {marked_count} notifications as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mark all notifications read error: {e}")

@app.delete("/api/notifications/{notification_id}/user/{user_id}", response_model=dict)
async def delete_notification_endpoint(notification_id: str, user_id: str):
    """Delete a notification"""
    try:
        success = notification_service.delete_notification(notification_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"success": True, "message": "Notification deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete notification error: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)