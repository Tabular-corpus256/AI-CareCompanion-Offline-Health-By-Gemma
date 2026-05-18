import Share from 'react-native-share';
import { buildReportPdf } from '@utils/PdfBuilder';
import { LlmService } from './LlmService';
import { DatabaseService } from './DatabaseService';
import type { AgentMessage } from '@types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReportSection {
  title: string;
  content: string;
}

export type ReportType = 'both';  // always generate both; UI shows tabs

export interface ChatReport {
  id: string;
  conversationId: string;
  type: ReportType;
  title: string;
  contentClinical: ReportSection[];
  contentPatient: ReportSection[];
  pdfPath: string | null;
  messageCount: number;
  createdAt: number;
  userId: string;
}

// ─── Token / context helpers ──────────────────────────────────────────────────

const CHARS_PER_TOKEN = 4;
const REPORT_TOKEN_LIMIT = 100_000;  // ~400K chars of conversation

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function getContextStats(messages: AgentMessage[]): {
  totalMessages: number;
  includedMessages: number;
  totalTokens: number;
  includedTokens: number;
} {
  const nonSystem = messages.filter(m => m.role !== 'system');
  const included = buildContextMessages(messages);
  const totalTokens = nonSystem.reduce((s, m) => s + estimateTokens(m.content), 0);
  const includedTokens = included.reduce((s, m) => s + estimateTokens(m.content), 0);
  return {
    totalMessages: nonSystem.length,
    includedMessages: included.length,
    totalTokens,
    includedTokens,
  };
}

function buildContextMessages(messages: AgentMessage[]): AgentMessage[] {
  let tokens = 0;
  const result: AgentMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'system') continue;
    const t = estimateTokens(messages[i].content);
    if (tokens + t > REPORT_TOKEN_LIMIT) break;
    result.unshift(messages[i]);
    tokens += t;
  }
  return result;
}

// ─── Report generation prompt ─────────────────────────────────────────────────

function buildPrompt(conversationText: string, profileSummary: string): string {
  return `You are a medical documentation specialist. Based on the health consultation conversation below, generate a structured report in TWO formats.

PATIENT PROFILE:
${profileSummary || 'Not provided'}

CONVERSATION:
${conversationText}

Generate ONLY a valid JSON object (no markdown, no code blocks, no extra text) with this EXACT structure:
{
  "title": "Health Consultation Report — [1-4 word topic summary]",
  "clinical": {
    "sections": [
      {"title": "Chief Complaint & Presentation", "content": "..."},
      {"title": "History & Symptoms", "content": "..."},
      {"title": "Assessment & Differential Diagnosis", "content": "..."},
      {"title": "Recommendations & Treatment Plan", "content": "..."},
      {"title": "Red Flags & Urgency Indicators", "content": "..."},
      {"title": "Follow-up & Monitoring", "content": "..."}
    ]
  },
  "patient": {
    "sections": [
      {"title": "What We Discussed", "content": "..."},
      {"title": "Key Health Findings", "content": "..."},
      {"title": "Action Steps for You", "content": "..."},
      {"title": "Medications & Supplements Mentioned", "content": "..."},
      {"title": "When to Seek Urgent Care", "content": "..."},
      {"title": "Lifestyle & Wellness Tips", "content": "..."}
    ]
  }
}

Rules:
- Clinical sections: professional medical terminology, suitable for a healthcare provider
- Patient sections: plain everyday language, no medical jargon
- If something was not discussed, write exactly: "Not discussed in this consultation"
- Be thorough but concise (2-5 sentences per section)
- Output ONLY the raw JSON — no markdown fences, no preamble`;
}

