export type TranslationKey =
  | 'signIn' | 'signUp' | 'createAccount' | 'welcomeBack'
  | 'email' | 'password' | 'forgotPassword' | 'dontHaveAccount'
  | 'alreadyHaveAccount' | 'resetPassword' | 'sendResetLink' | 'backToSignIn'
  | 'checkYourEmail' | 'resetLinkSent' | 'redirecting'
  | 'healthProfile' | 'helpAiPersonalize' | 'personalInfo' | 'fullName' | 'age'
  | 'gender' | 'male' | 'female' | 'other' | 'bodyMetrics' | 'weight'
  | 'height' | 'bloodGroup' | 'medicalConditions' | 'allergies'
  | 'currentMedications' | 'lifestyle' | 'smoker' | 'alcohol' | 'exerciseLevel'
  | 'saveContinue' | 'settings' | 'aiModel' | 'language' | 'appearance'
  | 'darkMode' | 'data' | 'clearCache' | 'signOut' | 'about' | 'version'
  | 'aiEngine' | 'status' | 'online' | 'offline' | 'account' | 'security'
  | 'appLock' | 'cloud' | 'onDevice' | 'ready' | 'downloading' | 'download'
  | 'failed' | 'askHealth' | 'aiDisclaimer' | 'accountCreated' | 'letsSetup'
  | 'expertCare' | 'multiAgent' | 'privateSecure' | 'voiceReady'
  | 'unlockApp' | 'tryAgain' | 'skipUnsecured' | 'biometricRequired'
  | 'useBiometric' | 'confirmPin' | 'weakPassword' | 'enterPin' | 'setPin'
  | 'newPin' | 'pinMismatch' | 'reviewing' | 'analysing' | 'consulting'
  | 'reviewingSymptoms' | 'preparing' | 'howCanIHelp' | 'describeConcern'
  | 'checkSymptoms' | 'describeFeel' | 'medicineInfo' | 'drugInteractions'
  | 'dietAdvice' | 'nutritionTips' | 'uploadPhoto' | 'photoAnalysis'
  | 'passwordResetSent' | 'checkSpam' | 'signInFailed' | 'signUpFailed'
  | 'invalidEmail' | 'missingInfo' | 'generalHealth' | 'aiHealthAgent'
  | 'agents' | 'noAgentsFound';

export type Language = 'en' | 'hi' | 'mr';

type TM = Record<TranslationKey, string>;

const en: TM = {
  signIn: 'Sign In', signUp: 'Sign Up', createAccount: 'Create Account',
  welcomeBack: 'Welcome Back', email: 'Email address', password: 'Password',
  forgotPassword: 'Forgot Password?', dontHaveAccount: "Don't have an account? Sign Up",
  alreadyHaveAccount: 'Already have an account? Sign In', resetPassword: 'Reset Password',
  sendResetLink: 'Send Reset Link', backToSignIn: 'Back to Sign In',
  checkYourEmail: 'Check Your Email', resetLinkSent: 'Reset Link Sent',
  redirecting: 'Redirecting to sign in...', healthProfile: 'Health Profile',
  helpAiPersonalize: 'Help our AI doctors personalize your care',
  personalInfo: 'Personal Info', fullName: 'Full Name', age: 'Age',
  gender: 'Gender', male: 'Male', female: 'Female', other: 'Other',
  bodyMetrics: 'Body Metrics', weight: 'Weight (kg)', height: 'Height (cm)',
  bloodGroup: 'Blood Group', medicalConditions: 'Medical Conditions',
  allergies: 'Allergies', currentMedications: 'Current Medications',
  lifestyle: 'Lifestyle', smoker: 'Smoker', alcohol: 'Alcohol',
  exerciseLevel: 'Exercise Level', saveContinue: 'Save & Continue',
  settings: 'Settings', aiModel: 'AI Model', language: 'Language',
  appearance: 'Appearance', darkMode: 'Dark Mode', data: 'Data',
  clearCache: 'Clear Cache', signOut: 'Sign Out', about: 'About',
  version: 'Version', aiEngine: 'AI Engine', status: 'Status',
  online: 'Online', offline: 'Offline', account: 'Account',
  security: 'Security', appLock: 'App Lock', cloud: 'Cloud (Gemini API)',
  onDevice: 'Offline (On-Device)', ready: 'Ready', downloading: 'Downloading',
  download: 'Tap to download', failed: 'Failed — tap to retry',
  askHealth: 'Ask any health question...',
  aiDisclaimer: 'AI guidance only — always consult a licensed doctor',
  accountCreated: 'Account Created!',
  letsSetup: 'Let\'s set up your health profile so our AI doctors can give you personalized care.',
  expertCare: 'Expert care. Powered by AI.', multiAgent: 'Multi-Agent AI',
  privateSecure: 'Private & Secure', voiceReady: 'Voice Ready',
  unlockApp: 'Unlock AI Care Companion', tryAgain: 'Try Again',
  skipUnsecured: 'Skip (unsecured)', biometricRequired: 'Biometric Required',
  useBiometric: 'Use your device fingerprint or face to unlock the app.',
  confirmPin: 'Confirm password', weakPassword: 'Password must be at least 6 characters.',
  enterPin: 'Enter PIN', setPin: 'Set PIN', newPin: 'New PIN (4+ digits)',
  pinMismatch: 'Passwords do not match.', reviewing: 'Reviewing...',
  analysing: 'Analysing…', consulting: 'Consulting specialists…',
  reviewingSymptoms: 'Reviewing symptoms…', preparing: 'Preparing response…',
  howCanIHelp: 'How can I help you today?',
  describeConcern: 'Describe your health concern and I\'ll connect you with the right specialist.',
  checkSymptoms: 'Check symptoms', describeFeel: 'Describe how you feel',
  medicineInfo: 'Medicine info', drugInteractions: 'Drug interactions & dosage',
  dietAdvice: 'Diet advice', nutritionTips: 'Nutrition & wellness tips',
  uploadPhoto: 'Upload photo', photoAnalysis: 'Skin, X-ray, scan analysis',
  passwordResetSent: 'If an account exists, you\'ll receive a password reset email shortly.',
  checkSpam: 'Check your spam folder if you don\'t see it in your inbox.',
  signInFailed: 'Sign In Failed', signUpFailed: 'Sign Up Failed',
  invalidEmail: 'Please enter a valid email address.',
  missingInfo: 'Please enter your email and password.',
  generalHealth: 'General Health', aiHealthAgent: 'AI Health Agent',
  agents: 'Agents',
  noAgentsFound: 'No specialists found',
};

