import { registerTool } from './registry';

function hypertensionGuideline(args: Record<string, unknown>): string {
  const stage = String(args.stage || 'stage1').toLowerCase();
  const guidelines: Record<string, any> = {
    stage1: {
      description: 'Stage 1 Hypertension (140-159 / 90-99 mmHg)',
      steps: [
        'Lifestyle modifications for 3-6 months',
        'Reduce salt intake to <5 g/day',
        'Regular physical activity (30 min/day)',
        'Weight reduction if overweight',
        'If BP not controlled: start thiazide diuretic or ACE inhibitor',
      ],
    },
    stage2: {
      description: 'Stage 2 Hypertension (>=160 / >=100 mmHg)',
      steps: [
        'Start antihypertensive medication immediately',
        'Thiazide diuretic + ACE inhibitor or ARB',
        'Add calcium channel blocker if needed',
        'Lifestyle modifications concurrently',
        'Monitor renal function and electrolytes',
        'Refer to physician for management',
      ],
    },
    emergency: {
      description: 'Hypertensive Emergency (>=180/120 with organ damage)',
      steps: [
        'EMERGENCY: Refer to hospital immediately',
        'Do not lower BP rapidly at home',
        'Symptoms may include severe headache, chest pain, vision changes',
        'Requires IV antihypertensives in hospital setting',
      ],
    },
  };
  return JSON.stringify(guidelines[stage] || guidelines.stage1);
}

function manageChronicDisease(args: Record<string, unknown>): string {
  const disease = String(args.disease || '').toLowerCase();
  const plans: Record<string, any> = {
    diabetes: {
      steps: [
        'Check fasting glucose and HbA1c every 3 months',
        'Foot examination at each visit',
        'Yearly eye examination',
        'Blood pressure control (<130/80)',
        'Diet: low carbohydrate, high fiber',
        'Exercise: 30 min brisk walking 5 days/week',
        'Medication adherence crucial',
      ],
      danger_signs: [
        'Glucose >300 mg/dL with symptoms',
        'Ketones in urine (type 1)',
        'Non-healing foot ulcer',
        'Sudden vision changes',
      ],
    },
    hypertension: {
      steps: [
        'Check BP at every visit',
        'Annual renal function and electrolytes',
        'Lifestyle: DASH diet, limit salt',
        'Medication as prescribed',
        'Monitor for side effects',
      ],
      danger_signs: [
        'BP >180/120 mmHg',
        'Chest pain',
        'Severe headache with vision changes',
        'Shortness of breath',
      ],
    },
    copd: {
      steps: [
        'Smoking cessation critical',
        'Inhaler technique review',
        'Pulmonary rehabilitation if available',
        'Annual influenza vaccine',
        'Early treatment of exacerbations',
      ],
      danger_signs: [
        'Increased shortness of breath',
        'Change in sputum colour/volume',
        'Fever',
        'Confusion or drowsiness (CO2 retention)',
      ],
    },
    heart_failure: {
      steps: [
        'Daily weight monitoring',
        'Fluid restriction (1.5-2 L/day)',
        'Low salt diet',
        'Medication adherence essential',
        'Regular follow-up',
      ],
      danger_signs: [
        'Weight gain >2 kg in 2 days',
        'Increased shortness of breath when lying down',
        'Swelling in legs worsening',
        'Persistent cough',
      ],
    },
  };

  const plan = plans[disease] || plans.diabetes;
  return JSON.stringify({ disease: args.disease, ...plan });
}

registerTool('hypertension_guideline', hypertensionGuideline);
registerTool('manage_chronic_disease', manageChronicDisease);
