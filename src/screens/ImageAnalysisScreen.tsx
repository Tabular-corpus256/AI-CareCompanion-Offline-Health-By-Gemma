import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Animated,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useTheme } from '@theme';
import { AppText } from '@components/ui/AppText';
import { AppIcon } from '@components/AppIcon';
import { useAppDialog } from '@components/DialogProvider';
import { DatabaseService } from '@services/DatabaseService';
import { AgentService } from '@services/AgentService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisType {
  id: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  agentId: string;
  prompt: string;
}

interface PastAnalysis {
  id: string;
  local_uri: string;
  analysis_type: string;
  type_label: string;
  type_color: string;
  user_prompt: string;
  ai_response: string;
  timestamp: number;
}

interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

// ─── Analysis category definitions ───────────────────────────────────────────

const ANALYSIS_TYPES: AnalysisType[] = [
  {
    id: 'skin',
    icon: 'body',
    title: 'Skin & Rash',
    desc: 'Rashes, moles, acne, wounds',
    color: '#FF6B6B',
    agentId: 'dermatology',
    prompt: 'Please analyze this skin condition carefully. Identify visible symptoms, describe the appearance (color, texture, pattern, spread), suggest possible conditions, and recommend next steps or when to see a doctor.',
  },
  {
    id: 'xray',
    icon: 'pulse',
    title: 'X-Ray / Scan',
    desc: 'X-rays, CT scans, MRI images',
    color: '#74B9FF',
    agentId: 'radiology',
    prompt: 'Please analyze this medical imaging scan. Describe what you can observe, identify any notable findings or abnormalities, and provide a preliminary assessment. Note which body part and imaging type is shown.',
  },
  {
    id: 'lab',
    icon: 'flask',
    title: 'Lab Report',
    desc: 'Blood tests, urine analysis',
    color: '#1DB589',
    agentId: 'clinical_pathology',
    prompt: 'Please analyze this lab report or test result. Identify values that are outside normal ranges, explain what they may indicate, describe clinical significance, and suggest follow-up actions.',
  },
  {
    id: 'eye',
    icon: 'eye',
    title: 'Eye Health',
    desc: 'Redness, discharge, conditions',
    color: '#00CEC9',
    agentId: 'ophthalmology',
    prompt: 'Please analyze this eye condition. Look for redness, discharge, swelling, structural abnormalities, or other visible symptoms. Suggest possible conditions and whether urgent care is needed.',
  },
  {
    id: 'wound',
    icon: 'medical',
    title: 'Wound & Injury',
    desc: 'Cuts, bruises, swelling',
    color: '#FD79A8',
    agentId: 'general_practice',
    prompt: 'Please analyze this wound or injury. Assess the severity, look for signs of infection (redness, swelling, discharge, heat), estimate how serious it is, and recommend appropriate first aid or medical care.',
  },
  {
    id: 'medication',
    icon: 'medication',
    title: 'Medication ID',
    desc: 'Identify pills & prescriptions',
    color: '#FDCB6E',
    agentId: 'pharmacy',
    prompt: 'Please identify the medication shown in this image (pill, tablet, label, or prescription). Provide the drug name, use case, typical dosage, common side effects, and any important warnings.',
  },
  {
    id: 'food',
    icon: 'nutrition',
    title: 'Food & Nutrition',
    desc: 'Meal analysis & calorie count',
    color: '#55EFC4',
    agentId: 'nutrition_dietetics',
    prompt: 'Please analyze this meal or food item. Estimate the nutritional content including calories, macronutrients (protein, carbs, fat), key micronutrients, and provide dietary advice about whether this is a healthy choice.',
  },
  {
    id: 'custom',
    icon: 'image',
    title: 'Custom Analysis',
    desc: 'Any medical image or document',
    color: '#0D7C66',
    agentId: 'general_practice',
    prompt: 'Please analyze this medical image or document and provide a comprehensive assessment of what you observe, any notable findings, and relevant health information.',
  },
];

// ─── Past analysis card ───────────────────────────────────────────────────────

