# AI CareCompanion — Offline Health Assistant

> Offline-first AI health companion powered by Google's Gemma 4 4B running entirely on-device. Multi-agent specialist routing, drug lookup, symptom triage, nearby doctor search, and Firebase-backed cloud sync — all in a single React Native app for Android and iOS.

[![React Native](https://img.shields.io/badge/React%20Native-0.76-blue)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-orange)](https://firebase.google.com)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

---

## Demo Video

[![AI CareCompanion Demo](https://img.youtube.com/vi/h1XZizzMmdQ/maxresdefault.jpg)](https://youtu.be/h1XZizzMmdQ)

---

## Screenshots

| Splash | Sign In |
|--------|---------|
| ![Splash](docs/screenshots/frame_0_00_0f.jpeg) | ![Sign In](docs/screenshots/frame_0_07_28f.jpeg) |

| Model Download | Home |
|----------------|------|
| ![Model Download](docs/screenshots/frame_0_10_23f.jpeg) | ![Home](docs/screenshots/frame_0_13_12f.jpeg) |

| Lab Report Analysis | AI Response |
|---------------------|-------------|
| ![Lab Report Analysis](docs/screenshots/frame_0_31_14f.jpeg) | ![AI Response](docs/screenshots/frame_0_48_20f.jpeg) |

| Skin Lesion Analysis | Hindi Language |
|----------------------|----------------|
| ![Skin Lesion Analysis](docs/screenshots/frame_1_29_4f.jpeg) | ![Hindi Language](docs/screenshots/frame_2_49_3f.jpeg) |

| Chat Reports | Report Generated |
|--------------|------------------|
| ![Chat Reports](docs/screenshots/frame_3_04_14f.jpeg) | ![Report Generated](docs/screenshots/frame_3_06_23f.jpeg) |

| PDF Patient Summary | PDF Clinical Report |
|---------------------|---------------------|
| ![PDF Patient Summary](docs/screenshots/frame_3_09_5f.jpeg) | ![PDF Clinical Report](docs/screenshots/frame_3_18_20f.jpeg) |

| Health Insights | Insight Detail |
|-----------------|----------------|
| ![Health Insights](docs/screenshots/frame_3_48_9f.jpeg) | ![Insight Detail](docs/screenshots/frame_3_50_14f.jpeg) |

| Navigation Menu | Drug Search |
|-----------------|-------------|
| ![Navigation Menu](docs/screenshots/frame_4_10_11f.jpeg) | ![Drug Search](docs/screenshots/frame_4_14_28f.jpeg) |

| Drug Detail | Affordable Alternatives |
|-------------|------------------------|
| ![Drug Detail](docs/screenshots/frame_4_19_13f.jpeg) | ![Affordable Alternatives](docs/screenshots/frame_4_35_10f.jpeg) |

| Find Nearby | On-Device AI |
|-------------|--------------|
| ![Find Nearby](docs/screenshots/frame_4_43_12f.jpeg) | ![On-Device AI](docs/screenshots/frame_4_52_14f.jpeg) |

---

## System Architecture

### High-Level Design (HLD)
![High Level Design](docs/architecture_hld.png)
*Data flow between the Mobile Client, AI Orchestrator, Inference Engines, and SQLite/Firebase Data Layer.*

### Multi-Agent Pipeline (LLD)
![Low Level Design](docs/architecture_lld.png)
*The 5-step sequence flow of a user query being routed and processed by the AI Orchestrator and Specialists.*

---

## Features

### On-Device AI — No Internet Required
- **Gemma 4 4B (IQ2_M)** runs fully on-device via **llama.rn** (GGUF format)
- ~1.5 GB model, ~2 GB RAM — works offline after one-time download
- Zero data sent to external servers during inference
- Cloud AI (Gemini) used as fallback when online

### Multi-Agent Specialist System
- **46 specialist agents** — each with domain-specific system prompts and tool access
- **Central orchestrator** auto-detects intent and routes to the right specialist(s)
- Up to 3 agents collaborate on complex multi-system queries
- Real-time routing info (agent name + response time) shown in every message

| # | Agent | Specialty | Image Support |
|---|-------|-----------|:---:|
| 1 | Triage Assistant | Orchestrator — intent detection & routing | ✓ |
| 2 | General Health Specialist | General Practice | |
| 3 | Child Health Specialist | Paediatrics | |
| 4 | Chronic Care Specialist | Internal Medicine | |
| 5 | Heart Health Specialist | Cardiology | |
| 6 | Skin Care Specialist | Dermatology | ✓ |
| 7 | Brain & Nerve Specialist | Neurology | |
| 8 | Digestive Health Specialist | Gastroenterology | |
| 9 | Lung & Breathing Specialist | Pulmonology | |
| 10 | Kidney Specialist | Nephrology | |
| 11 | Hormone Specialist | Endocrinology | |
| 12 | Infection Specialist | Infectious Disease | |
| 13 | Women's Health Specialist | Obstetrics & Gynecology | |
| 14 | Bone & Muscle Specialist | Orthopaedics | |
| 15 | Eye Care Specialist | Ophthalmology | |
| 16 | Ear, Nose & Throat Specialist | ENT | |
| 17 | Mental Health Specialist | Psychiatry | |
| 18 | Dental Care Specialist | Dentistry | |
| 19 | Urinary Tract Specialist | Urology | |
| 20 | Blood Specialist | Haematology | |
| 21 | Joint & Immune Specialist | Rheumatology | |
| 22 | Allergy Specialist | Allergy & Immunology | |
| 23 | Newborn Care Specialist | Neonatology | |
| 24 | Senior Health Specialist | Geriatrics | |
| 25 | Emergency Care Specialist | Emergency Medicine | |
| 26 | Nutrition & Diet Specialist | Nutrition & Dietetics | |
| 27 | Medication Specialist | Pharmacy | |
| 28 | Radiology & Imaging Specialist | Radiology | ✓ |
| 29 | Sports Medicine Specialist | Sports Medicine | |
| 30 | Sleep Medicine Specialist | Sleep Medicine | |
| 31 | Palliative & Hospice Care Specialist | Palliative Care | |
| 32 | Rehabilitation Specialist | Physiatry / Rehab Medicine | |
| 33 | Genetics & Genomics Specialist | Genetics | |
| 34 | Pain Management Specialist | Pain Management | |
| 35 | Toxicology & Poisoning Specialist | Toxicology | |
| 36 | Travel Medicine Specialist | Travel Medicine | |
| 37 | Adolescent Medicine Specialist | Adolescent Medicine | |
| 38 | Reproductive & Fertility Specialist | Fertility | |
| 39 | Vascular Medicine Specialist | Vascular Medicine | |
| 40 | Transplant Medicine Specialist | Transplant Medicine | |
| 41 | Clinical Pathology Specialist | Pathology | |
| 42 | Integrative Medicine Specialist | Integrative Medicine | |
| 43 | Addiction Medicine Specialist | Addiction Medicine | |
| 44 | Occupational Medicine Specialist | Occupational Medicine | |
| 45 | Lifestyle Medicine Specialist | Lifestyle Medicine | |
| 46 | Preventive Medicine Specialist | Preventive Medicine | |

### Health Tools
- **Drug Info** — Search 1mg medicine database (name, dosage, warnings, interactions)
- **Affordable Alternatives** — Find cheaper generic substitutes with price comparison
- **First Aid Guide** — Step-by-step emergency guidance
- **Find Nearby Doctors** — Location-based doctor and hospital search
- **Image Analysis** — Analyze wound, rash, or medical images via camera/gallery
- **Health Metrics** — Track vitals (BP, glucose, weight) over time
- **Medication Reminders** — Local notifications for medication schedules
- **Chat Reports** — Export conversation summaries as PDF

### Privacy & Sync
- All AI inference runs **on-device** — no health data leaves your phone
- **SQLite** local database for all chats, profiles, and history
- **Firebase Firestore** optional cloud sync with incremental pull + outbox pattern
- **Biometric authentication** (fingerprint/face) for app lock

### UI/UX
- Light and Dark mode
- Markdown rendering in AI responses
- Animated splash screen
- Search history across drug lookups and AI queries

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.76 (TypeScript) |
| On-Device AI | llama.rn — Gemma 4 4B IQ2_M GGUF |
| Cloud AI | Google Gemini (online fallback) |
| Auth | Firebase Auth (Email/Password + email verification) |
| Local DB | SQLite via react-native-sqlite-storage |
| Cloud Sync | Firebase Firestore |
| Navigation | React Navigation v7 |
| Biometrics | react-native-biometrics |

---

## Setup

### Prerequisites

- Node.js >= 18
- React Native CLI
- Android Studio (API 33+) or Xcode 15+
- Firebase project with Auth and Firestore enabled

### 1. Clone and install

```bash
git clone https://github.com/narender-rk10/AI-CareCompanion-Offline-Health-By-Gemma.git
cd AI-CareCompanion-Offline-Health-By-Gemma
npm install
```

### 2. iOS pods

```bash
cd ios && pod install && cd ..
```

### 3. Firebase configuration

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Email/Password**
3. Enable **Firestore Database**
4. Download `google-services.json` → place in `android/app/`
5. Download `GoogleService-Info.plist` → add to Xcode project

### 4. Environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

```env
# Gemini API key — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Google Sign-In Web Client ID (Firebase Console → Auth → Google → Web SDK config)
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com

# Direct GGUF download URL for Gemma 4 4B (~1.5 GB)
MODEL_DOWNLOAD_URL=https://huggingface.co/your-org/model/resolve/main/model.gguf
```

> Firebase credentials go in `android/app/google-services.json` and `ios/GoogleService-Info.plist` — not in `.env`.

### 5. Run

```bash
# Android
npm run android

# iOS
npm run ios
```

### 6. Download the AI model

On first launch, the app will prompt you to download Gemma 4 4B (~1.5 GB). Requires a stable Wi-Fi connection and ~3 GB free storage. After download the model runs fully offline.

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # AppButton, AppInput, AppCard, ScreenHeader
│   ├── ChatBubble.tsx
│   ├── BiometricGate.tsx
│   ├── MarkdownText.tsx
│   └── SyncStatusBar.tsx
├── screens/             # All app screens
│   ├── ChatScreen.tsx               # Main AI chat
│   ├── HomeScreen.tsx               # Dashboard
│   ├── DrugInfoScreen.tsx           # Medicine search
│   ├── AffordableAlternativesScreen.tsx
│   ├── FirstAidGuideScreen.tsx
│   ├── FindNearbyDoctorScreen.tsx
│   ├── ImageAnalysisScreen.tsx
│   ├── AgentSelectorScreen.tsx
│   ├── ChatReportsScreen.tsx
│   ├── SettingsScreen.tsx
│   └── ...
├── services/            # Business logic
│   ├── LlmService.ts              # Gemini cloud AI
│   ├── LocalLlmService.ts         # llama.rn on-device AI
│   ├── AgentService.ts            # Multi-agent orchestration
│   ├── ModelManager.ts            # Model download & lifecycle
│   ├── DatabaseService.ts         # SQLite wrapper
│   ├── FirebaseService.ts         # Auth + Firestore sync
│   ├── DrugInfoService.ts         # 1mg medicine DB
│   └── PlaceSearchService.ts      # Nearby doctor search
├── context/
│   └── HealthProfileContext.tsx   # Global health profile state
├── navigation/
│   └── AppNavigator.tsx           # Auth flow + tab navigation
└── theme/                         # Colors, typography, dark mode
```

---

## Demo Prompts

```
"I have chest pain and shortness of breath"
"What is the dosage for metformin 500mg?"
"My child has had a fever for 3 days"
"Find a cardiologist near me"
"What are affordable alternatives to Crocin?"
"Analyze this rash on my arm" (attach photo)
```

---

## Privacy

- AI inference is **100% on-device** when using the offline model
- Health profile and chat history stored only in local SQLite by default
- Firebase sync is opt-in — no data uploaded without user action
- Biometric lock prevents unauthorized access

---

## License

Copyright (c) 2026 Narender Keswani. All Rights Reserved.

This project is proprietary software. You may view the source code for personal reference, but you may **not** copy, distribute, modify, or use it commercially without explicit written permission.

See [LICENSE](LICENSE) for full terms.

---

Built for people who need reliable health guidance anywhere — with or without internet.
