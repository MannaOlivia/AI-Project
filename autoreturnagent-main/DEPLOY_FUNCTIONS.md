# Deploy Edge Functions to Supabase

Since Supabase CLI isn't installed, you can deploy functions directly through the Supabase Dashboard.

## Method 1: Deploy via Supabase Dashboard

### 1. Create `analyze-return` Function

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **MannaOlivia's Project**
3. Click **"Edge Functions"** in the left sidebar
4. Click **"Create a new function"**
5. Function name: `analyze-return`
6. Copy the entire content from: `supabase/functions/analyze-return/index.ts`
7. Paste it into the editor
8. Click **"Deploy"** or **"Save"**

### 2. Verify Environment Variables

Make sure you've added the OpenAI API key in:
- **Settings** → **Edge Functions** → **Secrets**
- Name: `OPENAI_API_KEY`
- Value: Your OpenAI API key

### 3. Test the Function

After deployment:
1. Go back to your app: http://localhost:8080/
2. Try submitting a return request with an image
3. The AI should now analyze it using OpenAI GPT-4o

---

## Method 2: Install Supabase CLI (Alternative)

If you want to use CLI for future deployments:

### Install via NPX (No global install needed):

```bash
# Navigate to project directory
cd autoreturnagent-main

# Deploy function using npx
npx supabase login
npx supabase link --project-ref xqzxaqtgrxbdutxfjehi
npx supabase functions deploy analyze-return
```

---

## Troubleshooting

### If you get "Function not found" error:
- Make sure the function name is exactly `analyze-return`
- Check that it's deployed (you should see it in the Edge Functions list)

### If you get "Authorization" error:
- Make sure you're logged in to the app
- Check that OPENAI_API_KEY is set in Supabase secrets

### If analysis takes too long:
- OpenAI API might be slow
- Check Supabase Function logs for errors

---

## Function Files to Deploy:

You have 3 edge functions in your project:

1. **analyze-return** (REQUIRED for returns) - Already has OpenAI integration
2. **import-orders** (Optional) - For bulk importing orders
3. **assign-orders** (Optional) - For assigning orders to users

For now, you only need `analyze-return` deployed to make the app work.


