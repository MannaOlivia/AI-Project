# LangGraph Integration Guide

## What is LangGraph?

LangGraph is an orchestration framework for building complex AI workflows with:
- **State Management**: Track data through multi-step processes
- **Conditional Routing**: Smart decision-making at each step
- **Error Handling**: Robust failure recovery
- **Visualizable Workflows**: Easy to understand and debug

---

## Why We Added LangGraph

### Before (Direct API Calls):
- ❌ Linear, hard-coded flow
- ❌ Difficult to modify or extend
- ❌ Complex error handling logic
- ❌ Hard to debug

### After (LangGraph):
- ✅ Modular, reusable nodes
- ✅ Easy to add/remove steps
- ✅ Clean conditional logic
- ✅ Clear state transitions
- ✅ Better debugging and testing

---

## Workflow Architecture

Our LangGraph workflow has **8 nodes**:

```
┌─────────────────────┐
│  Check Duplicate    │ (Node 1: Prevent duplicate images)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ Detect Suspicious   │ (Node 2: AI-generated/stock photo detection)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Analyze Vision     │ (Node 3: GPT-4o vision analysis)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Extract Data       │ (Node 4: Structured defect extraction)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Check Policy       │ (Node 5: Match against return policies)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Make Decision      │ (Node 6: Approve/Deny/Manual Review)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Generate Email     │ (Node 7: Auto-draft customer email)
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Save Decision      │ (Node 8: Persist to database)
└─────────────────────┘
```

---

## State Interface

The workflow maintains this state across all nodes:

```typescript
interface ReturnAnalysisState {
  // Input
  requestId: string;
  imageUrl: string | null;
  description: string;
  language: string;
  
  // Analysis Results
  damageType: string;           // manufacturing/user/normal_wear
  defectCategory: string;       // cracked_screen, water_damage, etc.
  confidence: number;           // 0-1
  visionAnalysis: string;       // Full AI analysis text
  
  // Decision
  decision: string;             // approved/denied/manual_review
  decisionReason: string;
  emailDraft: string;
  
  // Metadata
  analysisRound: number;
  error: string | null;
}
```

---

## Key Features

### 1. Conditional Routing
```typescript
function shouldContinue(state: ReturnAnalysisState): string {
  if (state.error) return "end";
  return "continue";
}
```

Duplicate images skip the entire analysis and jump straight to saving the denial.

### 2. Smart Decision Logic

**Automatic Denials:**
- AI-generated images
- Watermarked/stock photos
- User damage
- Normal wear and tear

**Automatic Approvals:**
- Manufacturing defects matching returnable policies

**Manual Review:**
- Low confidence (<0.7)
- Unclear damage type
- No visible defect

### 3. Multi-Round Analysis

If confidence is low on first attempt, the system can request better images and run a second analysis round.

---

## How to Deploy

### Option 1: Deploy via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **"New Function"** or select existing `analyze-return`
3. Copy **ALL 647 lines** from: `supabase/functions/analyze-return-langgraph/index.ts`
4. Paste into Supabase editor
5. Set function name: `analyze-return`
6. Click **"Deploy"**

### Option 2: Deploy via CLI (if available)

```bash
supabase functions deploy analyze-return-langgraph --no-verify-jwt
```

---

## Environment Variables Required

Make sure these are set in **Supabase → Settings → Edge Functions → Secrets**:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key
- `OPENAI_API_KEY`: Your OpenAI API key (for GPT-4o)

---

## Testing the LangGraph Version

### Test 1: User Damage (Should Deny)
1. Upload a cracked screen photo (clearly user damage)
2. Submit return request
3. **Expected**: Denied - "User damage not covered"

### Test 2: Manufacturing Defect (Should Approve)
1. Upload a color defect photo
2. Submit return request
3. **Expected**: Approved - "Manufacturing defect covered"

### Test 3: AI-Generated Image (Should Deny)
1. Upload an AI-generated product image
2. Submit return request
3. **Expected**: Denied - "AI-generated image detected"

### Test 4: Unclear Image (Should Request More Info)
1. Upload a blurry/dark photo
2. Submit return request
3. **Expected**: More info requested - "Need clearer images"

---

## Benefits Over Previous Version

| Feature | Old (Direct API) | New (LangGraph) |
|---------|-----------------|-----------------|
| **Modularity** | ❌ One giant function | ✅ 8 separate nodes |
| **Testability** | ❌ Hard to test parts | ✅ Test individual nodes |
| **Extensibility** | ❌ Complex to add steps | ✅ Just add a node |
| **Error Handling** | ❌ Try-catch everywhere | ✅ State-based error flow |
| **Debugging** | ❌ Hard to trace | ✅ Clear state transitions |
| **Maintenance** | ❌ Spaghetti code | ✅ Clean, readable |

---

## Future Enhancements

With LangGraph, we can easily add:

1. **Human-in-the-Loop**: Pause for manual approval on edge cases
2. **Multi-Agent**: Different agents for different defect types
3. **Retry Logic**: Automatic retries with exponential backoff
4. **A/B Testing**: Run different decision strategies
5. **Parallel Processing**: Analyze multiple images simultaneously
6. **Feedback Loop**: Learn from human corrections

---

## Comparison: Code Before vs After

### Before (320 lines, one function):
```typescript
// Everything in one try-catch
try {
  const result1 = await step1();
  if (result1.error) { /* handle */ }
  
  const result2 = await step2(result1);
  if (result2.error) { /* handle */ }
  
  // ... 300 more lines
} catch (e) { /* catch all */ }
```

### After (647 lines, 8 modular nodes):
```typescript
// Each node is independent and testable
async function step1(state) {
  // Clear, focused logic
  return updatedState;
}

// LangGraph handles orchestration
workflow.addNode("step1", step1);
workflow.addEdge("step1", "step2");
```

---

## Monitoring & Debugging

LangGraph provides better observability:

```typescript
console.log("Current state:", state);
console.log("Node:", "check_duplicate");
console.log("Decision:", state.decision);
```

Each node logs its actions, making it easy to trace the exact point of failure.

---

## Cost Considerations

**API Calls:** Same as before (4-5 OpenAI calls per request)

**LangGraph Overhead:** Minimal (just state management, no extra API calls)

**Net Cost:** ~Same, but **much better value** due to improved reliability and maintainability.

---

## Migration Path

### Step 1: Deploy LangGraph version
Deploy `analyze-return-langgraph` function

### Step 2: Test both versions
Keep old `analyze-return` function as backup

### Step 3: Switch gradually
Update frontend to call new function

### Step 4: Monitor
Compare success rates, errors, and performance

### Step 5: Deprecate old version
Once confident, remove old function

---

## Need Help?

- **LangGraph Docs**: https://langchain-ai.github.io/langgraphjs/
- **OpenAI API**: https://platform.openai.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

**You now have a production-ready, enterprise-grade AI workflow!** 🚀

