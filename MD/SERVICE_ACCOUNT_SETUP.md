# Service Account Setup Guide

## 🎯 Overview

Menggunakan **Firebase Service Account** untuk:
- ✅ Setup admin users programmatically
- ✅ Create & manage API keys securely
- ✅ Initialize database structure
- ✅ Automated tasks & maintenance

---

## 📋 Step 1: Download Service Account Key

### 1.1 Firebase Console

1. Buka: https://console.firebase.google.com/project/synawacth-id/settings/serviceaccounts/adminsdk

2. Klik **"Generate New Private Key"**
   - File akan download: `synawacth-id-firebase-adminsdk-xxxxx.json`

3. **Simpan file dengan aman:**
   ```bash
   mv ~/Downloads/synawacth-id-*.json /c/Users/mosto/Desktop/SYNAWATCH/serviceAccountKey.json
   ```

### 1.2 Security

⚠️ **PENTING:**
- ❌ JANGAN push file ke Git!
- ❌ JANGAN share dengan orang lain
- ✅ Keep in `.gitignore`
- ✅ Use environment variables untuk production

```bash
# Add to .gitignore
echo "serviceAccountKey.json" >> /c/Users/mosto/Desktop/SYNAWATCH/.gitignore
```

---

## 🚀 Step 2: Install Dependencies

```bash
cd /c/Users/mosto/Desktop/SYNAWATCH

# Install firebase-admin
npm install
```

---

## 📝 Step 3: Setup Admin User

### Command:
```bash
node setup-admin.js setup-admin your-email@example.com
```

### Example:
```bash
node setup-admin.js setup-admin mosto@synawatch.dev
```

### Output:
```
✓ Found user: mosto@synawatch.dev (UID: abc123...)
✓ Added admin role to Firestore
✓ Set custom auth claim: admin=true

✅ Admin setup complete!
   Email: mosto@synawatch.dev
   UID: abc123...
   Role: admin
```

### After Setup:
1. **Logout & Login ulang** di aplikasi
2. **Buka Admin Panel:** https://synawacth-id.web.app/#/admin
3. Dashboard dengan 4 tabs muncul ✅

---

## 🔑 Step 4: Create API Keys

### Command:
```bash
node setup-admin.js create-api-key <name> <service> [quota]
```

### Examples:

**Create Gemini Chat Key:**
```bash
node setup-admin.js create-api-key gemini-prod Gemini 100000
```

**Create ElevenLabs TTS Key:**
```bash
node setup-admin.js create-api-key elevenlabs-prod ElevenLabs 50000
```

**Create Custom Service Key:**
```bash
node setup-admin.js create-api-key my-service Custom 200000
```

### Output:
```
✓ API Key created: doc-id-xxx
   Name: gemini-prod
   Service: Gemini
   Quota: 100,000 calls/month
   Key: ABCDEFGHxxxx
   Secret: XYZxxxxx

✅ API Key ready to use!
```

---

## 👥 Step 5: List All Users

### Command:
```bash
node setup-admin.js list-users
```

### Output:
```
👥 Users in Database:

1. mosto@example.com
   UID: abc123...
   Role: admin
   Created: 3/25/2026

2. user2@example.com
   UID: xyz789...
   Role: user
   Created: 3/24/2026

✅ Total users: 2
```

---

## ⚙️ Step 6: Initialize Database

First time setup:

```bash
node setup-admin.js init-db
```

Creates:
- `system/stats` collection
- `apiKeys` collection
- `users` collection

---

## 🎯 Complete Setup Workflow

```bash
# 1. Install dependencies
npm install

# 2. Setup first admin user
node setup-admin.js setup-admin your-email@example.com

# 3. Create API keys
node setup-admin.js create-api-key gemini-prod Gemini 100000
node setup-admin.js create-api-key elevenlabs-prod ElevenLabs 50000

# 4. Verify setup
node setup-admin.js list-users

# 5. Login & access admin panel
# https://synawacth-id.web.app/#/admin
```

---

## 📊 What Gets Created

### Admin User (Firestore)
```javascript
users/{uid} = {
  email: "admin@example.com",
  role: "admin",
  setupAt: Timestamp(...),
  onboardingCompleted: true
}
```

### API Key (Firestore)
```javascript
apiKeys/{docId} = {
  name: "gemini-prod",
  service: "Gemini",
  key: "ABCDEFGHIJKLMNOP...",
  secret: "XYZZZZZZZZZZZ...",
  quota: 100000,
  used: 0,
  status: "active",
  createdAt: Timestamp(...),
  lastUsed: null,
  history: []
}
```

---

## 🔒 Security Best Practices

### Local Development
```bash
# Setup admin
node setup-admin.js setup-admin dev@example.com

# Create test key
node setup-admin.js create-api-key gemini-test Gemini 10000
```

### Production
1. **Store service account key securely**
   - Use environment variable: `FIREBASE_SERVICE_ACCOUNT`
   - Or CI/CD secrets management

2. **Rotate admin credentials**
   - Change passwords regularly
   - Monitor admin activities

3. **API Key Security**
   - Use separate keys per service
   - Rotate high-risk keys every 30 days
   - Enable audit logging

---

## 🐛 Troubleshooting

### Error: "serviceAccountKey.json not found"
```bash
# Download from Firebase Console and save at project root
https://console.firebase.google.com/project/synawacth-id/settings/serviceaccounts/adminsdk
```

### Error: "User not found"
```bash
# User must exist in Firebase Auth first
# Signup user in app or create via Firebase Console
```

### Error: "Permission denied"
```bash
# Ensure service account has Firestore permissions
# Check Firebase Console → IAM & Admin
```

### Can't find setup-admin.js
```bash
# Make sure you're in project root
cd /c/Users/mosto/Desktop/SYNAWATCH
ls -la setup-admin.js
```

---

## 📚 Additional Commands

### Help
```bash
node setup-admin.js help
```

### Setup Custom Quota
```bash
node setup-admin.js create-api-key my-key MyService 500000
```

### Bulk Import Users (Future)
```bash
# Script to import users from CSV
# node setup-admin.js import-users users.csv
```

---

## ✅ Verification Checklist

After setup:

- [ ] Service account key downloaded and saved
- [ ] Admin user created successfully
- [ ] API keys created for each service
- [ ] Can login to https://synawacth-id.web.app
- [ ] Admin panel accessible at /#/admin
- [ ] API keys visible in Admin Dashboard
- [ ] Users list shows in Admin Panel
- [ ] Can create new API keys from Admin UI

---

## 🚀 Next Steps

After admin setup:

1. **Create API Keys for services:**
   - Gemini Chat
   - ElevenLabs TTS
   - Firebase Admin
   - Custom services

2. **Setup rotation schedule:**
   - 30 days for production keys
   - 60-90 days for non-critical keys

3. **Monitor usage:**
   - Check Admin Dashboard daily
   - Set up quota alerts

4. **Document keys:**
   - Keep secure record of all keys
   - Document rotation schedule

---

## 📞 Support

For issues:
1. Check error message
2. Verify service account permissions
3. Check Firebase Console logs
4. Review troubleshooting section above

---

**Last Updated:** March 2026
**Version:** 1.0.0
