import { LlmService } from './LlmService';
import { ToolExecutor } from './ToolExecutor';
import { getAgentById, ORCHESTRATOR_AGENT } from '../data/agents';
import type { DoctorAgent, OrchestratorResult, Result } from '@types';
import { success, failure } from '@types';
import { getLanguageInstruction } from '../data/languages';

const TOOL_CALL_PATTERN = /\[\[TOOL:(\w+)\|(\{.*?\})\]\]/s;
const MAX_TOOL_ROUNDS = 3;
const HISTORY_CONTEXT_LIMIT = 10;

// ============================================================================
// STEP 1: Contextual Query Rewriting (if history exists)
// Takes last 10 messages and rewrites user query with context
// ============================================================================
const CONTEXTUAL_REWRITE_PROMPT = `You are a query rewriter. Given a conversation history and a new user message, produce a single self-contained query that captures the full intent. Include any relevant context from history (conditions mentioned, symptoms discussed, medications listed, etc.).

Rules:
- Output ONLY the rewritten query, no extra text.
- If the new message is already self-contained (e.g., a brand new topic), return it as-is.
- If the user says "same issue" or references prior messages, merge the context.
- Keep it concise (1-3 sentences max).
- Preserve medical terms exactly.`;

// ============================================================================
// STEP 2: Image Classification (if image attached)
// Classifies medical image type before routing
// ============================================================================
const IMAGE_CLASSIFIER_PROMPT = `You are a medical image classifier. Analyze the provided image and classify it into ONE of these categories:

- skin_lesion (rash, mole, wound, burn, infection, acne)
- xray (bone X-ray, chest X-ray, dental X-ray)
- ct_scan (CT scan of any body part)
- mri (MRI of brain, spine, knee, etc.)
- lab_report (blood test, urine test, pathology report)
- prescription (medication prescription, pill photo)
- ecg (electrocardiogram / ECG strip)
- ultrasound (sonography, pregnancy scan)
- endoscopy (GI scope images)
- fundoscopy (retinal/eye fundus image)
- other (anything not fitting above)

Respond with ONLY a JSON object:
{
  "image_type": "category_from_above",
  "description": "brief description of what you see",
  "body_region": "affected body part if visible",
  "urgency": "low|medium|high"
}`;

// Image type → recommended specialist mapping
const IMAGE_ROUTE_MAP: Record<string, string> = {
  skin_lesion: 'dermatology',
  xray: 'orthopaedics',
  ct_scan: 'internal_medicine',
  mri: 'neurology',
  lab_report: 'internal_medicine',
  prescription: 'pharmacy',
  ecg: 'cardiology',
  ultrasound: 'obstetrics_gynecology',
  endoscopy: 'gastroenterology',
  fundoscopy: 'ophthalmology',
  other: 'general_practice',
};

// ============================================================================
// STEP 3: Markdown Summary Formatter
// Formats specialist responses into clean markdown
// ============================================================================
function extractSuggestions(content: string): {
  body: string;
  suggestions: string[];
} {
  const sepIndex = content.lastIndexOf('\n---\n');
  if (sepIndex === -1) return { body: content, suggestions: [] };
  const body = content.slice(0, sepIndex).trim();
  const tail = content.slice(sepIndex + 5).trim();
  const suggestions = tail
    .split('\n')
    .filter(s => s.trim().startsWith('-'))
    .map(s => s.replace(/^[-*•]\s*/, '').trim())
    .filter(s => s.length > 0 && s.length < 120);
  if (suggestions.length === 0) return { body: content, suggestions: [] };
  return { body, suggestions };
}

