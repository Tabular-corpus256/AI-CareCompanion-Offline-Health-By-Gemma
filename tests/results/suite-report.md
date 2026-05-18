# AI Care Companion — Agent Test Report

**Date:** 2026-05-10T14:09:40.320Z
**Model:** `gemini-2.5-flash`
**Total tests:** 45
**Passed:** 6 ✅ | **Failed:** 39 ❌
**Duration:** 45.2s

---

## 🧠 Orchestrator (Multi-Agent Routing)

**Query:** I have chest pain that started suddenly while exercising. I also feel nauseous and my left arm feels heavy.
**Latency:** 2115ms

**Response:**

```json
{
  "specialty": "Cardiology",
  "reasoning": "The user is experiencing sudden chest pain during exercise, accompanied by nausea and left arm heaviness. These are classic symptoms suggestive of acute coronary syndrome or a cardiac event, requiring immediate evaluation by a cardiologist."
}
```

---

## ⚕️ Agent Tests

| # | Agent | Query | Latency | Status |
|---|-------|-------|---------|--------|
| 1 | "Addiction Medicine Specialist" | What are the key things to know about "Addiction Medicine Sp... | 5387ms | ✅ |
| 2 | "Adolescent Medicine Specialist" | What are the key things to know about "Adolescent Medicine S... | 5504ms | ✅ |
| 3 | "Allergy & Immunology Specialist" | What are the key things to know about "Allergy & Immunology ... | 6203ms | ✅ |
| 4 | "Heart Health Specialist" | I sometimes feel my heart racing and get dizzy. What could b... | 5648ms | ✅ |
| 5 | "Clinical Pathology Specialist" | What are the key things to know about "Clinical Pathology Sp... | 5795ms | ✅ |
| 6 | "Dental Care Specialist" | I have a toothache that comes and goes. What could it be? | — | ❌ |
| 7 | "Skin Care Specialist" | I have a red itchy rash on my forearm that appeared yesterda... | — | ❌ |
| 8 | "Emergency Care Specialist" | What should I do if someone is having a severe allergic reac... | — | ❌ |
| 9 | "Hormone Specialist" | I feel tired all the time and have gained weight. Could this... | — | ❌ |
| 10 | "Reproductive Endocrinology & Fertility Specialist" | What are the key things to know about "Reproductive Endocrin... | — | ❌ |
| 11 | "Forensic Medicine Specialist" | What are the key things to know about "Forensic Medicine Spe... | — | ❌ |
| 12 | "Digestive Health Specialist" | I have bloating and stomach pain after eating. What dietary ... | — | ❌ |
| 13 | "Genetics & Genomics Specialist" | What are the key things to know about "Genetics & Genomics S... | — | ❌ |
| 14 | "Senior Health Specialist" | My 72-year-old mother has been forgetting things more often.... | — | ❌ |
| 15 | "Blood Specialist" | What are the key things to know about "Blood Specialist"? | — | ❌ |
| 16 | "Infection Specialist" | What are the key things to know about "Infection Specialist"... | — | ❌ |
| 17 | "Integrative Medicine Specialist" | What are the key things to know about "Integrative Medicine ... | — | ❌ |
| 18 | "Chronic Care Specialist" | What are the key things to know about "Chronic Care Speciali... | — | ❌ |
| 19 | "Lifestyle Medicine Specialist" | What are the key things to know about "Lifestyle Medicine Sp... | — | ❌ |
| 20 | "Newborn Care Specialist" | What are the key things to know about "Newborn Care Speciali... | — | ❌ |
| 21 | "Kidney Specialist" | What are the key things to know about "Kidney Specialist"? | — | ❌ |
| 22 | "Brain & Nerve Specialist" | I get migraines about twice a month. What can help prevent t... | — | ❌ |
| 23 | "Nutrition & Diet Specialist" | What diet would you recommend for someone with high choleste... | — | ❌ |
| 24 | "Women's Health Specialist" | What are the key things to know about "Women's Health Specia... | — | ❌ |
| 25 | "Occupational Medicine Specialist" | What are the key things to know about "Occupational Medicine... | — | ❌ |
| 26 | "Eye Care Specialist" | My eyes feel dry and gritty all day. What can help? | — | ❌ |
| 27 | "Bone & Muscle Specialist" | I twisted my ankle playing sports. It is swollen. What shoul... | — | ❌ |
| 28 | "Ear, Nose & Throat Specialist" | What are the key things to know about "Ear, Nose & Throat Sp... | — | ❌ |
| 29 | Child Health Specialist | My 3-year-old has a cough and runny nose for 4 days. No feve... | — | ❌ |
| 30 | "Pain Management Specialist" | I have chronic lower back pain that gets worse when sitting ... | — | ❌ |
| 31 | "Palliative & Hospice Care Specialist" | What are the key things to know about "Palliative & Hospice ... | — | ❌ |
| 32 | "Medication Specialist" | Can I take ibuprofen with my blood pressure medication? | — | ❌ |
| 33 | "Mental Health Specialist" | I have been feeling anxious and unable to sleep properly for... | — | ❌ |
| 34 | "Lung & Breathing Specialist" | I get short of breath when climbing stairs. Is this normal? | — | ❌ |
| 35 | "Radiology & Imaging Specialist" | What does an X-ray show for pneumonia vs normal lungs? | — | ❌ |
| 36 | "Rehabilitation Specialist (Physiatry)" | What are the key things to know about "Rehabilitation Specia... | — | ❌ |
| 37 | "Joint & Immune Specialist" | What are the key things to know about "Joint & Immune Specia... | — | ❌ |
| 38 | "Sleep Medicine Specialist" | I have trouble falling asleep and wake up multiple times at ... | — | ❌ |
| 39 | "Sports Medicine Specialist" | What are the key things to know about "Sports Medicine Speci... | — | ❌ |
| 40 | "Toxicology & Poisoning Specialist" | What are the key things to know about "Toxicology & Poisonin... | — | ❌ |
| 41 | "Transplant Medicine Specialist" | What are the key things to know about "Transplant Medicine S... | — | ❌ |
| 42 | "Travel Medicine Specialist" | I am traveling to a tropical country next month. What vaccin... | — | ❌ |
| 43 | "Urinary Tract Specialist" | What are the key things to know about "Urinary Tract Special... | — | ❌ |
| 44 | "Vascular Medicine Specialist" | What are the key things to know about "Vascular Medicine Spe... | — | ❌ |

