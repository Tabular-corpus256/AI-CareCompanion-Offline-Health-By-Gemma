export interface SeedDrug {
  name: string;
  indication: string;
  dosage_adult: string;
  dosage_child: string;
  contraindications: string;
}

export interface SeedLabTest {
  test_name: string;
  unit: string;
  normal_low: number;
  normal_high: number;
  interpretation_guide: string;
}

export interface SeedSkinRemedy {
  condition_keywords: string;
  natural_remedy: string;
  otc_cream: string;
  referral_flag: number;
}

export interface SeedHospital {
  name: string;
  district: string;
  distance_km: number;
  phone: string;
  services: string;
}

export const SEED_DRUGS: SeedDrug[] = [
  {
    name: 'Paracetamol',
    indication: 'Fever, mild to moderate pain, headache',
    dosage_adult: '500-1000 mg every 4-6 hours, max 4000 mg/day',
    dosage_child: '10-15 mg/kg every 4-6 hours, max 60 mg/kg/day',
    contraindications: 'Severe liver disease, alcoholism',
  },
  {
    name: 'Ibuprofen',
    indication: 'Pain, inflammation, fever, arthritis, dysmenorrhoea',
    dosage_adult: '200-400 mg every 6-8 hours, max 1200 mg/day OTC',
    dosage_child: '5-10 mg/kg every 6-8 hours (over 6 months only)',
    contraindications: 'Peptic ulcer, severe heart failure, renal impairment, aspirin allergy',
  },
  {
    name: 'Amoxicillin',
    indication:
      'Bacterial infections: respiratory, urinary, skin, dental; H. pylori',
    dosage_adult: '250-500 mg every 8 hours or 500-875 mg every 12 hours',
    dosage_child: '20-40 mg/kg/day divided every 8 hours',
    contraindications: 'Penicillin allergy, infectious mononucleosis',
  },
  {
    name: 'Cotrimoxazole',
    indication: 'UTI, respiratory infections, PCP prophylaxis, travellers diarrhoea',
    dosage_adult: '160/800 mg (trimethoprim/sulfamethoxazole) every 12 hours',
    dosage_child: '8/40 mg/kg/day divided every 12 hours',
    contraindications: 'Sulpha allergy, pregnancy (3rd trimester), G6PD deficiency',
  },
  {
    name: 'ORS (Oral Rehydration Salts)',
    indication: 'Dehydration due to diarrhoea, vomiting, heat exhaustion',
    dosage_adult: '200-400 ml per loose stool, or as tolerated',
    dosage_child: '50-100 ml per loose stool for children under 2; 100-200 ml for children 2-10',
    contraindications: 'Severe dehydration requiring IV fluids, intestinal obstruction',
  },
  {
    name: 'Albendazole',
    indication: 'Intestinal worm infections: roundworm, hookworm, whipworm, pinworm',
    dosage_adult: '400 mg single dose; repeat after 2 weeks if needed',
    dosage_child: '400 mg single dose for children over 2 years; 200 mg for 1-2 years',
    contraindications: 'Pregnancy (first trimester), known hypersensitivity',
  },
  {
    name: 'Metformin',
    indication: 'Type 2 diabetes mellitus, PCOS',
    dosage_adult: '500 mg once or twice daily, max 2000 mg/day',
    dosage_child: 'Not routinely used in children under 10 years',
    contraindications: 'Severe renal impairment (eGFR <30), liver failure, acute metabolic acidosis',
  },
  {
    name: 'Amlodipine',
    indication: 'Hypertension, angina',
    dosage_adult: '5-10 mg once daily',
    dosage_child: '2.5-5 mg once daily (6-17 years)',
    contraindications: 'Severe hypotension, cardiogenic shock, unstable angina',
  },
  {
    name: 'Salbutamol',
    indication: 'Asthma, COPD, bronchospasm',
    dosage_adult: 'Inhaler: 100-200 mcg as needed; Nebuliser: 2.5-5 mg',
    dosage_child: 'Inhaler: 100 mcg as needed; Nebuliser: 2.5 mg (under 5 years)',
    contraindications: 'Tachyarrhythmias, hypersensitivity',
  },
  {
    name: 'Omeprazole',
    indication: 'GERD, peptic ulcer, gastritis, Zollinger-Ellison syndrome',
    dosage_adult: '20-40 mg once daily before meals',
    dosage_child: '0.7-3.3 mg/kg/day (1-16 years)',
    contraindications: 'Hypersensitivity, concurrent rilpivirine use',
  },
  {
    name: 'Ciprofloxacin',
    indication: 'UTI, respiratory infections, typhoid, travellers diarrhoea',
    dosage_adult: '250-750 mg every 12 hours',
    dosage_child: '10-20 mg/kg every 12 hours (only when no alternative)',
    contraindications: 'Pregnancy, children (caution), tendon disorders, epilepsy',
  },
  {
    name: 'Chlorpheniramine',
    indication: 'Allergic rhinitis, urticaria, insect bites, motion sickness',
    dosage_adult: '4 mg every 4-6 hours, max 24 mg/day',
    dosage_child: '2-6 years: 1 mg every 4-6 hours; 6-12 years: 2 mg every 4-6 hours',
    contraindications: 'Newborns, narrow-angle glaucoma, prostatic hypertrophy',
  },
];

