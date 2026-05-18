/**
 * PdfBuilder — generates a styled binary PDF using jspdf (pure JS, no native code).
 *
 * jsPDF uses pt units, A4 page (595 × 842 pt), coordinates from top-left.
 * Built-in fonts: 'helvetica' normal/bold — no embedding needed, always available.
 */

import type { ChatReport, ReportSection } from '@services/ReportService';

// ─── Colours (0-255) ──────────────────────────────────────────────────────────
const C = {
  primary:  [13,  124, 102] as [number,number,number],   // #0D7C66
  clinical: [192,  57,  43] as [number,number,number],   // #C0392B
  patient:  [ 46, 125,  50] as [number,number,number],   // #2E7D32
  dark:     [ 26,  26,  46] as [number,number,number],   // #1A1A2E
  gray:     [ 85,  85,  85] as [number,number,number],
  lightbg:  [240, 250, 247] as [number,number,number],   // #F0FAF7 patient card
  warnbg:   [255, 248, 225] as [number,number,number],
  warnbdr:  [243, 156,  18] as [number,number,number],
  warntext: [127,  79,   0] as [number,number,number],
  white:    [255, 255, 255] as [number,number,number],
};

// Light tint: add 160 to each channel (clamped)
function tint(c: [number,number,number]): [number,number,number] {
  return c.map(v => Math.min(255, v + 160)) as [number,number,number];
}