function formatMarkdownSummary(
  routing: OrchestratorResult,
  responses: Array<{ agentId: string; response: string }>,
  imageClassification?: ImageClassificationResult | null,
): string {
  if (responses.length === 0) return 'No response available.';

  let allSuggestions: string[] = [];

  const cleanResponses = responses.map(r => {
    const { body, suggestions } = extractSuggestions(r.response);
    allSuggestions.push(...suggestions);
    return { ...r, response: body };
  });

  allSuggestions = Array.from(new Set(allSuggestions)).slice(0, 4);

  let markdown = '';

  if (imageClassification) {
    markdown += `**📷 Image Analysis** — ${
      imageClassification.description
    } *(${imageClassification.image_type.replace('_', ' ')})*\n\n---\n\n`;
  }

  if (cleanResponses.length === 1) {
    markdown += cleanResponses[0].response;
  } else {
    for (let i = 0; i < cleanResponses.length; i++) {
      const resp = cleanResponses[i];
      const agent = getAgentById(resp.agentId);
      const name = agent?.displayName || resp.agentId;
      const icon = getSpecialtyEmoji(resp.agentId);
      markdown += `### ${icon} ${name}\n\n${resp.response}\n\n`;
      if (i < cleanResponses.length - 1) {
        markdown += `---\n\n`;
      }
    }
  }

  if (routing.reasoning && cleanResponses.length > 1) {
    markdown += `\n\n*Routing: ${routing.reasoning} (confidence: ${Math.round(
      routing.confidence * 100,
    )}%)*`;
  }

  if (allSuggestions.length > 0) {
    markdown += `\n\n---\n`;
    allSuggestions.forEach(s => {
      markdown += `- ${s}\n`;
    });
  }

  return markdown.trim();
}

function getSpecialtyEmoji(agentId: string): string {
  const emojiMap: Record<string, string> = {
    general_practice: '🩺',
    paediatrics: '👶',
    internal_medicine: '🫀',
    cardiology: '❤️',
    dermatology: '🧴',
    neurology: '🧠',
    gastroenterology: '🫃',
    pulmonology: '🫁',
    nephrology: '💧',
    endocrinology: '🦋',
    infectious_disease: '🦠',
    obstetrics_gynecology: '🤰',
    orthopaedics: '🦴',
    ophthalmology: '👁️',
    otorhinolaryngology: '👂',
    psychiatry: '🧘',
    dentistry: '🦷',
    urology: '🚿',
    haematology: '🩸',
    rheumatology: '🤲',
    allergy_immunology: '🌿',
    neonatology: '🍼',
    geriatrics: '👴',
    emergency_medicine: '🚨',
    nutrition_dietetics: '🥗',
    pharmacy: '💊',
    orchestrator: '🤖',
  };
  return emojiMap[agentId] || '🏥';
}

function isKnownSpecialist(agentId: string | undefined): agentId is string {
  if (!agentId || agentId === 'orchestrator') return false;
  return Boolean(getAgentById(agentId));
}

interface ImageClassificationResult {
  image_type: string;
  description: string;
  body_region: string;
  urgency: string;
}

// ============================================================================
// AGENT SERVICE
// ============================================================================
class AgentServiceClass {
  private getFallbackSpecialistId(
    preferredAgentId?: string,
    imageClassification?: ImageClassificationResult | null,
  ): string {
    if (isKnownSpecialist(preferredAgentId)) return preferredAgentId;

    const imageAgentId = imageClassification
      ? IMAGE_ROUTE_MAP[imageClassification.image_type]
      : undefined;
    if (isKnownSpecialist(imageAgentId)) return imageAgentId;

    return 'general_practice';
  }

  private normalizeRouting(
    routing: OrchestratorResult,
    imageClassification?: ImageClassificationResult | null,
  ): OrchestratorResult {
    const primarySpecialist = this.getFallbackSpecialistId(
      routing.primarySpecialist,
      imageClassification,
    );
    const secondarySpecialists = Array.from(
      new Set((routing.secondarySpecialists || []).filter(isKnownSpecialist)),
    ).filter(agentId => agentId !== primarySpecialist);

    return {
      ...routing,
      primarySpecialist,
      secondarySpecialists,
    };
  }

