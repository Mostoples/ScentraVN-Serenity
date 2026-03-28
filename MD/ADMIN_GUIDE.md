# SynaWatch Admin Dashboard - Complete Guide

## 📊 Overview

The Admin Dashboard is a comprehensive management system for **API Keys**, **Users**, and **System Settings**. Only users with the `admin` role can access this panel.

**Access URL:** `/#/admin`

---

## 🔐 Admin Features

### 1. **Dashboard Tab** (Monitoring & Analytics)

#### Key Metrics
- **Total Users**: Total registered users in the system
- **API Calls**: Total API calls made (tracks usage across all services)
- **System Uptime**: Current system availability (target: 99.9%)
- **Active API Keys**: Number of active (not disabled) API keys

#### Recent Activity Log
- Real-time activity monitoring
- Tracks: API calls, key rotations, user logins, system checks
- Shows timestamp and status for each activity

---

### 2. **API Keys Tab** (Management & Rotation)

#### Create New API Key
- **Name**: Descriptive name (e.g., "Gemini Production")
- **Service**: Select from predefined services:
  - Gemini Chat
  - ElevenLabs TTS
  - Firebase
  - Custom Service
- **Monthly Quota**: API call limit (default: 100,000)

#### API Key Management Actions

**View Key Details:**
- Masked key (first 8 + last 4 characters for security)
- Service type
- Status (Active, Disabled, Expired)
- Creation date
- Last used timestamp

**For Active Keys:**
- ✅ **Rotate** - Generate new key/secret pair, invalidate old key
  - Useful when: Quota depleting, key exposed, scheduled rotation
  - Old key stored in history with timestamp

- ✅ **Disable** - Temporarily disable key without deletion
  - API calls using this key will fail
  - Can be re-enabled later

- ✅ **Delete** - Permanently remove key (cannot be undone)

**Quota Monitoring:**
- Visual quota bar showing usage percentage
- Color-coded: Green (normal), Red (>80% usage)
- Automatic alerts when approaching limit

#### Key Features
- **Secure Storage**: Keys stored in Firestore, never exposed in frontend
- **Rotation History**: Every rotation tracked with timestamp and old key reference
- **Usage Tracking**: Last used timestamp and total usage count
- **Audit Trail**: All actions logged for compliance

---

### 3. **Users Tab** (User Management & Permissions)

#### User List
Shows all registered users with:
- Email/Username
- User ID (first 10 chars for identification)
- Current role
- Account status

#### User Management Actions

**Change User Role:**
- **User** - Regular user (default access to app)
- **Admin** - Full admin access (can manage API keys, users, system)

**Account Status:**
- ✅ **Disable** - Lock account, prevent login (user is notified)
- ✅ **Enable** - Unlock previously disabled account

#### Use Cases
- Promote trusted users to admin role
- Disable accounts for inactive users
- Manage access based on user tier or privileges

---

### 4. **Settings Tab** (System Configuration)

#### API Key Rotation Policy
Configure automatic key rotation schedule:

| Option | Frequency | Use Case |
|--------|-----------|----------|
| 30 days | Monthly | High-security environments, prod keys |
| 60 days | Quarterly | Standard rotation for most services |
| 90 days | Tri-annual | Low-risk services, stable keys |
| Manual | Never | Special cases, manual rotation only |

**Implementation Notes:**
- System will send notifications 7 days before auto-rotation
- Automatic rotation happens at midnight UTC
- New key generated, old key disabled (not deleted)
- Detailed logs stored for audit trail

#### Other Planned Settings
- Quota adjustment policies
- API rate limiting thresholds
- Activity logging level (verbose, normal, minimal)
- Backup and recovery settings

---

## 🔑 API Key Management Best Practices

### Security Guidelines

1. **Rotation Schedule**
   - Rotate high-risk keys (Gemini Chat, TTS) every 30 days
   - Rotate low-risk keys (Firebase) every 90 days
   - Immediate rotation if key is exposed

2. **Quota Management**
   - Set quota based on expected monthly usage
   - Add 20% buffer for traffic spikes
   - Monitor usage trends to predict future needs

3. **Key Naming Convention**
   ```
   [Service]-[Environment]-[Version]

   Examples:
   - gemini-prod-v1
   - elevenlabs-staging-v1
   - firebase-backup-v2
   ```

4. **Access Control**
   - Only share keys with authorized services
   - Use separate keys for different environments
   - Never commit keys to git (use environment variables)

### Monitoring & Alerts

