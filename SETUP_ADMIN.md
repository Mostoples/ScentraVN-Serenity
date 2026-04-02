# 🔐 Panduan Setup Admin User - SYNAWATCH

## 🎯 Ringkasan

Ada **4 metode** untuk menambahkan admin ke sistem SYNAWATCH. Pilih yang paling sesuai dengan kebutuhan Anda.

---

## ✅ **Metode 1: Via Setup Page** (Paling Mudah & Direkomendasikan) ⭐

### Langkah:

1. **Buka halaman setup:**
   ```
   http://localhost:3000/setup-admin-user.html
   ```

2. **Pilih salah satu dari 2 opsi:**

   **Opsi A: Buat Admin Baru**
   - Isi form:
     - Email admin (contoh: `admin@synawatch.com`)
     - Password (minimal 6 karakter)
     - Nama admin
   - Klik **"Buat Admin Baru"**
   - Done! ✅

   **Opsi B: Upgrade User Existing**
   - Cari user yang sudah terdaftar
   - Klik user yang ingin di-upgrade
   - Klik **"Upgrade ke Admin"**
   - Done! ✅

### Kelebihan:
- ✅ User-friendly interface
- ✅ Tidak perlu coding
- ✅ Visual feedback
- ✅ Error handling yang jelas
- ✅ Bisa search user existing

---

## ✅ **Metode 2: Via Firebase Console** (Manual)

### Langkah:

1. Buka **Firebase Console**:
   ```
   https://console.firebase.google.com/
   ```

2. Pilih project: **synawacth-id**

3. Klik **Firestore Database** di sidebar

4. Buka collection **`users`**

5. **Cari user** yang ingin dijadikan admin (berdasarkan email/ID)

6. Klik document user tersebut untuk edit

7. **Tambahkan/Edit field:**
   ```
   Field: role
   Type: string
   Value: admin
   ```

8. Klik **Save**

9. **Done!** User sekarang admin ✅

### Kelebihan:
- ✅ Tidak perlu login ke app
- ✅ Direct access ke database
- ✅ Bisa edit multiple fields sekaligus

### Screenshot:
```
Firestore Database
└── users
    └── abc123xyz (user ID)
        ├── email: "user@example.com"
        ├── name: "User Name"
        ├── role: "admin"  ← ADD THIS
        └── createdAt: Timestamp
```

---

## ✅ **Metode 3: Via Browser Console** (Developer)

### Langkah:

1. **Login** ke SYNAWATCH terlebih dahulu:
   ```
   http://localhost:3000/auth.html
   ```

2. **Buka Developer Console:**
   - Windows/Linux: `Ctrl + Shift + J` atau `F12`
   - Mac: `Cmd + Option + J`

3. **Copy-paste script ini:**

   ```javascript
   // Untuk current user (diri sendiri)
   const userId = auth.currentUser.uid;
   console.log('Setting admin for user:', userId);

   await db.collection('users').doc(userId).update({
       role: 'admin',
       roleUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
   });

   console.log('✅ You are now an admin!');
   ```

   **Atau untuk user lain (by email):**
   ```javascript
   // Cari user by email
   const email = 'user@example.com'; // GANTI INI

   const snapshot = await db.collection('users')
       .where('email', '==', email)
       .get();

   if (snapshot.empty) {
       console.error('❌ User not found!');
   } else {
       const userId = snapshot.docs[0].id;
       await db.collection('users').doc(userId).update({
           role: 'admin',
           roleUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
       });
       console.log('✅ User is now admin:', email);
   }
   ```

4. **Tekan Enter**

5. **Refresh halaman** dan akses `admin.html`

### Kelebihan:
- ✅ Quick & easy untuk developer
- ✅ Bisa bulk update multiple users
- ✅ Flexible scripting

---

## ✅ **Metode 4: Via Existing Admin Dashboard**

Jika **sudah ada admin**, admin lain bisa ditambahkan via admin dashboard:

### Langkah:

1. **Login sebagai admin** dan buka:
   ```
   http://localhost:3000/admin.html
   ```

2. Klik tab **"Users"**

3. Cari user yang ingin di-upgrade

4. **Change role dropdown** dari `user` → `admin`

5. Done! ✅

### Kelebihan:
- ✅ Built-in admin dashboard
- ✅ No need external tools
- ✅ Audit trail

---