const PG_W  = 595;
const PG_H  = 842;
const ML    = 48;   // margin left
const MR    = 48;   // margin right
const MT    = 60;   // margin top (first content y)
const MB    = 55;   // margin bottom
const CW    = PG_W - ML - MR;   // 499 pt content width

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1] ?? 0, b2 = bytes[i + 2] ?? 0;
    result += B64[b0 >> 2];
    result += B64[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? B64[((b1 & 0xf) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < bytes.length ? B64[b2 & 0x3f] : '=';
  }
  return result;
}

export async function buildReportPdf(
  report: ChatReport,
  profileSummary: string,
): Promise<string> {
  // ── Polyfills jsPDF expects in a browser-like env ─────────────────────────
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const g = globalThis as any;
  if (!g.window)   g.window   = g;
  if (!g.document) g.document = { createElement: () => ({ getContext: () => null, style: {} }) };
  /* eslint-enable */

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jsPDF } = require('jspdf');

  const doc: any = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

  let y = 0;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const font = (bold: boolean, size: number) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
  };
  const textColor = (c: [number,number,number]) => doc.setTextColor(...c);
  const fillColor = (c: [number,number,number]) => doc.setFillColor(...c);
  const drawColor = (c: [number,number,number]) => doc.setDrawColor(...c);
  const lineW    = (w: number) => doc.setLineWidth(w);

  // Check remaining space; add a new page if needed
  const checkPage = (needed: number) => {
    if (y + needed > PG_H - MB) {
      doc.addPage();
      y = MT;
    }
  };

  // Draw wrapped text, returns final y after all lines
  const wrappedText = (
    text: string,
    x: number,
    startY: number,
    maxW: number,
    lineH: number,
  ): number => {
    const lines: string[] = doc.splitTextToSize(text, maxW);
    let cy = startY;
    for (const line of lines) {
      checkPage(lineH);
      doc.text(line, x, cy);
      cy += lineH;
    }
    return cy;
  };

  // ── HEADER BAR ────────────────────────────────────────────────────────────
  fillColor(C.primary);
  doc.rect(0, 0, PG_W, 78, 'F');

  font(true, 19);
  textColor(C.white);
  doc.text(report.title, ML, 30);

  const date = new Date(report.createdAt).toLocaleDateString('en', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  font(false, 8.5);
  textColor([220, 245, 238] as [number,number,number]);
  doc.text(
    `Generated ${date}  ·  ${report.messageCount} messages  ·  CareCompanion AI`,
    ML,
    50,
  );

  y = 90;

  // ── PATIENT INFO CARD ────────────────────────────────────────────────────
  const profileLines = profileSummary
    ? profileSummary.split('\n').map(l => l.trim()).filter(Boolean)
    : [];

  if (profileLines.length > 0) {
    const cardH = 14 + profileLines.length * 13 + 10;
    fillColor(C.lightbg);
    drawColor(C.primary);
    lineW(1.5);
    doc.roundedRect(ML, y, CW, cardH, 4, 4, 'FD');

    font(true, 9.5);
    textColor(C.primary);
    doc.text('Patient Information', ML + 10, y + 13);

    font(false, 9);
    textColor(C.gray);
    profileLines.forEach((line, i) => {
      doc.text(line, ML + 10, y + 13 + (i + 1) * 13);
    });

    y += cardH + 14;
  }

  // ── DRAW REPORT TYPE (clinical or patient) ────────────────────────────────
  const drawReportType = (
    label: string,
    badgeLabel: string,
    sections: ReportSection[],
    accent: [number,number,number],
  ) => {
    if (sections.length === 0) return;

    checkPage(50);

    // Type heading
    font(true, 14);
    textColor(C.dark);
    doc.text(label, ML, y);
    y += 6;

    // Divider under type heading
    drawColor(accent);
    lineW(2);
    doc.line(ML, y, ML + CW, y);
    lineW(0.5);
    y += 10;

    // Badge pill
    fillColor(tint(accent));
    drawColor(tint(accent));
    doc.roundedRect(ML, y, 145, 16, 8, 8, 'FD');
    font(true, 7.5);
    textColor(accent);
    doc.text(badgeLabel, ML + 10, y + 11);
    y += 24;

    // Sections
    sections.forEach(section => {
      checkPage(55);

      font(true, 9.5);
      textColor(accent);
      doc.text(section.title.toUpperCase(), ML, y);
      y += 4;

      drawColor(accent);
      lineW(0.8);
      doc.line(ML, y, ML + CW, y);
      lineW(0.5);
      y += 9;

      font(false, 10);
      textColor(C.dark);
      y = wrappedText(section.content, ML, y, CW, 14);
      y += 12;
    });

    y += 8;
  };

  drawReportType(
    'Clinical Report',
    'FOR HEALTHCARE PROVIDER',
    report.contentClinical,
    C.clinical,
  );

  drawReportType(
    'Patient Summary',
    'PATIENT COPY',
    report.contentPatient,
    C.patient,
  );

  // ── DISCLAIMER ───────────────────────────────────────────────────────────
  checkPage(55);
  fillColor(C.warnbg);
  drawColor(C.warnbdr);
  lineW(3);
  const disc = 'Disclaimer: This report is AI-generated for informational purposes only. It is not medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions.';
  const discLines: string[] = doc.splitTextToSize(disc, CW - 14);
  const boxH = discLines.length * 12 + 14;
  doc.rect(ML, y, CW, boxH, 'FD');
  lineW(0.5);

  font(false, 8.5);
  textColor(C.warntext);
  discLines.forEach((line: string, i: number) => {
    doc.text(line, ML + 8, y + 12 + i * 12);
  });

  y += boxH + 10;

  // Footer line
  checkPage(20);
  drawColor([200, 200, 200] as [number,number,number]);
  doc.line(ML, y, ML + CW, y);
  y += 10;
  font(false, 8);
  textColor(C.gray);
  doc.text(`CareCompanion AI Health Assistant  ·  ${date}`, ML, y);

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const pdfBuf: ArrayBuffer = doc.output('arraybuffer');
  const base64 = arrayBufferToBase64(pdfBuf);

  return `data:application/pdf;base64,${base64}`;
}