function PastCard({
  item,
  colors,
  borderRadius,
  shadows,
  onPress,
}: {
  item: PastAnalysis;
  colors: any;
  borderRadius: any;
  shadows: any;
  onPress: (item: PastAnalysis) => void;
}) {
  const date = new Date(item.timestamp);
  const dateStr = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  const preview = item.ai_response.replace(/\*\*/g, '').slice(0, 90);

  return (
    <TouchableOpacity
      style={[s.pastCard, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.borderLight, ...shadows.sm }]}
      activeOpacity={0.8}
      onPress={() => onPress(item)}
    >
      <Image
        source={{ uri: item.local_uri }}
        style={[s.pastThumb, { borderRadius: borderRadius.lg }]}
        resizeMode="cover"
      />
      <View style={[s.pastTypeBadge, { backgroundColor: item.type_color + '22', borderRadius: borderRadius.full }]}>
        <View style={[s.pastTypeDot, { backgroundColor: item.type_color }]} />
        <AppText style={{ fontSize: 10, fontWeight: '700', color: item.type_color }}>{item.type_label.toUpperCase()}</AppText>
      </View>
      <AppText style={[s.pastPreview, { color: colors.textSecondary }]} numberOfLines={2}>{preview || 'Tap to view analysis'}</AppText>
      <AppText style={[s.pastDate, { color: colors.textTertiary }]}>{dateStr} · {timeStr}</AppText>
    </TouchableOpacity>
  );
}

// ─── Result modal (full-screen inline view) ───────────────────────────────────