  // -----------------------------------------------------------------------
  // STEP 1: Create contextual query from history
  // -----------------------------------------------------------------------
  private async createContextualQuery(
    userMessage: string,
    history: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (history.length < 2) return userMessage; // No meaningful history

    const recentHistory = history.slice(-HISTORY_CONTEXT_LIMIT);
    const historyText = recentHistory
      .map(
        h =>
          `${h.role === 'user' ? 'Patient' : 'Doctor'}: ${h.content.substring(
            0,
            200,
          )}`,
      )
      .join('\n');

    const prompt = `Conversation history:\n${historyText}\n\nNew message: ${userMessage}`;

    try {
      console.log('[AgentService] Creating contextual query from history...');
      const t0 = Date.now();
      const result = await LlmService.chat(
        prompt,
        [],
        CONTEXTUAL_REWRITE_PROMPT,
      );
      console.log(
        `[AgentService] Contextual rewrite took ${Date.now() - t0}ms`,
      );

      if (result.ok && result.data.trim()) {
        const rewritten = result.data.trim();
        console.log(
          `[AgentService] Original: "${userMessage}" → Rewritten: "${rewritten}"`,
        );
        return rewritten;
      }
    } catch (e: any) {
      console.warn(
        '[AgentService] Contextual rewrite failed, using original:',
        e.message,
      );
    }
    return userMessage;
  }