export const SEED_LAB_TESTS: SeedLabTest[] = [
  {
    test_name: 'Haemoglobin (Hb)',
    unit: 'g/dL',
    normal_low: 12.0,
    normal_high: 16.0,
    interpretation_guide:
      'Low: anaemia (iron/B12/folate deficiency, chronic disease, blood loss). High: polycythaemia, dehydration, smoking. Women: 12-16 g/dL. Men: 13.5-17.5 g/dL. Children vary by age.',
  },
  {
    test_name: 'Total WBC Count',
    unit: 'cells/mcL',
    normal_low: 4000,
    normal_high: 11000,
    interpretation_guide:
      'Low: viral infections, bone marrow suppression, autoimmune. High: bacterial infection, inflammation, leukaemia, steroids. Differential (neutrophils, lymphocytes) provides more detail.',
  },
  {
    test_name: 'Platelet Count',
    unit: 'platelets/mcL',
    normal_low: 150000,
    normal_high: 450000,
    interpretation_guide:
      'Low: dengue, ITP, bone marrow disorders, drugs, sepsis. High: inflammation, iron deficiency, splenectomy. Critical: <50000 (bleeding risk), <10000 (severe risk).',
  },
  {
    test_name: 'Serum Creatinine',
    unit: 'mg/dL',
    normal_low: 0.6,
    normal_high: 1.2,
    interpretation_guide:
      'Low: muscle wasting, pregnancy. High: kidney injury, CKD, dehydration, rhabdomyolysis. Use for eGFR calculation. Values vary by muscle mass (men higher).',
  },
  {
    test_name: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    normal_low: 70,
    normal_high: 100,
    interpretation_guide:
      'Low (<70): hypoglycaemia (excess insulin, liver disease, starvation). High (>100): impaired fasting glucose. >126 on two occasions suggests diabetes. Random >200 with symptoms is diagnostic.',
  },
  {
    test_name: 'HbA1c',
    unit: '%',
    normal_low: 4.0,
    normal_high: 5.6,
    interpretation_guide:
      'Normal <5.7%. Prediabetes 5.7-6.4%. Diabetes >=6.5%. Reflects average glucose over 2-3 months. Goal for diabetics typically <7.0% (individualised).',
  },
  {
    test_name: 'TSH (Thyroid Stimulating Hormone)',
    unit: 'mIU/L',
    normal_low: 0.5,
    normal_high: 5.0,
    interpretation_guide:
      'Low: hyperthyroidism, excess thyroid medication, pituitary disease. High: hypothyroidism, Hashimoto thyroiditis, thyroiditis recovery. Confirm with free T4.',
  },
  {
    test_name: 'ALT (Alanine Aminotransferase)',
    unit: 'U/L',
    normal_low: 7,
    normal_high: 56,
    interpretation_guide:
      'Elevated: liver injury (hepatitis, fatty liver, alcohol, medications like paracetamol, statins). Very high (>1000): acute hepatitis, toxin. ALT is more liver-specific than AST.',
  },
  {
    test_name: 'Serum Sodium',
    unit: 'mmol/L',
    normal_low: 135,
    normal_high: 145,
    interpretation_guide:
      'Low: SIADH, diuretics, vomiting, heart failure, liver disease. High: dehydration, diabetes insipidus, excess salt intake, Cushing syndrome. Rapid correction can be dangerous.',
  },
  {
    test_name: 'Serum Potassium',
    unit: 'mmol/L',
    normal_low: 3.5,
    normal_high: 5.0,
    interpretation_guide:
      'Low: diuretics, vomiting, diarrhoea, alkalosis, insulin. High: kidney failure, ACE inhibitors, acidosis, cell lysis. Both extremes can cause life-threatening arrhythmias.',
  },
];

