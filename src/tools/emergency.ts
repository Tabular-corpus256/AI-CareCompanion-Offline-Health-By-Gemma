import { registerTool } from './registry';

function assessUrgency(args: Record<string, unknown>): string {
  const symptoms = String(args.symptoms || '').toLowerCase();

  const emergencyKeywords = [
    'chest pain',
    'cannot breathe',
    'difficulty breathing',
    'shortness of breath',
    'severe bleeding',
    'unconscious',
    'seizure',
    'seizures',
    'convulsions',
    'poisoning',
    'snake bite',
    'stroke',
    'one-sided weakness',
    'facial droop',
    'cannot speak',
    'sudden severe headache',
    'chemical injury',
    'anaphylaxis',
    'swelling of tongue',
  ];

  const urgentKeywords = [
    'high fever',
    'vomiting blood',
    'blood in stool',
    'severe pain',
    'dehydration',
    'not passing urine',
    'altered consciousness',
    'confused',
    'lethargic',
    'fast breathing',
    'neck stiffness',
    'photophobia',
    'jaundice',
  ];

  const hasEmergency = emergencyKeywords.some(kw => symptoms.includes(kw));
  if (hasEmergency) {
    return JSON.stringify({
      urgency: 'high',
      action: 'emergency',
      advice:
        'IMMEDIATE EMERGENCY REFERRAL NEEDED. Call emergency services or go to nearest hospital immediately.',
    });
  }

  const hasUrgent = urgentKeywords.some(kw => symptoms.includes(kw));
  if (hasUrgent) {
    return JSON.stringify({
      urgency: 'medium',
      action: 'clinic visit',
      advice:
        'Urgent medical attention needed within 24 hours. Go to nearest clinic or hospital.',
    });
  }

  return JSON.stringify({
    urgency: 'low',
    action: 'home care',
    advice:
      'Symptoms appear manageable at home. Monitor for worsening. Seek care if symptoms persist beyond 48 hours or new symptoms develop.',
  });
}

function strokeScale(args: Record<string, unknown>): string {
  const s = String(args.symptoms || '').toLowerCase();
  const face =
    s.includes('face') ||
    s.includes('facial') ||
    s.includes('droop') ||
    s.includes('smile')
      ? 1
      : 0;
  const arm =
    s.includes('arm') ||
    s.includes('weakness') ||
    s.includes('one side') ||
    s.includes('one-sided')
      ? 1
      : 0;
  const speech =
    s.includes('speech') ||
    s.includes('talk') ||
    s.includes('slurred') ||
    s.includes('cannot speak')
      ? 1
      : 0;
  const time =
    s.includes('sudden') ||
    s.includes('acute') ||
    s.includes('minutes') ||
    s.includes('hours')
      ? 1
      : 0;

  const totalScore = face + arm + speech + time;

  return JSON.stringify({
    fast_score: totalScore,
    max_score: 4,
    face_droop: face === 1,
    arm_weakness: arm === 1,
    speech_difficulty: speech === 1,
    time_critical: time === 1,
    recommendation:
      totalScore >= 3
        ? 'STROKE LIKELY - Act FAST. Call emergency services immediately. Note time of symptom onset.'
        : totalScore >= 1
        ? 'Possible stroke/TIA. Urgent medical evaluation needed.'
        : 'Low suspicion for stroke based on FAST screen. Consider other causes.',
  });
}

