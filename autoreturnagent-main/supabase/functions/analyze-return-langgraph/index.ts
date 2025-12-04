// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { StateGraph, END } from "https://esm.sh/@langchain/langgraph";
import { ChatOpenAI } from "https://esm.sh/@langchain/openai";
import { HumanMessage } from "https://esm.sh/@langchain/core/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define the state interface for LangGraph
interface ReturnAnalysisState {
  requestId: string;
  imageUrl: string | null;
  description: string;
  language: string;
  supabase: any;
  
  // Analysis results
  isSuspiciousImage: boolean;
  isAiGeneratedImage: boolean;
  imageQuality: string;
  visionAnalysis: string;
  damageType: string;
  defectCategory: string;
  isVisible: boolean;
  confidence: number;
  hasWatermark: boolean;
  
  // Policy and decision
  matchedPolicy: any;
  decision: string;
  decisionReason: string;
  manualReviewReason: string | null;
  emailDraft: string;
  
  // Metadata
  analysisRound: number;
  error: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const errorId = crypto.randomUUID();
  
  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error(`Error ID ${errorId}: Missing authorization header`);
      return new Response(
        JSON.stringify({ 
          error: "Authentication required",
          errorId 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { requestId, imageUrl, description, language = 'en' } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize ChatOpenAI
    const llm = new ChatOpenAI({
      modelName: "gpt-4o",
      openAIApiKey: openaiApiKey,
      temperature: 0.1,
    });

    // Get current request data
    const { data: currentRequest, error: fetchError } = await supabase
      .from("return_requests")
      .select("analysis_round, original_image_url")
      .eq("id", requestId)
      .single();

    if (fetchError) {
      console.error(`Error ID ${errorId}: Failed to fetch request`, fetchError);
      throw fetchError;
    }

    const analysisRound = currentRequest.analysis_round || 1;

    // Initialize state
    const initialState: ReturnAnalysisState = {
      requestId,
      imageUrl,
      description,
      language,
      supabase,
      isSuspiciousImage: false,
      isAiGeneratedImage: false,
      imageQuality: "good",
      visionAnalysis: "",
      damageType: "UNKNOWN",
      defectCategory: "UNKNOWN",
      isVisible: false,
      confidence: 0,
      hasWatermark: false,
      matchedPolicy: null,
      decision: "",
      decisionReason: "",
      manualReviewReason: null,
      emailDraft: "",
      analysisRound,
      error: null,
    };

    // Define LangGraph nodes
    
    // Node 1: Check for duplicate images
    async function checkDuplicateImage(state: ReturnAnalysisState) {
      if (!state.imageUrl) return state;
      
      const { data: existingRequests } = await state.supabase
        .from("return_requests")
        .select("id, user_id")
        .eq("image_url", state.imageUrl)
        .neq("id", state.requestId)
        .limit(1);

      if (existingRequests && existingRequests.length > 0) {
        console.error(`Duplicate image detected for request ${state.requestId}`);
        
        const duplicateReason = "This image has already been submitted in a previous return request. Please upload a new photo of the product.";
        
        await state.supabase.from("return_decisions").insert({
          request_id: state.requestId,
          decision: "denied",
          decision_reason: duplicateReason,
          defect_category: "duplicate_submission",
          vision_analysis: "Duplicate image detected",
          confidence: 1.0,
          is_suspicious_image: true,
          auto_email_draft: `We noticed you've already submitted this image in a previous return request. To process your return, please provide a new photo of the product showing the current issue.`,
          language: state.language,
        });

        await state.supabase
          .from("return_requests")
          .update({ status: "denied" })
          .eq("id", state.requestId);

        return {
          ...state,
          decision: "denied",
          decisionReason: duplicateReason,
          error: "DUPLICATE_IMAGE"
        };
      }

      return state;
    }

    // Node 2: Detect suspicious/AI-generated images
    async function detectSuspiciousImage(state: ReturnAnalysisState) {
      if (!state.imageUrl || state.error) return state;
      
      console.log("Checking if image is suspicious or AI-generated...");
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an image forensics expert. Respond ONLY with valid JSON: {\"suspicious_image\": boolean, \"ai_generated\": boolean, \"image_quality\": \"good\"/\"bad\"/\"blurry\", \"reason\": \"string\"}",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image for: 1) AI-generated artifacts 2) Stock photo/watermark indicators 3) Image quality. Return JSON only.",
                },
                {
                  type: "image_url",
                  image_url: { url: state.imageUrl },
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        try {
          const result = JSON.parse(data.choices[0].message.content);
          return {
            ...state,
            isSuspiciousImage: result.suspicious_image === true,
            isAiGeneratedImage: result.ai_generated === true,
            imageQuality: result.image_quality || "good",
          };
        } catch (e) {
          console.error("Failed to parse suspicious image response:", e);
        }
      }

      return state;
    }

