import { DatabaseService } from '@services/DatabaseService';
import { registerTool } from './registry';

async function getDrugInfo(args: Record<string, unknown>): Promise<string> {
  const drugName = String(args.drug_name || '');
  const ageGroup = args.age_group ? String(args.age_group) : undefined;
  try {
    await DatabaseService.init();
    const rows = await DatabaseService.query(
      'SELECT * FROM drugs WHERE name LIKE ?',
      [`%${drugName}%`],
    );
    if (rows.length === 0) {
      return JSON.stringify({
        found: false,
        message: `No information found for "${drugName}". Check spelling or consult a pharmacist.`,
      });
    }
    const drug = rows[0] as any;
    const dosage = ageGroup === 'child' ? drug.dosage_child : drug.dosage_adult;
    return JSON.stringify({
      found: true,
      name: drug.name,
      indication: drug.indication,
      dosage,
      dosage_adult: drug.dosage_adult,
      dosage_child: drug.dosage_child,
      contraindications: drug.contraindications,
    });
  } catch (e: any) {
    return JSON.stringify({
      found: false,
      message: `Database error: ${e.message || 'Unable to look up drug info'}`,
    });
  }
}

async function searchSkinDb(args: Record<string, unknown>): Promise<string> {
  const keywords = String(args.keywords || '');
  try {
    await DatabaseService.init();
    const rows = await DatabaseService.query(
      "SELECT * FROM skin_remedies WHERE condition_keywords LIKE '%' || ? || '%'",
      [keywords],
    );
    if (rows.length === 0) {
      return JSON.stringify({
        found: false,
        message:
          'No specific remedy found. Keep the area clean, avoid scratching, and consult a doctor if it worsens.',
      });
    }
    const remedies = rows;
    return JSON.stringify({ found: true, remedies });
  } catch (e: any) {
    return JSON.stringify({
      found: false,
      message: `Database error: ${
        e.message || 'Unable to look up skin remedies'
      }`,
    });
  }
}

async function getLabReference(args: Record<string, unknown>): Promise<string> {
  const testName = String(args.test_name || '');
  try {
    await DatabaseService.init();
    const rows = await DatabaseService.query(
      'SELECT * FROM lab_tests WHERE test_name LIKE ?',
      [`%${testName}%`],
    );
    if (rows.length === 0) {
      return JSON.stringify({
        found: false,
        message: `No reference range found for "${testName}".`,
      });
    }
    return JSON.stringify(rows[0]);
  } catch (e: any) {
    return JSON.stringify({
      found: false,
      message: `Database error: ${
        e.message || 'Unable to look up lab reference'
      }`,
    });
  }
}

function drugInteractionCheck(args: Record<string, unknown>): string {
  const drugList = (args.drug_list as string[]) || [];
  const interactions: Record<string, string[]> = {
    Ibuprofen: [
      'Aspirin (increased bleeding risk)',
      'Warfarin (bleeding risk)',
      'ACE inhibitors (reduced BP effect)',
    ],
    Paracetamol: [
      'Warfarin (high doses may increase INR)',
      'Alcohol (liver damage risk)',
    ],
    Metformin: [
      'Alcohol (lactic acidosis risk)',
      'Iodinated contrast (risk of kidney injury)',
    ],
    Amlodipine: [
      'Grapefruit juice (increased drug level)',
      'Simvastatin (increased statin effect)',
    ],
    Ciprofloxacin: [
      'Warfarin (increased INR)',
      'Antacids (reduced absorption)',
      'Theophylline (toxicity risk)',
    ],
    Omeprazole: [
      'Clopidogrel (reduced effectiveness)',
      'Ketoconazole (reduced absorption)',
      'Methotrexate (increased levels)',
    ],
  };

  const foundInteractions: Array<{ drug: string; interactions: string[] }> = [];
  for (const drug of drugList) {
    const drugKey = Object.keys(interactions).find(
      k => k.toLowerCase() === drug.trim().toLowerCase(),
    );
    if (drugKey) {
      foundInteractions.push({
        drug: drugKey,
        interactions: interactions[drugKey],
      });
    }
  }

  return JSON.stringify({
    interactions_found: foundInteractions,
    total_drugs_checked: drugList.length,
    warning:
      foundInteractions.length > 0
        ? 'INTERACTIONS FOUND: Review with a pharmacist or doctor before combining these medications.'
        : 'No known serious interactions found for the checked drugs. Always consult a pharmacist for complete review.',
  });
}