// Generates a real binary PDF using jsPDF (pure JS — no native module, no NPE).
async function generateReportFile(report: ChatReport, profileSummary: string): Promise<string> {
  return buildReportPdf(report, profileSummary);
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

function parseReport(row: any): ChatReport {
  let contentClinical: ReportSection[] = [];
  let contentPatient: ReportSection[] = [];
  try { contentClinical = JSON.parse(row.content_clinical || '[]'); } catch {}
  try { contentPatient = JSON.parse(row.content_patient || '[]'); } catch {}
  return {
    id: row.id,
    conversationId: row.conversation_id,
    type: 'both',
    title: row.title,
    contentClinical,
    contentPatient,
    pdfPath: row.pdf_path || null,
    messageCount: row.message_count || 0,
    createdAt: Number(row.created_at),
    userId: row.user_id,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

class ReportServiceClass {
  async generateReport(
    conversationId: string,
    conversationTitle: string,
    messages: AgentMessage[],
    profileSummary: string,
  ): Promise<ChatReport> {
    const contextMessages = buildContextMessages(messages);
    if (contextMessages.length === 0) {
      throw new Error('No messages to generate a report from. Start a conversation first.');
    }

    const conversationText = contextMessages
      .map(m => {
        const role = m.role === 'user' ? 'Patient' : `AI Doctor (${m.agentDisplayName || 'Health Assistant'})`;
        const img = m.imageUri ? ' [Image was attached]' : '';
        return `${role}${img}:\n${m.content}`;
      })
      .join('\n\n---\n\n');

    const prompt = buildPrompt(conversationText, profileSummary);
    const result = await LlmService.generateResponse(prompt);
    if (!result.ok) throw new Error(result.error || 'AI failed to generate report');

    const jsonMatch = result.data.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid report format received from AI');

    let parsed: any;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { throw new Error('Could not parse report JSON'); }

    const clinicalSections: ReportSection[] = (parsed?.clinical?.sections || []).filter(
      (s: any) => s?.title && s?.content,
    );
    const patientSections: ReportSection[] = (parsed?.patient?.sections || []).filter(
      (s: any) => s?.title && s?.content,
    );
    if (clinicalSections.length === 0 && patientSections.length === 0) {
      throw new Error('Report generation returned empty sections');
    }

    const reportTitle = (parsed?.title as string) || `${conversationTitle} — Health Report`;
    const userId = DatabaseService.getCurrentUserId();
    const id = DatabaseService.uuid();
    const now = Date.now();

    const report: ChatReport = {
      id,
      conversationId,
      type: 'both',
      title: reportTitle,
      contentClinical: clinicalSections,
      contentPatient: patientSections,
      pdfPath: null,
      messageCount: contextMessages.length,
      createdAt: now,
      userId,
    };

    // Persist to DB
    await DatabaseService.execute(
      `INSERT INTO chat_reports (id, conversation_id, type, title, content_clinical, content_patient, pdf_path, message_count, created_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, conversationId, 'both', reportTitle,
        JSON.stringify(clinicalSections),
        JSON.stringify(patientSections),
        null,
        contextMessages.length,
        now,
        userId,
      ],
    );

    // Generate PDF (or HTML fallback) — never throws
    const filePath = await generateReportFile(report, profileSummary);
    report.pdfPath = filePath;
    await DatabaseService.execute(
      'UPDATE chat_reports SET pdf_path = ? WHERE id = ?',
      [filePath, id],
    );

    return report;
  }

  async getReportsForConversation(conversationId: string): Promise<ChatReport[]> {
    const rows = await DatabaseService.query<any>(
      'SELECT * FROM chat_reports WHERE conversation_id = ? ORDER BY created_at DESC',
      [conversationId],
    );
    return rows.map(parseReport);
  }

  async deleteReport(id: string): Promise<void> {
    await DatabaseService.execute('DELETE FROM chat_reports WHERE id = ?', [id]);
  }

  async shareReport(report: ChatReport, profileSummary: string): Promise<void> {
    let filePath = report.pdfPath;

    // Force regenerate if it's using any old path logic, we ONLY want base64 URIs now
    if (!filePath || filePath.startsWith('file://')) {
      filePath = await generateReportFile(report, profileSummary);
      await DatabaseService.execute(
        'UPDATE chat_reports SET pdf_path = ? WHERE id = ?',
        [filePath, report.id],
      );
    }

    const safeName = report.title.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'HealthReport';

    await Share.open({
      url: filePath,
      type: 'application/pdf',
      title: report.title,
      filename: safeName,
      useInternalStorage: true,
    });
  }
}

export const ReportService = new ReportServiceClass();
