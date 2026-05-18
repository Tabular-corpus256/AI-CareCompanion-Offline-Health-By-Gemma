import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { DatabaseService } from '@services/DatabaseService';
import { AgentService } from '@services/AgentService';
import { getAgentById } from '../data/agents';
import { AppIcon } from '@components/AppIcon';
import { ScreenHeader } from '@components/ui/ScreenHeader';

export function MedicationInteractionCheckerScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const navigation = useNavigation<any>();
  const [drugs, setDrugs] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    // Pre-populate from user's medications
    (async () => {
      const rows = await DatabaseService.query<{ name: string }>(
        'SELECT name FROM medications WHERE user_id = ? AND deleted_at IS NULL',
        [DatabaseService.getCurrentUserId()],
      );
      if (rows.length > 0) {
        setDrugs(rows.map(r => r.name));
      }
    })();
  }, []);

  const addDrug = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || drugs.includes(trimmed)) return;
    setDrugs(prev => [...prev, trimmed]);
    setInput('');
  }, [input, drugs]);

  const removeDrug = useCallback((drug: string) => {
    setDrugs(prev => prev.filter(d => d !== drug));
    setResult(null);
  }, []);

  const checkInteractions = useCallback(async () => {
    if (drugs.length < 2) return;
    setLoading(true);
    setResult(null);
    try {
      const agent = getAgentById('pharmacy')!;
      const query = `Check drug interactions for the following medications: ${drugs.join(', ')}.
List any significant interactions, severity (mild/moderate/severe), and management recommendations.`;
      const res = await AgentService.chatWithAgent(agent, query, []);
      setResult(res.ok ? res.data : `Error: ${res.error}`);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [drugs]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Drug Interactions"
        subtitle="Check for conflicts"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={[s.infoBox, { backgroundColor: colors.warningMuted, borderColor: colors.borderLight, borderRadius: borderRadius.lg }]}>
          <View style={[s.infoIconWrap, { backgroundColor: colors.warning + '20' }]}>
            <AppIcon name="info" size={18} color={colors.warning ?? '#FF9800'} />
          </View>
          <Text style={[s.infoTxt, { color: colors.textPrimary }]}>
            Enter 2 or more medications to check for potential drug interactions. Always consult your doctor.
          </Text>
        </View>

        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Medications to Check</Text>
        <View style={s.inputRow}>
          <TextInput
            style={[s.input, { borderColor: colors.borderLight, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: borderRadius.md }]}
            value={input}
            onChangeText={setInput}
            placeholder="Enter medication name…"
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={addDrug}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
            onPress={addDrug}
            activeOpacity={0.7}
          >
            <AppIcon name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {drugs.length > 0 && (
          <View style={s.drugList}>
            {drugs.map(drug => (
              <View key={drug} style={[s.drugChip, { backgroundColor: colors.primaryMuted, borderColor: colors.borderLight, borderRadius: borderRadius.full }]}>
                <AppIcon name="medication" size={14} color={colors.primary} />
                <Text style={[s.drugName, { color: colors.textPrimary }]}>{drug}</Text>
                <TouchableOpacity onPress={() => removeDrug(drug)} style={{ padding: 2 }}>
                  <AppIcon name="close" size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {drugs.length >= 2 && (
          <TouchableOpacity
            style={[s.checkBtn, { backgroundColor: loading ? colors.textTertiary : colors.primary, borderRadius: borderRadius.lg, ...shadows.sm }]}
            onPress={checkInteractions}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <AppIcon name="search" size={20} color="#fff" />
            )}
            <Text style={s.checkTxt}>
              {loading ? 'Checking interactions…' : `Check ${drugs.length} Medications`}
            </Text>
          </TouchableOpacity>
        )}

        {drugs.length < 2 && drugs.length > 0 && (
          <Text style={[s.hint, { color: colors.textTertiary }]}>Add at least one more medication to check interactions.</Text>
        )}

        {result && (
          <View style={[s.resultCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, ...shadows.sm, borderWidth: 1, borderColor: colors.borderLight }]}>
            <View style={s.resultHeader}>
              <View style={[s.resultIconWrap, { backgroundColor: colors.primaryMuted }]}>
                <AppIcon name="science" size={20} color={colors.primary} />
              </View>
              <Text style={[s.resultTitle, { color: colors.textPrimary }]}>Interaction Analysis</Text>
            </View>
            <Text style={[s.resultText, { color: colors.textPrimary }]}>{result}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  infoBox: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1, marginBottom: 8, alignItems: 'flex-start' },
  infoIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  infoTxt: { flex: 1, fontSize: 13, lineHeight: 19 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  input: {
    flex: 1, borderWidth: 1.5, padding: 14,
    fontSize: 15,
  },
  addBtn: { width: 50, justifyContent: 'center', alignItems: 'center' },
  drugList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  drugChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  drugName: { fontSize: 14, fontWeight: '600' },
  checkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, marginBottom: 16 },
  checkTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { textAlign: 'center', fontSize: 14, marginBottom: 16 },
  resultCard: { padding: 18, marginTop: 4 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  resultIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultText: { fontSize: 14, lineHeight: 22 },
});
