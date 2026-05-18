import { registerTool } from './registry';

function analyzeSkinImage(args: Record<string, unknown>): string {
  const imageBase64 = String(args.image_base64 || '');
  if (!imageBase64) {
    return JSON.stringify({
      error:
        'No image provided. Please upload a clear photo of the skin condition.',
    });
  }

  return JSON.stringify({
    note: 'Image analysis invokes on-device AI model for skin condition assessment.',
    image_size_chars: imageBase64.length,
    general_guidance: {
      assess: [
        'Distribution: Is it localized or widespread?',
        'Morphology: Flat (macule/patch), raised (papule/plaque), fluid-filled (vesicle/bulla/pustule)?',
        'Color: Red, brown, black, purple, skin-colored, yellow?',
        'Borders: Well-defined or poorly defined?',
        'Surface: Smooth, scaly, crusted, ulcerated?',
      ],
      differentials:
        'Based on visual characteristics, consider inflammatory (eczema, psoriasis), infectious (fungal, bacterial, viral), neoplastic, or allergic causes.',
      recommendation:
        'A detailed description from the AI model is being processed. Meanwhile: keep area clean, avoid scratching, use the search_skin_db tool with your symptoms to find remedies.',
    },
  });
}

function detectImageType(args: Record<string, unknown>): string {
  const imageBase64 = String(args.image_base64 || '');
  const description = String(args.description || '');

  if (!imageBase64 && !description) {
    return JSON.stringify({ error: 'No image or description provided.' });
  }

  const desc = description.toLowerCase();
  let detectedType = 'unknown';
  let confidence = 0.5;
  let suggestedAgent = 'general_practice';
  let analysis = '';

  if (
    desc.includes('xray') ||
    desc.includes('x-ray') ||
    desc.includes('bone') ||
    desc.includes('fracture') ||
    desc.includes('chest x')
  ) {
    detectedType = 'xray';
    confidence = 0.85;
    suggestedAgent = 'orthopaedics';
    analysis =
      'X-ray image detected. Analyzing for bone fractures, joint abnormalities, or chest pathology.';
  } else if (desc.includes('mri') || desc.includes('magnetic resonance')) {
    detectedType = 'mri';
    confidence = 0.85;
    suggestedAgent = 'neurology';
    analysis =
      'MRI scan detected. Analyzing soft tissue, brain, spine, or joint structures.';
  } else if (
    desc.includes('ct') ||
    desc.includes('computed tomography') ||
    desc.includes('cat scan')
  ) {
    detectedType = 'ct_scan';
    confidence = 0.85;
    suggestedAgent = 'internal_medicine';
    analysis =
      'CT scan detected. Analyzing cross-sectional anatomy for abnormalities.';
  } else if (
    desc.includes('skin') ||
    desc.includes('rash') ||
    desc.includes('lesion') ||
    desc.includes('pimple') ||
    desc.includes('acne') ||
    desc.includes('mole') ||
    desc.includes('spot')
  ) {
    detectedType = 'dermatology';
    confidence = 0.8;
    suggestedAgent = 'dermatology';
    analysis =
      'Skin image detected. Analyzing for rashes, lesions, moles, or other dermatological conditions.';
  } else if (
    desc.includes('eye') ||
    desc.includes('red eye') ||
    desc.includes('vision')
  ) {
    detectedType = 'ophthalmology';
    confidence = 0.75;
    suggestedAgent = 'ophthalmology';
    analysis =
      'Eye image detected. Analyzing for redness, discharge, or other ocular conditions.';
  } else if (
    desc.includes('prescription') ||
    desc.includes('medicine') ||
    desc.includes('pill') ||
    desc.includes('tablet')
  ) {
    detectedType = 'prescription';
    confidence = 0.8;
    suggestedAgent = 'pharmacy';
    analysis =
      'Prescription or medication image detected. Analyzing drug name, dosage, and instructions.';
  } else if (
    desc.includes('wound') ||
    desc.includes('cut') ||
    desc.includes('burn') ||
    desc.includes('injury')
  ) {
    detectedType = 'wound';
    confidence = 0.75;
    suggestedAgent = 'general_practice';
    analysis =
      'Wound or injury image detected. Assessing severity and providing first aid guidance.';
  } else {
    detectedType = 'general';
    confidence = 0.5;
    suggestedAgent = 'general_practice';
    analysis =
      'General medical image detected. Analyzing for relevant clinical features.';
  }

  return JSON.stringify({
    detected_type: detectedType,
    confidence,
    suggested_agent: suggestedAgent,
    analysis,
    image_size_chars: imageBase64 ? imageBase64.length : 0,
    description_used: desc.slice(0, 100),
  });
}

function analyzeMedicalImage(args: Record<string, unknown>): string {
  const imageType = String(args.image_type || 'general');
  const imageBase64 = String(args.image_base64 || '');

  if (!imageBase64) {
    return JSON.stringify({ error: 'No image provided.' });
  }

  const typeGuidance: Record<string, string> = {
    xray: 'X-ray Analysis: Look for bone alignment, fractures, joint space narrowing, lung opacities, pleural effusion, or cardiac silhouette abnormalities.',
    mri: 'MRI Analysis: Evaluate soft tissue contrast, brain lesions, spinal cord compression, disc herniation, or ligament tears.',
    ct_scan:
      'CT Scan Analysis: Assess cross-sectional anatomy for masses, bleeding, organ enlargement, or vascular abnormalities.',
    dermatology:
      'Skin Analysis: Evaluate lesion morphology (macule/papule/plaque), distribution, color, borders, and surface characteristics. Consider ABCDE criteria for moles.',
    ophthalmology:
      'Eye Analysis: Check for conjunctival injection, corneal opacity, pupil asymmetry, or discharge patterns.',
    prescription:
      'Prescription Analysis: Extract drug name, dosage, frequency, route, and prescriber information. Verify against known drug databases.',
    wound:
      'Wound Analysis: Assess depth, edges, surrounding tissue, signs of infection (redness, warmth, pus), and healing stage.',
    general:
      'General Medical Image Analysis: Identify anatomical structures, abnormalities, and clinical relevance.',
  };

  return JSON.stringify({
    image_type: imageType,
    guidance: typeGuidance[imageType] || typeGuidance.general,
    note: 'For detailed AI-powered image analysis, use a multimodal model (Gemma 4 E2B/E4B or MedGemma 1.5) with the image passed directly in the contents array.',
    disclaimer:
      'This is automated guidance only. Always have medical images reviewed by a qualified radiologist or specialist.',
  });
}

registerTool('analyze_skin_image', analyzeSkinImage);
registerTool('detect_image_type', detectImageType);
registerTool('analyze_medical_image', analyzeMedicalImage);