function emergencyTriage(args: Record<string, unknown>): string {
  const symptoms = String(args.symptoms || '').toLowerCase();
  const actions: string[] = [];
  const criticalConditions: string[] = [];

  if (symptoms.includes('chest pain') || symptoms.includes('heart attack')) {
    criticalConditions.push('Suspected Myocardial Infarction');
    actions.push('Keep patient sitting upright, calm, and still');
    actions.push('Give aspirin 300 mg to chew (if not allergic)');
    actions.push('Do NOT give anything else by mouth');
  }

  if (
    symptoms.includes('cannot breathe') ||
    symptoms.includes('choking') ||
    symptoms.includes('respiratory distress')
  ) {
    criticalConditions.push('Respiratory Emergency');
    actions.push('Ensure open airway');
    actions.push('If choking: perform Heimlich manoeuvre or back blows');
    actions.push('Do NOT attempt blind finger sweep');
  }

  if (symptoms.includes('bleeding') || symptoms.includes('haemorrhage')) {
    criticalConditions.push('Active Haemorrhage');
    actions.push('Apply direct firm pressure with clean cloth');
    actions.push('Elevate bleeding limb above heart level');
    actions.push('Do NOT remove impaled objects');
  }

  if (
    symptoms.includes('seizure') ||
    symptoms.includes('convulsion') ||
    symptoms.includes('fitting')
  ) {
    criticalConditions.push('Active Seizure');
    actions.push('Clear area of dangerous objects');
    actions.push('Do NOT restrain or put anything in mouth');
    actions.push(
      'Time the seizure - if >5 minutes, this is status epilepticus',
    );
    actions.push('After seizure: place in recovery position');
  }

  if (!criticalConditions.length) {
    criticalConditions.push('General Emergency');
    actions.push('Assess ABC: Airway, Breathing, Circulation');
    actions.push(
      'Check consciousness - AVPU scale (Alert, Voice, Pain, Unresponsive)',
    );
    actions.push('If unresponsive and not breathing normally: start CPR');
  }

  return JSON.stringify({
    call_emergency: 'CALL EMERGENCY SERVICES IMMEDIATELY (108/112/911)',
    conditions: criticalConditions,
    while_waiting: actions,
    prepare_for_transport:
      'Gather patient medications, relevant medical history, and ID. Arrange transport to nearest emergency facility.',
  });
}

function poisonControl(args: Record<string, unknown>): string {
  const substance = String(args.substance || '').toLowerCase();
  const ingestionTime = args.ingestion_time
    ? String(args.ingestion_time)
    : 'unknown';

  const poisonMap: Record<string, any> = {
    paracetamol: {
      antidote: 'N-acetylcysteine (NAC) - hospital only',
      firstAid:
        'Do NOT induce vomiting. Go to hospital immediately. Activated charcoal if within 1 hour and patient alert. NAC must be given within 8 hours for best results.',
      danger:
        'Liver failure risk increases with time. Delayed treatment is dangerous.',
    },
    kerosene: {
      antidote: 'None specific. Supportive care.',
      firstAid:
        'Do NOT induce vomiting (aspiration risk). Do NOT give milk/water. Keep upright. Go to hospital immediately.',
      danger:
        'Aspiration pneumonia is major risk. Respiratory distress can develop.',
    },
    pesticide: {
      antidote: 'Atropine + Pralidoxime (for organophosphates) - hospital only',
      firstAid:
        'Remove contaminated clothing. Wash skin with soap and water. Do NOT induce vomiting if ingested. Go to hospital immediately with container.',
      danger:
        'Organophosphates can cause respiratory failure rapidly. Time-critical.',
    },
    'rat poison': {
      antidote: 'Vitamin K (hospital). Fresh frozen plasma if severe.',
      firstAid:
        'Go to hospital. Take the poison container. Bleeding may not appear for 24-48 hours.',
      danger: 'Delayed bleeding risk. Monitor for bruising, bleeding gums.',
    },
    bleach: {
      antidote: 'None specific.',
      firstAid:
        'Do NOT induce vomiting. Rinse mouth with water. If on skin/eyes: flush with water for 15 minutes. Go to hospital for significant ingestion.',
      danger: 'Corrosive injury to oesophagus. Do NOT neutralise.',
    },
    alcohol: {
      antidote: 'None specific. Supportive care.',
      firstAid:
        'Keep warm. Turn on side if vomiting (aspiration prevention). Go to hospital if unconscious or very confused.',
      danger: 'Hypoglycaemia risk. Monitor breathing.',
    },
    'sleeping pills': {
      antidote: 'Flumazenil (for benzodiazepines) - hospital only',
      firstAid:
        'Go to hospital immediately. Keep person awake if possible. Place in recovery position if drowsy.',
      danger: 'Respiratory depression risk. Do not leave person alone.',
    },
  };

  const info = poisonMap[substance] || {
    antidote: 'Unknown. Call poison control centre.',
    firstAid:
      'Remove person from exposure. If ingested, do NOT induce vomiting unless instructed. Take container to hospital. Call emergency services.',
    danger:
      'Unknown substance - treat as emergency. Watch for breathing difficulty, seizures, or loss of consciousness.',
  };

  return JSON.stringify({
    substance: args.substance,
    ingestion_time: ingestionTime,
    antidote: info.antidote,
    first_aid: info.firstAid,
    danger_warning: info.danger,
    general_advice:
      'CALL EMERGENCY SERVICES IMMEDIATELY. While waiting: keep person calm and still, place in recovery position if drowsy, do NOT give anything by mouth unless directed, take the poison container to the hospital.',
  });
}