---

## 📝 Detailed Responses

### "Addiction Medicine Specialist" (`addiction_medicine`)

**Query:** What are the key things to know about "Addiction Medicine Specialist"?

**Response:**

As an Addiction Medicine Specialist, here are the key things to know about this vital medical subspecialty:

1.  **Defining the Specialty:**
    *   **Recognized Medical Subspecialty

**Latency:** 5387ms | **Status:** ✅ Pass

---

### "Adolescent Medicine Specialist" (`adolescent_medicine`)

**Query:** What are the key things to know about "Adolescent Medicine Specialist"?

**Response:**

As an Adolescent Medicine Specialist, here are the key things to know about our role and approach:

1.  **Specialized Age Range:** We primarily care for young people aged **1

**Latency:** 5504ms | **Status:** ✅ Pass

---

### "Allergy & Immunology Specialist" (`allergy_immunology`)

**Query:** What are the key things to know about "Allergy & Immunology Specialist"?

**Response:**

As an Allergist/Immunologist in a community clinic, I see a wide spectrum of patients, from infants to the elderly. Our specialty is fascinating because it delves into the intricate workings of

**Latency:** 6203ms | **Status:** ✅ Pass

---

### "Heart Health Specialist" (`cardiology`)

**Query:** I sometimes feel my heart racing and get dizzy. What could be causing this?

**Response:**

I understand this can be quite unsettling and concerning. Feeling your heart race and getting dizzy are symptoms that definitely warrant a thorough medical evaluation. As a cardiologist, my primary concern is to ensure your safety and determine

**Latency:** 5648ms | **Status:** ✅ Pass

---

### "Clinical Pathology Specialist" (`clinical_pathology`)

**Query:** What are the key things to know about "Clinical Pathology Specialist"?

**Response:**

As a Clinical Pathologist, I can tell you that we are often called the "doctors' doctor" or the "invisible doctors" because while we rarely interact directly with patients, our work under

**Latency:** 5795ms | **Status:** ✅ Pass

---

### "Dental Care Specialist" (`dentistry`)

**Query:** I have a toothache that comes and goes. What could it be?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 35.466433405s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Skin Care Specialist" (`dermatology`)

**Query:** I have a red itchy rash on my forearm that appeared yesterday. What could it be?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 35.087987939s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Emergency Care Specialist" (`emergency_medicine`)

**Query:** What should I do if someone is having a severe allergic reaction?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 34.705592923s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Hormone Specialist" (`endocrinology`)

**Query:** I feel tired all the time and have gained weight. Could this be thyroid related?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 34.326222844s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Reproductive Endocrinology & Fertility Specialist" (`fertility`)

**Query:** What are the key things to know about "Reproductive Endocrinology & Fertility Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 33.949872447s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Forensic Medicine Specialist" (`forensic_medicine`)

**Query:** What are the key things to know about "Forensic Medicine Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 33.573338826s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Digestive Health Specialist" (`gastroenterology`)

**Query:** I have bloating and stomach pain after eating. What dietary changes can help?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 33.19847624s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Genetics & Genomics Specialist" (`genetics`)

**Query:** What are the key things to know about "Genetics & Genomics Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 32.821662657s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Senior Health Specialist" (`geriatrics`)