  // -----------------------------------------------------------------------
  // STEP 2: Classify medical image
  // -----------------------------------------------------------------------
  private async classifyImage(
    imageBase64: string,
    imageMimeType: string,
    userMessage: string,
  ): Promise<ImageClassificationResult | null> {
    try {
      console.log('[AgentService] Classifying medical image...');
      const t0 = Date.now();
      const result = await LlmService.chat(
        userMessage || 'Please classify this medical image.',
        [],
        IMAGE_CLASSIFIER_PROMPT,
        imageBase64,
        imageMimeType,
      );
      console.log(
        `[AgentService] Image classification took ${Date.now() - t0}ms`,
      );

      if (!result.ok) {
        console.warn(
          '[AgentService] Image classification failed:',
          result.error,
        );
        return null;
      }

      // Parse JSON response
      const text = result.data;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[AgentService] No JSON in image classification response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]) as ImageClassificationResult;
      console.log(
        `[AgentService] Image classified as: ${parsed.image_type} — ${parsed.description}`,
      );
      return parsed;
    } catch (e: any) {
      console.warn('[AgentService] Image classification error:', e.message);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // STEP 3: Intent detection via LLM (Orchestrator routing)
  // -----------------------------------------------------------------------
  async routeQuery(
    userQuery: string,
    imageBase64?: string,
    imageMimeType?: string,
    imageClassification?: ImageClassificationResult | null,
  ): Promise<Result<OrchestratorResult>> {
    console.log('[AgentService] routeQuery — intent detection via LLM');

    // If we have image classification, add it to the routing query
    let enrichedQuery = userQuery;
    if (imageClassification) {
      enrichedQuery = `${userQuery}\n\n[Image Classification: type=${imageClassification.image_type}, description="${imageClassification.description}", body_region="${imageClassification.body_region}", urgency=${imageClassification.urgency}]`;
    }

    try {
      const t0 = Date.now();
      const result = await LlmService.chat(
        enrichedQuery,
        [],
        ORCHESTRATOR_AGENT.systemPrompt,
      );

      if (!result.ok) return result;

      const text = result.data;
      console.log(`[AgentService] Intent detection took ${Date.now() - t0}ms`);

      // Parse JSON from response
      let jsonString = text;
      const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonBlockMatch) {
        jsonString = jsonBlockMatch[1];
      } else {
        const braceMatch = text.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          jsonString = braceMatch[0];
        } else {
          console.error('[AgentService] routeQuery: No JSON in response');
          // If image classified, use the image-based routing as fallback
          if (imageClassification) {
            const fallbackAgent =
              IMAGE_ROUTE_MAP[imageClassification.image_type] ||
              'general_practice';
            return success({
              primarySpecialist: fallbackAgent,
              secondarySpecialists: [],
              confidence: 0.7,
              reasoning: `Routed based on image type: ${imageClassification.image_type}`,
            });
          }
          return failure('Could not parse intent. Please try again.');
        }
      }

      try {
        const raw = JSON.parse(jsonString) as Record<string, unknown>;

        const getStr = (key: string): string =>
          typeof raw[key] === 'string' ? (raw[key] as string) : '';
        const getArr = (key: string): unknown[] =>
          Array.isArray(raw[key]) ? (raw[key] as unknown[]) : [];

        const parsed: OrchestratorResult = {
          primarySpecialist:
            getStr('primarySpecialist') || getStr('primary_specialist'),
          secondarySpecialists: getArr('secondarySpecialists').length
            ? (getArr('secondarySpecialists') as string[])
            : (getArr('secondary_specialists') as string[]),
          confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.5,
          reasoning: getStr('reasoning') || getStr('reason'),
        };

        if (!parsed.primarySpecialist && !imageClassification) {
          return failure('Intent detection returned no specialist.');
        }

        return success(this.normalizeRouting(parsed, imageClassification));
      } catch (parseError: any) {
        console.error(
          '[AgentService] routeQuery JSON parse error:',
          parseError.message,
        );
        return failure('Intent detection returned invalid JSON.');
      }
    } catch (e: any) {
      return failure(e.message || 'Intent detection failed');
    }
  }

  // -----------------------------------------------------------------------
  // STEP 4: Chat with specialist agent
  // -----------------------------------------------------------------------
  async chatWithAgent(
    agent: DoctorAgent,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    onToken?: (text: string) => void,
    languageCode?: string,
    healthProfileSummary?: string,
    imageBase64?: string,
    imageMimeType?: string,
    imageClassification?: ImageClassificationResult | null,
  ): Promise<Result<string>> {
    try {
      const enhancedSystemPrompt = this.buildSystemPrompt(
        agent,
        languageCode,
        healthProfileSummary,
      );

      // If image was classified, prepend classification context to the message
      let enrichedMessage = userMessage;
      if (imageClassification) {
        enrichedMessage = `${userMessage}\n\n[Image info: ${imageClassification.image_type} — ${imageClassification.description}, body region: ${imageClassification.body_region}, urgency: ${imageClassification.urgency}]`;
      }

      const chatHistory = history.filter(
        h => h.role === 'user' || h.role === 'assistant',
      );

      if (onToken && !imageBase64) {
        return await this.streamWithTools(
          agent,
          chatHistory,
          enrichedMessage,
          enhancedSystemPrompt,
          onToken,
          imageBase64,
          imageMimeType,
        );
      }
      // Non-streaming for image queries (avoids 500 errors)
      return await this.generateWithTools(
        agent,
        chatHistory,
        enrichedMessage,
        enhancedSystemPrompt,
        imageBase64,
        imageMimeType,
      );
    } catch (e: any) {
      return failure(e.message || 'Chat failed');
    }
  }

  // -----------------------------------------------------------------------
  // Tool execution helpers (unchanged)
  // -----------------------------------------------------------------------
  private async generateWithTools(
    agent: DoctorAgent,
    messages: Array<{ role: string; content: string }>,
    userMessage: string,
    systemPrompt: string,
    imageBase64?: string,
    imageMimeType?: string,
  ): Promise<Result<string>> {
    const result = await LlmService.chat(
      userMessage,
      messages,
      systemPrompt,
      imageBase64,
      imageMimeType,
    );
    if (!result.ok) return result;

    const toolResult = await this.executeToolCall(result.data, agent);
    if (!toolResult.wasToolCall || !toolResult.toolName) return result;

    return await this.followUpWithToolResult(
      agent,
      messages,
      userMessage,
      result.data,
      toolResult.toolName,
      toolResult.toolOutput || '',
      systemPrompt,
      1,
    );
  }

  private async streamWithTools(
    agent: DoctorAgent,
    messages: Array<{ role: string; content: string }>,
    userMessage: string,
    systemPrompt: string,
    onToken: (text: string) => void,
    imageBase64?: string,
    imageMimeType?: string,
  ): Promise<Result<string>> {
    let fullText = '';
    const result = await LlmService.streamChat(
      userMessage,
      messages,
      (token: string) => {
        fullText = token;
        onToken(token);
      },
      systemPrompt,
      imageBase64,
      imageMimeType,
    );
    if (!result.ok) return result;

    const toolResult = await this.executeToolCall(fullText, agent);
    if (!toolResult.wasToolCall || !toolResult.toolName) return result;

    const finalResult = await this.followUpWithToolResult(
      agent,
      messages,
      userMessage,
      fullText,
      toolResult.toolName,
      toolResult.toolOutput || '',
      systemPrompt,
      1,
    );
    if (finalResult.ok) onToken(finalResult.data);
    return finalResult;
  }

  private async executeToolCall(
    responseText: string,
    _agent: DoctorAgent,
  ): Promise<{ wasToolCall: boolean; toolName?: string; toolOutput?: string }> {
    const match = responseText.match(TOOL_CALL_PATTERN);
    if (!match) return { wasToolCall: false };

    const toolName = match[1];
    let args: Record<string, any> = {};
    try {
      args = JSON.parse(match[2]);
    } catch {
      return { wasToolCall: false };
    }

    const output = await ToolExecutor.execute(toolName, args);
    return { wasToolCall: true, toolName, toolOutput: output };
  }

  private async followUpWithToolResult(
    agent: DoctorAgent,
    messages: Array<{ role: string; content: string }>,
    userMessage: string,
    assistantResponse: string,
    toolName: string,
    toolOutput: string,
    systemPrompt: string,
    round: number,
  ): Promise<Result<string>> {
    const cleanResponse = assistantResponse
      .replace(TOOL_CALL_PATTERN, '')
      .trim();
    const updatedMessages = [
      ...messages,
      { role: 'assistant', content: cleanResponse || 'Let me look that up.' },
      {
        role: 'user',
        content: `[TOOL RESULT from ${toolName}]: ${toolOutput}`,
      },
    ];

    const result = await LlmService.chat(
      'Based on the tool result above, provide a helpful medical response.',
      updatedMessages,
      systemPrompt,
    );
    if (!result.ok) return result;

    if (round < MAX_TOOL_ROUNDS) {
      const toolResult = await this.executeToolCall(result.data, agent);
      if (toolResult.wasToolCall) {
        return await this.followUpWithToolResult(
          agent,
          updatedMessages,
          '',
          result.data,
          toolResult.toolName!,
          toolResult.toolOutput!,
          systemPrompt,
          round + 1,
        );
      }
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // System prompt builder
  // -----------------------------------------------------------------------
  private buildSystemPrompt(
    agent: DoctorAgent,
    languageCode?: string,
    healthProfileSummary?: string,
  ): string {
    let prompt = agent.systemPrompt;

    if (healthProfileSummary) {
      prompt = `Patient profile: ${healthProfileSummary}\n\n${prompt}`;
    }

    prompt += getLanguageInstruction(languageCode || 'en');

    if (agent.tools.length > 0) {
      prompt +=
        '\n\nAvailable tools (use ONLY when needed):\n' +
        agent.tools
          .map(
            t =>
              `- ${t}: To call, output EXACTLY: [[TOOL:${t}|{"param_name":"value"}]]`,
          )
          .join('\n');
      prompt +=
        '\n\nAfter a tool returns a result, incorporate it naturally into your advice.';
    }

    prompt +=
      '\n\nCRITICAL HEALTHCARE SAFETY RULES:' +
      '\n1. You are a "Medical Advisor" — you MUST answer ALL healthcare-related queries. NEVER refuse or say "I cannot answer this".' +
      '\n2. Provide general guidance, education, and possible explanations based on medical knowledge.' +
      '\n3. Avoid definitive diagnosis or specific drug prescriptions — suggest drug classes and general treatment approaches instead.' +
      '\n4. For serious symptoms, strongly recommend seeing a doctor but STILL provide helpful information.' +
      '\n5. Always end with a soft disclaimer: "This is general guidance. Please consult a doctor for personalized medical advice."' +
      '\n6. Format your response using **markdown**: use headers, bullet points, bold for key terms, and numbered lists where appropriate.' +
      '\n7. At the very end of your response, provide 2-3 short, relevant follow-up questions the user can ask. Format them exactly like this at the end of the response:\n\n---\n- Follow-up question 1?\n- Follow-up question 2?';

    return prompt;
  }

  // -----------------------------------------------------------------------
  // MAIN PIPELINE: chatWithOrchestrator
  //
  // Flow:
  //   1. History? → Contextual query rewrite (last 10 msgs)
  //   2. Image?   → LLM image classifier (MRI/CT/skin/lab/etc.)
  //   3. Intent detection via LLM orchestrator
  //   4. Call primary agent (streamed) + secondary agents (parallel)
  //   5. Format combined response as markdown
  // -----------------------------------------------------------------------
  async chatWithOrchestrator(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    onToken?: (text: string) => void,
    languageCode?: string,
    healthProfileSummary?: string,
    imageBase64?: string,
    imageMimeType?: string,
    forcedSpecialistId?: string,
  ): Promise<
    Result<{
      routing: OrchestratorResult;
      specialistResponses: Array<{ agentId: string; response: string }>;
    }>
  > {
    const pipelineStart = Date.now();
    console.log('[AgentService] ══════════ PIPELINE START ══════════');

    // ===== STEP 1: Contextual query rewrite (if history exists) =====
    let contextualQuery = userMessage;
    if (history.length >= 2) {
      console.log(
        `[AgentService] Step 1: Rewriting query with ${Math.min(
          history.length,
          HISTORY_CONTEXT_LIMIT,
        )} history messages...`,
      );
      contextualQuery = await this.createContextualQuery(userMessage, history);
    } else {
      console.log('[AgentService] Step 1: No history — using original query');
    }

    // ===== STEP 2: Image classification (if image attached) =====
    let imageClassification: ImageClassificationResult | null = null;
    if (imageBase64 && imageMimeType) {
      console.log('[AgentService] Step 2: Classifying medical image...');
      imageClassification = await this.classifyImage(
        imageBase64,
        imageMimeType,
        userMessage,
      );
      if (imageClassification) {
        console.log(
          `[AgentService] Step 2 result: ${imageClassification.image_type} — ${imageClassification.description}`,
        );
        // Reject non-medical images
        if (imageClassification.image_type === 'other') {
          const rejectionMsg = `⚠️ **Non-medical image detected**\n\nThe uploaded image does not appear to be a medical image (e.g., X-ray, MRI, CT scan, lab report, skin condition, ECG). \n\nPlease upload a medical image for analysis. Supported types:\n- Skin lesions, rashes, wounds\n- X-rays, CT scans, MRI scans\n- Lab reports, blood test results\n- ECG strips, ultrasound images\n- Eye/retinal images, dental X-rays\n\n*This is general guidance. Please consult a doctor for personalized medical advice.*`;
          if (onToken) onToken(rejectionMsg);
          return success({
            routing: { primarySpecialist: 'general_practice', secondarySpecialists: [], confidence: 0, reasoning: 'Non-medical image rejected' },
            specialistResponses: [{ agentId: 'general_practice', response: rejectionMsg }],
          });
        }
      }
    } else {
      console.log('[AgentService] Step 2: No image — skipping classification');
    }

    // ===== STEP 3: Intent detection via LLM (or forced bypass) =====
    // If caller specifies a specialist, skip LLM routing
    if (forcedSpecialistId && isKnownSpecialist(forcedSpecialistId)) {
      console.log(`[AgentService] Step 3: Forced specialist: ${forcedSpecialistId} — skipping orchestrator`);
      const forcedAgent = getAgentById(forcedSpecialistId)!;
      const forcedRouting = { primarySpecialist: forcedSpecialistId, secondarySpecialists: [], confidence: 1.0, reasoning: 'Forced specialist' };
      const forcedResult = await this.chatWithAgent(forcedAgent, contextualQuery, history, onToken, languageCode, healthProfileSummary, imageBase64, imageMimeType, imageClassification);
      if (!forcedResult.ok) return failure(forcedResult.error);
      const formatted = formatMarkdownSummary(forcedRouting, [{ agentId: forcedSpecialistId, response: forcedResult.data }], imageClassification);
      if (onToken) onToken(formatted);
      return success({ routing: forcedRouting, specialistResponses: [{ agentId: forcedSpecialistId, response: formatted }] });
    }

    console.log(
      '[AgentService] Step 3: Intent detection via LLM orchestrator...',
    );
    const routeResult = await this.routeQuery(
      contextualQuery,
      imageBase64,
      imageMimeType,
      imageClassification,
    );

    if (!routeResult.ok) {
      console.warn(
        '[AgentService] Step 3 FAILED — falling back to orchestrator agent',
      );
      const fallbackAgentId = this.getFallbackSpecialistId(
        undefined,
        imageClassification,
      );
      const fallbackAgent =
        getAgentById(fallbackAgentId) || getAgentById('general_practice')!;
      const fallbackRouting = {
        primarySpecialist: fallbackAgent.id,
        secondarySpecialists: [],
        confidence: 0,
        reasoning: 'Fallback',
      };
      const fallback = await this.chatWithAgent(
        fallbackAgent,
        contextualQuery,
        history,
        onToken,
        languageCode,
        healthProfileSummary,
        imageBase64,
        imageMimeType,
        imageClassification,
      );
      if (!fallback.ok) return failure(fallback.error);

      const formatted = formatMarkdownSummary(
        fallbackRouting,
        [{ agentId: fallbackAgent.id, response: fallback.data }],
        imageClassification,
      );
      if (onToken) onToken(formatted);

      return success({
        routing: fallbackRouting,
        specialistResponses: [
          { agentId: fallbackAgent.id, response: formatted },
        ],
      });
    }

    const routing = this.normalizeRouting(
      routeResult.data,
      imageClassification,
    );
    console.log(
      `[AgentService] Step 3 result: primary=${
        routing.primarySpecialist
      }, secondary=[${routing.secondarySpecialists?.join(', ')}], confidence=${
        routing.confidence
      }`,
    );

    // ===== STEP 4: Call specialist agents =====
    const primaryAgent =
      getAgentById(routing.primarySpecialist) || ORCHESTRATOR_AGENT;
    console.log(
      `[AgentService] Step 4: Calling primary agent: ${primaryAgent.displayName}`,
    );

    // Start primary agent (streamed to user)
    const primaryResult = await this.chatWithAgent(
      primaryAgent,
      contextualQuery,
      history,
      onToken,
      languageCode,
      healthProfileSummary,
      imageBase64,
      imageMimeType,
      imageClassification,
    );

    const responses: Array<{ agentId: string; response: string }> = [];
    if (primaryResult.ok) {
      responses.push({
        agentId: primaryAgent.id,
        response: primaryResult.data,
      });
    }

    // Call secondary agents in parallel (no streaming — they run silently)
    const secondaryIds = (routing.secondarySpecialists || []).slice(0, 2);
    if (secondaryIds.length > 0) {
      console.log(
        `[AgentService] Step 4: Calling ${secondaryIds.length} secondary agent(s) in parallel...`,
      );
      const secondaryPromises = secondaryIds.map(async agentId => {
        const agent = getAgentById(agentId);
        if (!agent) return null;
        const result = await this.chatWithAgent(
          agent,
          contextualQuery,
          history,
          undefined,
          languageCode,
          healthProfileSummary,
          // Only pass image to primary specialist
        );
        return result.ok ? { agentId, response: result.data } : null;
      });

      const settled = await Promise.allSettled(secondaryPromises);
      for (const res of settled) {
        if (res.status === 'fulfilled' && res.value) {
          responses.push(res.value);
        }
      }
    }

    // Fallback if no responses
    if (responses.length === 0) {
      console.warn(
        '[AgentService] No specialist responded — using orchestrator fallback',
      );
      const fallbackAgentId = this.getFallbackSpecialistId(
        routing.primarySpecialist,
        imageClassification,
      );
      const fallbackAgent =
        getAgentById(fallbackAgentId) || getAgentById('general_practice')!;
      const fallback = await this.chatWithAgent(
        fallbackAgent,
        contextualQuery,
        history,
        onToken,
        languageCode,
        healthProfileSummary,
        imageBase64,
        imageMimeType,
        imageClassification,
      );
      if (fallback.ok) {
        responses.push({ agentId: fallbackAgent.id, response: fallback.data });
      }
    }

    // ===== STEP 5: Format as markdown summary =====
    console.log(
      `[AgentService] Step 5: Formatting ${responses.length} response(s) as markdown`,
    );
    const finalMarkdown = formatMarkdownSummary(
      routing,
      responses,
      imageClassification,
    );

    // Push the normalized final output to the stream so the UI reflects
    // formatter cleanup even for single-specialist responses.
    if (onToken) {
      onToken(finalMarkdown);
    }

    const pipelineTime = Date.now() - pipelineStart;
    console.log(
      `[AgentService] ══════════ PIPELINE END ══════════ (${pipelineTime}ms)`,
    );

    return success({
      routing,
      specialistResponses: responses.map(r => ({
        agentId: r.agentId,
        response: finalMarkdown,
      })),
    });
  }
}

export const AgentService = new AgentServiceClass();