The system tracks:
- **Quota Usage**: Alert at 80% usage
- **Anomalies**: Unusual spike in API calls (possible compromised key)
- **Rotation**: Automatic reminders 7 days before rotation
- **Usage Patterns**: Detailed logs of when and how keys are used

---

## 📋 Managing Gemini Chat API

### Current Setup
- **Service**: Google Gemini API (gemini-1.5-flash-8b)
- **Current Key**: `gemini-prod-v1`
- **Default Quota**: 100,000 calls/month

### Recommended Rotation Schedule
- **Frequency**: Every 30 days (production)
- **Next Rotation**: [Calculate from creation date]
- **Rotation History**: Maintained in admin panel

### Quota Recommendations
Based on expected usage:
- 50 concurrent users = ~150,000 calls/month
- 100 concurrent users = ~300,000 calls/month
- 500 concurrent users = ~1,500,000 calls/month

### Fallback Strategy
If Gemini quota exceeded:
1. Check Alternative APIs (Claude API, etc.)
2. Implement rate limiting
3. Queuer system for pending requests
4. User notification (graceful degradation)

---

## 🚀 Admin Workflows

### Workflow 1: Regular API Key Rotation

```
1. Open Admin Dashboard → API Keys Tab
2. Find key due for rotation (check "Last Used" date)
3. Click "Rotate" button
4. Confirm rotation (old key will be disabled)
5. New key generated automatically
6. Deployment teams notified to update .env files
7. Old key stored in history for 90 days
```

**Time Required:** 5 minutes

### Workflow 2: Monitor Quota Usage

```
1. Open Admin Dashboard → Dashboard Tab
2. Check "API Calls" metric
3. Open API Keys Tab
4. Review quota bar for each key
5. If >80% usage:
   a. Identify peak usage patterns
   b. Consider increasing quota
   c. Or rotate key to reset counter
```

**Frequency:** Weekly recommended

### Workflow 3: Onboard New Service

```
1. Admin Dashboard → API Keys Tab
2. Click "Create New API Key"
3. Fill in:
   - Name: "service-name-v1"
   - Service: Select or "Custom"
   - Quota: Based on expected usage
4. Click "Create Key"
5. New key displayed (copy to clipboard)
6. Share with service team securely
7. Service team updates their config
8. Test integration
9. Monitor usage in dashboard
```

**Time Required:** 10-15 minutes

### Workflow 4: Manage User Roles

```
1. Admin Dashboard → Users Tab
2. Find user to modify
3. Click role dropdown
4. Select: User, Admin, or Custom
5. Changes take effect immediately
6. User receives notification (if enabled)
```

**Time Required:** 1 minute per user

---

## ⚠️ Important Notes

### Security Considerations
- ❌ Never share API keys publicly
- ❌ Never commit keys to git repository
- ✅ Store in environment variables
- ✅ Use separate keys per environment
- ✅ Rotate regularly (30-90 days)
- ✅ Monitor for unusual activity

### Limitations
- Keys are one-way hashed in storage
- Cannot retrieve previously issued keys
- Only partial key visible for security
- Admin role required for all operations

### Support & Troubleshooting

**Q: Key appears expired but still works?**
- Status updates after 24 hours of inactivity
- Check "Last Used" timestamp

**Q: How to reset quota counter?**
- Rotate the key to get fresh quota allocation
- Or contact system admin for manual reset

**Q: Can I recover a deleted key?**
- No, deleted keys cannot be recovered
- Keep audit logs for historical reference

---

## 📊 API Key Analytics

The admin panel tracks:

1. **Usage Patterns**
   - Hourly API call distribution
   - Peak usage times
   - Service-specific trends

2. **Performance Metrics**
   - Average response time per service
   - Success/error rates
   - Timeout frequencies

3. **Cost Tracking** (future feature)
   - Cost per API call
   - Monthly spending by service
   - Quota optimization recommendations

---

## 🔄 API Key Rotation Automation

**Planned Feature:** Automatic rotation based on schedule

### How It Works
```
Every night at 2:00 AM UTC:
1. Check which keys are due for rotation
2. Generate new key/secret pair
3. Update database with new key
4. Disable old key (keep in history)
5. Notify admin & service owners
6. Log rotation event
```

### Configuration
- Set in Settings Tab
- Supports: 30/60/90 day intervals
- Manual option to skip automation

---

## 📞 Getting Help

- **Admin Panel Issues**: Check browser console (F12)
- **API Key Problems**: Review usage logs in dashboard
- **System Errors**: Contact support with error message and timestamp
- **Feature Requests**: Submit through GitHub issues

---

**Last Updated:** March 2026
**Version:** 1.0.0
**Next Review:** June 2026
