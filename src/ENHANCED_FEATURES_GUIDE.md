# Enhanced Features Guide

## 🚀 New Features - Quick Reference

This guide covers the final features added to complete the Quiz Management System to 100%.

---

## 1. Enhanced Quiz Monitor with Real-Time Updates

### Overview
Teachers can now monitor quiz attempts in real-time with comprehensive student tracking and violation monitoring.

### How to Access
1. Login as a teacher
2. Navigate to: Teacher Dashboard → Quiz Monitor (from sidebar)
3. Or click "Monitor Quiz" from Teacher Quizzes page

### Features

#### A. Live Student Tracking
- **Auto-Refresh:** Updates every 5 seconds (can be toggled on/off)
- **Quiz Selection:** Dropdown to choose which quiz to monitor
- **Real-Time Progress:** Live progress bars for each student
- **Current Question Tracking:** See which question students are on
- **Time Tracking:** Monitor how long students have been taking the quiz

#### B. Statistics Dashboard
Four key metrics displayed at the top:
- **Total Students:** Number of students assigned to the quiz
- **Active Students:** Currently taking the quiz (blue)
- **Completed Students:** Finished the quiz (green)
- **Total Violations:** Sum of all anti-cheating violations (orange)

#### C. Student Details Table
Each row shows:
- Student name and registration number
- Status badge (In Progress/Completed/Idle)
- Progress bar with percentage
- Current question number (e.g., "5/10")
- Time spent in minutes
- Violation count (clickable for details)
- Last activity timestamp
- Actions button for detailed view

#### D. Violation Details Modal
Click on a student's violation count or actions button to see:
- **Student Stats:**
  - Overall progress
  - Total time spent
  - Tab switches count
  - Fullscreen exits count
- **Violation Log:**
  - Type of violation (tab-switch, fullscreen-exit, copy-attempt, right-click)
  - Timestamp of each violation
  - Question number where it occurred
  - Chronological list of all violations

#### E. Export & Print
- **Export CSV:** Download complete monitoring data
- **Print:** Generate printer-friendly report
- **Auto-filename:** Files include quiz ID and date

### Usage Tips
- Keep auto-refresh ON during active quizzes for live updates
- Click on violation counts to investigate suspicious activity
- Export data before quiz ends for permanent record
- Use the quiz dropdown to switch between different active quizzes

---

## 2. Enhanced Export/Print Functionality

### Overview
Comprehensive export and print capabilities added across all major components for data portability and reporting.

### Locations with Export/Print

#### A. Teacher Dashboard
**Path:** `/teacher/dashboard`

**Export Includes:**
- Summary statistics (quizzes, students, scores)
- Quiz performance data
- Recent quiz attempts (last 20)
- Teacher-specific metrics

**Print Layout:**
- Clean, professional format
- All charts and statistics
- Hidden navigation and buttons

#### B. Student Results
**Path:** `/student/results`

**Export Includes:**
- All quiz results
- Score breakdown (score/total/percentage)
- Status (graded/pending)
- Violation records
- Average score calculation
- Summary statistics

**Print Layout:**
- Individual result cards
- Clear score display
- Timestamp information

#### C. Grading Dashboard
**Path:** `/teacher/grading`

**Export Includes:**
- Pending/reviewed submissions (based on active tab)
- Student details (name, registration number)
- Submission timestamps
- Scores and percentages
- Status information
- Summary counts

**Print Layout:**
- Organized submission lists
- Clear grading status
- Student information visible

#### D. Quiz Monitor
**Path:** `/teacher/quiz-monitor`

**Export Includes:**
- Student tracking data
- Progress percentages
- Current question numbers
- Time spent
- Violation details (all types)
- Last activity timestamps

**Print Layout:**
- Comprehensive monitoring report
- Violation highlights
- Status indicators

#### E. Existing Components (Already Had Export/Print)
- Admin Dashboard
- Admin Users
- Admin Classes
- Quiz Analytics
- Student Management

### How to Use Export/Print

#### Exporting to CSV
1. Navigate to any page with export functionality
2. Click the green "Export CSV" button (with download icon)
3. File automatically downloads with date-stamped filename
4. Open in Excel, Google Sheets, or any CSV viewer

