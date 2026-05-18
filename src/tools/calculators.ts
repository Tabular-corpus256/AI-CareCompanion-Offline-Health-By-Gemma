import { registerTool } from './registry';

function bmiCalculator(args: Record<string, unknown>): string {
  const weightKg = Number(args.weight_kg);
  const heightM = Number(args.height_m);
  if (!weightKg || !heightM || heightM <= 0) {
    return JSON.stringify({ error: 'Valid weight and height required' });
  }

  const bmi = weightKg / (heightM * heightM);
  const roundedBmi = Math.round(bmi * 10) / 10;

  let category: string;
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else if (bmi < 35) category = 'Obese Class I';
  else if (bmi < 40) category = 'Obese Class II';
  else category = 'Obese Class III';

  return JSON.stringify({
    bmi: roundedBmi,
    category,
    inputs: { weight_kg: weightKg, height_m: heightM },
    advice:
      bmi < 18.5
        ? 'Underweight: Increase caloric intake with nutrient-dense foods. Monitor for underlying illness.'
        : bmi >= 25
        ? 'Overweight/Obese: Reduce caloric intake, increase physical activity to 150+ minutes/week. Consult dietitian.'
        : 'Normal weight: Maintain balanced diet and regular exercise.',
  });
}

function egfrCalculator(args: Record<string, unknown>): string {
  const creatinine = Number(args.creatinine);
  const age = Number(args.age);
  const gender = String(args.gender);
  if (!creatinine || creatinine <= 0) {
    return JSON.stringify({ error: 'Valid creatinine value required' });
  }

  let egfr = 141;
  if (gender === 'female') {
    egfr *= 0.7;
  }

  const k = gender === 'female' ? 0.7 : 0.9;
  const a = gender === 'female' ? -0.329 : -0.411;

  egfr =
    141 *
    Math.min(creatinine / k, 1) ** a *
    Math.max(creatinine / k, 1) ** -1.209 *
    0.993 ** age;
  if (gender === 'female') egfr *= 1.018;

  egfr = Math.round(egfr);

  const stage =
    egfr >= 90
      ? 'Normal (Stage 1)'
      : egfr >= 60
      ? 'Mildly reduced (Stage 2)'
      : egfr >= 45
      ? 'Mild-moderate CKD (Stage 3a)'
      : egfr >= 30
      ? 'Moderate-severe CKD (Stage 3b)'
      : egfr >= 15
      ? 'Severe CKD (Stage 4)'
      : 'Kidney failure (Stage 5)';

  return JSON.stringify({
    egfr_ml_min: egfr,
    stage,
    inputs: { creatinine, age, gender },
    referral:
      egfr < 30
        ? 'URGENT: Refer to nephrologist. eGFR <30 indicates severe kidney disease.'
        : egfr < 60
        ? 'Refer to physician for CKD evaluation and management.'
        : 'No immediate referral needed. Monitor periodically.',
  });
}

function cvRiskScore(args: Record<string, unknown>): string {
  const age = Number(args.age);
  const gender = String(args.gender);
  const bpSystolic = Number(args.bp_systolic);
  const smoking = Boolean(args.smoking);
  const diabetes = Boolean(args.diabetes);

  let risk = 5;
  if (age >= 70) risk += 8;
  else if (age >= 60) risk += 5;
  else if (age >= 50) risk += 3;
  else if (age >= 40) risk += 1;

  risk += gender === 'male' ? 3 : 0;

  if (bpSystolic >= 180) risk += 8;
  else if (bpSystolic >= 160) risk += 5;
  else if (bpSystolic >= 140) risk += 3;

  if (smoking) risk += 4;
  if (diabetes) risk += 4;

  risk = Math.min(risk, 40);

  const category =
    risk < 10
      ? 'Low'
      : risk < 20
      ? 'Moderate'
      : risk < 30
      ? 'High'
      : 'Very High';

  return JSON.stringify({
    ten_year_cvd_risk_pct: risk,
    category,
    inputs: { age, gender, bp_systolic: bpSystolic, smoking, diabetes },
    recommendation:
      risk >= 30
        ? 'High risk: Urgent cardiovascular risk reduction needed. Refer to cardiologist.'
        : risk >= 20
        ? 'Moderate-high risk: Start risk reduction measures aggressively.'
        : risk >= 10
        ? 'Moderate risk: Lifestyle modification and possibly medication.'
        : 'Low risk: Maintain healthy lifestyle.',
  });
}

