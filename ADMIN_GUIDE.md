# 🛡️ SYNAWATCH Admin Dashboard Guide

## 📋 Overview

Admin Dashboard adalah sistem manajemen komprehensif untuk mengelola seluruh data SYNAWATCH. Dashboard ini memberikan kontrol penuh kepada administrator untuk mengelola users, patient data, dan questionnaire responses.

---

## 🔐 Akses Admin Dashboard

### URL:
```
https://your-domain.com/admin.html
```

### Requirements:
1. **Akun dengan role `admin`**
2. **Firebase Authentication** aktif

### Cara Setup Admin User:

#### Metode 1: Via Firebase Console
1. Buka Firebase Console → Firestore Database
2. Buka collection `users`
3. Pilih user document yang ingin dijadikan admin
4. Tambahkan/edit field: `role: "admin"`
5. Save changes

#### Metode 2: Via Code (One-time setup)
```javascript
// Jalankan di browser console setelah login
const userId = 'USER_ID_DISINI';
await db.collection('users').doc(userId).update({
    role: 'admin'
});
```

---

## 🎯 Fitur Utama

### 1. **Dashboard** 📊

**Tampilan Overview:**
- Total Users
- Total Patients
- Total Questionnaires
- Total Health Records

**Charts:**
- User growth over time
- Questionnaire submissions

**Recent Activity:**
- Real-time system events
- API calls
- User logins

---

### 2. **User Management** 👥

**Fitur:**
- View all registered users
- Change user roles (user ↔ admin)
- Enable/Disable user accounts
- Search users
- Export user list

**Actions:**
- **Change Role:** Dropdown untuk mengubah role user
- **Disable/Enable:** Suspend atau reactivate user account

**Use Cases:**
- Promote user menjadi admin
- Disable spam/malicious accounts
- Monitor user registrations

---

### 3. **Patient Data Management** 🏥

**Data yang Dikelola:**
- Health Readings (Heart Rate, SpO2, Temperature, GSR)
- Assessment Results
- Journal Entries
- Chat History
- HEROIC Activities
- HEROIC Scores

**Fitur:**

#### A. View Patient List
- Tampilkan semua pasien dengan statistik
- Info per pasien:
  - Nama & Email
  - Status onboarding
  - Jumlah health readings
  - Jumlah assessments
  - Jumlah journal entries
  - Jumlah HEROIC activities

#### B. View Patient Details
Klik icon **👁️ Eye** untuk melihat detail lengkap:
- Informasi dasar pasien
- Ringkasan data kesehatan
- 5 health readings terakhir dengan data sensor lengkap
- Assessment history
- Journal entries

#### C. Export Patient Data
Klik icon **📥 Download** untuk export:
- Format: **JSON**
- Berisi: Semua data pasien (health, assessments, journals, HEROIC)
- Filename: `patient_{userId}_{date}.json`

**Use Cases:**
- Medical review
- Research data extraction
- Patient data portability (GDPR compliance)
- Backup individual patient data

#### D. Delete Patient Data
Klik icon **🗑️ Trash** untuk menghapus:
- ⚠️ **WARNING:** Permanent deletion!
- Menghapus ALL subcollections:
  - healthReadings
  - assessments
  - journals
  - chatHistory
  - dailySummary
  - interventionLogs
  - moodLogs
  - HEROIC activities
  - HEROIC score history

**Use Cases:**
- GDPR "Right to be forgotten"
- Test data cleanup
- Remove corrupted data

#### E. Filter & Search
- **Search:** Cari pasien berdasarkan nama/email
- **Filter by Data Type:**
  - All Data
  - Health Readings only
  - Assessments only
  - Journals only
  - HEROIC Activities only

---

### 4. **Questionnaire Management** 📋

**Data yang Dikelola:**
Questionnaire responses dari research study dengan metrik:
- **SUS (System Usability Scale)** - Skor 0-100
- **TAM (Technology Acceptance Model)** - Usefulness & Ease of Use
- **UI/UX Ratings** - User satisfaction
- **UEQ (User Experience Questionnaire)**
- **Trust & Privacy scores**
- **Therapeutic Value ratings**
- **Engagement metrics**
- **NPS (Net Promoter Score)** - 0-10

