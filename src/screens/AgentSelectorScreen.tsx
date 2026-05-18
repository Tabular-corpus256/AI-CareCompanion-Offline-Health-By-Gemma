import React, { useState, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { SPECIALIST_AGENTS, ORCHESTRATOR_AGENT } from '../data/agents';
import { AppText, ScreenHeader, AppInput } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { useI18n } from '../i18n/I18nContext';
import { getAgentTheme } from '../data/agentThemes';
import type { DoctorAgent } from '@types';

const AGENT_CATEGORIES: Record<string, string> = {
  orchestrator: 'Core', general_practice: 'Core', emergency_medicine: 'Core',
  internal_medicine: 'Core', pharmacy: 'Core',
  cardiology: 'Physical Health', pulmonology: 'Physical Health', gastroenterology: 'Physical Health',
  nephrology: 'Physical Health', endocrinology: 'Physical Health', dermatology: 'Physical Health',
  neurology: 'Physical Health', orthopaedics: 'Physical Health', ophthalmology: 'Physical Health',
  otorhinolaryngology: 'Physical Health', urology: 'Physical Health', haematology: 'Physical Health',
  rheumatology: 'Physical Health', vascular_medicine: 'Physical Health', radiology: 'Physical Health',
  clinical_pathology: 'Physical Health',
  paediatrics: 'Women & Children', obstetrics_gynecology: 'Women & Children',
  neonatology: 'Women & Children', adolescent_medicine: 'Women & Children', fertility: 'Women & Children',
  psychiatry: 'Mental Health', addiction_medicine: 'Mental Health', sleep_medicine: 'Mental Health',
  nutrition_dietetics: 'Lifestyle & Wellness', sports_medicine: 'Lifestyle & Wellness',
  lifestyle_medicine: 'Lifestyle & Wellness', integrative_medicine: 'Lifestyle & Wellness',
  occupational_medicine: 'Lifestyle & Wellness', travel_medicine: 'Lifestyle & Wellness',
  allergy_immunology: 'Specialized Care', geriatrics: 'Specialized Care',
  infectious_disease: 'Specialized Care', dentistry: 'Specialized Care', genetics: 'Specialized Care',
  pain_management: 'Specialized Care', palliative_care: 'Specialized Care',
  rehabilitation: 'Specialized Care', toxicology: 'Specialized Care', transplant_medicine: 'Specialized Care',
  preventive_medicine: 'Lifestyle & Wellness',
};

const CATEGORY_ORDER = ['Core', 'Physical Health', 'Women & Children', 'Mental Health', 'Lifestyle & Wellness', 'Specialized Care'];

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  Core: { icon: 'medical-services', color: '#0D7C66' },
  'Physical Health': { icon: 'favorite', color: '#E74C3C' },
  'Women & Children': { icon: 'child-care', color: '#E84393' },
  'Mental Health': { icon: 'self-improvement', color: '#9B59B6' },
  'Lifestyle & Wellness': { icon: 'fitness-center', color: '#00B894' },
  'Specialized Care': { icon: 'science', color: '#3498DB' },
};

const FILTER_CHIPS = ['All', ...CATEGORY_ORDER];