function doseCalculation(args: Record<string, unknown>): string {
  const drug = String(args.drug || '');
  const age = Number(args.age);
  const weight = Number(args.weight);

  if (drug.toLowerCase().includes('paracetamol')) {
    const doseMg = weight ? Math.round(weight * 15) : age < 12 ? 250 : 500;
    return JSON.stringify({
      drug: 'Paracetamol',
      dose_mg: doseMg,
      frequency: 'Every 4-6 hours',
      max_daily_mg: weight ? Math.round(weight * 60) : 4000,
      notes:
        'Do not exceed 4 doses in 24 hours. Use weight-based dosing for children.',
    });
  }

  if (drug.toLowerCase().includes('ibuprofen')) {
    const doseMg = weight ? Math.round(weight * 10) : 400;
    return JSON.stringify({
      drug: 'Ibuprofen',
      dose_mg: doseMg,
      frequency: 'Every 6-8 hours',
      max_daily_mg: weight ? Math.round(weight * 30) : 1200,
      notes:
        'Take with food. Not for children under 6 months. Avoid in pregnancy.',
    });
  }

  return JSON.stringify({
    drug,
    message:
      'Dose calculation requires specific drug name. Try Paracetamol or Ibuprofen. For other drugs, consult drug reference materials.',
  });
}

function beersCriteriaCheck(args: Record<string, unknown>): string {
  const medicationList = (args.medication_list as string[]) || [];
  const beersList: Record<string, string> = {
    Diazepam: 'Increased fall risk, cognitive impairment in elderly',
    Amitriptyline: 'Anticholinergic effects, confusion, falls',
    Diphenhydramine: 'Anticholinergic, confusion, urinary retention',
    Indomethacin: 'Highest GI risk among NSAIDs in elderly',
    Ketorolac: 'High risk of GI bleeding and renal failure in elderly',
    'Digoxin >0.125mg': 'Higher doses increase toxicity without added benefit',
    Glyburide: 'Prolonged hypoglycaemia, avoid in elderly',
    'Sliding scale insulin': 'Higher hypoglycaemia risk without proven benefit',
    'PPIs long-term': 'Associated with C. difficile, bone loss, B12 deficiency',
  };

  const flagged: Array<{ drug: string; reason: string }> = [];
  for (const med of medicationList) {
    const key = Object.keys(beersList).find(
      k => k.toLowerCase() === med.trim().toLowerCase(),
    );
    if (key) {
      flagged.push({ drug: key, reason: beersList[key] });
    }
  }

  return JSON.stringify({
    potentially_inappropriate: flagged,
    total_checked: medicationList.length,
    recommendation:
      flagged.length > 0
        ? 'MEDICATIONS FLAGGED: Review with geriatrician or pharmacist. Consider alternative medications or dose adjustments for elderly patients.'
        : 'No medications from the checked list appear in Beers Criteria for potentially inappropriate use in elderly.',
  });
}

function mealPlan(args: Record<string, unknown>): string {
  const condition = String(args.condition || '').toLowerCase();
  const plans: Record<string, any> = {
    diabetes: {
      breakfast:
        'Vegetable dalia/porridge or 2 roti with low-fat paneer bhurji',
      lunch:
        '1 cup brown rice + 1 cup dal + 1 cup green vegetable sabzi + cucumber raita (low-fat)',
      dinner: '2 multigrain roti + 1 cup mixed vegetable + 1 bowl dal + salad',
      snacks:
        'Roasted chana, cucumber/carrot sticks, handful of nuts (unsalted), buttermilk (no sugar)',
      advice:
        'Limit rice and refined flour. Include bitter gourd, fenugreek, and cinnamon. Eat at regular times.',
    },
    hypertension: {
      breakfast: 'Oats upma or poha with vegetables + 1 fruit (banana/papaya)',
      lunch:
        '2 roti (no salt) + 1 cup dal + 1 cup lauki/tori sabzi + salad with lemon juice',
      dinner: '1 bowl vegetable khichdi + raita (low salt) + salad',
      snacks:
        'Fruits (banana for potassium), roasted makhana, coconut water (no sugar)',
      advice:
        'Reduce salt to <5g/day. Increase potassium-rich foods (banana, sweet potato, spinach). Avoid pickles and papad.',
    },
    anaemia: {
      breakfast:
        'Fortified cereal or iron-rich poha + 1 orange (vitamin C helps iron absorption)',
      lunch: '1 cup rice + 1 cup spinach/methi dal + jaggery (small piece)',
      dinner: 'Ragi roti or 2 roti + beetroot sabzi + 1 bowl dal',
      snacks: 'Dates, figs, groundnuts, roasted chana, sesame ladoo',
      advice:
        'Combine iron-rich foods with vitamin C. Avoid tea/coffee with meals (reduces absorption). Include jaggery, dates, and green leafy vegetables.',
    },
    general: {
      breakfast: 'Vegetable poha/upma/paratha with curd or 2 idli with sambar',
      lunch: '1 cup rice + 1 cup dal + 1 cup seasonal vegetable sabzi + salad',
      dinner: '2 roti + 1 cup dal + 1 cup mixed vegetable + salad',
      snacks: 'Fruits, roasted chana, buttermilk, sprouts',
      advice:
        'Eat locally available fresh foods. Include all food groups: cereals, pulses, vegetables, fruits, dairy/nut. Drink 2-3 litres water daily.',
    },
  };

  const plan = plans[condition] || plans.general;
  return JSON.stringify({
    condition: args.condition || 'general',
    meal_plan: plan,
    note: 'Meal suggestions use locally available Indian foods. Adjust portions based on weight, activity, and specific dietary needs.',
  });
}