function calculateZscore(args: Record<string, unknown>): string {
  const ageMonths = Number(args.age_months);
  const weightKg = Number(args.weight_kg);
  const heightCm = Number(args.height_cm);

  const whoMedians: Record<
    string,
    {
      median_weight: number;
      sd_weight: number;
      median_height: number;
      sd_height: number;
    }
  > = {
    '0': {
      median_weight: 3.3,
      sd_weight: 0.5,
      median_height: 49.9,
      sd_height: 1.9,
    },
    '1': {
      median_weight: 4.5,
      sd_weight: 0.6,
      median_height: 54.7,
      sd_height: 2.0,
    },
    '2': {
      median_weight: 5.6,
      sd_weight: 0.7,
      median_height: 58.4,
      sd_height: 2.2,
    },
    '3': {
      median_weight: 6.4,
      sd_weight: 0.7,
      median_height: 61.4,
      sd_height: 2.3,
    },
    '4': {
      median_weight: 7.0,
      sd_weight: 0.8,
      median_height: 63.9,
      sd_height: 2.4,
    },
    '5': {
      median_weight: 7.5,
      sd_weight: 0.8,
      median_height: 65.9,
      sd_height: 2.5,
    },
    '6': {
      median_weight: 7.9,
      sd_weight: 0.9,
      median_height: 67.6,
      sd_height: 2.5,
    },
    '7': {
      median_weight: 8.3,
      sd_weight: 0.9,
      median_height: 69.2,
      sd_height: 2.6,
    },
    '8': {
      median_weight: 8.6,
      sd_weight: 0.9,
      median_height: 70.6,
      sd_height: 2.7,
    },
    '9': {
      median_weight: 8.9,
      sd_weight: 1.0,
      median_height: 72.0,
      sd_height: 2.7,
    },
    '10': {
      median_weight: 9.2,
      sd_weight: 1.0,
      median_height: 73.3,
      sd_height: 2.8,
    },
    '11': {
      median_weight: 9.4,
      sd_weight: 1.0,
      median_height: 74.5,
      sd_height: 2.9,
    },
    '12': {
      median_weight: 9.6,
      sd_weight: 1.1,
      median_height: 75.7,
      sd_height: 2.9,
    },
    '18': {
      median_weight: 10.9,
      sd_weight: 1.2,
      median_height: 82.3,
      sd_height: 3.2,
    },
    '24': {
      median_weight: 12.2,
      sd_weight: 1.3,
      median_height: 87.8,
      sd_height: 3.5,
    },
    '36': {
      median_weight: 14.3,
      sd_weight: 1.5,
      median_height: 96.1,
      sd_height: 3.8,
    },
    '48': {
      median_weight: 16.3,
      sd_weight: 1.8,
      median_height: 103.3,
      sd_height: 4.1,
    },
    '60': {
      median_weight: 18.3,
      sd_weight: 2.1,
      median_height: 110.0,
      sd_height: 4.4,
    },
  };

  const nearestAge = Object.keys(whoMedians)
    .map(Number)
    .sort((a, b) => Math.abs(a - ageMonths) - Math.abs(b - ageMonths))[0];

  const ref = whoMedians[String(nearestAge)];
  if (!ref) {
    return JSON.stringify({
      error: 'Age out of range for Z-score calculation (0-60 months)',
    });
  }

  const whz = (weightKg - ref.median_weight) / ref.sd_weight;
  const haz = (heightCm - ref.median_height) / ref.sd_height;
  const waz = (weightKg - ref.median_weight) / ref.sd_weight;

  const interpret = (z: number): string => {
    if (z < -3) return 'Severely under';
    if (z < -2) return 'Moderately under';
    if (z < -1) return 'Mildly under';
    if (z <= 1) return 'Normal';
    if (z <= 2) return 'Over';
    return 'Obese';
  };

  return JSON.stringify({
    age_months: ageMonths,
    reference_age_months: nearestAge,
    whz: whz.toFixed(2),
    haz: haz.toFixed(2),
    waz: waz.toFixed(2),
    whz_interpretation: interpret(whz),
    haz_interpretation: interpret(haz),
    waz_interpretation: interpret(waz),
    warning:
      whz < -3 || haz < -3
        ? 'SEVERE MALNUTRITION - Refer to hospital for therapeutic feeding'
        : whz < -2
        ? 'Moderate malnutrition - Start supplementary feeding and monitor'
        : undefined,
  });
}