**Query:** My 72-year-old mother has been forgetting things more often. Should I be concerned?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 32.460633897s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Blood Specialist" (`haematology`)

**Query:** What are the key things to know about "Blood Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 32.105271429s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Infection Specialist" (`infectious_disease`)

**Query:** What are the key things to know about "Infection Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 31.725258523s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Integrative Medicine Specialist" (`integrative_medicine`)

**Query:** What are the key things to know about "Integrative Medicine Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 31.352035897s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Chronic Care Specialist" (`internal_medicine`)

**Query:** What are the key things to know about "Chronic Care Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 30.955348754s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Lifestyle Medicine Specialist" (`lifestyle_medicine`)

**Query:** What are the key things to know about "Lifestyle Medicine Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 30.604483556s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Newborn Care Specialist" (`neonatology`)

**Query:** What are the key things to know about "Newborn Care Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 30.249115305s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Kidney Specialist" (`nephrology`)

**Query:** What are the key things to know about "Kidney Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 29.84737175s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Brain & Nerve Specialist" (`neurology`)

**Query:** I get migraines about twice a month. What can help prevent them?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 29.468595268s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Nutrition & Diet Specialist" (`nutrition_dietetics`)

**Query:** What diet would you recommend for someone with high cholesterol?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 29.111465172s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Women's Health Specialist" (`obstetrics_gynecology`)

**Query:** What are the key things to know about "Women's Health Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 28.739936821s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Occupational Medicine Specialist" (`occupational_medicine`)

**Query:** What are the key things to know about "Occupational Medicine Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 28.356399098s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Eye Care Specialist" (`ophthalmology`)

**Query:** My eyes feel dry and gritty all day. What can help?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 27.973670708s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Bone & Muscle Specialist" (`orthopaedics`)

**Query:** I twisted my ankle playing sports. It is swollen. What should I do?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 27.612398905s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Ear, Nose & Throat Specialist" (`otorhinolaryngology`)

**Query:** What are the key things to know about "Ear, Nose & Throat Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 27.233275655s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### Child Health Specialist (`paediatrics`)

**Query:** My 3-year-old has a cough and runny nose for 4 days. No fever. Should I be worried?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 26.848528345s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Pain Management Specialist" (`pain_management`)

**Query:** I have chronic lower back pain that gets worse when sitting for long periods.

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 26.485028123s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Palliative & Hospice Care Specialist" (`palliative_care`)

**Query:** What are the key things to know about "Palliative & Hospice Care Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 26.126829351s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Medication Specialist" (`pharmacy`)

**Query:** Can I take ibuprofen with my blood pressure medication?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 25.763127913s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Mental Health Specialist" (`psychiatry`)

**Query:** I have been feeling anxious and unable to sleep properly for the past month.

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 25.403497664s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Lung & Breathing Specialist" (`pulmonology`)

**Query:** I get short of breath when climbing stairs. Is this normal?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 25.030832287s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Radiology & Imaging Specialist" (`radiology`)

**Query:** What does an X-ray show for pneumonia vs normal lungs?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 24.627637379s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Rehabilitation Specialist (Physiatry)" (`rehabilitation`)

**Query:** What are the key things to know about "Rehabilitation Specialist (Physiatry)"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 24.249311612s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Joint & Immune Specialist" (`rheumatology`)

**Query:** What are the key things to know about "Joint & Immune Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 23.893976793s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Sleep Medicine Specialist" (`sleep_medicine`)

**Query:** I have trouble falling asleep and wake up multiple times at night.

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 23.527195498s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Sports Medicine Specialist" (`sports_medicine`)

**Query:** What are the key things to know about "Sports Medicine Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 23.146388836s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Toxicology & Poisoning Specialist" (`toxicology`)

**Query:** What are the key things to know about "Toxicology & Poisoning Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 22.801799462s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Transplant Medicine Specialist" (`transplant_medicine`)

**Query:** What are the key things to know about "Transplant Medicine Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 22.427134373s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Travel Medicine Specialist" (`travel_medicine`)

**Query:** I am traveling to a tropical country next month. What vaccines do I need?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 22.073598842s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Urinary Tract Specialist" (`urology`)

**Query:** What are the key things to know about "Urinary Tract Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 21.718362146s.

**Latency:** 0ms | **Status:** ❌ Failed

---

### "Vascular Medicine Specialist" (`vascular_medicine`)

**Query:** What are the key things to know about "Vascular Medicine Specialist"?

**Response:**

429: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. 
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash
Please retry in 21.36194871s.

**Latency:** 0ms | **Status:** ❌ Failed

---

## 📊 Performance Summary

- **Average latency:** 5109ms
- **Fastest:** 2115ms
- **Slowest:** 6203ms
- **Agents tested:** 44 / 44
- **Success rate:** 13%
