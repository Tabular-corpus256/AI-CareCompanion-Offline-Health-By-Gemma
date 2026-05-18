/**
 * AffordableAlternativesScreen
 *
 * - Auto-detects location + currency via IP geolocation (ipapi.co)
 * - Validates input is a real medicine name via a quick Gemini call
 * - Searches for alternatives with live prices via Gemini + Google Search grounding
 * - Renders the response as structured UI using @json-render/react-native
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@theme';
import { GEMINI_API_KEY } from '@env';
import { AppIcon } from '@components/AppIcon';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { GoogleGenAI } from '@google/genai';
import {
  JSONUIProvider,
  Renderer,
  type ComponentRegistry,
  type ComponentRenderProps,
} from '@json-render/react-native';
import type { Spec } from '@json-render/react-native';

// ─── Gemini client ────────────────────────────────────────────────────────────

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const SEARCH_MODEL = 'gemini-2.5-flash';

// ─── IP geolocation ───────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', EUR: '€', AUD: 'A$', CAD: 'C$',
  PKR: '₨', BDT: '৳', NGN: '₦', ZAR: 'R', BRL: 'R$', MXN: 'Mex$',
  JPY: '¥', CNY: '¥', SGD: 'S$', AED: 'د.إ', THB: '฿', IDR: 'Rp',
  MYR: 'RM', PHP: '₱', KRW: '₩', HKD: 'HK$', TWD: 'NT$', TRY: '₺',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', CHF: 'CHF', NZD: 'NZ$', ILS: '₪',
  SAR: '﷼', QAR: '﷼', KWD: 'KD', EGP: '£',
};

interface LocationInfo {
  city: string;
  region: string;
  country: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
}

async function fetchLocationFromIP(): Promise<LocationInfo> {
  const resp = await fetch('https://ipapi.co/json/', {
    headers: { Accept: 'application/json', 'User-Agent': 'HealthApp/1.0' },
  });
  if (!resp.ok) throw new Error(`IP lookup HTTP ${resp.status}`);
  const data = await resp.json();
  const code: string = (data.currency as string) || 'USD';
  return {
    city: (data.city as string) || '',
    region: (data.region as string) || '',
    country: (data.country_name as string) || 'United States',
    countryCode: (data.country_code as string) || 'US',
    currency: code,
    currencySymbol: CURRENCY_SYMBOLS[code] || code,
  };
}

// ─── Medicine-name validation ─────────────────────────────────────────────────

const MEDICINE_SEED = [
  'mg', 'mcg', 'iu', 'tablet', 'capsule', 'syrup', 'drug', 'medicine',
  'medication', 'pill', 'dosage', 'antibiotic', 'analgesic', 'antihistamine',
  'steroid', 'insulin', 'metformin', 'amlodipine', 'losartan', 'atorvastatin',
  'omeprazole', 'paracetamol', 'ibuprofen', 'aspirin', 'amoxicillin',
  'azithromycin', 'cetirizine', 'pantoprazole', 'metoprolol', 'lisinopril',
  'salbutamol', 'montelukast', 'dolo', 'crocin', 'combiflam', 'ozempic',
  'eliquis', 'humira', 'keytruda', 'jardiance', 'trulicity', 'farxiga',
  'dupixent', 'entresto', 'biktarvy', 'revlimid', 'xarelto', 'crestor',
  'nexium', 'zoloft', 'prozac', 'lexapro', 'lipitor', 'zithromax', 'augmentin',
];

function hintCheck(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return MEDICINE_SEED.some(h => lower.includes(h));
}

async function validateMedicineName(name: string): Promise<boolean> {
  if (hintCheck(name)) return true;
  try {
    const resp = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: `Is "${name.trim()}" the name of a pharmaceutical drug, medicine, vaccine, or medical supplement? Reply with exactly one word: YES or NO.`,
      config: { temperature: 0, maxOutputTokens: 5 },
    });
    return (resp.text || '').trim().toUpperCase().startsWith('YES');
  } catch {
    return false;
  }
}

// ─── System prompt for Gemini → json-render Spec ─────────────────────────────

const SPEC_SYSTEM_PROMPT = `You are a clinical pharmacist creating structured medicine alternative results for a mobile health app.

Return ONLY a valid JSON object following this json-render Spec format. No markdown, no code fences, no explanation — pure JSON only.

Format:
{
  "root": "root",
  "elements": {
    "root": { "type": "Column", "props": { "gap": 14, "padding": 0 }, "children": ["..."] },
    "element_key": { "type": "ComponentType", "props": { ... }, "children": ["..."] }
  }
}

Available component types:
- Column: { gap?, padding?, alignItems?, flex? } — vertical stack
- Row: { gap?, alignItems?, justifyContent?, padding?, flexWrap? } — horizontal stack
- Card: { title?, subtitle?, padding?, backgroundColor?, borderRadius?, elevated? } — container
- Heading: { text, level? ("h1"|"h2"|"h3"|"h4"), color?, align? }
- Paragraph: { text, color?, fontSize?, numberOfLines?, align? }
- Label: { text, color?, bold?, size? ("xs"|"sm"|"md") }
- Badge: { label, variant? ("default"|"info"|"success"|"warning"|"error") }
- Divider: { color?, thickness?, margin? }
- ListItem: { title, subtitle?, leading?, trailing? }
- Spacer: { size? }

Rules:
1. All element keys are unique camelCase or snake_case strings
2. children arrays reference other element keys in "elements"
3. Structure sections in this order: generic_info → mechanism → alternatives → where_to_buy → disclaimer
4. Use Card with elevated:true for each alternative (1 card per alternative medicine)
5. Use Badge variant:"success" for prices, variant:"info" for availability, variant:"warning" for prescription needed
6. Use ListItem for pharmacy/website entries with the URL as subtitle and an emoji as leading
7. Keep all text concise for a mobile screen
8. Use realistic in-country prices; if ranges are unknown write typical ranges
9. Element keys must never contain spaces`;

// ─── Custom themed component registry ────────────────────────────────────────

function buildRegistry(colors: any, shadows: any): ComponentRegistry {
  const Card = ({ element, children }: ComponentRenderProps) => {
    const p = element.props as any;
    return (
      <View style={{
        backgroundColor: p.backgroundColor ?? colors.surface,
        borderRadius: p.borderRadius ?? 14,
        padding: p.padding ?? 14,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...(p.elevated !== false ? shadows.sm : {}),
      }}>
        {p.title ? (
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: p.subtitle ? 2 : 8 }}>
            {p.title}
          </Text>
        ) : null}
        {p.subtitle ? (
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
            {p.subtitle}
          </Text>
        ) : null}
        {children}
      </View>
    );
  };

  const Column = ({ element, children }: ComponentRenderProps) => {
    const p = element.props as any;
    return (
      <View style={{
        flexDirection: 'column',
        gap: p.gap ?? 0,
        padding: p.padding ?? 0,
        flex: p.flex ?? undefined,
        alignItems: p.alignItems ?? undefined,
        justifyContent: p.justifyContent ?? undefined,
      }}>
        {children}
      </View>
    );
  };

  const Row = ({ element, children }: ComponentRenderProps) => {
    const p = element.props as any;
    return (
      <View style={{
        flexDirection: 'row',
        gap: p.gap ?? 0,
        padding: p.padding ?? 0,
        flex: p.flex ?? undefined,
        alignItems: p.alignItems ?? 'center',
        justifyContent: p.justifyContent ?? undefined,
        flexWrap: p.flexWrap ?? undefined,
      }}>
        {children}
      </View>
    );
  };

  const Heading = ({ element }: ComponentRenderProps) => {
    const p = element.props as any;
    const sizes: Record<string, number> = { h1: 22, h2: 18, h3: 16, h4: 14 };
    const size = sizes[p.level ?? 'h2'] ?? 18;
    return (
      <Text style={{
        fontSize: size,
        fontWeight: '800',
        color: p.color ?? colors.textPrimary,
        textAlign: p.align ?? 'left',
        letterSpacing: -0.3,
      }}>
        {p.text}
      </Text>
    );
  };

  const Paragraph = ({ element }: ComponentRenderProps) => {
    const p = element.props as any;
    return (
      <Text
        numberOfLines={p.numberOfLines ?? undefined}
        style={{
          fontSize: p.fontSize ?? 14,
          color: p.color ?? colors.textSecondary,
          lineHeight: (p.fontSize ?? 14) * 1.55,
          textAlign: p.align ?? 'left',
        }}
      >
        {p.text}
      </Text>
    );
  };

  const Label = ({ element }: ComponentRenderProps) => {
    const p = element.props as any;
    const sizes: Record<string, number> = { xs: 11, sm: 12, md: 14 };
    const fs = sizes[p.size ?? 'md'] ?? 14;
    return (
      <Text style={{
        fontSize: fs,
        fontWeight: p.bold ? '700' : '500',
        color: p.color ?? colors.textTertiary,
        lineHeight: fs * 1.5,
      }}>
        {p.text}
      </Text>
    );
  };

  const Badge = ({ element }: ComponentRenderProps) => {
    const p = element.props as any;
    const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
      default: { bg: colors.surfaceVariant, text: colors.textSecondary },
      info:    { bg: '#E3F2FD', text: '#1565C0' },
      success: { bg: colors.successMuted ?? '#E8F5E9', text: colors.success ?? '#2E7D32' },
      warning: { bg: '#FFF3E0', text: '#E65100' },
      error:   { bg: '#FFEBEE', text: '#C62828' },
    };
    const { bg, text: tc } = BADGE_COLORS[p.variant ?? 'default'] ?? BADGE_COLORS.default;
    return (
      <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: tc }}>{p.label}</Text>
      </View>
    );
  };

  const Divider = ({ element }: ComponentRenderProps) => {
    const p = element.props as any;
    return (
      <View style={{
        height: p.thickness ?? 1,
        backgroundColor: p.color ?? colors.borderLight,
        marginVertical: p.margin ?? 4,
      }} />
    );
  };

  const ListItem = ({ element }: ComponentRenderProps) => {
    const p = element.props as any;
    const isUrl = typeof p.subtitle === 'string' && /^https?:\/\//.test(p.subtitle);
    return (
      <TouchableOpacity
        activeOpacity={isUrl ? 0.7 : 1}
        onPress={isUrl ? () => Linking.openURL(p.subtitle) : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingVertical: 8,
          gap: 10,
        }}
      >
        {p.leading ? (
          <Text style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{p.leading}</Text>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{p.title}</Text>
          {p.subtitle ? (
            <Text style={{
              fontSize: 13,
              color: isUrl ? colors.primary : colors.textTertiary,
              textDecorationLine: isUrl ? 'underline' : 'none',
              marginTop: 2,
            }}>
              {p.subtitle}
            </Text>
          ) : null}
        </View>
        {p.trailing ? (
          <Text style={{ fontSize: 13, color: colors.textTertiary }}>{p.trailing}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const Spacer = ({ element }: ComponentRenderProps) => {
    const p = element.props as any;
    return <View style={{ height: p.size ?? 8, flex: p.flex ?? undefined }} />;
  };

  return { Card, Column, Row, Heading, Paragraph, Label, Badge, Divider, ListItem, Spacer };
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function AffordableAlternativesScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialDrug = (route.params?.drugName as string) ?? '';

  const [drugName, setDrugName] = useState(initialDrug);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [searchedDrug, setSearchedDrug] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registry = useMemo(() => buildRegistry(colors, shadows), [colors, shadows]);

  // Auto-fetch location on mount
  useEffect(() => {
    fetchLocationFromIP()
      .then(info => setLocationInfo(info))
      .catch(() => setLocationInfo({
        city: '', region: '', country: 'India',
        countryCode: 'IN', currency: 'INR', currencySymbol: '₹',
      }))
      .finally(() => setLocationLoading(false));
  }, []);

  // Auto-search if launched from another screen with a drug name
  useEffect(() => {
    if (initialDrug && !locationLoading && locationInfo) {
      findAlternatives(initialDrug);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationLoading]);

  const findAlternatives = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);
    setSpec(null);

    // Step 1: Validate it's a medicine name
    setValidating(true);
    const isValid = await validateMedicineName(trimmed);
    setValidating(false);

    if (!isValid) {
      setError('Please enter a valid medicine or drug name. Non-pharmaceutical queries are not supported.');
      return;
    }

    setLoading(true);
    setSearchedDrug(trimmed);

    const loc = locationInfo ?? { country: 'India', countryCode: 'IN', city: '', region: '', currency: 'INR', currencySymbol: '₹' };
    const locationCtx = [loc.city, loc.region, loc.country].filter(Boolean).join(', ');
    const currencyInfo = `${loc.currencySymbol} (${loc.currency})`;

    const prompt = `Find affordable generic alternatives for the medicine: ${trimmed}
User location: ${locationCtx}
Currency: ${currencyInfo}

Create a json-render Spec that includes:
1. Generic (INN) name and drug class card
2. Brief mechanism of action (1–2 sentences)
3. 3–5 affordable alternatives as individual Cards — each with brand name, generic name, price in ${currencyInfo}, and where to buy
4. Where to Buy section with ListItems for 2–3 online pharmacies in ${loc.country} (include URLs as subtitle)
5. A brief safety disclaimer in a warning Badge

Use real approximate prices for ${locationCtx} in ${currencyInfo}. Keep all text concise for mobile.`;

    try {
      let responseText = '';

      // Primary: Gemini + Google Search grounding
      try {
        const resp = await ai.models.generateContent({
          model: SEARCH_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: SPEC_SYSTEM_PROMPT,
            tools: [{ googleSearch: {} }],
            temperature: 0.3,
          },
        });
        responseText = resp.text || '';
      } catch {
        // Fallback: no grounding
        const resp = await ai.models.generateContent({
          model: SEARCH_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: SPEC_SYSTEM_PROMPT,
            temperature: 0.3,
          },
        });
        responseText = resp.text || '';
      }

      if (!responseText) {
        setError('No results returned. Please try again.');
        return;
      }

      // Strip any markdown code fences Gemini might add
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        setError('Could not parse response. Please try again.');
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]) as Spec;
      if (!parsed.root || !parsed.elements) {
        setError('Invalid response structure. Please try again.');
        return;
      }

      setSpec(parsed);
    } catch (e: any) {
      setError(`Error: ${e?.message || 'Could not fetch alternatives.'}`);
    } finally {
      setLoading(false);
    }
  }, [locationInfo]);

  const handleSearch = () => findAlternatives(drugName);

  // ── Location badge ───────────────────────────────────────────────────────────
  const locationLabel = locationLoading
    ? 'Detecting location…'
    : locationInfo
      ? [locationInfo.city, locationInfo.country].filter(Boolean).join(', ')
        + `  ·  ${locationInfo.currencySymbol} ${locationInfo.currency}`
      : 'Location unavailable';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Affordable Alternatives" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={[s.infoBanner, {
          backgroundColor: colors.primaryMuted,
          borderColor: colors.primary + '30',
          borderRadius: borderRadius.lg,
        }]}>
          <AppIcon name="savings" size={18} color={colors.primary} />
          <Text style={[s.bannerText, { color: colors.textPrimary }]}>
            Find generic alternatives with real-time prices. Powered by Gemini + Google Search.
          </Text>
        </View>

        {/* Auto-detected location chip */}
        <View style={[s.locationChip, {
          backgroundColor: colors.surface,
          borderColor: locationLoading ? colors.borderLight : colors.primary + '40',
          borderRadius: borderRadius.full ?? 100,
        }]}>
          {locationLoading
            ? <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
            : <AppIcon name="location" size={14} color={colors.primary} />}
          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600', flex: 1, marginLeft: 6 }} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>

        {/* Medicine name input */}
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Medicine / Drug Name</Text>
        <View style={s.searchRow}>
          <TextInput
            style={[s.input, {
              borderColor: error ? '#E74C3C' : colors.borderLight,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
            }]}
            value={drugName}
            onChangeText={v => { setDrugName(v); setError(null); }}
            placeholder="e.g. Paracetamol, Metformin, Atorvastatin…"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            editable={!loading && !validating}
          />
          <TouchableOpacity
            style={[s.searchBtn, {
              backgroundColor: (loading || validating || locationLoading)
                ? colors.primaryMuted : colors.primary,
              borderRadius: borderRadius.md,
            }]}
            onPress={handleSearch}
            disabled={loading || validating || locationLoading}
            activeOpacity={0.8}
          >
            {(loading || validating)
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <AppIcon name="search" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Validation in-progress */}
        {validating && (
          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
            Checking medicine name…
          </Text>
        )}

        {/* Error */}
        {error && !loading && !validating && (
          <View style={[s.errorCard, {
            backgroundColor: '#FFF3F3',
            borderColor: '#FF6B6B40',
            borderRadius: borderRadius.lg,
          }]}>
            <AppIcon name="warning" size={18} color="#E74C3C" />
            <Text style={{ flex: 1, color: '#E74C3C', fontSize: 14, lineHeight: 20 }}>{error}</Text>
          </View>
        )}

        {/* Loading spinner */}
        {loading && (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
              Searching for alternatives with live prices…
            </Text>
          </View>
        )}

        {/* JSON-render result */}
        {spec && !loading && (
          <View style={{ marginTop: 16 }}>
            {/* Result header */}
            <View style={[s.resultHeader, {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              borderColor: colors.borderLight,
              ...shadows.sm,
              marginBottom: 14,
            }]}>
              <View style={[s.resultIcon, { backgroundColor: colors.primaryMuted }]}>
                <AppIcon name="local-pharmacy" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  Alternatives for {searchedDrug}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                  Gemini AI + Google Search · {locationInfo?.currency ?? ''}
                </Text>
              </View>
            </View>

            {/* Rendered spec */}
            <JSONUIProvider>
              <Renderer spec={spec} registry={registry} />
            </JSONUIProvider>

            {/* Disclaimer */}
            <View style={[s.disclaimer, {
              backgroundColor: colors.warningMuted ?? '#FFF9E6',
              borderColor: colors.borderLight,
              borderRadius: borderRadius.md,
              marginTop: 14,
            }]}>
              <AppIcon name="warning" size={14} color={colors.warning ?? '#FF9800'} />
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                Always consult your doctor or pharmacist before switching medications. Prices are approximate and may vary.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    marginBottom: 18,
    maxWidth: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  searchBtn: {
    width: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginTop: 14,
    alignItems: 'flex-start',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
  },
});

export default AffordableAlternativesScreen;
