import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

// ─── Gemma 4 / MedGemma Proxy ──────────────────────────────────────────────

export const gemma4Proxy = onCall(
  { timeoutSeconds: 120, memory: '256MiB' },
  async request => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpsError(
        'internal',
        'Gemini API key not configured. Set GEMINI_API_KEY in Cloud Functions environment.',
      );
    }

    const {
      model = 'gemma-4-26b-a4b-it',
      systemPrompt,
      userMessage,
      history = [],
      tools,
      imageBase64,
      mimeType = 'image/jpeg',
    } = request.data as {
      model?: string;
      systemPrompt?: string;
      userMessage: string;
      history?: Array<{ role: string; content: string }>;
      tools?: any[];
      imageBase64?: string;
      mimeType?: string;
    };

    if (!userMessage) {
      throw new HttpsError('invalid-argument', 'userMessage is required.');
    }

    const contents: any[] = [];

    for (const h of history.slice(-8)) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      });
    }

    const userParts: any[] = [{ text: userMessage }];
    if (imageBase64) {
      userParts.push({ inlineData: { mimeType, data: imageBase64 } });
    }
    contents.push({ role: 'user', parts: userParts });

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    };

    if (systemPrompt) {
      requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools.map((t: any) => ({
        functionDeclarations: [t],
      }));
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post(url, requestBody, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' },
      });

      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text ?? '';
      const functionCall = candidate?.content?.parts?.find(
        (p: any) => p.functionCall,
      );

      return {
        text,
        functionCall: functionCall?.functionCall ?? null,
        finishReason: candidate?.finishReason,
        model,
      };
    } catch (err: any) {
      const status = err.response?.status ?? 500;
      const message =
        err.response?.data?.error?.message ?? err.message ?? 'Gemini API error';
      console.error('[gemma4Proxy] Error:', status, message);
      throw new HttpsError('internal', message);
    }
  },
);

// ─── MedGemma Image Analysis ────────────────────────────────────────────────

export const medgemmaAnalyze = onCall(
  { timeoutSeconds: 120, memory: '256MiB' },
  async request => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpsError('internal', 'API key not configured.');
    }

    const {
      imageBase64,
      mimeType = 'image/jpeg',
      imageType = 'general',
      description = '',
    } = request.data;

    if (!imageBase64) {
      throw new HttpsError('invalid-argument', 'imageBase64 is required.');
    }

    const MODEL_MAP: Record<string, string> = {
      xray: 'medgemma-1.5-27b',
      mri: 'medgemma-1.5-27b',
      ct: 'medgemma-1.5-27b',
      skin: 'medgemma-1.5-4b',
      retina: 'medgemma-1.5-4b',
      general: 'medgemma-1.5-4b',
    };

    const model = MODEL_MAP[imageType] ?? 'medgemma-1.5-4b';

    const systemPrompt = `You are an AI medical imaging assistant (MedGemma).
Analyze the provided medical image and describe:
1. What you observe in the image
2. Any abnormal findings
3. Possible conditions or diagnoses
4. Recommended follow-up actions
Always note that this is an AI analysis and a qualified radiologist/specialist should confirm findings.`;

    const userText = description
      ? `Please analyze this ${imageType} image. Additional context: ${description}`
      : `Please analyze this ${imageType} image and describe your findings.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: userText },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 2048 },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post(url, requestBody, { timeout: 90000 });
      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return { text, model, imageType };
    } catch (err: any) {
      const message = err.response?.data?.error?.message ?? err.message;
      throw new HttpsError('internal', message);
    }
  },
);

// ─── Health Insights Generator ──────────────────────────────────────────────

export const generateHealthInsights = onCall(
  { timeoutSeconds: 60, memory: '256MiB' },
  async request => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpsError('internal', 'API key not configured.');
    }

    const { metrics, medications, profile } = request.data;

    const prompt = `You are a health analytics AI. Based on the following health data, generate 3-5 actionable health insights:

Health Metrics: ${JSON.stringify(metrics)}
Current Medications: ${JSON.stringify(medications)}
Patient Profile: ${JSON.stringify(profile)}

Generate insights in this JSON format:
{
  "insights": [
    {
      "title": "Insight title",
      "description": "Detailed explanation",
      "priority": "high|medium|low",
      "category": "lifestyle|medication|monitoring|diet|exercise",
      "action": "Specific recommended action"
    }
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post(
        url,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
        },
        { timeout: 30000 },
      );

      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [] };
      return insights;
    } catch (err: any) {
      throw new HttpsError('internal', err.message);
    }
  },
);

// ─── Tool Execution Functions ───────────────────────────────────────────────

export const executeTool = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { toolName, args } = request.data as {
    toolName: string;
    args: Record<string, any>;
  };
  const db = admin.firestore();

  switch (toolName) {
    case 'store_patient_data': {
      await db
        .collection('patients')
        .doc(request.auth.uid)
        .set(args, { merge: true });
      return { success: true, message: 'Patient data stored.' };
    }
    case 'get_patient_history': {
      const patientDoc = await db
        .collection('patients')
        .doc(request.auth.uid)
        .get();
      return patientDoc.exists
        ? patientDoc.data()
        : { message: 'No patient history found.' };
    }
    case 'schedule_reminder': {
      const reminder = {
        ...args,
        userId: request.auth.uid,
        createdAt: Date.now(),
      };
      await db.collection('reminders').add(reminder);
      return {
        success: true,
        message: `Reminder scheduled for ${args.time ?? 'unspecified time'}.`,
      };
    }
    case 'find_nearby_hospitals': {
      const snap = await db.collection('hospitals').limit(10).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    default:
      throw new HttpsError(
        'unimplemented',
        `Tool ${toolName} not implemented in Cloud Functions.`,
      );
  }
});

// ─── Batch Sync User Data ───────────────────────────────────────────────────

export const syncUserData = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { outboxEntries } = request.data as { outboxEntries: any[] };
  const db = admin.firestore();
  const userId = request.auth.uid;
  const batch = db.batch();

  for (const entry of outboxEntries ?? []) {
    const ref = db
      .collection('users')
      .doc(userId)
      .collection(entry.entity)
      .doc(entry.entityId);
    if (entry.operation === 'upsert') {
      batch.set(ref, JSON.parse(entry.payload), { merge: true });
    } else if (entry.operation === 'delete') {
      batch.delete(ref);
    }
  }

  await batch.commit();
  return { success: true, processed: outboxEntries?.length ?? 0 };
});
