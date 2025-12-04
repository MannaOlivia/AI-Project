# Setup Guide for Friends - Auto Return Agent

Follow these steps to run this project on your computer.

---

## Prerequisites

Before starting, make sure you have:
- ✅ Git installed
- ✅ Node.js (v18 or higher) installed
- ✅ A code editor (VS Code, Cursor, etc.)

---

## Step 1: Clone the Repository

1. Open your terminal/command prompt
2. Navigate to where you want the project:
   ```bash
   cd Desktop
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/MannaOlivia/AI-Project.git
   ```
4. Navigate into the project:
   ```bash
   cd AI-Project
   cd autoreturnagent-main
   ```

---

## Step 2: Install Dependencies

Run this command:
```bash
npm install
```

Wait for it to complete (takes 1-2 minutes).

---

## Step 3: Get Supabase Credentials from Me

**Ask me (MannaOlivia) for:**
- Supabase Project URL
- Supabase API Key

I'll send you something like:
```
URL: https://xxxxxxx.supabase.co
API Key: eyJhbGc...
```

---

## Step 4: Create .env File

1. In the `autoreturnagent-main` folder, create a new file named `.env`
2. Add these lines (using the credentials I sent you):

```env
VITE_SUPABASE_URL=https://xqzxaqtgrxbdutxfjehi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxenhhcXRncnhiZHV0eGZqZWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODYyNDcsImV4cCI6MjA4MDM2MjI0N30.MwvxqmkzM-Z56uOqqYfnGrhTmLSB1JUWpJ-kAIChzOM
```

3. Save the file

---

## Step 5: Run the Project

```bash
npm run dev
```

You should see:
```
VITE v5.4.19  ready in 730 ms
➜  Local:   http://localhost:8080/
```

---

## Step 6: Open in Browser

1. Open your browser
2. Go to: **http://localhost:8080/**
3. You should see the login page

---

## Step 7: Create an Account or Login

### Option 1: Use Admin Quick Login (Testing)
- Click the blue **"👑 Login as Admin (Quick Access)"** button
- Instant access to admin features

### Option 2: Create Your Own Account
1. Click **"Sign Up"** tab
2. Enter any email and password
3. You'll be created as a regular user

### Option 3: Login with Existing Accounts
**Ask me for credentials** if you want to test specific roles:
- Admin account
- User account with sample orders

---

## What You Can Do:

### As Admin:
- View ALL return requests from all users
- Manage return policies
- See analytics
- Review manual cases
- Import orders

### As Regular User:
- Submit return requests with product images
- Upload photos for AI analysis
- Track your own returns
- View your orders

---

## Troubleshooting

### "Failed to send request to Edge Function"
- This is normal - the AI analysis function needs to be deployed
- You can still see the UI and database features
- Contact MannaOlivia if you need full AI functionality

### "No orders found"
- Orders need to be assigned to your account
- Login once, then ask MannaOlivia to run the order assignment

### Server won't start
- Make sure you're in the `autoreturnagent-main` folder
- Check that `.env` file exists with correct credentials
- Try `npm install` again

### Port 8080 already in use
- Change the port in `vite.config.ts`
- Or stop other apps using port 8080

---

## Project Features

This AI-powered return management system includes:
- 🤖 OpenAI GPT-4o vision analysis
- 📸 Image-based defect detection
- ✅ Automated approve/deny decisions
- 📧 Auto-generated customer emails
- 📊 Real-time admin dashboard
- 🔍 Fraud detection (AI-generated images, stock photos)
- ⚖️ Policy-based decision making

---

## Need Help?

Contact: **MannaOlivia** (project owner)

GitHub Issues: https://github.com/MannaOlivia/AI-Project/issues

---

Enjoy exploring the Auto Return Agent! 🚀