**Fitur:**

#### A. View Questionnaire List
Table dengan info:
- Responden name, age, gender
- Submission date
- **SUS Score** dengan color coding:
  - 🟢 Green (85+): Excellent
  - 🔵 Blue (71-84): Good
  - 🟠 Orange (51-70): OK
  - 🔴 Red (<51): Poor
- TAM Average
- UI/UX Average
- NPS Score dengan badge:
  - 🟢 Promoter (9-10)
  - 🟠 Passive (7-8)
  - 🔴 Detractor (0-6)

#### B. View Questionnaire Details
Klik icon **👁️ Eye** untuk melihat:
- Demographic info (name, age, gender, background)
- All scores summary
- Open-ended responses:
  - Liked features
  - Confusing features
  - Missing features
  - Smartwatch opinion
  - Suggestions

#### C. Questionnaire Statistics
Klik **📊 Statistics** untuk analisis agregat:
- Total responses
- Average scores (SUS, TAM, UEQ)
- **NPS Breakdown:**
  - Count of Promoters
  - Count of Passives
  - Count of Detractors
  - Net Promoter Score calculation

**Formula NPS:**
```
NPS = ((Promoters - Detractors) / Total Responses) × 100
```

#### D. Export to CSV
Klik **📥 Export CSV** untuk download:
- Format: **CSV** (Excel-compatible)
- Columns include:
  - All demographic data
  - All numerical scores
  - All open-ended responses (sanitized)
- Filename: `questionnaires_{date}.csv`

**Use Cases:**
- Statistical analysis di SPSS/Python/R
- Research paper data
- Stakeholder reporting
- Backup research data

#### E. Delete Responses
- Hapus individual response
- Untuk data cleanup / test data removal

#### F. Search & Filter
- Search by respondent name
- Filter by date range (coming soon)

---

## 🔧 Technical Details

### File Structure
```
admin.html                  # Main admin page
js/
├── admin.js               # Backend logic (data operations)
└── admin-ui.js            # Frontend logic (UI rendering)
```

### Key Functions

#### admin.js (AdminManager)
```javascript
// User Management
AdminManager.loadUsers()
AdminManager.updateUserRole(userId, role)
AdminManager.disableUser(userId)
AdminManager.enableUser(userId)

// Patient Data
AdminManager.loadPatientData()
AdminManager.getPatientDetails(userId)
AdminManager.getPatientHealthReadings(userId, startDate, endDate)
AdminManager.deletePatientData(userId, dataType)
AdminManager.exportPatientDataToJSON(userId)

// Questionnaire
AdminManager.loadQuestionnaires()
AdminManager.getQuestionnaireStats()
AdminManager.exportQuestionnairesToCSV()
AdminManager.deleteQuestionnaire(questionnaireId)

// System
AdminManager.formatDate(date)
AdminManager.logout()
```

#### admin-ui.js (AdminUI)
```javascript
// Tab Switching
AdminUI.switchTab(tabName)

// Rendering
AdminUI.renderDashboard()
AdminUI.renderUsersTab()
AdminUI.renderPatientsTab()
AdminUI.renderQuestionnairesTab()

// Patient Actions
AdminUI.viewPatientDetails(userId)
AdminUI.exportPatientData(userId)
AdminUI.deletePatientDataConfirm(userId)

// Questionnaire Actions
AdminUI.viewQuestionnaireDetails(questionnaireId)
AdminUI.showQuestionnaireStats()
AdminUI.exportQuestionnaires()
AdminUI.deleteQuestionnaireConfirm(questionnaireId)

// UI Helpers
AdminUI.showSuccess(message)
AdminUI.showError(message)
AdminUI.closeModal()
```

---

## 🔒 Security & Firestore Rules

### Firestore Security Rules sudah dikonfigurasi:

