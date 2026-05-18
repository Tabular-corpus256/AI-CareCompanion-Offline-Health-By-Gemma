import { registerTool } from './registry';

function getVaccineSchedule(args: Record<string, unknown>): string {
  const ageMonths = Number(args.age_months);
  const schedule: Record<number, string[]> = {
    0: ['BCG', 'OPV-0', 'Hepatitis B-0'],
    1.5: ['DTwP-1', 'OPV-1', 'Hepatitis B-1', 'Hib-1', 'Rotavirus-1', 'PCV-1'],
    2.5: ['DTwP-2', 'OPV-2', 'Hepatitis B-2', 'Hib-2', 'Rotavirus-2', 'PCV-2'],
    3.5: ['DTwP-3', 'OPV-3', 'Hepatitis B-3', 'Hib-3', 'Rotavirus-3', 'PCV-3'],
    9: [
      'Measles-1',
      'Vitamin A (first dose)',
      'Japanese Encephalitis (endemic areas)',
    ],
    12: ['PCV Booster'],
    16: [
      'DTwP Booster-1',
      'OPV Booster',
      'Measles-2',
      'Vitamin A (second dose)',
    ],
    24: ['Typhoid conjugate'],
    60: ['DTwP Booster-2', 'OPV Booster'],
  };

  const milestones = Object.keys(schedule)
    .map(Number)
    .sort((a, b) => a - b);
  const upcoming = milestones.filter(m => m >= ageMonths);
  const due = upcoming.length > 0 ? schedule[upcoming[0]] : [];
  const nextAge = upcoming.length > 0 ? upcoming[0] : null;

  return JSON.stringify({
    current_age_months: ageMonths,
    next_vaccination_age_months: nextAge,
    due_vaccines: due,
    full_schedule: schedule,
  });
}

function getPaediatricDosing(args: Record<string, unknown>): string {
  const drugName = String(args.drug_name);
  const weightKg = Number(args.weight_kg);
  const indication = args.indication ? String(args.indication) : undefined;

  const dosingMap: Record<string, any> = {
    Paracetamol: {
      doseMgPerKg: 15,
      frequency: 'every 4-6 hours',
      maxDailyMgPerKg: 60,
      notes: 'Do not exceed 4 doses in 24 hours',
    },
    Ibuprofen: {
      doseMgPerKg: 10,
      frequency: 'every 6-8 hours',
      maxDailyMgPerKg: 30,
      notes: 'For children over 6 months only. Give with food.',
    },
    Amoxicillin: {
      doseMgPerKg: 25,
      frequency: 'every 8 hours or every 12 hours (depending on formulation)',
      maxDailyMgPerKg: 90,
      notes: 'Complete full course. Shake suspension well.',
    },
    Cotrimoxazole: {
      doseMgPerKg: 8,
      frequency: 'every 12 hours (based on trimethoprim component)',
      maxDailyMgPerKg: 16,
      notes: 'Ensure adequate hydration. Contraindicated in G6PD deficiency.',
    },
    Albendazole: {
      doseMgPerKg: null,
      frequency: 'single dose',
      maxDailyMgPerKg: null,
      notes: '400 mg single dose for children >2 years; 200 mg for 1-2 years',
    },
  };

  const dosing = dosingMap[drugName] || {
    doseMgPerKg: null,
    frequency: 'See package insert',
    maxDailyMgPerKg: null,
    notes: 'Consult drug reference for weight-based dosing',
  };

  const singleDose = dosing.doseMgPerKg
    ? Math.round(dosing.doseMgPerKg * weightKg)
    : null;
  const maxDaily = dosing.maxDailyMgPerKg
    ? Math.round(dosing.maxDailyMgPerKg * weightKg)
    : null;

  return JSON.stringify({
    drug: drugName,
    weight_kg: weightKg,
    indication: indication || 'general',
    single_dose_mg: singleDose,
    frequency: dosing.frequency,
    max_daily_dose_mg: maxDaily,
    notes: dosing.notes,
    contraindications: 'Consult package insert',
  });
}

function newbornDangerSigns(args: Record<string, unknown>): string {
  const feedingPoor = Boolean(args.feeding_poor);
  const lethargy = Boolean(args.lethargy);
  const fever = Boolean(args.fever);
  const jaundiceExtent = args.jaundice_extent
    ? String(args.jaundice_extent)
    : 'none';

  const signs: string[] = [];
  if (feedingPoor) signs.push('Poor feeding / unable to breastfeed');
  if (lethargy) signs.push('Lethargy / reduced consciousness');
  if (fever) signs.push('Fever (temperature >38C or <35.5C)');
  if (jaundiceExtent && jaundiceExtent.toLowerCase() !== 'none') {
    signs.push(`Jaundice: ${jaundiceExtent}`);
  }

  const hasDangerSign = signs.length > 0;

  return JSON.stringify({
    danger_signs: signs,
    has_danger_sign: hasDangerSign,
    action: hasDangerSign
      ? 'IMMEDIATE REFERRAL: Newborn has danger signs. Take baby to hospital NOW. Do not delay.'
      : 'No immediate danger signs detected. Continue breastfeeding, maintain warmth, and monitor closely.',
    danger_signs_present: {
      poor_feeding: feedingPoor,
      lethargy,
      fever,
      jaundice: jaundiceExtent || 'none',
    },
  });
}

registerTool('get_vaccine_schedule', getVaccineSchedule);
registerTool('get_paediatric_dosing', getPaediatricDosing);
registerTool('newborn_danger_signs', newbornDangerSigns);
