export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪', nativeName: 'Kiswahili' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩', nativeName: 'বাংলা' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português' },
];

export const getLanguageInstruction = (langCode: string): string => {
  if (langCode === 'en') {
    return `\n\nLANGUAGE RULE: Respond in English by default. IMPORTANT: If the user writes their message in any other language, automatically respond in that same language instead.`;
  }
  const langName = LANGUAGES.find(l => l.code === langCode)?.nativeName || langCode;
  return `\n\nLANGUAGE RULE: The user's preferred language is ${langName}. Respond in ${langName} — write all advice, explanations, and medical terms in ${langName}. Use simple, everyday words. IMPORTANT: If the user writes their message in a different language than ${langName}, automatically respond in that same language instead.`;
};
