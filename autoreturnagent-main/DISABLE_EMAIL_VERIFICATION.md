# Disable Email Verification for Dev Mode

## Steps to Disable Email Verification in Supabase:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/xqzxaqtgrxbdutxfjehi

2. **Click "Authentication"** in left sidebar

3. **Click "Providers"** 

4. **Find "Email" provider** and click on it

5. **Disable these settings**:
   - ❌ Uncheck "Confirm email"
   - ❌ Uncheck "Secure email change"
   - ❌ Uncheck "Enable email confirmations"

6. **Click "Save"**

## Now Users Can:
- ✅ Sign up with ANY email format (even test@test)
- ✅ No email verification required
- ✅ Instant access after signup
- ✅ System only checks if user already exists

## Testing:
Try signing up with:
- `admin@test` 
- `user@test`
- `anyname@anything`

All formats will work!

