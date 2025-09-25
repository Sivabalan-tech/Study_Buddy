# Authentication service for managing user login and registration
import json
import os
import bcrypt
from typing import Optional
from models.auth_models import LoginInput, LoginOutput, UserRegistrationInput, UserRegistrationOutput

class AuthService:
    def __init__(self):
        self.users_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data/users.json")
        self._ensure_data_directory()
    
    def _ensure_data_directory(self):
        """Ensure data directory exists"""
        os.makedirs(os.path.dirname(self.users_file), exist_ok=True)
        
        # Initialize users file if it doesn't exist
        if not os.path.exists(self.users_file):
            # Create default users with properly hashed passwords
            print("Creating default users...")
            default_users = [
                {
                    "user_id": "student_001",
                    "username": "RA2111003010001",
                    "password": self._hash_password("student123"),
                    "user_type": "student",
                    "full_name": "John Doe",
                    "email": "john.doe@srmist.edu.in"
                },
                {
                    "user_id": "teacher_001",
                    "username": "TEACH001",
                    "password": self._hash_password("teacher123"),
                    "user_type": "teacher",
                    "full_name": "Dr. Jane Smith",
                    "email": "jane.smith@srmist.edu.in"
                }
            ]
            with open(self.users_file, 'w') as f:
                json.dump(default_users, f, indent=2)
            print("Default users created successfully")
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt and return as string"""
        # Generate a salt and hash the password
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        # Ensure we're returning a string that can be properly decoded later
        return hashed.decode('utf-8') if isinstance(hashed, bytes) else hashed

    def _load_users(self) -> list:
        """Load users from JSON file"""
        try:
            with open(self.users_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_users(self, users_list: list):
        """Save users to JSON file"""
        with open(self.users_file, 'w') as f:
            json.dump(users_list, f, indent=2)
    
    def _find_user(self, username: str, user_type: str) -> Optional[dict]:
        """Find user by username and type"""
        users = self._load_users()
        for user in users:
            if user["username"] == username and user["user_type"] == user_type:
                return user
        return None
    
    async def authenticate_user(self, login_input: LoginInput) -> LoginOutput:
        """Authenticate user login"""
        try:
            print(f"[AUTH] Starting authentication for user: {login_input.username}, type: {login_input.user_type}")
            print(f"[AUTH] Users file location: {self.users_file}")
            
            # Load all users for debugging
            all_users = self._load_users()
            print(f"[AUTH] Total users in system: {len(all_users)}")
            for u in all_users:
                print(f"[AUTH] Available user: {u.get('username')} (type: {u.get('user_type')})")
            
            user = self._find_user(login_input.username, login_input.user_type)
            print(f"[AUTH] Found user: {user}")
            
            if not user:
                print(f"[AUTH] User {login_input.username} not found or incorrect user type {login_input.user_type}")
                return LoginOutput(
                    success=False,
                    user_type=login_input.user_type,
                    user_id="",
                    username=login_input.username,
                    message="Invalid username or password"  # Generic message for security
                )
            
            # Verify password using bcrypt
            print(f"[AUTH] Verifying password for user: {user.get('username', 'unknown')}")
            
            # Get the stored hash and ensure it's in the correct format
            stored_hash = user["password"]
            print(f"[AUTH] Stored hash (type: {type(stored_hash)}): {stored_hash}")
            
            # Convert stored hash to bytes if it's a string
            if isinstance(stored_hash, str):
                try:
                    stored_hash = stored_hash.encode('utf-8')
                    print("[AUTH] Converted stored hash to bytes")
                except Exception as e:
                    print(f"[AUTH] Error converting stored hash to bytes: {e}")
                    raise
            
            # Convert password to bytes
            try:
                password_bytes = login_input.password.encode('utf-8')
                print("[AUTH] Converted password to bytes")
            except Exception as e:
                print(f"[AUTH] Error converting password to bytes: {e}")
                raise
            
            # Verify password
            print("[AUTH] Starting password verification")
            try:
                password_matched = bcrypt.checkpw(password_bytes, stored_hash)
                print(f"[AUTH] Password verification result: {password_matched}")
            except Exception as e:
                print(f"[AUTH] Error during password verification: {e}")
                print(f"[AUTH] Password bytes: {password_bytes}")
                print(f"[AUTH] Stored hash: {stored_hash}")
                raise
            
            if not password_matched:
                return LoginOutput(
                    success=False,
                    user_type=login_input.user_type,
                    user_id=user.get("user_id", ""),
                    username=user.get("username", ""),
                    message="Invalid password"
                )
            
            return LoginOutput(
                success=True,
                user_type=user.get("user_type", ""),
                user_id=user.get("user_id", ""),
                username=user.get("username", ""),
                message="Login successful"
            )
            
        except Exception as e:
            import traceback
            error_msg = f"Authentication error: {str(e)}\n{traceback.format_exc()}"
            print(error_msg)
            return LoginOutput(
                success=False,
                user_type=login_input.user_type if hasattr(login_input, 'user_type') else "unknown",
                user_id="",
                username=login_input.username if hasattr(login_input, 'username') else "unknown",
                message=f"Authentication failed: {str(e)}"
            )
    
    async def register_user(self, registration_input: UserRegistrationInput) -> UserRegistrationOutput:
        """Register new user"""
        try:
            print(f"Registering new user: {registration_input.username} as {registration_input.user_type}")
            users = self._load_users()
            
            # Check if user already exists
            if self._find_user(registration_input.username, registration_input.user_type):
                return UserRegistrationOutput(
                    success=False,
                    message="User already exists"
                )
            
            # Generate user ID
            user_id = f"{registration_input.user_type}_{len(users) + 1:03d}"
            
            # Create new user
            new_user = {
                "user_id": user_id,
                "username": registration_input.username,
                "password": self._hash_password(registration_input.password),
                "user_type": registration_input.user_type,
                "full_name": registration_input.full_name,
                "email": registration_input.email
            }
            
            users.append(new_user)
            self._save_users(users)
            
            print(f"User {user_id} registered successfully")
            return UserRegistrationOutput(
                success=True,
                message="User registered successfully",
                user_id=user_id
            )
        except Exception as e:
            import traceback
            error_msg = f"Registration error: {str(e)}\n{traceback.format_exc()}"
            print(error_msg)
            return UserRegistrationOutput(
                success=False,
                message=f"Registration failed: {str(e)}"
            )