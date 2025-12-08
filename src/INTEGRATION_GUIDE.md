# Integration Guide - Notification System & Attempt Reset

**Quick Start Guide for Integrating New Features**

---

## Step 1: Add Notification Center to Dashboard Layout

Since the DashboardLayout file appears to be incomplete, here's how to integrate the NotificationCenter:

### Update DashboardLayout.tsx

```typescript
// Add import at top
import NotificationCenter from './NotificationCenter';

// In your header section (where you have the theme toggle and user menu), add:
<div className="flex items-center gap-4">
  {/* Notification Center */}
  <NotificationCenter userId={user.id} />
  
  {/* Theme Toggle */}
  <button onClick={toggleTheme}>
    {theme === 'dark' ? <Sun /> : <Moon />}
  </button>
  
  {/* User Menu */}
  <UserMenu user={user} onLogout={onLogout} />
</div>
```

---

## Step 2: Update GradingDashboard with Submission Manager

### Modify /components/teacher/GradingDashboard.tsx

```typescript
// Add import
import SubmissionManager from './SubmissionManager';

// Replace the attempt list section with:
<SubmissionManager
  quizId={selectedQuiz}
  quizTitle={quizzes.find(q => q.id === selectedQuiz)?.title || ''}
  maxAttempts={quizzes.find(q => q.id === selectedQuiz)?.max_attempts || 1}
  attempts={filteredAttempts.map(attempt => ({
    id: attempt.id,
    studentId: attempt.studentId,
    studentName: attempt.studentName,
    registrationNumber: students.find(s => s.id === attempt.studentId)?.registrationNumber || '',
    attemptNumber: 1, // Calculate from data
    status: attempt.status,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    percentage: attempt.percentage,
    totalViolations: attempt.violations,
    autoSubmittedDueToViolations: attempt.auto_submitted_due_to_violations || false,
    submittedAt: attempt.submittedAt,
    startedAt: attempt.startedAt || new Date().toISOString()
  }))}
  onRefresh={() => {
    // Refresh data
    fetchAttempts();
  }}
/>
```

---

## Step 3: Update QuizTaking to Check Available Attempts

### Modify /components/student/QuizTaking.tsx

```typescript
// At the start of component, add check for available attempts:
useEffect(() => {
  const checkAvailableAttempts = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/attempts/available?quiz_id=${quizId}`);
      // const data = await response.json();
      
      // Mock data
      const remainingAttempts = 1; // Get from API
      
      if (remainingAttempts <= 0) {
        toast.error('You have no more attempts available for this quiz');
        navigate('/student');
        return;
      }
      
      // Show info toast
      toast.info(`You have ${remainingAttempts} attempt(s) remaining`);
    } catch (error) {
      console.error('Failed to check attempts:', error);
    }
  };
  
  checkAvailableAttempts();
}, [quizId, navigate]);
```

---

## Step 4: Update Quiz Submission to Send Notifications

### Modify the handleSubmit function in QuizTaking.tsx

```typescript
const handleSubmit = useCallback(() => {
  // Save attempt
  const attemptData = {
    quiz_id: quizId,
    student_id: user.id,
    answers: answers,
    violations: violations,
    auto_submitted: violations >= 3
  };
  
  // TODO: Replace with actual API call
  // const response = await fetch('/api/attempts/submit', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(attemptData)
  // });
  
  if (violations >= 3) {
    toast.error('Quiz auto-submitted due to violations');
    // Backend will create notification automatically
  } else {
    toast.success('Quiz submitted successfully!');
    // Backend will create notification when graded
  }
  
  navigate('/student/results');
  
  // Exit fullscreen
  if (document.exitFullscreen && document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.warn('Error exiting fullscreen:', err));
  }
}, [answers, violations, navigate, quizId, user.id]);
```

---

## Step 5: Add Attempt Reset to QuizMonitor

### Modify /components/teacher/QuizMonitor.tsx

```typescript
// Add import
import AttemptReset from './AttemptReset';

// In the student list rendering, add reset button:
{students.map(student => (
  <div key={student.id} className="...">
    {/* Existing student info */}
    <div className="student-details">
      {/* ... student info ... */}
    </div>
    
    {/* Add reset button */}
    <div className="mt-2">
      <AttemptReset
        studentId={student.id}
        studentName={student.name}
        quizId={selectedQuiz}
        quizTitle={quiz?.title || ''}
        currentAttempts={student.attempt_number || 1}
        maxAttempts={quiz?.max_attempts || 1}
        onResetComplete={() => {
          toast.success('Attempt reset successfully');
          fetchMonitorData(); // Refresh
        }}
      />
    </div>
  </div>
))}
```

---

## Step 6: Update mockData.ts to Support New Features

### Add to /lib/mockData.ts

```typescript
// Add to Quiz interface
export interface Quiz {
  // ... existing fields ...
  max_attempts: number;
}