const hi: TM = {
  signIn: 'साइन इन', signUp: 'साइन अप', createAccount: 'खाता बनाएं',
  welcomeBack: 'वापसी पर स्वागत', email: 'ईमेल पता', password: 'पासवर्ड',
  forgotPassword: 'पासवर्ड भूल गए?', dontHaveAccount: 'खाता नहीं है? साइन अप करें',
  alreadyHaveAccount: 'पहले से खाता है? साइन इन करें', resetPassword: 'पासवर्ड रीसेट करें',
  sendResetLink: 'रीसेट लिंक भेजें', backToSignIn: 'साइन इन पर वापस जाएं',
  checkYourEmail: 'अपना ईमेल जांचें', resetLinkSent: 'रीसेट लिंक भेजा गया',
  redirecting: 'साइन इन पर रीडायरेक्ट...', healthProfile: 'स्वास्थ्य प्रोफ़ाइल',
  helpAiPersonalize: 'हमारे AI डॉक्टरों को आपकी देखभाल वैयक्तिकृत करने में मदद करें',
  personalInfo: 'व्यक्तिगत जानकारी', fullName: 'पूरा नाम', age: 'उम्र',
  gender: 'लिंग', male: 'पुरुष', female: 'महिला', other: 'अन्य',
  bodyMetrics: 'शारीरिक माप', weight: 'वजन (kg)', height: 'ऊंचाई (cm)',
  bloodGroup: 'रक्त समूह', medicalConditions: 'चिकित्सा स्थितियां',
  allergies: 'एलर्जी', currentMedications: 'वर्तमान दवाएं',
  lifestyle: 'जीवनशैली', smoker: 'धूम्रपान', alcohol: 'शराब',
  exerciseLevel: 'व्यायाम स्तर', saveContinue: 'सहेजें और जारी रखें',
  settings: 'सेटिंग्स', aiModel: 'AI मॉडल', language: 'भाषा',
  appearance: 'दिखावट', darkMode: 'डार्क मोड', data: 'डेटा',
  clearCache: 'कैश साफ़ करें', signOut: 'साइन आउट', about: 'बारे में',
  version: 'संस्करण', aiEngine: 'AI इंजन', status: 'स्थिति',
  online: 'ऑनलाइन', offline: 'ऑफ़लाइन', account: 'खाता',
  security: 'सुरक्षा', appLock: 'ऐप लॉक', cloud: 'क्लाउड (Gemini API)',
  onDevice: 'ऑफ़लाइन (डिवाइस पर)', ready: 'तैयार', downloading: 'डाउनलोड हो रहा है',
  download: 'डाउनलोड करें', failed: 'विफल',
  askHealth: 'कोई भी स्वास्थ्य प्रश्न पूछें...',
  aiDisclaimer: 'AI मार्गदर्शन केवल — हमेशा डॉक्टर से परामर्श लें',
  accountCreated: 'खाता बन गया!',
  letsSetup: 'चलिए आपकी स्वास्थ्य प्रोफ़ाइल सेट करते हैं।',
  expertCare: 'विशेषज्ञ देखभाल। AI द्वारा संचालित।', multiAgent: 'मल्टी-एजेंट AI',
  privateSecure: 'निजी और सुरक्षित', voiceReady: 'वॉइस तैयार',
  unlockApp: 'AI Care Companion अनलॉक करें', tryAgain: 'पुनः प्रयास करें',
  skipUnsecured: 'छोड़ें (असुरक्षित)', biometricRequired: 'बायोमेट्रिक आवश्यक',
  useBiometric: 'ऐप अनलॉक करने के लिए फिंगरप्रिंट या चेहरे का उपयोग करें।',
  confirmPin: 'पासवर्ड की पुष्टि करें', weakPassword: 'पासवर्ड कम से कम 6 अक्षर',
  enterPin: 'PIN दर्ज करें', setPin: 'PIN सेट करें', newPin: 'नया PIN (4+ अंक)',
  pinMismatch: 'पासवर्ड मेल नहीं खाते', reviewing: 'समीक्षा...',
  analysing: 'विश्लेषण…', consulting: 'विशेषज्ञों से परामर्श…',
  reviewingSymptoms: 'लक्षणों की समीक्षा…', preparing: 'प्रतिक्रिया तैयार…',
  howCanIHelp: 'मैं आज आपकी कैसे मदद कर सकता हूं?',
  describeConcern: 'अपनी स्वास्थ्य चिंता बताएं।',
  checkSymptoms: 'लक्षण जांचें', describeFeel: 'बताएं कैसा महसूस कर रहे हैं',
  medicineInfo: 'दवा की जानकारी', drugInteractions: 'दवा इंटरैक्शन और खुराक',
  dietAdvice: 'आहार सलाह', nutritionTips: 'पोषण टिप्स',
  uploadPhoto: 'फोटो अपलोड करें', photoAnalysis: 'त्वचा, एक्स-रे, स्कैन विश्लेषण',
  passwordResetSent: 'यदि खाता मौजूद है, तो आपको पासवर्ड रीसेट ईमेल प्राप्त होगा।',
  checkSpam: 'स्पैम फ़ोल्डर जांचें।', signInFailed: 'साइन इन विफल',
  signUpFailed: 'साइन अप विफल', invalidEmail: 'कृपया मान्य ईमेल दर्ज करें।',
  missingInfo: 'कृपया ईमेल और पासवर्ड दर्ज करें।',
  generalHealth: 'सामान्य स्वास्थ्य', aiHealthAgent: 'AI स्वास्थ्य एजेंट',
  agents: 'एजेंट्स',
  noAgentsFound: 'कोई विशेषज्ञ नहीं मिला',
};

