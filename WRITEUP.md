# CareCompanion: A Multi-Agent Medical AI Copilot Powered by Gemma 4

**An offline-first, voice-enabled healthcare assistant that orchestrates 46 specialist AI doctors through a Gemma 4–driven routing pipeline — built for underserved communities with unreliable connectivity.**

**Track:** Built with Google AI

---

## Problem Statement

Over 400 million people worldwide lack access to basic healthcare services. In rural and underserved communities, a single general practitioner may cover thousands of patients, specialist consultations require hours of travel, and internet connectivity is intermittent at best. Existing health apps assume constant connectivity and offer only generic chatbot responses — they cannot triage across medical specialties, operate offline, or adapt to a patient's language and health history.

CareCompanion addresses this gap with a production-grade mobile application that brings multi-specialist medical guidance to anyone with a smartphone — online or off.

---

## Architecture Overview

CareCompanion is a React Native 0.85 (TypeScript) application with a layered architecture built around a central AI orchestration pipeline.

**Frontend Layer:** 26 screens, 14 reusable UI components, and a design system with 50+ color tokens supporting light and dark modes. The app uses React Navigation v7 with native stack and bottom tab navigation across five primary sections: Home (dashboard), Chat, Agents, Health Metrics, and Settings.

**AI Layer:** The core innovation — a 5-step inference pipeline (detailed below) that transforms a single user message into a structured, multi-specialist medical response. The pipeline uses Gemma 4 models exclusively for all reasoning: intent classification, image analysis, contextual query rewriting, specialist consultation, and response formatting.

**Data Layer:** SQLite (via `react-native-sqlite-storage`) serves as the offline-first datastore with 20+ tables across 6 schema versions. Firebase Firestore provides cloud synchronisation through an outbox-based queue that buffers writes when offline and flushes them on reconnection.

**Voice Layer:** Speech-to-text (`@react-native-voice/voice`) supporting 8 languages and text-to-speech (`react-native-tts`) for hands-free interaction — critical for users with limited literacy.