function rehydrationPlan(args: Record<string, unknown>): string {
  const age = Number(args.age);
  const weight = Number(args.weight);
  const diarrhoeaSeverity = String(args.diarrhoea_severity || '').toLowerCase();

  const orsRecipe =
    'Homemade ORS: 1 litre clean water + 6 level teaspoons sugar + 1/2 level teaspoon salt. Mix well. Use within 24 hours. Alternatively, use WHO ORS sachets if available.';

  if (diarrhoeaSeverity === 'severe' || diarrhoeaSeverity === 'some') {
    const vol = weight * 75;
    return JSON.stringify({
      plan: 'Plan B (Some dehydration)',
      ors_volume_ml: vol,
      administration:
        age < 2
          ? 'Give ORS by spoon or cup: 50-100 ml per loose stool. If breastfed, continue breastfeeding between ORS feeds.'
          : 'Give ORS by cup: 100-200 ml per loose stool. Small frequent sips.',
      ors_recipe: orsRecipe,
      zinc_supplement:
        age < 6
          ? 'Zinc 10 mg daily for 10-14 days'
          : 'Zinc 20 mg daily for 10-14 days',
      danger_signs:
        'If unable to drink, vomiting everything, or becoming lethargic - go to hospital immediately for IV fluids.',
    });
  }

  return JSON.stringify({
    plan: 'Plan A (No dehydration)',
    advice:
      'Give extra fluids after each loose stool. Continue normal feeding/breastfeeding. Avoid sugary drinks, undiluted juices, and caffeine.',
    ors_recipe: orsRecipe,
    zinc_supplement: 'Consider zinc supplementation for 10-14 days.',
    monitoring:
      'Watch for signs of dehydration: sunken eyes, dry mouth, decreased urine, irritability, skin pinch slow to return.',
  });
}

function fallRiskAssessment(args: Record<string, unknown>): string {
  const mobility = String(args.mobility || '');
  const vision = String(args.vision || '');
  const orthostasis = String(args.orthostasis || '');

  let riskScore = 0;
  const factors: string[] = [];

  if (mobility && mobility.toLowerCase() !== 'good') {
    riskScore += 2;
    factors.push('Impaired mobility: ' + mobility);
  }
  if (vision && vision.toLowerCase() !== 'good') {
    riskScore += 1;
    factors.push('Vision impairment: ' + vision);
  }
  if (orthostasis && orthostasis.toLowerCase() === 'yes') {
    riskScore += 2;
    factors.push('Orthostatic hypotension present');
  }

  const risk = riskScore >= 3 ? 'High' : riskScore >= 1 ? 'Moderate' : 'Low';

  return JSON.stringify({
    risk_level: risk,
    risk_score: riskScore,
    factors,
    recommendations:
      risk === 'High'
        ? 'HIGH FALL RISK: Remove loose rugs, install grab bars in bathroom, improve lighting, use walking aid, review medications for dizziness. Refer for physiotherapy and home safety assessment.'
        : risk === 'Moderate'
        ? 'MODERATE FALL RISK: Ensure clear pathways at home, adequate lighting, non-slip footwear, regular balance exercises.'
        : 'LOW FALL RISK: Encourage regular exercise for strength and balance. Maintain vision checks.',
  });
}

function fractureDecisionRule(args: Record<string, unknown>): string {
  const mechanism = String(args.mechanism || '');
  const swelling = Boolean(args.swelling);
  const deformity = Boolean(args.deformity);
  const pointTenderness = Boolean(args.point_tenderness);

  const redFlags = [];
  if (deformity) redFlags.push('Visible deformity');
  if (swelling) redFlags.push('Significant swelling');
  if (pointTenderness) redFlags.push('Point tenderness');

  const hasRedFlag = deformity || (swelling && pointTenderness);
  const isMajorTrauma = [
    'fall from height',
    'road accident',
    'vehicle crash',
    'severe',
    'major',
  ].some(kw => mechanism.toLowerCase().includes(kw));

  return JSON.stringify({
    xray_recommended: hasRedFlag || isMajorTrauma,
    red_flags: redFlags,
    mechanism: mechanism || 'unknown',
    immediate_care:
      'RICE protocol: Rest the injured area, Ice (20 min on/20 min off), Compression with bandage (not too tight), Elevation above heart level.',
    referral:
      hasRedFlag || isMajorTrauma
        ? 'X-RAY RECOMMENDED. Go to hospital for imaging. Possible fracture requires professional evaluation.'
        : 'Fracture unlikely based on Ottawa rules. Continue RICE and monitor. Seek care if pain worsens or ability to bear weight does not improve in 48 hours.',
  });
}

