# Study Buddy Fullstack Application

A comprehensive study companion application designed to help students manage their study sessions, track progress, and enhance learning through various interactive features.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure login and registration system for students and teachers
- **Study Session Management**: Track and log study sessions with detailed analytics
- **Communication Practice**: Audio recording and analysis for communication skills improvement
- **Coding Practice**: Interactive coding exercises and history tracking
- **Quiz System**: Create and take quizzes with immediate feedback
- **Progress Tracking**: Comprehensive analytics and history of all learning activities

### Key Modules
- **Study Logs**: Record and monitor study sessions with time tracking
- **Communication Test**: Practice and improve verbal communication skills
- **Coding Practice**: Enhance programming skills with structured exercises
- **Quiz System**: Test knowledge across various subjects
- **Feedback System**: Collect and analyze user feedback for continuous improvement

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Authentication**: JWT-based authentication
- **Data Storage**: JSON-based file storage
- **Audio Processing**: WebM audio recording support
- **AI Integration**: AI-powered analysis for communication and coding feedback

### Frontend
- **HTML5/CSS3**: Modern responsive design
- **JavaScript**: Vanilla JS with modular architecture
- **Tailwind CSS**: Utility-first CSS framework
- **Audio Recording**: Web Audio API integration
- **Icons**: SVG and PNG icon sets

### Development Tools
- **Git**: Version control
- **PowerShell**: Command-line operations (Windows)
- **Python Virtual Environment**: Dependency management

## 📁 Project Structure

```
srm-study-buddy-fullstack/
├── backend/                 # Backend application
│   ├── main.py             # FastAPI application entry point
│   ├── models/             # Data models and schemas
│   ├── services/           # Business logic services
│   ├── data/               # JSON data files
│   ├── .venv/              # Python virtual environment
│   └── requirements.txt    # Python dependencies
├── frontend/               # Frontend application
│   ├── index.html          # Main landing page
│   ├── js/                 # JavaScript modules
│   ├── assets/             # Images and icons
│   ├── styles/             # CSS stylesheets
│   └── node_modules/       # Node.js dependencies
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js and npm
- Modern web browser with Web Audio API support
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sivabalan-tech/Study_Buddy.git
   cd srm-study-buddy-fullstack
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   .venv\Scripts\activate  # Windows
   python main.py
   ```
   The backend will run on `http://localhost:8000`

2. **Start the Frontend**
   ```bash
   cd frontend
   # Use a local server like Python's built-in server
   python -m http.server 8001
   ```
   Access the frontend at `http://localhost:8001`

## 📚 API Documentation

Once the backend is running, you can access the interactive API documentation at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/validate` - Token validation

#### Study Logs
- `GET /api/study-logs/user/{user_id}` - Get user's study logs
- `POST /api/study-logs/save` - Save a new study log
- `DELETE /api/study-logs/delete` - Delete a study log

#### Communication Practice
- `POST /api/communication/save-result` - Save communication test results
- `GET /api/communication/history/{user_id}` - Get communication history

#### Coding Practice
- `POST /api/coding/save-result` - Save coding practice results
- `GET /api/coding/history/{user_id}` - Get coding history

#### Quiz System
- `POST /api/quiz/save-result` - Save quiz results
- `GET /api/quiz/history/{user_id}` - Get quiz history

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
# Database and configuration settings
SECRET_KEY=your-secret-key-here
DEBUG=true
```

### Backend Configuration
- Main configuration is handled in `main.py`
- Data files are stored in the `backend/data/` directory
- Audio recordings are temporarily stored in `backend/temp_audio.webm`

## 🎯 Usage Guide

### For Students
1. **Register/Login**: Create an account or log in with existing credentials
2. **Study Sessions**: Start and track study sessions with the timer
3. **Communication Practice**: Record audio responses and receive AI feedback
4. **Coding Practice**: Solve programming problems and track progress
5. **Take Quizzes**: Test your knowledge and review results
6. **View History**: Access detailed analytics of all activities

### For Teachers
1. **Teacher Dashboard**: Access specialized dashboard for managing classes
2. **Student Progress**: Monitor student performance across all modules
3. **Feedback Management**: Review and provide feedback on student submissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Notes

### Code Structure
- **Backend**: Follows FastAPI best practices with modular service architecture
- **Frontend**: Uses vanilla JavaScript with modular file organization
- **Data Models**: Pydantic models for data validation and serialization

### Security Considerations
- JWT-based authentication for secure API access
- Input validation and sanitization
- CORS configuration for cross-origin requests

### Performance Optimizations
- Efficient data handling with JSON storage
- Optimized audio processing for communication features
- Responsive design for various screen sizes

## 🔍 Troubleshooting

### Common Issues

1. **Backend won't start**
   - Ensure Python virtual environment is activated
   - Check all dependencies are installed via `pip install -r requirements.txt`
   - Verify port 8000 is not in use

2. **Frontend styling issues**
   - Ensure Tailwind CSS is properly configured
   - Check browser console for CSS loading errors

3. **Audio recording not working**
   - Ensure browser supports Web Audio API
   - Check microphone permissions
   - Verify HTTPS connection (required for audio recording in some browsers)

4. **Authentication issues**
   - Check JWT token configuration
   - Verify user data files exist in `backend/data/`

### Debug Mode
Enable debug mode by setting `DEBUG=true` in the backend `.env` file for detailed error messages.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FastAPI team for the excellent web framework
- Tailwind CSS for the utility-first CSS framework
- All contributors who have helped improve this application

## 📞 Contact

For support, questions, or contributions, please reach out through the GitHub repository issues section.

---

**Happy Learning! 🎓**