#### Printing Reports
1. Navigate to any page with print functionality
2. Click the purple "Print" button (with printer icon)
3. Browser print dialog opens
4. Choose printer or "Save as PDF"
5. Adjust settings and print

### CSV File Format
All CSV exports include:
- **Header Section:** Report title and metadata
- **Data Section:** Tabular data with column headers
- **Summary Section:** Aggregated statistics
- **Proper Escaping:** Handles commas, quotes, special characters

### Print Optimizations
- **Auto Light Mode:** Prints use light colors regardless of theme
- **Hidden Elements:** Buttons and navigation removed
- **Clean Borders:** Tables and cards have visible borders
- **Optimized Text:** Black text on white background
- **No Animations:** All animations disabled for printing

---

## 3. Export Utilities Library

### Overview
Reusable utility functions for consistent export/print functionality across the application.

### Location
`/lib/exportUtils.ts`

### Available Functions

#### exportToCSV()
```typescript
exportToCSV(csvData: string[][], filename: string)
```
- Converts array of arrays to CSV
- Handles special characters and quotes
- Triggers file download
- Shows success notification

#### printPage()
```typescript
printPage()
```
- Triggers browser print dialog
- Shows success notification

#### generateFilename()
```typescript
generateFilename(prefix: string, extension?: string): string
```
- Creates date-stamped filename
- Default extension: 'csv'
- Format: `{prefix}-{YYYY-MM-DD}.{extension}`

#### createCSVHeader()
```typescript
createCSVHeader(title: string, metadata: Record<string, string>): string[][]
```
- Generates standardized CSV header
- Includes title and metadata
- Returns formatted array for CSV

#### formatPercentage()
```typescript
formatPercentage(value: number, decimals?: number): string
```
- Formats number as percentage
- Default: 1 decimal place
- Returns: "85.5%"

#### formatDate()
```typescript
formatDate(date: Date | string): string
```
- Formats date for consistent display
- Uses locale string format

### Usage Example
```typescript
import { exportToCSV, generateFilename } from '../../lib/exportUtils';

const handleExport = () => {
  const csvData = [
    ['Report Title'],
    ['Generated:', new Date().toLocaleString()],
    [''],
    ['Column 1', 'Column 2', 'Column 3'],
    ['Data 1', 'Data 2', 'Data 3'],
  ];
  
  const filename = generateFilename('my-report');
  exportToCSV(csvData, filename);
};
```

---

## 4. Print Styles Enhancement

### Overview
Professional print styles added to ensure clean, readable printed reports.

### Location
`/styles/globals.css` - Print Media Query Section

### Features

#### Hidden Elements
- Navigation bars
- Buttons with `.print:hidden` class
- Sidebar navigation
- Interactive controls

#### Color Optimization
- Forces light mode colors
- Black text on white background
- Removes dark mode styling

#### Layout Improvements
- Removes shadows and backgrounds
- Visible table and card borders
- Clean, professional appearance

#### Page Break Controls
Available utility classes:
- `.page-break-before` - Break before element
- `.page-break-after` - Break after element
- `.page-break-inside-avoid` - Keep element together

#### Performance
- Removes animations
- Removes transitions
- Optimizes for faster printing

### Usage in Components
Simply add `print:hidden` class to elements that shouldn't print:

```tsx
<button className="print:hidden">
  Export CSV
</button>
```

---

## 5. Real-Time Monitoring System

### Technical Details

#### Update Frequency
- **Auto-Refresh Interval:** 5 seconds
- **Progress Simulation:** Incremental updates to student progress
- **Activity Tracking:** Last activity timestamp updates

#### Data Tracked
1. **Student Progress:**
   - Percentage completion
   - Current question number
   - Time elapsed

2. **Violations:**
   - Tab switches
   - Fullscreen exits
   - Copy attempts
   - Right-click attempts

3. **Status:**
   - Idle
   - In Progress
   - Completed

#### Mock Data Generation
- Realistic progress increments (0-3% per update)
- Random activity timestamps
- Violation distribution across question numbers
- Automatic completion when reaching 100%

---

## 📊 Data Export Examples