```javascript
// Admin-only collections
match /apiKeys/{docId} {
  allow read, write, delete: if isAdmin();
}

match /adminActivityLogs/{docId} {
  allow read, write: if isAdmin();
}

// Users - admin can read all
match /users/{userId} {
  allow read, write: if isOwner(userId);
  allow read, write: if isAdmin();  // Admin full access

  match /{subcollection}/{docId} {
    allow read, write: if isOwner(userId);
    allow read: if isAdmin();  // Admin read access
  }
}

// Questionnaire results - admin read only
match /questionnaireResults/{docId} {
  allow create: if isAuthenticated();
  allow read: if isAdmin();  // Only admin can read
}

// HEROIC data - admin full access
match /heroicActivities/{docId} {
  allow read, write: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow read, write: if isAdmin();
}
```

### Admin Check Function:
```javascript
function isAdmin() {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

---

## 📊 Data Export Formats

### Patient Data Export (JSON)
```json
{
  "user": {
    "id": "userId123",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "healthReadings": [
    {
      "heartRate": 75,
      "spo2": 98,
      "temperature": 36.5,
      "gsr": 45,
      "timestamp": "..."
    }
  ],
  "assessments": [...],
  "journals": [...],
  "heroicActivities": [...],
  "heroicScores": [...]
}
```

### Questionnaire Export (CSV)
```csv
ID,Submitted At,Name,Age Range,Gender,SUS Score,TAM Overall,UI/UX Avg,NPS Score,...
doc123,2024-01-01,John Doe,25-34,Male,85,4.2,4.5,9,...
```

---

## 🎨 UI/UX Features

### Design System
- **Colors:**
  - Primary: `#7c3aed` (Purple)
  - Success: `#10b981` (Green)
  - Warning: `#f59e0b` (Orange)
  - Error: `#ef4444` (Red)
  - Info: `#3b82f6` (Blue)

- **Effects:**
  - Glassmorphism cards
  - Animated gradient background
  - Smooth transitions
  - Hover effects
  - Loading states

### Responsive Design
- Mobile-optimized
- Tablet-friendly
- Desktop full-featured

### Accessibility
- Clear labels
- Color-coded badges
- Icon + text buttons
- Confirmation dialogs for destructive actions

---

## ⚠️ Best Practices

### 1. Data Deletion
- **Always confirm** sebelum delete
- **Backup first** jika memungkinkan
- **Irreversible** - tidak bisa di-undo
- Use for: GDPR compliance, test data cleanup

### 2. Export Data
- **Regular backups** untuk research data
- **Before deletion** - export dulu
- **Privacy**: Jangan share exported files sembarangan

### 3. User Management
- **Minimal admin users** - hanya yang diperlukan
- **Monitor admin activity** via logs
- **Revoke access** segera jika tidak diperlukan

### 4. Patient Privacy
- **HIPAA/GDPR Compliance** dalam handling data
- **Minimize access** - hanya view yang diperlukan
- **Secure exports** - encrypt jika perlu

---

## 🐛 Troubleshooting

### "Access Denied" Error
**Penyebab:** User tidak memiliki role `admin`
**Solusi:**
1. Check Firestore → users collection
2. Pastikan field `role: "admin"` exists
3. Re-login setelah update role

### "Loading..." Stuck
**Penyebab:** Firestore connection/permissions issue
**Solusi:**
1. Check browser console for errors
2. Verify Firestore rules deployed
3. Check Firebase project status

### Export Not Working
**Penyebab:** Browser blocking download
**Solusi:**
1. Allow pop-ups untuk domain
2. Check download folder permissions
3. Try different browser

### Modal Not Closing
**Penyebab:** JavaScript error
**Solusi:**
1. Reload page
2. Check browser console
3. Clear cache

---

## 📈 Future Enhancements (Coming Soon)

- [ ] Advanced search & filtering
- [ ] Date range filters
- [ ] Bulk operations (delete multiple, export multiple)
- [ ] Admin activity logs viewer
- [ ] Real-time notifications
- [ ] Data visualization dashboards
- [ ] Automated backup scheduling
- [ ] PDF export reports
- [ ] Email notifications for critical events
- [ ] Two-factor authentication for admin

---

## 📞 Support

Jika ada pertanyaan atau issues:
1. Check dokumentasi ini
2. Check browser console untuk error messages
3. Verify Firestore rules & permissions
4. Contact development team

---

**Last Updated:** 2026-04-02
**Version:** 1.0.0
**Maintainer:** SYNAWATCH Development Team