export function AgentSelectorScreen() {
  const { colors, spacing, shadows } = useTheme();
  const { tr } = useI18n();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const allAgents = SPECIALIST_AGENTS;

  const sections = useMemo(() => {
    let filtered = allAgents;
    if (search) {
      filtered = filtered.filter(a =>
        a.displayName.toLowerCase().includes(search.toLowerCase()) ||
        a.specialty.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(a => (AGENT_CATEGORIES[a.id] || 'Specialized Care') === selectedCategory);
    }
    const grouped: Record<string, DoctorAgent[]> = {};
    filtered.forEach(agent => {
      const cat = AGENT_CATEGORIES[agent.id] || 'Specialized Care';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(agent);
    });
    return CATEGORY_ORDER
      .filter(cat => grouped[cat]?.length > 0)
      .map(cat => ({
        title: cat, data: grouped[cat],
        icon: CATEGORY_ICONS[cat]?.icon || 'circle',
        color: CATEGORY_ICONS[cat]?.color || colors.primary,
      }));
  }, [allAgents, search, selectedCategory, colors.primary]);

  const handleSelect = (agent: DoctorAgent) => {
    navigation.navigate('AgentProfile', { agentId: agent.id });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerRow}>
          <AppText variant="heading1" style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 28 }}>
            {tr('agents')}
          </AppText>
          <View style={[st.countBadge, { backgroundColor: colors.primaryMuted }]}>
            <AppText variant="captionMedium" style={{ color: colors.primary, fontWeight: '700' }}>
              {allAgents.length}
            </AppText>
          </View>
        </View>
        <AppText variant="body" color="secondary" style={{ marginTop: 4 }}>
          Specialized AI agents for every health need.
        </AppText>
      </View>

      {/* Search */}
      <View style={[st.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderLight, ...shadows.sm }]}>
        <AppIcon name="search" size={20} color={colors.textTertiary} />
        <AppInput
          placeholder="Search agents by name or specialty..."
          value={search}
          onChangeText={setSearch}
          inputContainerStyle={{ borderWidth: 0, backgroundColor: 'transparent', minHeight: 36, paddingHorizontal: 0 }}
          style={{ fontSize: 15 }}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <AppIcon name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        style={{ flexGrow: 0 }}
        data={FILTER_CHIPS}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.chipRow}
        keyExtractor={item => item}
        renderItem={({ item: cat }) => {
          const isSelected = selectedCategory === cat;
          const catInfo = CATEGORY_ICONS[cat];
          return (
            <TouchableOpacity
              style={[st.chip, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              {catInfo && (
                <View style={[st.chipIcon, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : catInfo.color + '15' }]}>
                  <AppIcon name={catInfo.icon} size={12} color={isSelected ? '#fff' : catInfo.color} />
                </View>
              )}
              <AppText variant="captionMedium" style={{ color: isSelected ? '#fff' : colors.textPrimary, fontWeight: '600' }}>
                {cat}
              </AppText>
            </TouchableOpacity>
          );
        }}
      />

      {/* Agent list */}
      <SectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={a => a.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl + 20 }}
        renderSectionHeader={({ section }) => (
          <View style={st.sectionHeader}>
            <View style={[st.sectionIconWrap, { backgroundColor: section.color + '15' }]}>
              <AppIcon name={section.icon} size={16} color={section.color} />
            </View>
            <AppText variant="captionMedium" style={{ color: colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {section.title}
            </AppText>
            <View style={[st.sectionCount, { backgroundColor: colors.surfaceVariant }]}>
              <AppText variant="small" style={{ color: colors.textTertiary, fontWeight: '600' }}>
                {section.data.length}
              </AppText>
            </View>
          </View>
        )}
        renderItem={({ item: agent, index, section }) => {
          const agentTheme = getAgentTheme(agent.id);
          const accentColor = agentTheme.color;
          const isLast = index === section.data.length - 1;
          return (
            <TouchableOpacity
              onPress={() => handleSelect(agent)}
              activeOpacity={0.7}
              style={[st.agentRow, {
                borderBottomColor: isLast ? 'transparent' : colors.borderLight,
                borderBottomWidth: isLast ? 0 : 1,
                backgroundColor: colors.surface,
                borderTopLeftRadius: index === 0 ? 14 : 0, borderTopRightRadius: index === 0 ? 14 : 0,
                borderBottomLeftRadius: isLast ? 14 : 0, borderBottomRightRadius: isLast ? 14 : 0,
              }]}
            >
              <View style={[st.agentIcon, { backgroundColor: accentColor + '15' }]}>
                <AppText style={{ fontSize: 22 }}>{agentTheme.emoji}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium" style={{ color: colors.textPrimary, fontWeight: '600' }}>
                  {agent.displayName}
                </AppText>
                <AppText variant="caption" style={{ color: accentColor, marginTop: 2, fontWeight: '500' }} numberOfLines={1}>
                  {agent.specialty}
                </AppText>
              </View>
              <View style={[st.agentArrow, { backgroundColor: accentColor + '12' }]}>
                <AppIcon name="chevron-forward" size={14} color={accentColor} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <>
            {!search && selectedCategory === 'All' && (
              <View style={{ marginBottom: 24 }}>
                <TouchableOpacity
                  onPress={() => handleSelect(ORCHESTRATOR_AGENT)}
                  activeOpacity={0.8}
                  style={[st.heroCard, { backgroundColor: colors.primary, ...shadows.xl }]}
                >
                  <View style={st.heroOrb1} />
                  <View style={st.heroOrb2} />
                  <View style={[st.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <AppIcon name="medical-services" size={28} color="#fff" />
                  </View>
                  <AppText variant="heading2" style={{ color: '#fff', marginTop: 16 }}>
                    General AI Specialist
                  </AppText>
                  <AppText variant="body" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4, marginBottom: 20 }}>
                    Not sure who to consult? Start here and our orchestrator will route you to the right expert automatically.
                  </AppText>
                  <View style={[st.heroBtn, { backgroundColor: '#fff' }]}>
                    <AppIcon name="chatbubbles" size={18} color={colors.primary} />
                    <AppText variant="button" style={{ color: colors.primary, marginLeft: 8 }}>
                      Start Consultation
                    </AppText>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={st.emptyContainer}>
            <AppIcon name="search" size={40} color={colors.textTertiary} />
            <AppText variant="bodyMedium" style={{ color: colors.textPrimary, marginTop: 12 }}>
              {tr('noAgentsFound')}
            </AppText>
            <AppText variant="caption" color="tertiary">
              Try a different search term or category
            </AppText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  chipIcon: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 4, marginTop: 8 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 'auto' },
  agentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 14 },
  agentIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  agentArrow: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: 24, padding: 24, overflow: 'hidden', position: 'relative' },
  heroOrb1: { position: 'absolute', top: -50, right: -20, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroOrb2: { position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroIconWrap: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  heroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, alignSelf: 'flex-start' },
});

export default AgentSelectorScreen;
