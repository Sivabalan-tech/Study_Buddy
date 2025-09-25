# Authentication-related database models
from pydantic import BaseModel, Field
from typing import Literal, Optional

class LoginInput(BaseModel):
    username: str = Field(..., description="Username (register number for students, employee ID for teachers)")
    password: str = Field(..., description="Password")
    user_type: Literal["student", "teacher"] = Field(..., description="Type of user")

class LoginOutput(BaseModel):
    success: bool
    user_type: Literal["student", "teacher"]
    user_id: str
    username: str
    message: str
    token: Optional[str] = None   # ✅ Added token support

class UserRegistrationInput(BaseModel):
    username: str = Field(..., description="Username (register number for students, employee ID for teachers)")
    password: str = Field(..., description="Password")
    user_type: Literal["student", "teacher"] = Field(..., description="Type of user")
    full_name: str = Field(..., description="Full name of the user")
    email: Optional[str] = Field(None, description="Email address")

class UserRegistrationOutput(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
