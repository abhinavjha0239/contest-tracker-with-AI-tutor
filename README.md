# 🏆 Contest Tracker

A comprehensive platform that helps competitive programmers track and learn from coding contests across multiple platforms. Features automated video solution discovery and AI-powered tutoring.

## ⭐ Key Features

### 👨‍💻 Contest Management
- **Multi-Platform Integration**
  - Real-time contest tracking with start/end times
  - Supported Platforms:
    - Codeforces (Div 1, 2, 3, Educational, Global)
    - LeetCode (Weekly, Biweekly)
    - CodeChef (Long, Cook-off, Lunchtime, Starters)
    - AtCoder (ABC, ARC, AGC)
- **Smart Organization**
  - Past/Upcoming contest views
  - Platform-wise filtering
  - Personal bookmarking system
- **Google Calendar Integration**
  - OAuth2.0 authenticated calendar access
  - Automatic event creation with contest details
  - Platform subscription for automatic additions
  - Customizable reminders (1hr, 12hr before contest)

### 🎥 Video Solutions System
- **Automated Content Discovery**
  - Post-contest video solution aggregation
  - Official platform content prioritization
  - Trusted educator recognition system
    - Platform experts (e.g., NeetCode, Errichto)
    - Quality scoring algorithm
    - Publication timing verification
- **Smart Caching**
  - 24-hour video metadata cache
  - Manual refresh option
  - Offline availability
  
### 🤖 AI Tutoring System
- **Code Analysis & Learning**
  - Google Gemini API powered analysis
  - Secure code storage via AWS S3
  - Multiple language support 
    - C++, Java, Python, JavaScript
  - Reference solution comparison
- **Progressive Learning**
  - Step-by-step hints
  - Concept explanations
  - Common mistake detection

## 🎥 Demo Video
Check out our platform walkthrough and feature demonstration:
[Watch Demo Video](https://drive.google.com/file/d/1mETLlBA-fFEN4hMsmE6LkUDvo49EQgK0/view?usp=drive_link)

## 🔧 Technical Architecture

### Frontend (`/frontend`)
```javascript
React.js (v18)        // Core framework
Axios                 // API client
React Router (v6)     // Navigation
JWT Authentication    // Session management
```

### Backend (`/backend`)
```javascript
Node.js + Express     // Server framework
MongoDB              // Database
AWS S3               // File storage
JWT                  // Auth tokens
OAuth 2.0            // Google services
```

### API Integrations
```javascript
YouTube Data API v3   // Video solutions
Google Calendar API   // Contest scheduling  
Google Gemini API    // AI tutoring
AWS S3 API           // File management
```

## 📥 Installation

### Prerequisites
1. Node.js (v14+)
2. MongoDB (local/Atlas)
3. Required API Keys:
```javascript
YouTube Data API     // Video features
Google OAuth 2.0     // Calendar integration
Google Gemini API    // AI tutoring
AWS S3              // File storage
```

### Setup Steps
1. **Clone & Install**
```bash
git clone https://github.com/yourusername/contest-tracker.git
cd contest-tracker
```

2. **Backend Configuration**
```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev
```

3. **Frontend Configuration**
```bash
cd frontend
npm install
npm start
```

4. Access application at `http://localhost:3000`

## 🔐 Security Features
- **Authentication**: JWT-based user sessions
- **File Security**: AWS S3 with restricted access
- **API Protection**: Rate limiting & route guards
- **OAuth Security**: Secure calendar access
- **Data Privacy**: Encrypted storage & transmission

## 🗂️ Project Structure
```
contest-tracker/
├── backend/                 # Node.js API server
│   ├── config/             # API configurations
│   ├── middleware/         # Auth & request handling
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   └── services/          # External API integration
└── frontend/              # React application
    ├── src/
    │   ├── components/    # Reusable UI components
    │   ├── pages/        # Main views
    │   ├── services/     # API communication
    │   └── utils/        # Helper functions
    └── public/           # Static assets
```

## 📝 License

MIT License - See LICENSE file for details

---

**Note**: Make sure to properly configure all API keys in `.env` files before starting the application.