export const SEED_SKIN_REMEDIES: SeedSkinRemedy[] = [
  {
    condition_keywords: 'eczema, dry skin, atopic dermatitis, itching',
    natural_remedy:
      'Coconut oil (virgin) applied 2-3 times daily; aloe vera gel from fresh leaf; oatmeal bath (soak in lukewarm water with colloidal oatmeal for 15 min); neem leaf paste',
    otc_cream:
      'Hydrocortisone 1% cream (apply thin layer twice daily, max 7 days); petroleum jelly; calamine lotion',
    referral_flag: 1,
  },
  {
    condition_keywords: 'fungal, ringworm, tinea, athletes foot, jock itch',
    natural_remedy:
      'Tea tree oil (diluted 5% in coconut oil) applied twice daily; garlic paste (test on small area first); turmeric paste with water; neem oil',
    otc_cream:
      'Clotrimazole 1% cream twice daily for 2-4 weeks; miconazole 2% cream; terbinafine 1% cream',
    referral_flag: 1,
  },
  {
    condition_keywords: 'acne, pimples, blackheads, whiteheads',
    natural_remedy:
      'Tea tree oil (5% dilution) as spot treatment; aloe vera gel; honey and cinnamon mask; green tea extract; witch hazel as toner',
    otc_cream:
      'Benzoyl peroxide 2.5-5% gel/cream; salicylic acid 0.5-2% cleanser; adapalene 0.1% gel (at night)',
    referral_flag: 0,
  },
  {
    condition_keywords: 'scabies, itching worse at night, burrows, between fingers',
    natural_remedy:
      'Neem leaf paste applied all over body; tea tree oil (5-10%) in carrier oil; turmeric paste; wash all clothes and bedding in hot water',
    otc_cream:
      'Permethrin 5% cream (apply neck-to-toe, leave 8-14 hours, repeat after 7 days)',
    referral_flag: 1,
  },
  {
    condition_keywords: 'sunburn, red skin, peeling, sun damage',
    natural_remedy:
      'Aloe vera gel (fresh or pure) applied frequently; cool compress with plain water; coconut oil after acute phase; cucumber slices',
    otc_cream:
      'Hydrocortisone 1% cream if severe; calamine lotion; moisturiser with aloe vera',
    referral_flag: 0,
  },
  {
    condition_keywords: 'insect bites, mosquito, bee, wasp, ant, sting',
    natural_remedy:
      'Ice pack for 10 min; baking soda paste (1 tbsp with water); aloe vera; honey (antibacterial); basil leaf paste',
    otc_cream:
      'Hydrocortisone 1% cream; calamine lotion; oral antihistamine (chlorpheniramine 4 mg) for multiple bites',
    referral_flag: 0,
  },
  {
    condition_keywords: 'wound, cut, scrape, abrasion, minor burn',
    natural_remedy:
      'Clean with clean water and mild soap; honey (medical grade if available) as dressing; aloe vera gel; turmeric powder for clotting',
    otc_cream:
      'Povidone-iodine solution for cleaning; antibiotic ointment (bacitracin/mupirocin); sterile gauze dressing',
    referral_flag: 1,
  },
];

export const SEED_HOSPITALS: SeedHospital[] = [
  {
    name: 'District General Hospital',
    district: 'Central District',
    distance_km: 5.2,
    phone: '+91-11-23456789',
    services:
      'Emergency, General Medicine, Surgery, Obstetrics, Paediatrics, Lab, X-ray, Pharmacy',
  },
  {
    name: 'Rural Community Health Centre',
    district: 'North District',
    distance_km: 12.8,
    phone: '+91-11-34567890',
    services:
      'OPD, Maternal & Child Health, Immunization, Basic Lab, Dispensary',
  },
  {
    name: 'St. Mary Mission Hospital',
    district: 'East District',
    distance_km: 18.5,
    phone: '+91-11-45678901',
    services:
      'Emergency, ICU, Surgery, Obstetrics, Paediatrics, Lab, Pharmacy, TB DOTS Centre',
  },
  {
    name: 'Women & Children Hospital',
    district: 'South District',
    distance_km: 8.3,
    phone: '+91-11-56789012',
    services:
      'Obstetrics, Neonatal ICU, Paediatrics, Immunization, Nutrition Clinic, Family Planning',
  },
  {
    name: 'Infectious Disease Referral Centre',
    district: 'West District',
    distance_km: 25.0,
    phone: '+91-11-67890123',
    services:
      'HIV/AIDS Care, TB Treatment, Malaria, Tropical Diseases, Isolation Ward, Lab',
  },
  {
    name: 'Trauma & Emergency Centre',
    district: 'Central District',
    distance_km: 6.1,
    phone: '+91-11-78901234',
    services:
      '24/7 Emergency, Trauma Surgery, Orthopaedics, Neurosurgery, ICU, Blood Bank, CT Scan',
  },
];