const mr: TM = {
  signIn: 'साइन इन', signUp: 'साइन अप', createAccount: 'खाते तयार करा',
  welcomeBack: 'परत आल्याबद्दल स्वागत', email: 'ईमेल पत्ता', password: 'पासवर्ड',
  forgotPassword: 'पासवर्ड विसरलात?', dontHaveAccount: 'खाते नाही? साइन अप करा',
  alreadyHaveAccount: 'आधीच खाते आहे? साइन इन करा', resetPassword: 'पासवर्ड रीसेट करा',
  sendResetLink: 'रीसेट लिंक पाठवा', backToSignIn: 'साइन इन वर परत जा',
  checkYourEmail: 'तुमचा ईमेल तपासा', resetLinkSent: 'रीसेट लिंक पाठवली',
  redirecting: 'साइन इन वर रीडायरेक्ट...', healthProfile: 'आरोग्य प्रोफाइल',
  helpAiPersonalize: 'AI डॉक्टरांना तुमची काळजी वैयक्तिकृत करण्यास मदत करा',
  personalInfo: 'वैयक्तिक माहिती', fullName: 'पूर्ण नाव', age: 'वय',
  gender: 'लिंग', male: 'पुरुष', female: 'स्त्री', other: 'इतर',
  bodyMetrics: 'शारीरिक माप', weight: 'वजन (kg)', height: 'उंची (cm)',
  bloodGroup: 'रक्त गट', medicalConditions: 'वैद्यकीय स्थिती',
  allergies: 'एलर्जी', currentMedications: 'सध्याची औषधे',
  lifestyle: 'जीवनशैली', smoker: 'धूम्रपान', alcohol: 'मद्यपान',
  exerciseLevel: 'व्यायाम पातळी', saveContinue: 'जतन करा आणि सुरू ठेवा',
  settings: 'सेटिंग्ज', aiModel: 'AI मॉडेल', language: 'भाषा',
  appearance: 'स्वरूप', darkMode: 'डार्क मोड', data: 'डेटा',
  clearCache: 'कॅश साफ करा', signOut: 'साइन आउट', about: 'बद्दल',
  version: 'आवृत्ती', aiEngine: 'AI इंजिन', status: 'स्थिती',
  online: 'ऑनलाइन', offline: 'ऑफलाइन', account: 'खाते',
  security: 'सुरक्षा', appLock: 'अॅप लॉक', cloud: 'क्लाउड (Gemini API)',
  onDevice: 'ऑफलाइन (डिव्हाइसवर)', ready: 'तयार', downloading: 'डाउनलोड होत आहे',
  download: 'डाउनलोड करा', failed: 'अयशस्वी',
  askHealth: 'कोणताही आरोग्य प्रश्न विचारा...',
  aiDisclaimer: 'AI मार्गदर्शन फक्त — नेहमी डॉक्टरचा सल्ला घ्या',
  accountCreated: 'खाते तयार झाले!',
  letsSetup: 'चला तुमची आरोग्य प्रोफाइल सेट करूया.',
  expertCare: 'तज्ञ काळजी. AI द्वारे संचालित.', multiAgent: 'मल्टी-एजंट AI',
  privateSecure: 'खाजगी आणि सुरक्षित', voiceReady: 'व्हॉइस तयार',
  unlockApp: 'AI Care Companion अनलॉक करा', tryAgain: 'पुन्हा प्रयत्न करा',
  skipUnsecured: 'वगळा (असुरक्षित)', biometricRequired: 'बायोमेट्रिक आवश्यक',
  useBiometric: 'अॅप अनलॉक करण्यासाठी फिंगरप्रिंट किंवा चेहरा वापरा.',
  confirmPin: 'पासवर्डची पुष्टी करा', weakPassword: 'पासवर्ड किमान 6 अक्षरे',
  enterPin: 'PIN प्रविष्ट करा', setPin: 'PIN सेट करा', newPin: 'नवीन PIN (4+ अंक)',
  pinMismatch: 'पासवर्ड जुळत नाहीत', reviewing: 'पुनरावलोकन...',
  analysing: 'विश्लेषण…', consulting: 'तज्ञांशी सल्लामसलत…',
  reviewingSymptoms: 'लक्षणांचे पुनरावलोकन…', preparing: 'प्रतिसाद तयार…',
  howCanIHelp: 'मी आज तुमची कशी मदत करू शकतो?',
  describeConcern: 'तुमची आरोग्य चिंता सांगा.',
  checkSymptoms: 'लक्षणे तपासा', describeFeel: 'तुम्हाला कसे वाटते ते सांगा',
  medicineInfo: 'औषधाची माहिती', drugInteractions: 'औषध परस्परक्रिया आणि डोस',
  dietAdvice: 'आहार सल्ला', nutritionTips: 'पोषण टिप्स',
  uploadPhoto: 'फोटो अपलोड करा', photoAnalysis: 'त्वचा, एक्स-रे, स्कॅन विश्लेषण',
  passwordResetSent: 'खाते अस्तित्वात असल्यास, पासवर्ड रीसेट ईमेल प्राप्त होईल.',
  checkSpam: 'स्पॅम फोल्डर तपासा.', signInFailed: 'साइन इन अयशस्वी',
  signUpFailed: 'साइन अप अयशस्वी', invalidEmail: 'कृपया वैध ईमेल प्रविष्ट करा.',
  missingInfo: 'कृपया ईमेल आणि पासवर्ड प्रविष्ट करा.',
  generalHealth: 'सामान्य आरोग्य', aiHealthAgent: 'AI आरोग्य एजंट',
  agents: 'एजंट्स',
  noAgentsFound: 'कोणतेही तज्ञ सापडले नाहीत',
};

const translations: Record<Language, TM> = { en, hi, mr };

export function t(key: TranslationKey, lang: Language = 'en'): string {
  return translations[lang]?.[key] || en[key] || key;
}