function redFlagSigns(args: Record<string, unknown>): string {
  const s = String(args.abdominal_symptoms || '').toLowerCase();
  const flags: string[] = [];

  if (
    s.includes('right lower') ||
    s.includes('right side') ||
    s.includes('appendix')
  ) {
    flags.push('Right lower quadrant pain - possible appendicitis');
  }
  if (
    s.includes('vomiting blood') ||
    s.includes('bloody vomit') ||
    s.includes('coffee ground')
  ) {
    flags.push('Haematemesis - upper GI bleeding');
  }
  if (
    s.includes('blood in stool') ||
    s.includes('black stool') ||
    s.includes('melena')
  ) {
    flags.push('GI bleeding - melena or bloody stool');
  }
  if (s.includes('bilious') || s.includes('green vomit')) {
    flags.push('Bilious vomiting - possible intestinal obstruction');
  }
  if (
    s.includes('distended') ||
    s.includes('swollen belly') ||
    s.includes('bloated')
  ) {
    flags.push('Abdominal distension - possible obstruction');
  }
  if (
    s.includes('cannot pass stool') ||
    s.includes('not passed stool') ||
    s.includes('constipated days')
  ) {
    flags.push('Obstipation - possible obstruction');
  }

  return JSON.stringify({
    red_flags: flags,
    has_red_flag: flags.length > 0,
    recommendation:
      flags.length > 0
        ? 'RED FLAGS PRESENT: Urgent surgical evaluation needed. Go to hospital. Do not give food or drink. Possible surgical emergency.'
        : 'No major red flags detected. Consider dietary adjustment (BRAT diet: Banana, Rice, Applesauce, Toast). Seek care if symptoms worsen.',
  });
}

function tbScreening(args: Record<string, unknown>): string {
  const coughWeeks = Number(args.cough_duration);
  const fever = Boolean(args.fever);
  const nightSweats = Boolean(args.night_sweats);
  const weightLoss = Boolean(args.weight_loss);

  const flags = [coughWeeks >= 2, fever, nightSweats, weightLoss]
    .map(f => (f ? 1 : 0) as number)
    .reduce((a, b) => a + b, 0);

  let risk: string;
  let recommendation: string;

  if (flags >= 3) {
    risk = 'High';
    recommendation =
      'High likelihood of TB. Refer for sputum AFB/GeneXpert testing. If positive, start DOTS immediately. Screen household contacts.';
  } else if (flags >= 2) {
    risk = 'Moderate';
    recommendation =
      'Moderate suspicion for TB. Refer for sputum examination and chest X-ray if available. Monitor weight.';
  } else if (flags === 1) {
    risk = 'Low';
    recommendation =
      'Low suspicion but possible. If cough persists beyond 2 more weeks, consider TB screening. Other causes likely (post-viral, asthma, allergies).';
  } else {
    risk = 'Minimal';
    recommendation =
      'TB unlikely based on current symptoms. Address other possible causes of cough.';
  }

  return JSON.stringify({
    risk_level: risk,
    flags_present: flags,
    flags: {
      cough_weeks: coughWeeks,
      fever,
      night_sweats: nightSweats,
      weight_loss: weightLoss,
    },
    recommendation,
  });
}

registerTool('assess_urgency', assessUrgency);
registerTool('stroke_scale', strokeScale);
registerTool('emergency_triage', emergencyTriage);
registerTool('poison_control', poisonControl);
registerTool('rehydration_plan', rehydrationPlan);
registerTool('fall_risk_assessment', fallRiskAssessment);
registerTool('fracture_decision_rule', fractureDecisionRule);
registerTool('red_flag_signs', redFlagSigns);
registerTool('tb_screening', tbScreening);