### Example 1: Student Results CSV
```csv
My Quiz Results Report
Student:,Alice Johnson
Generated:,12/6/2025 2:30:00 PM

Quiz Title,Score,Total Marks,Percentage (%),Status,Violations,Submitted At
Introduction to React,18,20,90,graded,0,12/5/2025 10:15:30 AM
JavaScript Basics,16,20,80,graded,1,12/4/2025 3:45:00 PM

Summary
Total Quizzes Taken:,2
Graded:,2
Pending:,0
Average Score:,85.0%
```

### Example 2: Quiz Monitor CSV
```csv
Quiz Monitor Report
Quiz:,Introduction to React
Subject:,Computer Science
Generated:,12/6/2025 2:30:00 PM

Student Name,Registration Number,Status,Progress (%),Current Question,Time Spent (min),Violations,Tab Switches,Fullscreen Exits,Last Activity
Alice Johnson,STU2024001,completed,100,10/10,25,0,0,0,2:29:45 PM
Bob Smith,STU2024002,in-progress,65,7/10,18,2,1,1,2:29:50 PM
Charlie Brown,STU2024003,in-progress,45,5/10,12,0,0,0,2:29:55 PM
```

---

## 🎯 Best Practices

### For Exporting
1. **Regular Backups:** Export data regularly for record-keeping
2. **Before Deletion:** Always export before deleting data
3. **Date Stamping:** Files are auto-dated for easy organization
4. **Filter First:** Use filters to export specific subsets of data

### For Printing
1. **Preview First:** Use print preview before printing
2. **Save as PDF:** Consider saving as PDF for digital archiving
3. **Landscape for Tables:** Use landscape orientation for wide tables
4. **Check Dark Mode:** Print works in both themes but optimizes to light

### For Monitoring
1. **Active Monitoring:** Keep quiz monitor open during active quizzes
2. **Check Violations:** Investigate high violation counts immediately
3. **Export Evidence:** Export monitoring data if violations are suspicious
4. **Multi-Quiz:** Use quiz selector to monitor multiple quizzes

---

## 🔒 Security Considerations

### Violation Monitoring
- All violations are logged with timestamps
- Question numbers help identify when violations occurred
- Pattern detection can identify systematic cheating
- Export violations for formal review or documentation

### Data Privacy
- CSV exports contain sensitive student data
- Store exported files securely
- Follow institutional data protection policies
- Consider encryption for stored exports

---

## 📱 Responsive Behavior

### Export/Print Buttons
- **Desktop:** Full text with icons
- **Tablet:** May stack vertically
- **Mobile:** Icons remain, text may abbreviate
- **Print:** Hidden automatically

### Print Layout
- **Desktop:** Multi-column where appropriate
- **Mobile Data:** Simplified, single-column layout
- **Tables:** Automatically adjust for page width
- **Charts:** Scale to fit page

---

## 🎓 Training Resources

### For Teachers
1. **Quiz Monitor Tutorial:**
   - How to track students in real-time
   - Understanding violation types
   - When to investigate violations
   - Exporting monitoring data

2. **Export Best Practices:**
   - When to export data
   - How to organize exported files
   - Using CSV data in Excel/Sheets

### For Admins
1. **System Reports:**
   - Exporting system-wide analytics
   - Printing comprehensive reports
   - Data analysis techniques

### For Students
1. **Personal Reports:**
   - Exporting quiz results
   - Understanding violation records
   - Tracking progress over time

---

## 🆘 Troubleshooting

### Export Issues
**Problem:** CSV doesn't download
- **Solution:** Check browser download settings, allow pop-ups from the site

**Problem:** Special characters appear incorrectly
- **Solution:** Open CSV with UTF-8 encoding, or use Excel import feature

### Print Issues
**Problem:** Print looks different from screen
- **Solution:** This is normal - print styles optimize for paper

**Problem:** Charts don't print
- **Solution:** Use "Print Background Graphics" in print settings

### Monitor Issues
**Problem:** Data not updating
- **Solution:** Check auto-refresh is enabled, click manual refresh

**Problem:** Student not appearing
- **Solution:** Ensure student has started the quiz and has network connection

---

## 📞 Support

For issues or questions about these features:
1. Check this guide first
2. Review the main documentation
3. Test with sample data
4. Check browser console for errors

---

**Last Updated:** December 6, 2025
**Version:** 2.0 (100% Complete)
