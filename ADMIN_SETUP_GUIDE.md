# Admin Role Setup Guide

## Current Implementation

The application currently uses **email-based admin verification** as a security measure. Admin emails are checked from environment variables against the authenticated user's email.

### Environment Setup
Add admin emails to your `.env.local` or `.env` file:
```bash
NEXT_PUBLIC_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## Recommended: Firebase Custom Claims (Future Enhancement)

For better security and scalability, implement Firebase Custom Claims for role-based access control.

### Step 1: Create Admin Script

Create `scripts/set-admin-claim.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✓ Admin claim set for ${email}`);
  } catch (error) {
    console.error(`✗ Error setting admin claim:`, error);
  }
}

// Set admin claims for specific users
const adminEmails = [
  'zestacademyonline@gmail.com',
  'ramunarlapati27@gmail.com'
];

Promise.all(adminEmails.map(setAdminClaim))
  .then(() => {
    console.log('All admin claims set successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
```

### Step 2: Run the Script

```bash
node scripts/set-admin-claim.js
```

### Step 3: Update API Routes

Uncomment the custom claims verification in API routes:

**app/api/admin/update-password/route.ts**:
```typescript
// Replace the email check with:
const userRecord = await adminAuth.getUser(decodedToken.uid);
if (!userRecord.customClaims?.admin) {
    return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
    );
}
```

**app/api/admin/delete-user/route.ts**:
```typescript
// Same as above
```

### Step 4: Update Firestore Rules

Update `firestore.rules` to use custom claims:

```javascript
function isAdmin() {
  return isAuthenticated() && request.auth.token.admin === true;
}
```

### Step 5: Update Frontend

The frontend already handles custom claims in `context/AuthContext.tsx`. Custom claims are automatically included in the Firebase ID token.

## Security Benefits of Custom Claims

1. **Server-Side Validation**: Claims are set server-side and cannot be manipulated by clients
2. **Included in Token**: Claims are part of the JWT, no extra database lookup needed
3. **Automatic Refresh**: Claims are automatically refreshed with token refresh
4. **Revocable**: Claims can be removed to instantly revoke admin access
5. **Scalable**: Easy to add more roles (moderator, hod, etc.)

## Migration Checklist

- [ ] Set up Firebase Admin SDK with service account
- [ ] Create and run admin claim script
- [ ] Verify claims are set (check Firebase Console > Authentication > Users)
- [ ] Update API route authentication logic
- [ ] Update Firestore rules
- [ ] Test with admin and non-admin accounts
- [ ] Remove email-based fallback after verification
- [ ] Update .env.example to remove NEXT_PUBLIC_ADMIN_EMAILS
- [ ] Document the new process in README

## Testing Custom Claims

```typescript
// Test in browser console after login:
firebase.auth().currentUser.getIdTokenResult()
  .then((idTokenResult) => {
    console.log('Claims:', idTokenResult.claims);
    console.log('Is Admin:', idTokenResult.claims.admin === true);
  });
```

## Additional Role Examples

```javascript
// Set HOD claim
await admin.auth().setCustomUserClaims(user.uid, { 
  admin: false, 
  hod: true, 
  department: 'Computer Science' 
});

// Set Faculty claim
await admin.auth().setCustomUserClaims(user.uid, { 
  admin: false,
  faculty: true,
  department: 'Electronics'
});

// Set Student claim (usually not needed, default)
await admin.auth().setCustomUserClaims(user.uid, { 
  admin: false,
  student: true,
  year: 2,
  branch: 'EEE'
});
```

## Troubleshooting

### Claims not working?
1. Check if custom claims are actually set in Firebase Console
2. Sign out and sign in again (tokens need refresh)
3. Check token expiry (tokens expire after 1 hour)
4. Verify Firestore rules are updated

### User sees old permissions?
- Force token refresh:
  ```typescript
  await firebase.auth().currentUser.getIdToken(true);
  ```

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never set claims from client-side**: Always use Firebase Admin SDK on server
2. **Validate claims on every request**: Don't cache admin status client-side
3. **Use HTTPS only**: Claims are in JWT, must be transmitted securely
4. **Rotate service account keys**: Regularly rotate Firebase service account keys
5. **Audit admin actions**: Log all admin operations for compliance
6. **Implement least privilege**: Only grant necessary permissions

## References

- [Firebase Custom Claims Documentation](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firebase Security Rules with Custom Claims](https://firebase.google.com/docs/rules/rules-and-auth)
- [Best Practices for Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims#best_practices_for_custom_claims)