function cbcInterpreter(args: Record<string, unknown>): string {
  const hb = args.hb !== undefined ? Number(args.hb) : null;
  const wbc = args.wbc !== undefined ? Number(args.wbc) : null;
  const platelets =
    args.platelets !== undefined ? Number(args.platelets) : null;
  const findings: string[] = [];

  if (hb !== null && !Number.isNaN(hb)) {
    if (hb < 12) {
      const mcv =
        hb < 8
          ? 'Severe anaemia'
          : hb < 10
          ? 'Moderate anaemia'
          : 'Mild anaemia';
      findings.push(
        `Haemoglobin ${hb} g/dL - ${mcv}. Consider iron deficiency (most common), B12/folate deficiency, chronic disease, or blood loss.`,
      );
    } else if (hb > 17) {
      findings.push(
        `Haemoglobin ${hb} g/dL - Elevated. Consider polycythaemia, dehydration, or chronic hypoxia.`,
      );
    } else {
      findings.push(`Haemoglobin ${hb} g/dL - Normal.`);
    }
  }

  if (wbc !== null && !Number.isNaN(wbc)) {
    if (wbc < 4000) {
      findings.push(
        `WBC ${wbc}/mcL - Low (leukopenia). Possible viral infection, bone marrow suppression, autoimmune disease.`,
      );
    } else if (wbc > 11000) {
      findings.push(
        `WBC ${wbc}/mcL - High (leukocytosis). Possible bacterial infection, inflammation, or leukaemia. Check differential count.`,
      );
    } else {
      findings.push(`WBC ${wbc}/mcL - Normal.`);
    }
  }

  if (platelets !== null && !Number.isNaN(platelets)) {
    if (platelets < 150000) {
      findings.push(
        `Platelets ${platelets}/mcL - Low (thrombocytopenia). Possible dengue, ITP, drug reaction, or bone marrow disorder. Monitor for bleeding.`,
      );
    } else if (platelets > 450000) {
      findings.push(
        `Platelets ${platelets}/mcL - High (thrombocytosis). Possible infection, inflammation, or iron deficiency.`,
      );
    } else {
      findings.push(`Platelets ${platelets}/mcL - Normal.`);
    }
  }

  return JSON.stringify({
    values: { haemoglobin: hb, wbc, platelets },
    findings,
    recommendation:
      (hb !== null && hb < 8) ||
      (platelets !== null && platelets < 50000) ||
      (wbc !== null && (wbc < 2000 || wbc > 30000))
        ? 'URGENT: Critical values detected. Refer to haematologist immediately.'
        : (hb !== null && hb < 10) || (platelets !== null && platelets < 100000)
        ? 'Abnormal values. Refer to physician for further evaluation and possible repeat testing.'
        : 'Values within acceptable range. Continue monitoring.',
  });
}

registerTool('get_drug_info', getDrugInfo);
registerTool('search_skin_db', searchSkinDb);
registerTool('get_lab_reference', getLabReference);
registerTool('drug_interaction_check', drugInteractionCheck);
registerTool('dose_calculation', doseCalculation);
registerTool('beers_criteria_check', beersCriteriaCheck);
registerTool('meal_plan', mealPlan);
registerTool('cbc_interpreter', cbcInterpreter);
