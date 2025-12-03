import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const startTime = Date.now();
    const { requestId, imageUrl, description, language = 'en' } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current request data to check analysis round
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
    console.log(`Analyzing return request ${requestId}, round ${analysisRound}`);

    if (!requestId || !description) {
      console.error(`Error ID ${errorId}: Missing required fields`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request data",
          errorId 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate image uploads from the same user
    if (imageUrl) {
      const { data: existingRequests } = await supabase
        .from("return_requests")
        .select("id, user_id")
        .eq("image_url", imageUrl)
        .neq("id", requestId)
        .limit(1);

      if (existingRequests && existingRequests.length > 0) {
        console.error(`Duplicate image detected for request ${requestId}`);
        
        const duplicateReason = "This image has already been submitted in a previous return request. Please upload a new photo of the product.";
        
        await supabase.from("return_decisions").insert({
          request_id: requestId,
          decision: "denied",
          decision_reason: duplicateReason,
          defect_category: "duplicate_submission",
          vision_analysis: "Duplicate image detected",
          confidence: 1.0,
          is_suspicious_image: true,
          auto_email_draft: `We noticed you've already submitted this image in a previous return request. To process your return, please provide a new photo of the product showing the current issue. If you need assistance, please contact our support team.`,
          language: language || "en",
        });

        await supabase
          .from("return_requests")
          .update({ status: "denied" })
          .eq("id", requestId);

        return new Response(
          JSON.stringify({
            success: false,
            decision: "denied",
            reason: duplicateReason,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 1: Detect if image is suspicious (stock photo, screenshot, fake, AI-generated)
    let isSuspiciousImage = false;
    let isAiGeneratedImage = false;
    let imageQuality = "good";
    
    if (imageUrl) {
      console.log("Checking if image is suspicious or AI-generated...");
      const suspiciousCheckResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are an image forensics expert specialized in detecting fake, AI-generated, and suspicious images. Respond ONLY with valid JSON matching this exact structure: {\"suspicious_image\": true/false, \"ai_generated\": true/false, \"image_quality\": \"good\"/\"bad\"/\"blurry\", \"reason\": \"brief explanation\"}",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image carefully. Check for: 1) Is it AI-generated (look for unnatural textures, impossible reflections, inconsistent lighting, overly perfect details, AI artifacts)? 2) Is it suspicious (stock photo, screenshot, watermark, logo overlay, text overlay, catalog photo)? 3) Rate the image quality. Return JSON only.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (suspiciousCheckResponse.ok) {
        const suspiciousData = await suspiciousCheckResponse.json();
        try {
          const result = JSON.parse(suspiciousData.choices[0].message.content);
          isSuspiciousImage = result.suspicious_image === true;
          isAiGeneratedImage = result.ai_generated === true;
          imageQuality = result.image_quality || "good";
          console.log("Image analysis:", { isSuspiciousImage, isAiGeneratedImage, imageQuality, reason: result.reason });
        } catch (e) {
          console.error("Failed to parse suspicious image response:", e);
        }
      }
    }

    // Step 2: Vision Analysis using Lovable AI
    const languageInstructions: Record<string, string> = {
      en: "Respond in English",
      es: "Responde en español",
      fr: "Répondez en français",
      de: "Antworten Sie auf Deutsch",
      zh: "用中文回答",
      ja: "日本語で答えてください",
      ar: "أجب بالعربية",
    };

    const visionMessages: any[] = [
      {
        role: "system",
        content: `You are an expert product defect analyst. ${languageInstructions[language] || languageInstructions.en}. 

CRITICAL INSTRUCTIONS:
- Only describe what is CLEARLY VISIBLE in the photo and CLEARLY WRITTEN in the user text
- If you are not sure about something, say "UNKNOWN" or "NOT CLEARLY VISIBLE"
- Do NOT make assumptions or infer things that aren't explicitly shown
- If the image quality is poor (blurry, dark, unclear), state this explicitly
- Be objective and conservative in your analysis

Analyze product images and descriptions to determine:
1. The type of defect (manufacturing defect, user damage, normal wear, or UNKNOWN)
2. The specific defect category 
3. Whether the damage is clearly visible in the image
4. Your confidence level (0-1) in this assessment

If uncertain, always prefer to flag for manual review rather than making a definitive judgment.`,
      },
      {
        role: "user",
        content: `Product Issue Description: ${description}`,
      },
    ];

    // Add image to the message if provided
    if (imageUrl) {
      visionMessages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      });
    }

    console.log("Calling Lovable AI for vision analysis...");
    const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: visionMessages,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error("Vision API error:", visionResponse.status, errorText);
      throw new Error(`Vision analysis failed: ${errorText}`);
    }

    const visionData = await visionResponse.json();
    const visionAnalysis = visionData.choices[0].message.content;
    console.log("Vision analysis complete:", visionAnalysis);

    // Step 3: Extract structured data using tool calling
    console.log("Extracting defect data and confidence...");
    const structuredResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `Based on this defect analysis, extract structured data: ${visionAnalysis}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_defect_data",
              description: "Extract structured defect data with confidence scoring",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: [
                      "cracked_screen",
                      "broken_component",
                      "color_defect",
                      "physical_damage",
                      "water_damage",
                      "scratches",
                      "discoloration",
                      "size_issue",
                      "fit_issue",
                      "color_mismatch",
                      "not_as_described",
                      "UNKNOWN",
                      "other",
                    ],
                    description: "The defect category, use UNKNOWN if not clear",
                  },
                  is_visible: {
                    type: "boolean",
                    description: "Whether the defect is clearly visible in the image",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level 0-1, where <0.7 indicates uncertainty",
                  },
                },
                required: ["category", "is_visible", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_defect_data" } },
      }),
    });

    if (!structuredResponse.ok) {
      const errorText = await structuredResponse.text();
      console.error("Structured data API error:", structuredResponse.status, errorText);
      throw new Error(`Structured data extraction failed: ${errorText}`);
    }

    const structuredData = await structuredResponse.json();
    const toolCall = structuredData.choices[0].message.tool_calls[0];
    const extractedData = JSON.parse(toolCall.function.arguments);
    
    const defectCategory = extractedData.category;
    const isVisible = extractedData.is_visible;
    const confidence = extractedData.confidence;
    
    // Check if vision analysis detected watermarks
    const hasWatermark = visionAnalysis.toLowerCase().includes("watermark") ||
                        visionAnalysis.toLowerCase().includes("logo overlay") ||
                        visionAnalysis.toLowerCase().includes("text overlay") ||
                        visionAnalysis.toLowerCase().includes("stock photo") ||
                        visionAnalysis.toLowerCase().includes("catalog photo");
    
    console.log("Extracted data:", { defectCategory, isVisible, confidence, hasWatermark });

    // Step 3: Check policy in database
    console.log("Checking return policy...");
    const { data: policies, error: policyError } = await supabase
      .from("return_policies")
      .select("*")
      .eq("defect_category", defectCategory);

    if (policyError) {
      console.error("Policy lookup error:", policyError);
      throw policyError;
    }

    const matchedPolicy = policies && policies.length > 0 ? policies[0] : null;
    console.log("Matched policy:", matchedPolicy);

    // Step 4: Determine if manual review is needed or automatic denial for watermarks/AI-generated
    let decision: string;
    let decisionReason: string;
    let manualReviewReason: string | null = null;
    
    // AI-generated images result in automatic denial
    if (isAiGeneratedImage) {
      decision = "denied";
      decisionReason = "The uploaded image appears to be AI-generated. We require authentic photographs of the actual product to process return requests. Please upload a real photo taken by you showing the defect clearly.";
      console.log("Decision: Denied due to AI-generated image detection");
    } 
    // Watermarks result in automatic denial
    else if (hasWatermark) {
      decision = "denied";
      decisionReason = "Image contains watermarks, logos, or appears to be a stock/catalog photo. Please provide an authentic photo of your actual product showing the defect clearly.";
      console.log("Decision: Denied due to watermark detection");
    } else {
      const needsManualReview = 
        confidence < 0.7 ||
        imageQuality === "bad" ||
        imageQuality === "blurry" ||
        isSuspiciousImage ||
        !isVisible ||
        defectCategory === "UNKNOWN" ||
        defectCategory === "size_issue" ||
        defectCategory === "fit_issue" ||
        defectCategory === "color_mismatch";
      
      console.log("Manual review check:", { 
        needsManualReview, 
        confidence, 
        imageQuality, 
        isSuspiciousImage, 
        isVisible,
        defectCategory,
        hasWatermark,
        analysisRound
      });

      // Only go to manual review after 2nd round of AI analysis
      if (needsManualReview && analysisRound >= 2) {
        decision = "manual_review";
        const reasons = [];
        if (confidence < 0.7) reasons.push("AI confidence too low (<70%)");
        if (imageQuality !== "good") reasons.push("poor image quality (blurry/unclear)");
        if (isSuspiciousImage) reasons.push("image appears suspicious");
        if (!isVisible) reasons.push("defect not clearly visible in image");
        if (defectCategory === "UNKNOWN") reasons.push("unable to identify defect type");
        if (["size_issue", "fit_issue", "color_mismatch"].includes(defectCategory)) {
          reasons.push("subjective issue requiring human judgment");
        }
        
        manualReviewReason = `After ${analysisRound} rounds of AI analysis: ${reasons.join(", ")}`;
        decisionReason = `Manual review required: ${reasons.join(", ")}. Our team will review your request within 24-48 hours.`;
      } else if (needsManualReview && analysisRound < 2) {
        // Request more info for first round if unclear
        decision = "more_info_requested";
        const reasons = [];
        if (confidence < 0.7) reasons.push("unclear from current image");
        if (imageQuality !== "good") reasons.push("image quality is poor");
        if (!isVisible) reasons.push("defect not clearly visible");
        if (defectCategory === "UNKNOWN") reasons.push("defect type unclear");
        
        decisionReason = `We need clearer images to process your return. Please upload: ${reasons.join(", ")}. Take clear, well-lit photos showing the defect from multiple angles.`;
      } else {
        // Make decision based on policy
        decision = matchedPolicy && matchedPolicy.is_returnable ? "approved" : "denied";
        decisionReason =
          matchedPolicy && matchedPolicy.is_returnable
            ? `Return approved. ${matchedPolicy.conditions}. Valid for ${matchedPolicy.time_limit_days} days from purchase.`
            : matchedPolicy
            ? `Return denied. ${matchedPolicy.conditions}`
            : "Return denied. This type of defect is not covered under our return policy.";
      }
    }

    console.log("Decision:", decision, "Reason:", decisionReason);

    // Step 5: Generate short email draft
    console.log("Generating email draft...");
    const emailResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional customer service representative. Write SHORT email body text (3-4 lines max). Do NOT include greetings like 'Dear Customer' or signatures. Just the body content.",
          },
          {
            role: "user",
            content: `Write a very short email body (3-4 lines only, no greeting, no signature) for a customer whose return was ${decision}. 

Reason: ${decisionReason}

Keep it brief, empathetic, and actionable.`,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email API error:", emailResponse.status, errorText);
      throw new Error(`Email generation failed: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    const emailDraft = emailData.choices[0].message.content;
    console.log("Email draft generated");

    // Step 6: Save decision to database
    console.log("Saving decision to database...");
    const { data: decisionData, error: decisionError } = await supabase
      .from("return_decisions")
      .insert({
        request_id: requestId,
        vision_analysis: visionAnalysis,
        defect_category: defectCategory,
        policy_matched_id: matchedPolicy?.id || null,
        decision: decision,
        decision_reason: decisionReason,
        manual_review_reason: manualReviewReason,
        auto_email_draft: emailDraft,
        confidence: confidence,
        is_suspicious_image: isSuspiciousImage,
        ai_generated_image: isAiGeneratedImage,
      })
      .select()
      .single();

    if (decisionError) {
      console.error("Decision save error:", decisionError);
      throw decisionError;
    }

    // Update request status and increment analysis round
    console.log("Updating request status...");
    const updates: any = { status: decision };
    
    // Store original image URL on first analysis
    if (analysisRound === 1 && imageUrl) {
      updates.original_image_url = imageUrl;
    }
    
    // Increment analysis round for next time
    updates.analysis_round = analysisRound + 1;

    const { error: updateError } = await supabase
      .from("return_requests")
      .update(updates)
      .eq("id", requestId);

    if (updateError) {
      console.error("Request update error:", updateError);
      throw updateError;
    }

    console.log("Analysis complete!");

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        visionAnalysis,
        defectCategory,
        decision,
        decisionReason,
        emailDraft,
        confidence,
        isSuspiciousImage,
        policyMatched: matchedPolicy,
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
