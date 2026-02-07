
# 🔐 Fixing Firebase Permissions Error

The error `FirebaseError: Missing or insufficient permissions` means your Firestore Security Rules are blocking access.

## Solution 1: Deploy Security Rules (Recommended)

Run this command in your terminal to deploy the rules we created:

```bash
firebase deploy --only firestore:rules
```

## Solution 2: Update Rules in Firebase Console

If you can't use the CLI, go to **[Firebase Console](https://console.firebase.google.com/)** > **Build** > **Firestore Database** > **Rules** tab.

**For Development (Allow logged-in users):**
Copy and paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**For Production (Use our defined roles):**
Copy the content from `c:\website\ALIET-ATTENDANCE\firestore.rules` and paste it into the console.

## Solution 3: Realtime Database Rules

Don't forget Realtime Database! Go to **Build** > **Realtime Database** > **Rules**.

**Dev Mode:**
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```