export async function buildProfilePdf(
  profile: any,
): Promise<string> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const g = globalThis as any;
  if (!g.window)   g.window   = g;
  if (!g.document) g.document = { createElement: () => ({ getContext: () => null, style: {} }) };
  /* eslint-enable */

  const { jsPDF } = require('jspdf');

  const doc: any = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

  let y = 0;

  const font = (bold: boolean, size: number) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
  };
  const textColor = (c: [number,number,number]) => doc.setTextColor(...c);
  const fillColor = (c: [number,number,number]) => doc.setFillColor(...c);
  const drawColor = (c: [number,number,number]) => doc.setDrawColor(...c);
  const lineW    = (w: number) => doc.setLineWidth(w);

  const checkPage = (needed: number) => {
    if (y + needed > PG_H - MB) {
      doc.addPage();
      y = MT;
    }
  };

  const wrappedText = (
    text: string,
    x: number,
    startY: number,
    maxW: number,
    lineH: number,
  ): number => {
    const lines: string[] = doc.splitTextToSize(text, maxW);
    let cy = startY;
    for (const line of lines) {
      checkPage(lineH);
      doc.text(line, x, cy);
      cy += lineH;
    }
    return cy;
  };

  fillColor(C.primary);
  doc.rect(0, 0, PG_W, 78, 'F');

  font(true, 19);
  textColor(C.white);
  doc.text(`Health Profile: ${profile.name || 'Unknown Patient'}`, ML, 30);

  const date = new Date().toLocaleDateString('en', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  font(false, 8.5);
  textColor([220, 245, 238] as [number,number,number]);
  doc.text(`Generated ${date}  ·  CareCompanion AI`, ML, 50);

  y = 100;

  const drawSection = (title: string, items: {label: string, value: string}[]) => {
    checkPage(40);
    font(true, 14);
    textColor(C.dark);
    doc.text(title, ML, y);
    y += 6;

    drawColor(C.primary);
    lineW(2);
    doc.line(ML, y, ML + CW, y);
    lineW(0.5);
    y += 15;

    items.forEach(item => {
      checkPage(20);
      font(true, 10);
      textColor(C.gray);
      doc.text(`${item.label}:`, ML, y);
      font(false, 10);
      textColor(C.dark);
      y = wrappedText(item.value, ML + 100, y, CW - 100, 14);
      y += 8;
    });
    y += 10;
  };

  drawSection('Personal Information', [
    { label: 'Age', value: profile.age?.toString() || '--' },
    { label: 'Gender', value: profile.gender || '--' },
    { label: 'Location', value: `${profile.city || '--'}, ${profile.district || '--'}` },
    { label: 'Language', value: profile.preferredLanguage || '--' },
  ]);

  drawSection('Vitals & Biometrics', [
    { label: 'Height', value: `${profile.heightCm || '--'} cm` },
    { label: 'Weight', value: `${profile.weightKg || '--'} kg` },
    { label: 'Blood Group', value: profile.bloodGroup || '--' },
  ]);

  drawSection('Medical History', [
    { label: 'Conditions', value: (profile.conditions || []).join(', ') || 'None reported' },
    { label: 'Allergies', value: (profile.allergies || []).join(', ') || 'None reported' },
    { label: 'Family History', value: (profile.familyHistory || []).join(', ') || 'None reported' },
  ]);

  const medsStr = (!profile.currentMedications || profile.currentMedications.length === 0) 
    ? 'No medications recorded.' 
    : profile.currentMedications.map((m: any) => `${m.name} - ${m.dosage} (${m.frequency})`).join('\n');
  
  drawSection('Current Medications', [
    { label: 'Medications', value: medsStr },
  ]);

  drawSection('Lifestyle', [
    { label: 'Smoker', value: profile.smoker ? `Yes (${profile.smokingFrequency || ''})` : 'No' },
    { label: 'Alcohol', value: profile.alcoholUse ? `Yes (${profile.alcoholFrequency || ''})` : 'No' },
    { label: 'Activity Level', value: profile.exerciseLevel || '--' },
    { label: 'Diet', value: profile.dietType || '--' },
  ]);

  drawSection('Emergency Contact', [
    { label: 'Name', value: profile.emergencyContactName || '--' },
    { label: 'Relationship', value: profile.emergencyContactRelation || '--' },
    { label: 'Phone', value: profile.emergencyContactPhone || '--' },
  ]);

  checkPage(20);
  drawColor([200, 200, 200] as [number,number,number]);
  doc.line(ML, y, ML + CW, y);
  y += 10;
  font(false, 8);
  textColor(C.gray);
  doc.text(`CareCompanion AI Health Assistant  ·  ${date}`, ML, y);

  const pdfBuf: ArrayBuffer = doc.output('arraybuffer');
  const base64 = arrayBufferToBase64(pdfBuf);

  return `data:application/pdf;base64,${base64}`;
}