    // Node 3: Vision analysis
    async function analyzeVision(state: ReturnAnalysisState) {
      if (state.error) return state;
      
      console.log("Performing vision analysis...");
      
      const languageInstructions: Record<string, string> = {
        en: "Respond in English",
        es: "Responde en español",
        fr: "Répondez en français",
      };

      const messages = [
        {
          role: "system",
          content: `You are an expert product defect analyst. ${languageInstructions[state.language] || languageInstructions.en}.
          
Analyze product images and descriptions to determine:
1. The type of defect (manufacturing defect, user damage, normal wear, or UNKNOWN)
2. The specific defect category
3. Whether the damage is clearly visible
4. Your confidence level (0-1)`,
        },
        {
          role: "user",
          content: `Product Issue Description: ${state.description}`,
        },
      ];

      if (state.imageUrl) {
        messages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: state.imageUrl },
            },
          ],
        });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`Vision analysis failed: ${await response.text()}`);
      }

      const visionData = await response.json();
      const visionAnalysis = visionData.choices[0].message.content;
      
      const hasWatermark = visionAnalysis.toLowerCase().includes("watermark") ||
                          visionAnalysis.toLowerCase().includes("stock photo");

      return {
        ...state,
        visionAnalysis,
        hasWatermark,
      };
    }

    // Node 4: Extract structured data
    async function extractDefectData(state: ReturnAnalysisState) {
      if (state.error) return state;
      
      console.log("Extracting structured defect data...");
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `Extract structured data from: ${state.visionAnalysis}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_defect_data",
                parameters: {
                  type: "object",
                  properties: {
                    damage_type: {
                      type: "string",
                      enum: ["manufacturing_defect", "user_damage", "normal_wear", "UNKNOWN"],
                    },
                    category: {
                      type: "string",
                      enum: ["cracked_screen", "broken_component", "color_defect", "physical_damage", "water_damage", "scratches", "discoloration", "UNKNOWN", "other"],
                    },
                    is_visible: { type: "boolean" },
                    confidence: { type: "number" },
                  },
                  required: ["damage_type", "category", "is_visible", "confidence"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_defect_data" } },
        }),
      });

      const data = await response.json();
      const toolCall = data.choices[0].message.tool_calls[0];
      const extracted = JSON.parse(toolCall.function.arguments);

      return {
        ...state,
        damageType: extracted.damage_type,
        defectCategory: extracted.category,
        isVisible: extracted.is_visible,
        confidence: extracted.confidence,
      };
    }

    // Node 5: Check policy
    async function checkPolicy(state: ReturnAnalysisState) {
      if (state.error) return state;
      
      console.log("Checking return policy...");
      
      const { data: policies } = await state.supabase
        .from("return_policies")
        .select("*")
        .eq("defect_category", state.defectCategory);

      return {
        ...state,
        matchedPolicy: policies && policies.length > 0 ? policies[0] : null,
      };
    }

    // Node 6: Make decision
    async function makeDecision(state: ReturnAnalysisState) {
      if (state.error) return state;
      
      console.log("Making decision...");
      
      let decision: string;
      let decisionReason: string;
      let manualReviewReason: string | null = null;

      // AI-generated images → deny
      if (state.isAiGeneratedImage) {
        decision = "denied";
        decisionReason = "The uploaded image appears to be AI-generated. We require authentic photographs.";
      }
      // Watermarks → deny
      else if (state.hasWatermark) {
        decision = "denied";
        decisionReason = "Image contains watermarks or is a stock photo. Please provide an authentic photo.";
      }
      // User damage → deny
      else if (state.damageType === "user_damage") {
        decision = "denied";
        decisionReason = "Return denied. Damage caused by user mishandling. Our policy only covers manufacturing defects.";
      }
      // Normal wear → deny
      else if (state.damageType === "normal_wear") {
        decision = "denied";
        decisionReason = "Return denied. Normal wear and tear is not covered by our return policy.";
      }
      // Low confidence or unclear → manual review
      else if (state.confidence < 0.7 || !state.isVisible || state.defectCategory === "UNKNOWN") {
        if (state.analysisRound >= 2) {
          decision = "manual_review";
          manualReviewReason = `Low confidence or unclear defect after ${state.analysisRound} rounds`;
          decisionReason = "Manual review required. Our team will respond within 24-48 hours.";
        } else {
          decision = "more_info_requested";
          decisionReason = "We need clearer images. Please upload well-lit photos showing the defect.";
        }
      }
      // Manufacturing defect → check policy
      else if (state.damageType === "manufacturing_defect") {
        decision = state.matchedPolicy && state.matchedPolicy.is_returnable ? "approved" : "denied";
        decisionReason = state.matchedPolicy && state.matchedPolicy.is_returnable
          ? `Return approved. ${state.matchedPolicy.conditions}. Valid for ${state.matchedPolicy.time_limit_days} days.`
          : "Return denied. This defect is not covered under our return policy.";
      }
      // Unknown type → manual review
      else {
        decision = "manual_review";
        manualReviewReason = `Unclear damage type: ${state.damageType}`;
        decisionReason = "Manual review required for proper assessment.";
      }

      return {
        ...state,
        decision,
        decisionReason,
        manualReviewReason,
      };
    }

    // Node 7: Generate email
    async function generateEmail(state: ReturnAnalysisState) {
      if (state.error) return state;
      
      console.log("Generating email draft...");
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Write SHORT email body text (3-4 lines max). No greeting, no signature. Just body content.",
            },
            {
              role: "user",
              content: `Write email for return ${state.decision}. Reason: ${state.decisionReason}. Keep brief and empathetic.`,
            },
          ],
        }),
      });

      const emailData = await response.json();
      const emailDraft = emailData.choices[0].message.content;

      return {
        ...state,
        emailDraft,
      };
    }

    // Node 8: Save to database
    async function saveDecision(state: ReturnAnalysisState) {
      if (state.error && state.error !== "DUPLICATE_IMAGE") return state;
      if (state.error === "DUPLICATE_IMAGE") return state; // Already saved
      
      console.log("Saving decision to database...");
      
      await state.supabase.from("return_decisions").insert({
        request_id: state.requestId,
        vision_analysis: state.visionAnalysis,
        defect_category: state.defectCategory,
        policy_matched_id: state.matchedPolicy?.id || null,
        decision: state.decision,
        decision_reason: state.decisionReason,
        manual_review_reason: state.manualReviewReason,
        auto_email_draft: state.emailDraft,
        confidence: state.confidence,
        is_suspicious_image: state.isSuspiciousImage,
        ai_generated_image: state.isAiGeneratedImage,
      });

      const updates: any = { status: state.decision };
      if (state.analysisRound === 1 && state.imageUrl) {
        updates.original_image_url = state.imageUrl;
      }
      updates.analysis_round = state.analysisRound + 1;

      await state.supabase
        .from("return_requests")
        .update(updates)
        .eq("id", state.requestId);

      return state;
    }

    // Define conditional routing
    function shouldContinue(state: ReturnAnalysisState): string {
      if (state.error) return "end";
      return "continue";
    }

    // Build the LangGraph workflow
    const workflow = new StateGraph({
      channels: {
        requestId: null,
        imageUrl: null,
        description: null,
        language: null,
        supabase: null,
        isSuspiciousImage: null,
        isAiGeneratedImage: null,
        imageQuality: null,
        visionAnalysis: null,
        damageType: null,
        defectCategory: null,
        isVisible: null,
        confidence: null,
        hasWatermark: null,
        matchedPolicy: null,
        decision: null,
        decisionReason: null,
        manualReviewReason: null,
        emailDraft: null,
        analysisRound: null,
        error: null,
      }
    });

    // Add nodes to the graph
    workflow.addNode("check_duplicate", checkDuplicateImage);
    workflow.addNode("detect_suspicious", detectSuspiciousImage);
    workflow.addNode("analyze_vision", analyzeVision);
    workflow.addNode("extract_data", extractDefectData);
    workflow.addNode("check_policy", checkPolicy);
    workflow.addNode("make_decision", makeDecision);
    workflow.addNode("generate_email", generateEmail);
    workflow.addNode("save_decision", saveDecision);

    // Define the flow
    workflow.setEntryPoint("check_duplicate");
    
    workflow.addConditionalEdges("check_duplicate", shouldContinue, {
      continue: "detect_suspicious",
      end: "save_decision",
    });
    
    workflow.addEdge("detect_suspicious", "analyze_vision");
    workflow.addEdge("analyze_vision", "extract_data");
    workflow.addEdge("extract_data", "check_policy");
    workflow.addEdge("check_policy", "make_decision");
    workflow.addEdge("make_decision", "generate_email");
    workflow.addEdge("generate_email", "save_decision");
    workflow.addEdge("save_decision", END);

    // Compile and run the graph
    const app = workflow.compile();
    const finalState = await app.invoke(initialState);

    console.log("LangGraph workflow complete!");

    return new Response(
      JSON.stringify({
        success: true,
        requestId: finalState.requestId,
        visionAnalysis: finalState.visionAnalysis,
        defectCategory: finalState.defectCategory,
        decision: finalState.decision,
        decisionReason: finalState.decisionReason,
        emailDraft: finalState.emailDraft,
        confidence: finalState.confidence,
        isSuspiciousImage: finalState.isSuspiciousImage,
        policyMatched: finalState.matchedPolicy,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`Error ID ${errorId}:`, error);
    return new Response(
      JSON.stringify({
        error: "Unable to process return request. Please try again later.",
        errorId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