function ResultView({
  image,
  type,
  response,
  userPrompt,
  colors,
  borderRadius,
  shadows,
  onReset,
}: {
  image: PickedImage;
  type: AnalysisType;
  response: string;
  userPrompt: string;
  colors: any;
  borderRadius: any;
  shadows: any;
  onReset: () => void;
}) {
  const lines = response.split('\n').filter(Boolean);

  return (
    <View style={{ gap: 14 }}>
      {/* Image + type row */}
      <View style={[s.resultImageRow, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.borderLight, ...shadows.sm }]}>
        <Image source={{ uri: image.uri }} style={[s.resultImage, { borderRadius: borderRadius.lg }]} resizeMode="cover" />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[s.resultTypePill, { backgroundColor: type.color + '22', borderRadius: borderRadius.full }]}>
            <AppIcon name={type.icon} size={13} color={type.color} />
            <AppText style={{ fontSize: 11, fontWeight: '700', color: type.color }}>{type.title}</AppText>
          </View>
          {userPrompt ? (
            <AppText style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 18 }} numberOfLines={3}>
              "{userPrompt}"
            </AppText>
          ) : null}
        </View>
      </View>

      {/* AI Response card */}
      <View style={[s.responseCard, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.primary + '30', ...shadows.sm }]}>
        <View style={s.responseHeader}>
          <View style={[s.aiTag, { backgroundColor: colors.primaryMuted, borderRadius: borderRadius.full }]}>
            <AppIcon name="sparkle" size={13} color={colors.primary} />
            <AppText style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>AI Analysis</AppText>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          {lines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
              return (
                <AppText key={i} style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 6 }}>
                  {trimmed.slice(2, -2)}
                </AppText>
              );
            }
            if (/^[-•]\s/.test(trimmed)) {
              return (
                <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 4 }}>
                  <AppText style={{ color: type.color, fontSize: 15, lineHeight: 22 }}>•</AppText>
                  <AppText style={{ flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                    {trimmed.replace(/^[-•]\s/, '')}
                  </AppText>
                </View>
              );
            }
            return (
              <AppText key={i} style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                {trimmed}
              </AppText>
            );
          })}
        </View>
      </View>

      {/* Disclaimer */}
      <View style={[s.disclaimerRow, { backgroundColor: colors.primaryMuted, borderRadius: borderRadius.lg }]}>
        <AppIcon name="information-circle" size={16} color={colors.primary} />
        <AppText style={{ fontSize: 12, color: colors.textTertiary, flex: 1, lineHeight: 17 }}>
          This is AI-generated guidance for informational purposes. Please consult a qualified doctor for diagnosis and treatment.
        </AppText>
      </View>

      {/* New analysis button */}
      <TouchableOpacity
        style={[s.resetBtn, { borderColor: colors.primary, borderRadius: borderRadius.lg }]}
        onPress={onReset}
        activeOpacity={0.8}
      >
        <AppIcon name="refresh" size={18} color={colors.primary} />
        <AppText style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>Analyze Another Image</AppText>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ImageAnalysisScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { showDialog, hideDialog } = useAppDialog();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [selectedType, setSelectedType] = useState<AnalysisType | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [response, setResponse] = useState('');
  const [pastAnalyses, setPastAnalyses] = useState<PastAnalysis[]>([]);
  const [viewingPast, setViewingPast] = useState<PastAnalysis | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const loadPastAnalyses = useCallback(async () => {
    try {
      const userId = DatabaseService.getCurrentUserId();
      const rows = await DatabaseService.query<PastAnalysis>(
        'SELECT * FROM image_analyses WHERE user_id = ? ORDER BY timestamp DESC LIMIT 30',
        [userId],
      );
      setPastAnalyses(rows);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadPastAnalyses(); }, [loadPastAnalyses]));

  const saveAnalysis = useCallback(async (
    uri: string,
    type: AnalysisType,
    prompt: string,
    aiResponse: string,
  ) => {
    try {
      const userId = DatabaseService.getCurrentUserId();
      await DatabaseService.execute(
        `INSERT INTO image_analyses (id, local_uri, analysis_type, type_label, type_color, user_prompt, ai_response, timestamp, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [DatabaseService.uuid(), uri, type.id, type.title, type.color, prompt, aiResponse, Date.now(), userId],
      );
    } catch {}
  }, []);

  const pickImage = useCallback(async (source: 'gallery' | 'camera') => {
    try {
      let result;
      if (source === 'camera') {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            showDialog({ title: 'Permission Denied', message: 'Camera access is required to take photos.', icon: 'camera', iconColor: colors.error });
            return;
          }
        }
        result = await launchCamera({ mediaType: 'photo', quality: 0.6, maxWidth: 1280, maxHeight: 1280, includeBase64: true });
      } else {
        result = await launchImageLibrary({ mediaType: 'photo', quality: 0.6, maxWidth: 1280, maxHeight: 1280, includeBase64: true });
      }
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri || !asset.base64) { showDialog({ title: 'Image Error', message: 'Could not read image data. Please try another image.', icon: 'image', iconColor: colors.error }); return; }
      setPickedImage({
        uri: Platform.OS === 'android' && !asset.uri.startsWith('file://') ? `file://${asset.uri}` : asset.uri,
        base64: asset.base64,
        mimeType: asset.type || 'image/jpeg',
      });
      setResponse('');
    } catch {
      showDialog({ title: 'Error', message: 'Could not open image picker. Please try again.', icon: 'image', iconColor: colors.error });
    }
  }, []);

  const handleTypeSelect = useCallback((type: AnalysisType) => {
    setSelectedType(type);
    setPickedImage(null);
    setResponse('');
    setUserPrompt('');
    setViewingPast(null);
    showDialog({
      title: type.title,
      message: 'Choose how to add your image for analysis.',
      icon: type.icon,
      iconColor: type.color,
      buttons: [
        { text: 'Cancel', onPress: () => { hideDialog(); setSelectedType(null); }, variant: 'ghost' },
        { text: 'Gallery', onPress: () => { hideDialog(); pickImage('gallery'); }, variant: 'primary' },
        { text: 'Camera', onPress: () => { hideDialog(); pickImage('camera'); }, variant: 'primary' },
      ],
    });
  }, [pickImage]);

  const handleAnalyze = useCallback(async () => {
    if (!pickedImage || !selectedType) return;
    setAnalyzing(true);
    try {
      const prompt = userPrompt.trim()
        ? `${selectedType.prompt}\n\nAdditional question from user: ${userPrompt.trim()}`
        : selectedType.prompt;
      const base64 = pickedImage.base64.replace(/^data:image\/\w+;base64,/, '');
      let streamedText = '';
      const result = await AgentService.chatWithOrchestrator(
        prompt, [],
        token => { streamedText = token; },
        'en', undefined, base64, pickedImage.mimeType, selectedType.agentId,
      );
      const text = result.ok
        ? streamedText || result.data?.specialistResponses?.[0]?.response || ''
        : `Unable to analyze: ${result.error}`;
      setResponse(text);
      await saveAnalysis(pickedImage.uri, selectedType, userPrompt.trim(), text);
      await loadPastAnalyses();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      setResponse(`Error: ${e?.message || 'Analysis failed'}`);
    } finally {
      setAnalyzing(false);
    }
  }, [pickedImage, selectedType, userPrompt, saveAnalysis, loadPastAnalyses]);

  const handleReset = useCallback(() => {
    setSelectedType(null);
    setPickedImage(null);
    setResponse('');
    setUserPrompt('');
    setViewingPast(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const hasResult = !!response && !!pickedImage && !!selectedType;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <AppIcon name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 }}>
            Visual AI Analysis
          </AppText>
          <AppText style={{ fontSize: 12, color: colors.textTertiary, marginTop: 1 }}>
            Upload any medical image for instant AI analysis
          </AppText>
        </View>
        {hasResult || pickedImage ? (
          <TouchableOpacity onPress={handleReset} style={s.newBtn}>
            <AppIcon name="add" size={18} color={colors.primary} />
            <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>New</AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 60, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, gap: 20 }}>

          {/* ── Past analysis full view ─────────────────────────────────────── */}
          {viewingPast ? (
            <View style={{ gap: 14 }}>
              <View style={[s.resultImageRow, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.borderLight, ...shadows.sm }]}>
                <Image source={{ uri: viewingPast.local_uri }} style={[s.resultImage, { borderRadius: borderRadius.lg }]} resizeMode="cover" />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={[s.resultTypePill, { backgroundColor: viewingPast.type_color + '22', borderRadius: borderRadius.full }]}>
                    <View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: viewingPast.type_color }]} />
                    <AppText style={{ fontSize: 11, fontWeight: '700', color: viewingPast.type_color }}>{viewingPast.type_label.toUpperCase()}</AppText>
                  </View>
                  <AppText style={{ fontSize: 12, color: colors.textTertiary }}>
                    {new Date(viewingPast.timestamp).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </AppText>
                  {viewingPast.user_prompt ? (
                    <AppText style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' }} numberOfLines={2}>
                      "{viewingPast.user_prompt}"
                    </AppText>
                  ) : null}
                </View>
              </View>
              <View style={[s.responseCard, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.primary + '30', ...shadows.sm }]}>
                <View style={s.responseHeader}>
                  <View style={[s.aiTag, { backgroundColor: colors.primaryMuted, borderRadius: borderRadius.full }]}>
                    <AppIcon name="sparkle" size={13} color={colors.primary} />
                    <AppText style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>AI Analysis</AppText>
                  </View>
                </View>
                <AppText style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 22 }}>
                  {viewingPast.ai_response}
                </AppText>
              </View>
              <TouchableOpacity
                style={[s.resetBtn, { borderColor: colors.primary, borderRadius: borderRadius.lg }]}
                onPress={handleReset}
                activeOpacity={0.8}
              >
                <AppIcon name="arrow-back" size={18} color={colors.primary} />
                <AppText style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>Back to Analysis</AppText>
              </TouchableOpacity>
            </View>
          ) : hasResult ? (
            /* ── Result view ──────────────────────────────────────────────── */
            <ResultView
              image={pickedImage!}
              type={selectedType!}
              response={response}
              userPrompt={userPrompt}
              colors={colors}
              borderRadius={borderRadius}
              shadows={shadows}
              onReset={handleReset}
            />
          ) : (
            /* ── Normal state ─────────────────────────────────────────────── */
            <View style={{ gap: 20 }}>
              {/* Category grid */}
              <View>
                <AppText style={[s.sectionTitle, { color: colors.textSecondary }]}>
                  SELECT ANALYSIS TYPE
                </AppText>
                <View style={s.grid}>
                  {ANALYSIS_TYPES.map(type => (
                    <TypeCard
                      key={type.id}
                      type={type}
                      isSelected={selectedType?.id === type.id}
                      colors={colors}
                      borderRadius={borderRadius}
                      shadows={shadows}
                      onPress={() => handleTypeSelect(type)}
                    />
                  ))}
                </View>
              </View>

              {/* Image preview + analyze section — shown after image is picked */}
              {pickedImage && selectedType ? (
                <View style={{ gap: 12 }}>
                  {/* Selected type indicator */}
                  <View style={[s.selectedTypeBanner, { backgroundColor: selectedType.color + '15', borderRadius: borderRadius.lg, borderColor: selectedType.color + '40' }]}>
                    <AppIcon name={selectedType.icon} size={18} color={selectedType.color} />
                    <AppText style={{ flex: 1, fontWeight: '700', color: selectedType.color }}>
                      {selectedType.title}
                    </AppText>
                    <TouchableOpacity onPress={() => setPickedImage(null)} style={{ padding: 4 }}>
                      <AppIcon name="close" size={16} color={selectedType.color} />
                    </TouchableOpacity>
                  </View>

                  {/* Image preview */}
                  <View style={[s.imagePreviewCard, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.borderLight, ...shadows.sm }]}>
                    <Image
                      source={{ uri: pickedImage.uri }}
                      style={[s.previewImage, { borderRadius: borderRadius.lg }]}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={[s.changeImageBtn, { backgroundColor: colors.surface, borderRadius: borderRadius.full, borderColor: colors.borderLight }]}
                      onPress={() =>
                        showDialog({
                          title: 'Change Image',
                          message: 'Choose how to add a new image.',
                          icon: 'camera',
                          iconColor: colors.primary,
                          buttons: [
                            { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
                            { text: 'Gallery', onPress: () => { hideDialog(); pickImage('gallery'); }, variant: 'primary' },
                            { text: 'Camera', onPress: () => { hideDialog(); pickImage('camera'); }, variant: 'primary' },
                          ],
                        })
                      }
                    >
                      <AppIcon name="camera" size={16} color={colors.primary} />
                      <AppText style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Change</AppText>
                    </TouchableOpacity>
                  </View>

                  {/* Optional question */}
                  <View style={[s.questionBox, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.borderLight }]}>
                    <AppText style={{ fontSize: 12, color: colors.textTertiary, fontWeight: '600', marginBottom: 6 }}>
                      ADD A SPECIFIC QUESTION (OPTIONAL)
                    </AppText>
                    <TextInput
                      value={userPrompt}
                      onChangeText={setUserPrompt}
                      placeholder="e.g. Is this mole dangerous? How long will it take to heal?"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      style={[s.questionInput, { color: colors.textPrimary }]}
                      maxLength={300}
                      returnKeyType="done"
                    />
                  </View>

                  {/* Analyze button */}
                  <TouchableOpacity
                    style={[s.analyzeBtn, { backgroundColor: analyzing ? colors.primaryMuted : colors.primary, borderRadius: borderRadius.lg }]}
                    onPress={handleAnalyze}
                    disabled={analyzing}
                    activeOpacity={0.85}
                  >
                    {analyzing ? (
                      <>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Analyzing image…</AppText>
                      </>
                    ) : (
                      <>
                        <AppIcon name="sparkle" size={20} color="#fff" />
                        <AppText style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Analyze with AI</AppText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          {/* ── Past analyses ───────────────────────────────────────────────── */}
          {pastAnalyses.length > 0 && !viewingPast && (
            <View>
              <View style={[s.pastHeader]}>
                <AppText style={[s.sectionTitle, { color: colors.textSecondary }]}>PAST ANALYSES</AppText>
                <AppText style={{ fontSize: 12, color: colors.textTertiary }}>{pastAnalyses.length} saved</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                {pastAnalyses.map(item => (
                  <PastCard
                    key={item.id}
                    item={item}
                    colors={colors}
                    borderRadius={borderRadius}
                    shadows={shadows}
                    onPress={past => {
                      setViewingPast(past);
                      scrollRef.current?.scrollTo({ y: 0, animated: true });
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Type card component ──────────────────────────────────────────────────────

function TypeCard({
  type,
  isSelected,
  colors,
  borderRadius,
  shadows,
  onPress,
}: {
  type: AnalysisType;
  isSelected: boolean;
  colors: any;
  borderRadius: any;
  shadows: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        s.typeCard,
        {
          backgroundColor: isSelected ? type.color + '15' : colors.surface,
          borderRadius: borderRadius.xl,
          borderColor: isSelected ? type.color : colors.borderLight,
          ...shadows.sm,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[s.typeIconWrap, { backgroundColor: type.color + '18' }]}>
        <View style={[s.typeIconInner, { backgroundColor: type.color + '28', borderRadius: borderRadius.lg }]}>
          <AppIcon name={type.icon} size={26} color={type.color} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontSize: 14, fontWeight: '700', color: isSelected ? type.color : colors.textPrimary }}>
          {type.title}
        </AppText>
        <AppText style={{ fontSize: 12, color: colors.textTertiary, lineHeight: 16 }}>
          {type.desc}
        </AppText>
      </View>
      <View style={[s.typeArrow, { backgroundColor: isSelected ? type.color : type.color + '18', borderRadius: borderRadius.full }]}>
        <AppIcon name="camera" size={13} color={isSelected ? '#fff' : type.color} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Category grid — 2 columns
  grid: { gap: 10 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  typeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconInner: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeArrow: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Selected type banner
  selectedTypeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },

  // Image preview
  imagePreviewCard: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  changeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },

  // Optional question
  questionBox: {
    padding: 14,
    borderWidth: 1,
  },
  questionInput: {
    fontSize: 14,
    lineHeight: 21,
    minHeight: 60,
    maxHeight: 120,
  },

  // Analyze button
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },

  // Result styles
  resultImageRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  resultImage: { width: 90, height: 90 },
  resultTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  responseCard: { padding: 16, borderWidth: 1, gap: 12 },
  responseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5 },

  // Disclaimer
  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12 },

  // Reset button
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderWidth: 1.5,
  },

  // Past analyses
  pastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pastCard: {
    width: 200,
    overflow: 'hidden',
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  pastThumb: { width: '100%', height: 120 },
  pastTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  pastTypeDot: { width: 6, height: 6, borderRadius: 3 },
  pastPreview: { fontSize: 12, lineHeight: 17 },
  pastDate: { fontSize: 11 },
});

export default ImageAnalysisScreen;
