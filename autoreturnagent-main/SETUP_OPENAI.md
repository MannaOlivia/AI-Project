# OpenAI Integration Setup Guide

This project now uses OpenAI GPT-4o for AI-powered return analysis.

## Environment Variables Required

### For Supabase Functions:
You need to set the `OPENAI_API_KEY` in your Supabase project:

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions Settings:**
   - Go to: Project Settings → Edge Functions → Secrets

3. **Add the OpenAI API Key:**
   - Click "New Secret"
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-proj-...`)
   - Click "Save"

### For Local Development:
If testing functions locally with Supabase CLI:

1. Create `.env` file in `supabase/.env`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

2. The `.env` file is already in `.gitignore` so it won't be committed

## What Was Changed

The following API calls now use OpenAI GPT-4o instead of Google Gemini:

1. **Suspicious Image Detection** - Detects AI-generated/stock photos
2. **Vision Analysis** - Analyzes product defects from images
3. **Structured Data Extraction** - Extracts defect categories and confidence
4. **Email Generation** - Creates customer service email drafts

All using: `gpt-4o` model via `https://api.openai.com/v1/chat/completions`

## Deploying Changes

To deploy the updated functions to Supabase:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy analyze-return
```

## Security Notes

⚠️ **NEVER commit your API key to Git**
⚠️ **Keep your `.env` files private**
⚠️ **Rotate your API key if accidentally exposed**

## Testing

After deployment, test the return analysis feature:
1. Go to Customer Portal
2. Submit a return request with an image
3. The AI will analyze using OpenAI GPT-4o

## API Usage & Costs

OpenAI charges per token. Monitor usage at:
https://platform.openai.com/usage

Estimated costs:
- Image analysis: ~$0.01-0.05 per request
- Text generation: ~$0.001-0.01 per request