## 🧪 **Testing Admin Access**

Setelah membuat admin, test dengan cara:

### 1. Login as Admin
```
http://localhost:3000/auth.html
```
Login dengan email admin yang baru dibuat

### 2. Access Admin Dashboard
```
http://localhost:3000/admin.html
```

### 3. Verify Access
Jika berhasil, Anda akan melihat:
- ✅ Dashboard dengan statistics
- ✅ Tabs: Dashboard, Users, Patient Data, Questionnaires
- ✅ No "Access Denied" error

### Jika Gagal (Access Denied):
1. **Check Firestore** → pastikan field `role: "admin"` exists
2. **Logout dan login ulang**
3. **Clear browser cache**
4. **Check console** untuk error messages

---

## 🔒 **Security Notes**

### Admin Role Permissions:
```javascript
// Di firestore.rules
function isAdmin() {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### Admin dapat:
- ✅ Read semua user data
- ✅ Read semua patient data (health readings, assessments, etc)
- ✅ Read semua questionnaire responses
- ✅ Manage API keys
- ✅ Change user roles
- ✅ Disable/enable users
- ✅ Export data
- ✅ Delete data

### Best Practices:
1. **Minimal admin users** - hanya yang diperlukan
2. **Strong passwords** - gunakan password manager
3. **2FA recommended** - aktifkan jika tersedia
4. **Regular audit** - review admin activities
5. **Revoke access** - segera jika admin tidak diperlukan

---

## 🚨 **Troubleshooting**

### Problem: "Access Denied" setelah set admin role

**Solusi:**
1. Logout dari app
2. Clear browser cache & cookies
3. Login ulang
4. Verify di Firestore: field `role: "admin"` exists
5. Try incognito/private window

### Problem: "User not found" di setup page

**Solusi:**
1. Pastikan sudah login terlebih dahulu
2. Check Firebase Console → Authentication → ada user atau tidak
3. Reload page dan try again

### Problem: Setup page stuck loading

**Solusi:**
1. Check browser console untuk errors
2. Verify Firebase config di `js/config.js`
3. Check internet connection
4. Try different browser

### Problem: Can't create new admin (email already exists)

**Solusi:**
- Gunakan **"Upgrade User Existing"** method di setup page
- Atau update via Firebase Console
- Atau via browser console script

---

## 📝 **Quick Reference**

### Current Admin Check (Console):
```javascript
const user = auth.currentUser;
const doc = await db.collection('users').doc(user.uid).get();
console.log('Current role:', doc.data().role);
```

### List All Admins (Console):
```javascript
const snapshot = await db.collection('users').where('role', '==', 'admin').get();
console.log('Total admins:', snapshot.size);
snapshot.forEach(doc => {
    const data = doc.data();
    console.log('Admin:', data.email, '-', data.name);
});
```

### Remove Admin Role (Console):
```javascript
const userId = 'USER_ID_HERE';
await db.collection('users').doc(userId).update({
    role: 'user'
});
console.log('Admin role removed');
```

---

## 📊 **Comparison Table**

| Metode | Difficulty | Speed | Best For |
|--------|-----------|-------|----------|
| **Setup Page** | ⭐ Easy | ⚡ Fast | Non-technical users |
| **Firebase Console** | ⭐⭐ Medium | ⚡⚡ Medium | Direct database access |
| **Browser Console** | ⭐⭐⭐ Advanced | ⚡⚡⚡ Fastest | Developers |
| **Admin Dashboard** | ⭐ Easy | ⚡ Fast | Existing admins |

---

## 🎯 **Rekomendasi**

### Untuk First-Time Setup:
→ Gunakan **Setup Page** (`setup-admin-user.html`)

### Untuk Quick Testing:
→ Gunakan **Browser Console** dengan script

### Untuk Production:
→ Gunakan **Firebase Console** untuk security

### Untuk Regular Operations:
→ Gunakan **Admin Dashboard** (after first admin exists)

---

## 📞 **Need Help?**

Jika masih kesulitan:
1. Check `ADMIN_GUIDE.md` untuk dokumentasi lengkap
2. Review firestore.rules untuk permission issues
3. Check Firebase Console → Authentication & Firestore
4. Clear cache & try incognito mode
5. Contact development team

---

**Created:** 2026-04-02
**Updated:** 2026-04-02
**Version:** 1.0.0
