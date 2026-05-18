import { registerTool } from './registry';

function phq9Scorer(args: Record<string, unknown>): string {
  const answers = (args.answers as number[]) || [];
  if (answers.length !== 9) {
    return JSON.stringify({
      error: 'PHQ-9 requires exactly 9 answers (0-3 each)',
    });
  }

  const total = answers.reduce((sum, val) => sum + val, 0);

  let severity: string;
  if (total <= 4) severity = 'Minimal or no depression';
  else if (total <= 9) severity = 'Mild depression';
  else if (total <= 14) severity = 'Moderate depression';
  else if (total <= 19) severity = 'Moderately severe depression';
  else severity = 'Severe depression';

  const q9Score = answers[8] || 0;

  return JSON.stringify({
    total_score: total,
    severity,
    max_score: 27,
    suicide_risk: q9Score > 0,
    recommendation:
      total >= 15 || q9Score > 0
        ? 'URGENT: Refer to mental health professional. Patient may need immediate support. Provide crisis helpline numbers.'
        : total >= 10
        ? 'Moderate depression: Refer for counselling or psychological support.'
        : total >= 5
        ? 'Mild symptoms: Supportive listening, encourage social connection, follow up in 2-4 weeks.'
        : 'Minimal symptoms: Reassure, provide mental health awareness information.',
  });
}

function gad7Scorer(args: Record<string, unknown>): string {
  const answers = (args.answers as number[]) || [];
  if (answers.length !== 7) {
    return JSON.stringify({
      error: 'GAD-7 requires exactly 7 answers (0-3 each)',
    });
  }

  const total = answers.reduce((sum, val) => sum + val, 0);

  let severity: string;
  if (total <= 4) severity = 'Minimal anxiety';
  else if (total <= 9) severity = 'Mild anxiety';
  else if (total <= 14) severity = 'Moderate anxiety';
  else severity = 'Severe anxiety';

  return JSON.stringify({
    total_score: total,
    severity,
    max_score: 21,
    recommendation:
      total >= 15
        ? 'Severe anxiety: Refer to mental health professional urgently.'
        : total >= 10
        ? 'Moderate anxiety: Recommend counselling, relaxation techniques, breathing exercises.'
        : total >= 5
        ? 'Mild anxiety: Suggest stress management, regular exercise, sleep hygiene.'
        : 'Minimal anxiety: Reassure and provide general wellness advice.',
  });
}

registerTool('phq9_scorer', phq9Scorer);
registerTool('gad7_scorer', gad7Scorer);