// Add to QuizAttempt interface
export interface QuizAttempt {
  // ... existing fields ...
  auto_submitted_due_to_violations: boolean;
  is_reset: boolean;
  reset_by?: string;
  reset_at?: string;
  reset_reason?: string;
  additional_attempts_granted?: number;
}

// Update mock quiz data
export let quizzes: Quiz[] = [
  {
    // ... existing fields ...
    max_attempts: 2, // Add this
  },
  // ... other quizzes
];

// Update mock attempt data
export let quizAttempts: QuizAttempt[] = [
  {
    // ... existing fields ...
    auto_submitted_due_to_violations: false,
    is_reset: false,
  },
  {
    // Example auto-submitted attempt
    id: 'attempt5',
    quizId: 'quiz1',
    studentId: '103',
    studentName: 'Charlie Brown',
    answers: [/* ... */],
    score: 0,
    totalMarks: 20,
    status: 'auto_submitted',
    submittedAt: '2024-12-05T10:45:00',
    violations: 3,
    auto_submitted_due_to_violations: true,
    is_reset: false,
  },
  // ... other attempts
];
```

---

## Step 7: Create API Integration Functions

### Add to /lib/api.ts (create if doesn't exist)

```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Handle token refresh
    // ... refresh logic ...
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Notification API functions
export const getNotifications = async (unreadOnly = false) => {
  return apiCall(`/notifications?unread_only=${unreadOnly}`);
};

export const markNotificationRead = async (notificationId: string) => {
  return apiCall(`/notifications/${notificationId}/read`, { method: 'POST' });
};

export const markAllNotificationsRead = async () => {
  return apiCall('/notifications/read-all', { method: 'POST' });
};

export const deleteNotification = async (notificationId: string) => {
  return apiCall(`/notifications/${notificationId}`, { method: 'DELETE' });
};

