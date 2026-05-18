import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { AppIcon } from '@components/AppIcon';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { useI18n, type Language } from '../i18n/I18nContext';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'Global' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'India' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', region: 'East Africa' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Latin America' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'France/Africa' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', region: 'Bangladesh' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'Middle East' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', region: 'Brazil/Africa' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', region: 'Pakistan' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'South India' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', region: 'South India' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', region: 'Maharashtra' },
];

export function LanguageSelectionScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const navigation = useNavigation<any>();
  const { lang: currentLang, setLang } = useI18n();
  const [selectedCode, setSelectedCode] = useState<string>(currentLang);

  const selectLanguage = async (code: string) => {
    setSelectedCode(code);
    await setLang(code as Language);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Language"
        onBack={() => navigation.goBack()}
      />

      <View style={[s.infoBox, { backgroundColor: colors.primaryMuted, borderColor: colors.borderLight, margin: spacing.md, borderRadius: borderRadius.lg }]}>
        <AppIcon name="translate" size={20} color={colors.primary} />
        <Text style={[s.infoTxt, { color: colors.textSecondary }]}>
          The AI will respond in your selected language. Medical accuracy may vary for non-English languages.
        </Text>
      </View>

      <FlatList
        data={LANGUAGES}
        keyExtractor={l => l.code}
        contentContainerStyle={{ padding: spacing.md, gap: 8, paddingBottom: 40 }}
        renderItem={({ item: lang }) => {
          const isSelected = selectedCode === lang.code;
          return (
            <TouchableOpacity
              style={[
                s.langCard,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.lg,
                  borderColor: isSelected ? colors.primary : colors.borderLight,
                  borderWidth: isSelected ? 2 : 1,
                  ...(!isSelected ? {} : { ...shadows.sm }),
                },
              ]}
              onPress={() => selectLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={s.flag}>{lang.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.langName, { color: colors.textPrimary }]}>{lang.name}</Text>
                <Text style={[s.langNative, { color: colors.textSecondary }]}>{lang.nativeName}</Text>
                <Text style={[s.langRegion, { color: colors.textTertiary }]}>{lang.region}</Text>
              </View>
              {isSelected && (
                <View style={[s.checkBadge, { backgroundColor: colors.primary }]}>
                  <AppIcon name="check" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  infoTxt: { flex: 1, fontSize: 13, lineHeight: 19 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  flag: { fontSize: 32 },
  langName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  langNative: { fontSize: 14, marginBottom: 2 },
  langRegion: { fontSize: 12 },
  checkBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});