function gestationalAgeCalc(args: Record<string, unknown>): string {
  const lastMenstrualPeriod = String(args.last_menstrual_period);
  let lmp: Date;
  try {
    lmp = new Date(lastMenstrualPeriod);
    if (isNaN(lmp.getTime())) {
      return JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
  } catch {
    return JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  const today = new Date();
  const diffMs = today.getTime() - lmp.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;

  const edc = new Date(lmp);
  edc.setDate(edc.getDate() + 280);

  const trimester = weeks < 13 ? 'First' : weeks < 27 ? 'Second' : 'Third';

  const visits: string[] = [];
  if (weeks <= 12)
    visits.push(
      'First ANC visit: Confirm pregnancy, baseline BP, Hb, urine, HIV test',
    );
  if (weeks <= 20)
    visits.push('Second ANC visit: Anomaly scan (18-20 weeks), check BP, Hb');
  if (weeks <= 26)
    visits.push('Third ANC visit: Check fetal growth, BP, glucose screening');
  if (weeks <= 32)
    visits.push('Fourth ANC visit: Check BP, Hb, fetal position, give IPTp');
  if (weeks <= 36)
    visits.push('Fifth ANC visit: Prepare birth plan, check BP, Hb, urine');
  if (weeks <= 38)
    visits.push(
      'Sixth ANC visit: Check fetal wellbeing, confirm delivery plan',
    );
  if (weeks <= 40)
    visits.push('Seventh ANC visit: Discuss labour signs, check BP');
  if (weeks > 40) visits.push('PAST DUE: Refer for induction assessment');

  return JSON.stringify({
    gestational_age: `${weeks} weeks and ${days} days`,
    weeks,
    days,
    trimester,
    estimated_due_date: edc.toISOString().split('T')[0],
    lmp_date: lastMenstrualPeriod,
    antenatal_visits_due: visits,
  });
}

function hba1cInterpret(args: Record<string, unknown>): string {
  const value = Number(args.value);
  if (value === undefined || value === null || Number.isNaN(value)) {
    return JSON.stringify({ error: 'HbA1c value required' });
  }

  let category: string;
  let advice: string;

  if (value < 5.7) {
    category = 'Normal';
    advice = 'No diabetes. Maintain healthy lifestyle.';
  } else if (value < 6.5) {
    category = 'Prediabetes';
    advice =
      'At risk for diabetes. Start lifestyle modification: reduce sugars, exercise 150 min/week, lose 5-7% body weight if overweight. Retest in 6-12 months.';
  } else if (value < 8.0) {
    category = 'Diabetes - Good Control';
    advice =
      'Diabetes is present but well-controlled. Continue current management. Monitor every 3-6 months.';
  } else if (value < 10.0) {
    category = 'Diabetes - Fair Control';
    advice =
      'Diabetes needs improvement. Review diet, medication adherence, and exercise. Consider medication adjustment with physician.';
  } else {
    category = 'Diabetes - Poor Control';
    advice =
      'URGENT: Poor diabetes control. High risk of complications. Refer to physician for medication review. Screen for complications (kidney, eye, foot).';
  }

  return JSON.stringify({
    hba1c: value,
    category,
    advice,
    estimated_average_glucose: Math.round((28.7 * value - 46.7) * 10) / 10,
  });
}

registerTool('bmi_calculator', bmiCalculator);
registerTool('egfr_calculator', egfrCalculator);
registerTool('cv_risk_score', cvRiskScore);
registerTool('calculate_zscore', calculateZscore);
registerTool('gestational_age_calc', gestationalAgeCalc);
registerTool('hba1c_interpret', hba1cInterpret);