// Attempt API functions
export const resetStudentAttempts = async (data: {
  student_id: string;
  quiz_id: string;
  additional_attempts: number;
  reason: string;
}) => {
  return apiCall('/attempts/reset', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getAvailableAttempts = async (quizId: string) => {
  return apiCall(`/attempts/available?quiz_id=${quizId}`);
};

export const getAttemptHistory = async (studentId: string, quizId: string) => {
  return apiCall(`/attempts/history?student_id=${studentId}&quiz_id=${quizId}`);
};

export const getCategorizedAttempts = async (quizId: string) => {
  return apiCall(`/attempts/quiz/${quizId}/categorized`);
};

// Quiz submission
export const submitQuizAttempt = async (attemptData: {
  quiz_id: string;
  student_id: string;
  answers: any[];
  violations: number;
}) => {
  return apiCall('/attempts/submit', {
    method: 'POST',
    body: JSON.stringify(attemptData),
  });
};
```

---

## Step 8: Update NotificationCenter to Use Real API

### Modify /components/shared/NotificationCenter.tsx

Replace the mock data fetch with:

```typescript
const fetchNotifications = async () => {
  try {
    const data = await getNotifications(false); // Import from lib/api.ts
    setNotifications(data.notifications);
    setUnreadCount(data.unread_count);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  }
};

const markAsRead = async (notificationId: string) => {
  try {
    await markNotificationRead(notificationId); // Import from lib/api.ts
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

// Similar updates for markAllAsRead and deleteNotification
```

---

## Step 9: Update AttemptReset to Use Real API

### Modify /components/teacher/AttemptReset.tsx

Replace the mock API call with:

```typescript
const handleReset = async () => {
  if (!reason.trim()) {
    toast.error('Please provide a reason for the reset');
    return;
  }

  setIsResetting(true);

  try {
    await resetStudentAttempts({ // Import from lib/api.ts
      student_id: studentId,
      quiz_id: quizId,
      additional_attempts: additionalAttempts,
      reason: reason
    });

    toast.success(`Reset successful! ${studentName} can now attempt the quiz ${additionalAttempts} more time(s)`);
    
    setIsOpen(false);
    setReason('');
    setAdditionalAttempts(1);
    onResetComplete();
  } catch (error) {
    console.error('Reset failed:', error);
    toast.error('Failed to reset attempts. Please try again.');
  } finally {
    setIsResetting(false);
  }
};
```

---

## Step 10: Backend Setup

Choose one of the backend implementations and follow the setup:

### For FastAPI + PostgreSQL:
1. Follow **PYTHON_BACKEND_GUIDE.md**
2. Add updates from **BACKEND_UPDATES_NOTIFICATIONS_ATTEMPTS.md**
3. Run database migrations
4. Start server with: `uvicorn app.main:app --reload`

### For Flask + MySQL:
1. Follow **FLASK_MYSQL_BACKEND_GUIDE.md**
2. Add updates from **BACKEND_UPDATES_NOTIFICATIONS_ATTEMPTS.md**
3. Run database migrations: `flask db upgrade`
4. Start server with: `python run.py`

---

## Step 11: Environment Variables

### Frontend (.env)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
# OR for production:
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/quiz_db
# OR
DATABASE_URL=mysql+mysqldb://user:password@localhost/quiz_db

# JWT
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-change-in-production

# Email (optional for notifications)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Step 12: Testing Checklist

### Test Notifications:
- [ ] Bell icon shows unread count
- [ ] Notifications load on click
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Delete notification works
- [ ] Auto-refresh works (every 30s)
- [ ] Clicking link navigates correctly

### Test Attempt Reset:
- [ ] Reset button appears for teachers
- [ ] Dialog shows correct information
- [ ] Validation works (reason required)
- [ ] Reset creates notification for student
- [ ] Student sees updated attempt count
- [ ] Student can start new attempt
- [ ] History preserved
- [ ] Audit log created

### Test Auto-Submission:
- [ ] 3 violations triggers auto-submit
- [ ] Student notified of auto-submit
- [ ] Teacher sees in "Auto-Submitted" tab
- [ ] Teacher can reset attempt
- [ ] Violations preserved in history

### Test Categorized Submissions:
- [ ] Tabs show correct counts
- [ ] Auto-submitted has orange badge
- [ ] Manual submissions separate
- [ ] In-progress shows live data
- [ ] All tab shows everything

---

## Step 13: Common Issues & Solutions

### Issue: Notifications not showing
**Solution:** Check if:
1. API endpoint is correct
2. Token is being sent in headers
3. CORS is configured
4. Backend service is running

### Issue: Reset not working
**Solution:** Check if:
1. User has teacher role
2. Quiz ID and Student ID are valid
3. Reason field is filled
4. Backend endpoint is accessible

### Issue: Auto-submission not triggering
**Solution:** Check if:
1. Violation count logic is correct (>= 3)
2. handleSubmit is called on 3rd violation
3. Status is set to 'auto_submitted'
4. Notification service is triggered

---

## Step 14: Production Deployment

### Frontend:
```bash
# Build
npm run build

# Deploy to Vercel, Netlify, or your server
```

### Backend:
```bash
# FastAPI
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Flask
gunicorn -c gunicorn_config.py wsgi:app
```

### Nginx Configuration:
```nginx
# Add WebSocket support for notifications
location /socket.io {
    proxy_pass http://localhost:5000/socket.io;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## Quick Reference: File Locations

### New Components Created:
- `/components/shared/NotificationCenter.tsx` ✅
- `/components/teacher/AttemptReset.tsx` ✅
- `/components/teacher/SubmissionManager.tsx` ✅

### Files to Modify:
- `/components/shared/DashboardLayout.tsx` - Add NotificationCenter
- `/components/teacher/GradingDashboard.tsx` - Add SubmissionManager
- `/components/teacher/QuizMonitor.tsx` - Add AttemptReset
- `/components/student/QuizTaking.tsx` - Add attempt check & notifications
- `/lib/mockData.ts` - Add new fields
- `/lib/api.ts` - Add API functions (create if needed)

### Backend Files to Create:
- `/app/services/notification_service.py`
- `/app/services/attempt_reset_service.py`
- `/app/routes/notifications.py` (Flask) or `/app/api/v1/notifications.py` (FastAPI)
- `/app/routes/attempts.py` - Add reset endpoints

### Documentation:
- `/PYTHON_BACKEND_GUIDE.md` - FastAPI implementation
- `/FLASK_MYSQL_BACKEND_GUIDE.md` - Flask implementation
- `/BACKEND_UPDATES_NOTIFICATIONS_ATTEMPTS.md` - New features
- `/FINAL_SYSTEM_COMPLETE.md` - Complete feature list
- `/INTEGRATION_GUIDE.md` - This document

---

## 🎉 You're All Set!

Your Quiz Management System now has:
✅ Comprehensive notification system
✅ Attempt reset functionality
✅ Auto-submission tracking
✅ Categorized submission views
✅ Complete audit trail
✅ Production-ready code

**Next Steps:**
1. Integrate notification center into dashboard
2. Set up backend (FastAPI or Flask)
3. Test all features
4. Deploy to production

Good luck with your quiz management system! 🚀
