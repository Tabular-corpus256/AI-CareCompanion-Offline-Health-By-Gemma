// Unique visual theme for each of the 46 agents
export interface AgentTheme {
  color: string;
  gradient: [string, string];
  emoji: string;
  greeting: string;
  prompts: { title: string; sub: string; prompt: string }[];
}

const t = (
  color: string, g1: string, g2: string, emoji: string,
  greeting: string, prompts: [string, string, string][]
): AgentTheme => ({
  color, gradient: [g1, g2], emoji, greeting,
  prompts: prompts.map(([title, sub, prompt]) => ({ title, sub, prompt })),
});

export const AGENT_THEMES: Record<string, AgentTheme> = {
  orchestrator: t('#0D7C66','#0D7C66','#00B894','🩺','How can I help you today?',[
    ['Check symptoms','Describe how you feel','I have some symptoms: '],
    ['Medicine info','Drug interactions & dosage','Tell me about this medication: '],
    ['Diet advice','Nutrition & wellness','Give me diet advice for '],
  ]),
  general_practice: t('#0D7C66','#0D7C66','#1DB589','🏥','What brings you in today?',[
    ['Feeling unwell','Fever, cold, flu symptoms','I have been feeling unwell with '],
    ['Check-up advice','General health questions','I need advice about '],
    ['Pain assessment','Describe your pain','I have pain in my '],
  ]),
  paediatrics: t('#00B894','#00B894','#55EFC4','👶','How is the little one doing?',[
    ['Child fever','Temperature & symptoms','My child has a fever and '],
    ['Growth check','Weight & height concerns','I am worried about my child\'s growth '],
    ['Vaccination','Immunization schedule','What vaccines does my child need at age '],
  ]),
  internal_medicine: t('#5C6BC0','#5C6BC0','#7986CB','💊','Let\'s manage your health together.',[
    ['Diabetes care','Blood sugar management','My blood sugar reading is '],
    ['BP concerns','Blood pressure issues','My blood pressure is '],
    ['Chronic disease','Long-term conditions','I have been diagnosed with '],
  ]),
  cardiology: t('#E74C3C','#E74C3C','#FF6B6B','❤️','Let\'s take care of your heart.',[
    ['Chest pain','Describe your chest pain','I have chest pain that '],
    ['Palpitations','Heart rhythm concerns','I feel my heart racing '],
    ['BP management','High blood pressure','My blood pressure reading is '],
  ]),
  dermatology: t('#F39C12','#F39C12','#FFEAA7','🧴','Show me what\'s on your skin.',[
    ['Skin rash','Describe or upload photo','I have a rash on my '],
    ['Acne help','Breakouts & skincare','I have acne on my '],
    ['Mole check','Concerning skin spots','I noticed a mole that '],
  ]),
  neurology: t('#9B59B6','#9B59B6','#D6A4FF','🧠','Let\'s address your neurological concerns.',[
    ['Headache','Recurring or severe','I have headaches that '],
    ['Dizziness','Balance & vertigo','I feel dizzy when '],
    ['Numbness','Tingling sensations','I have numbness in '],
  ]),
  gastroenterology: t('#795548','#795548','#A1887F','🫃','Let\'s settle your stomach.',[
    ['Stomach pain','Abdominal discomfort','I have stomach pain after '],
    ['Digestion','Bloating & gas','I experience bloating when '],
    ['Nausea','Vomiting concerns','I have been feeling nauseous '],
  ]),
  pulmonology: t('#3498DB','#3498DB','#74B9FF','🫁','Let\'s help you breathe easier.',[
    ['Cough','Persistent cough','I have had a cough for '],
    ['Breathing','Shortness of breath','I feel short of breath when '],
    ['Asthma','Wheeze & triggers','My asthma flares up when '],
  ]),
  nephrology: t('#5C6BC0','#3F51B5','#7986CB','💧','Let\'s check on your kidneys.',[
    ['Urine changes','Color or frequency','I noticed my urine is '],
    ['Swelling','Fluid retention','I have swelling in my '],
    ['Kidney pain','Flank discomfort','I have pain in my lower back '],
  ]),
  endocrinology: t('#E84393','#E84393','#FD79A8','⚗️','Let\'s balance your hormones.',[
    ['Thyroid','Energy & weight changes','I have been gaining/losing weight '],
    ['Diabetes','Sugar management','My HbA1c level is '],
    ['Hormonal','Mood & cycle changes','I have been experiencing '],
  ]),
  infectious_disease: t('#E74C3C','#C0392B','#FF6B6B','🦠','Let\'s identify that infection.',[
    ['Fever','Duration & pattern','I have had a fever for '],
    ['Travel illness','Post-travel symptoms','I recently traveled to '],
    ['Infection signs','Wound or systemic','I think I have an infection '],
  ]),
  obstetrics_gynecology: t('#E84393','#E84393','#FD79A8','🤰','Your women\'s health matters.',[
    ['Pregnancy','Prenatal concerns','I am pregnant and experiencing '],
    ['Periods','Menstrual issues','My periods have been '],
    ['Contraception','Birth control options','I want to know about '],
  ]),
  orthopaedics: t('#607D8B','#546E7A','#90A4AE','🦴','Let\'s fix those bones & joints.',[
    ['Joint pain','Knee, hip, shoulder','I have pain in my '],
    ['Injury','Sports or accident','I injured my '],
    ['Back pain','Spine concerns','I have back pain that '],
  ]),
  ophthalmology: t('#00B894','#00897B','#4DB6AC','👁️','Let\'s look after your eyes.',[
    ['Vision change','Blurry or dim','My vision has become '],
    ['Red eye','Irritation & discharge','My eye is red and '],
    ['Eye pain','Sharp or dull','I have pain in my eye '],
  ]),
  otorhinolaryngology: t('#9B59B6','#8E24AA','#CE93D8','👂','Ears, nose, and throat — I\'m here.',[
    ['Ear pain','Hearing concerns','I have ear pain and '],
    ['Sore throat','Swallowing difficulty','My throat has been sore for '],
    ['Sinus','Congestion & pressure','I have sinus pressure and '],
  ]),
  psychiatry: t('#0D7C66','#00695C','#4DB6AC','🧘','Your mental health is a priority.',[
    ['Anxiety','Worry & tension','I have been feeling anxious about '],
    ['Depression','Low mood & energy','I have been feeling down for '],
    ['Sleep issues','Insomnia & nightmares','I have trouble sleeping because '],
  ]),
  dentistry: t('#F39C12','#F57F17','#FFD54F','🦷','Let\'s keep that smile healthy.',[
    ['Toothache','Pain & sensitivity','I have a toothache in '],
    ['Gum issues','Bleeding or swollen','My gums have been '],
    ['Oral care','Prevention tips','I want advice on '],
  ]),
  urology: t('#FF9800','#EF6C00','#FFB74D','🚿','Let\'s address your urinary concerns.',[
    ['Urination','Frequency or pain','I have pain when urinating '],
    ['Kidney stones','Flank pain','I have sharp flank pain '],
    ['Prostate','Men\'s health','I have concerns about '],
  ]),
  haematology: t('#E74C3C','#B71C1C','#EF5350','🩸','Let\'s check your blood health.',[
    ['Fatigue','Tiredness & pallor','I have been very tired and '],
    ['Bruising','Easy bruising','I bruise easily and '],
    ['Bleeding','Unusual bleeding','I have noticed unusual bleeding '],
  ]),
  rheumatology: t('#636E7B','#455A64','#90A4AE','🦠','Joint & immune care is my specialty.',[
    ['Joint stiffness','Morning stiffness','My joints are stiff in the '],
    ['Swollen joints','Inflammation','My joints are swollen and '],
    ['Autoimmune','Lupus, RA concerns','I was diagnosed with '],
  ]),
  allergy_immunology: t('#00B894','#009688','#80CBC4','🤧','Let\'s manage those allergies.',[
    ['Allergic reaction','Hives & swelling','I had an allergic reaction to '],
    ['Seasonal','Hay fever symptoms','My allergies flare up during '],
    ['Food allergy','Dietary triggers','I react when I eat '],
  ]),
  neonatology: t('#E84393','#AD1457','#F48FB1','👼','Your newborn\'s health is precious.',[
    ['Newborn feeding','Breastfeeding issues','My newborn is not feeding well '],
    ['Jaundice','Yellow skin','My baby looks yellow and '],
    ['Breathing','Newborn respiratory','My newborn\'s breathing seems '],
  ]),
  geriatrics: t('#636E7B','#37474F','#78909C','👴','Senior health care, with compassion.',[
    ['Memory','Forgetfulness concerns','I have noticed memory issues '],
    ['Falls','Balance problems','I have been falling more '],
    ['Medications','Multiple drugs','I take many medications and '],
  ]),
  emergency_medicine: t('#E74C3C','#B71C1C','#FF5252','🚨','Emergency — let\'s act fast.',[
    ['Severe pain','Acute onset','I have sudden severe pain in '],
    ['Trauma','Injury or accident','I was involved in an accident '],
    ['Poisoning','Ingestion concern','I/someone ingested '],
  ]),
  nutrition_dietetics: t('#00B894','#00695C','#69F0AE','🥗','Fuel your body right.',[
    ['Weight plan','Gain or lose','I want to manage my weight '],
    ['Meal plan','Balanced diet','Create a meal plan for '],
    ['Deficiency','Vitamins & minerals','I think I may be deficient in '],
  ]),
  pharmacy: t('#3498DB','#1565C0','#64B5F6','💊','Medication guidance, safely.',[
    ['Drug info','Side effects','Tell me about the side effects of '],
    ['Interactions','Drug combinations','Can I take these together: '],
    ['Dosage','Correct amount','What is the correct dose of '],
  ]),
  radiology: t('#2196F3','#1565C0','#64B5F6','📷','Let\'s interpret your imaging.',[
    ['X-ray','Bone & chest','I have an X-ray showing '],
    ['CT/MRI','Scan results','My scan results show '],
    ['Ultrasound','Sonography findings','My ultrasound report says '],
  ]),
  sports_medicine: t('#FF5722','#D84315','#FF8A65','🏃','Get back in the game.',[
    ['Sports injury','Sprain or strain','I injured myself while '],
    ['Recovery','Rehab plan','I need a recovery plan for '],
    ['Performance','Training advice','I want to improve my '],
  ]),
  sleep_medicine: t('#3F51B5','#283593','#7986CB','😴','Better sleep starts here.',[
    ['Insomnia','Can\'t fall asleep','I have trouble falling asleep '],
    ['Sleep apnea','Snoring & fatigue','I snore and wake up tired '],
    ['Sleep schedule','Irregular patterns','My sleep schedule is '],
  ]),
  palliative_care: t('#8BC34A','#558B2F','#AED581','🕊️','Comfort and dignity, always.',[
    ['Pain relief','Comfort measures','I need help managing pain '],
    ['Quality of life','Daily comfort','How can I improve daily comfort '],
    ['Care planning','Advance directives','I want to discuss care goals '],
  ]),
  rehabilitation: t('#009688','#00695C','#4DB6AC','🚶','Restoring function, step by step.',[
    ['Stroke rehab','Recovery exercises','I am recovering from a stroke '],
    ['Physical therapy','Movement plan','I need exercises for '],
    ['Mobility aids','Equipment advice','What mobility aids would help '],
  ]),
  genetics: t('#673AB7','#4527A0','#9575CD','🧬','Unlocking your genetic blueprint.',[
    ['Family history','Hereditary risk','My family has a history of '],
    ['Genetic test','Results interpretation','My genetic test shows '],
    ['Counseling','Risk assessment','I want genetic counseling for '],
  ]),
  pain_management: t('#FF9800','#E65100','#FFB74D','🎯','Targeting your pain, effectively.',[
    ['Chronic pain','Long-term management','I have chronic pain in '],
    ['Non-opioid','Alternative treatments','What non-medication options for '],
    ['Nerve pain','Tingling & burning','I have burning pain in '],
  ]),
  toxicology: t('#4CAF50','#2E7D32','#81C784','☠️','Poison control & safety.',[
    ['Ingestion','Accidental poisoning','Someone accidentally ingested '],
    ['Chemical exposure','Skin or inhaled','I was exposed to '],
    ['Drug overdose','Emergency advice','I think there was an overdose of '],
  ]),
  travel_medicine: t('#03A9F4','#0277BD','#4FC3F7','✈️','Travel safe, travel healthy.',[
    ['Vaccines','Travel immunization','I am traveling to '],
    ['Malaria','Prevention advice','Do I need malaria pills for '],
    ['Travel illness','Post-trip symptoms','I returned from travel and have '],
  ]),
  adolescent_medicine: t('#E91E63','#C2185B','#F48FB1','🧑‍🎓','Teen health, no judgment.',[
    ['Puberty','Body changes','I have questions about '],
    ['Acne','Skin breakouts','I have acne and want help '],
    ['Mental health','Stress & anxiety','I have been feeling stressed about '],
  ]),
  fertility: t('#CDDC39','#9E9D24','#DCE775','🌱','Your fertility journey matters.',[
    ['Trying to conceive','Fertility tips','We have been trying to conceive '],
    ['Ovulation','Cycle tracking','I want to track my ovulation '],
    ['IVF info','Assisted reproduction','I want to learn about IVF '],
  ]),
  vascular_medicine: t('#B71C1C','#880E4F','#E57373','🫀','Keeping your blood flowing right.',[
    ['Leg pain','Claudication','I have pain in my legs when '],
    ['Varicose veins','Vein concerns','I have varicose veins that '],
    ['DVT risk','Clot concerns','I am worried about blood clots '],
  ]),
  transplant_medicine: t('#1B5E20','#1B5E20','#66BB6A','🏥','Post-transplant care expert.',[
    ['Medications','Immunosuppressants','I take transplant medications and '],
    ['Rejection signs','Warning symptoms','I am worried about rejection signs '],
    ['Follow-up','Post-transplant care','How should I manage my '],
  ]),
  clinical_pathology: t('#424242','#212121','#757575','🔬','Interpreting your lab results.',[
    ['Lab results','Blood work','My lab results show '],
    ['Tumor markers','Cancer screening','My tumor marker level is '],
    ['Biopsy','Tissue analysis','My biopsy report says '],
  ]),
  integrative_medicine: t('#26A69A','#00796B','#80CBC4','🌿','Blending the best of both worlds.',[
    ['Herbal remedies','Natural options','What natural remedies for '],
    ['Supplements','Vitamins & herbs','Should I take supplements for '],
    ['Mindfulness','Stress relief','I want mindfulness techniques for '],
  ]),
  addiction_medicine: t('#5D4037','#3E2723','#8D6E63','🤝','Recovery is possible. I\'m here.',[
    ['Substance use','Help & support','I need help with '],
    ['Withdrawal','Detox concerns','I am experiencing withdrawal from '],
    ['Relapse','Prevention strategies','I am worried about relapsing '],
  ]),
  occupational_medicine: t('#546E7A','#37474F','#90A4AE','⚙️','Workplace health & safety.',[
    ['Work injury','On-the-job','I got injured at work '],
    ['Ergonomics','Posture & strain','I have pain from sitting '],
    ['Fitness for duty','Return to work','Can I return to work after '],
  ]),
  lifestyle_medicine: t('#2E7D32','#1B5E20','#66BB6A','🌱','Lifestyle is the best medicine.',[
    ['Stress','Management tips','I am under a lot of stress '],
    ['Exercise','Activity plan','I want to start exercising '],
    ['Quit smoking','Cessation support','I want to quit smoking '],
  ]),
  preventive_medicine: t('#0D7C66','#004D40','#4DB6AC','🛡️','Prevention is better than cure.',[
    ['Screening','Health checkup','What screenings do I need at age '],
    ['Vaccines','Immunization','Am I up to date on vaccines '],
    ['Risk assessment','Health risks','What are my health risks if '],
  ]),
};

export function getAgentTheme(agentId: string): AgentTheme {
  return AGENT_THEMES[agentId] || AGENT_THEMES.orchestrator;
}