```
┌──────────────────────────────────────────────────────────────┐
│                     React Native 0.85                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  26      │  │  Chat    │  │  Voice   │  │  Health      │ │
│  │  Screens │  │  System  │  │  STT/TTS │  │  Dashboard   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│       └──────────────┼────────────┼────────────────┘         │
│                      ▼            ▼                          │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              AgentService (5-Step Pipeline)           │   │
│  │  Rewrite → Classify → Route → Consult → Format       │   │
│  └───────────────────────┬───────────────────────────────┘   │
│                          ▼                                   │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │  LlmService  │  │ ModelManager│  │  ToolExecutor      │  │
│  │  (Gemini API)│  │ (llama.rn)  │  │  (7 tool modules)  │  │
│  └──────┬───────┘  └──────┬──────┘  └────────────────────┘  │
│         ▼                 ▼                                  │
│  ┌──────────────────────────────┐  ┌──────────────────────┐  │
│  │  Gemma 4 26B / 31B (Cloud)  │  │  Gemma 4 4B (Device) │  │
│  └──────────────────────────────┘  └──────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   SQLite     │──│   Outbox     │──│   Firestore        │  │
│  │  (offline)   │  │   (queue)    │  │   (cloud sync)     │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## How We Use Gemma 4

Gemma 4 is not a bolt-on feature — it is the engine that powers every intelligent decision in CareCompanion. We use two Gemma 4 variants via the Gemini API (`@google/genai`):

- **Gemma 4 26B A4B (MoE)** — Default model. Only 4B parameters active per inference, delivering fast responses with low latency. Ideal for routine triage and follow-up questions.
- **Gemma 4 31B (Dense)** — Selected for complex multi-system queries where reasoning depth matters. Users can switch models from Settings.

Additionally, the app supports **on-device inference** via `llama.rn` with a quantised **Gemma 4 4B Q4_K_M** GGUF model (~2.7 GB), enabling fully offline operation.

### The 5-Step Inference Pipeline

Every user message passes through a Gemma 4–powered pipeline in `AgentService.ts`:

**Step 1 — Contextual Query Rewriting.** If conversation history exists, Gemma 4 rewrites the user's message into a self-contained query. For example, if the user previously discussed diabetes and now asks "Is it hereditary?", the model resolves "it" to "Type 2 diabetes" and produces a complete query. This prevents downstream agents from losing context.

**Step 2 — Medical Image Classification.** When the user uploads an image, Gemma 4's vision capability classifies it into one of 11 medical categories (skin lesion, X-ray, MRI, CT scan, lab report, ECG, etc.) and returns structured JSON with `image_type`, `body_region`, `description`, and `urgency`. Non-medical images are rejected with an explanation. This classification directly influences routing.

**Step 3 — Intent Detection & Specialist Routing.** The Orchestrator agent — driven by a carefully engineered system prompt with 46 specialist IDs, routing keywords, emergency detection rules, and image-based routing — analyses the (possibly rewritten) query and outputs a JSON object: `{ primarySpecialist, secondarySpecialists[], confidence, reasoning }`. The system normalises this output, validates specialist IDs against a registry, and falls back to `general_practice` if parsing fails.

**Step 4 — Parallel Specialist Consultation.** The primary specialist agent receives the full query with streaming enabled (token-by-token delivery to the UI). Up to 2 secondary specialists run in parallel without streaming. Each specialist agent has a domain-specific system prompt (stored as YAML — 46 prompt files totalling ~700KB), a curated tool list, and healthcare safety rules appended at runtime. If the user has a health profile, it is injected as context: _"Patient profile: 35M, Type 2 diabetes, metformin 500mg..."_

**Step 5 — Markdown Formatting & Follow-up Generation.** Specialist responses are combined into a clean markdown summary. Multi-specialist responses get section headers with specialty emojis. Follow-up suggestions are extracted (separated by `---` markers), deduplicated, and rendered as interactive chips in the UI.

### Tool Calling with Gemma 4

Agents can invoke tools using a custom `[[TOOL:name|{args}]]` syntax. Gemma 4 generates these inline tool calls, which the `ToolExecutor` parses, executes, and feeds back into the conversation for up to 3 rounds. Available tools include BMI/BMR calculators, cardiovascular risk scoring, drug interaction checks, paediatric dosing, lab reference lookups, emergency triage, and image analysis — 7 tool modules covering 30+ functions, all backed by local SQLite seed data for offline operation.

### Why Gemma 4 Specifically?

1. **SystemInstruction support.** Unlike earlier Gemma versions, Gemma 4 supports the `systemInstruction` parameter in the Gemini API, which is essential for our 46 distinct specialist prompts. Our code includes a graceful fallback that prepends system prompts to user content if a model rejects `systemInstruction`.
2. **Multimodal vision.** Gemma 4's image understanding enables our medical image classification pipeline without requiring a separate vision model.
3. **MoE efficiency.** The 26B A4B variant activates only 4B parameters per token, keeping API costs low while maintaining quality suitable for medical guidance.
4. **On-device viability.** The 4B variant runs as a quantised GGUF via `llama.rn` at a usable 2–5 tokens/second on mid-range Android devices, enabling true offline-first operation.

---

## Challenges Overcome

**Streaming reliability.** Gemma 4 via the Gemini API occasionally returns empty streaming responses. We implemented a dual-layer fallback: if the stream throws a `Response body is empty` error, we transparently retry with a non-streaming `generateContent` call, keeping the UX smooth.

**Specialist hallucination in routing.** Early versions of the orchestrator would sometimes return invalid specialist IDs or hallucinate new ones. We solved this with strict normalisation: every routing result is validated against the agent registry, unknown IDs are remapped, and duplicate specialists are filtered. If JSON parsing fails entirely, image-based routing provides a secondary fallback path.

**Offline-to-online sync conflicts.** With SQLite as the primary store and Firestore as the sync target, we needed a conflict strategy that wouldn't lose data. We implemented last-write-wins with soft deletes (tombstone pattern) and an outbox queue that retries failed pushes up to 5 times with exponential backoff.

**Multi-language medical accuracy.** Supporting 8 languages required per-agent language instructions injected at runtime. The system appends language-specific directives (e.g., _"Respond in Hindi using simple medical terminology"_) to specialist prompts without degrading medical accuracy.

---

## Technical Choices & Rationale

| Decision                       | Alternative Considered   | Why We Chose This                                                                              |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------- |
| React Native 0.85              | Flutter, Native          | Cross-platform from a single TypeScript codebase; access to `llama.rn` for on-device inference |
| SQLite (offline-first)         | Firestore-only           | Zero-connectivity operation is a core requirement for rural deployment                         |
| Outbox sync pattern            | Real-time listeners      | More resilient to network flaps; doesn't require persistent connections                        |
| Cloud-hosted Gemma 4 (primary) | On-device only           | Sub-second latency vs. 2–5s/token on device; on-device available as fallback                   |
| 46 YAML prompt files           | Single monolithic prompt | Maintainable, version-controlled, independently testable per specialty                         |
| Custom `[[TOOL:...]]` syntax   | Gemini function calling  | Works identically across cloud and on-device inference paths                                   |

---

## Impact

CareCompanion transforms a smartphone into a panel of 46 medical specialists. A mother in a rural clinic can describe her child's symptoms in Hindi, attach a photo of a rash, and receive structured guidance from Paediatrics and Dermatology specialists — with follow-up questions, drug dosing tools, and emergency triage — all powered by Gemma 4, all working offline.

This is not a chatbot. It is a clinical decision-support system built on open-source AI.
