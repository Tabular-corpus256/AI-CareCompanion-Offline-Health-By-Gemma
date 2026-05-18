import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { AppIcon } from '@components/AppIcon';
import { ScreenHeader } from '@components/ui/ScreenHeader';

interface GuideItem {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  steps: string[];
  doNot: string[];
  callIf: string[];
}

const FIRST_AID_DATA: GuideItem[] = [
  {
    id: 'burns',
    title: 'Burns',
    category: 'Wounds',
    icon: 'whatshot',
    color: '#F4511E',
    steps: [
      'Cool the burn with cool (not cold/icy) running water for 20 minutes',
      'Remove jewelry or tight clothing near the burn',
      'Cover loosely with non-stick cling film or clean plastic bag',
      'Give paracetamol or ibuprofen for pain if available',
    ],
    doNot: ['Do NOT use ice, butter, toothpaste, or creams', 'Do NOT burst blisters', 'Do NOT remove clothing stuck to skin'],
    callIf: ['Burn larger than 3cm', 'On face, hands, feet, genitals, or over a joint', 'Deep/charred skin', 'Chemical or electrical burn', 'Child under 5 or elder'],
  },
  {
    id: 'fracture',
    title: 'Broken Bone / Fracture',
    category: 'Injuries',
    icon: 'accessibility-new',
    color: '#607D8B',
    steps: [
      'Support the injured limb in the position found — do NOT straighten',
      'Apply padding (clothing, foam) around the fracture',
      'Immobilize with a splint (stiff board) from joint above to joint below',
      'Apply ice pack wrapped in cloth to reduce swelling',
      'Monitor circulation — check pulse, warmth, and sensation below the injury',
    ],
    doNot: ['Do NOT try to realign the bone', 'Do NOT apply a splint too tightly'],
    callIf: ['Suspected spinal injury', 'Open fracture (bone visible)', 'Hip, pelvis, or femur fracture', 'Loss of sensation or circulation'],
  },
  {
    id: 'wound',
    title: 'Cuts & Wounds',
    category: 'Wounds',
    icon: 'healing',
    color: '#c62828',
    steps: [
      'Apply direct pressure with a clean cloth for 10 minutes',
      'Elevate the injured area above heart level',
      'Clean the wound with clean water once bleeding stops',
      'Cover with a sterile dressing or bandage',
      'Change dressing daily and check for signs of infection',
    ],
    doNot: ['Do NOT probe the wound', 'Do NOT remove embedded objects', 'Do NOT use tourniquets unless bleeding is life-threatening and uncontrolled'],
    callIf: ['Bleeding does not stop after 10 min', 'Wound is deep, gaping, or from an animal bite', 'Signs of infection: redness, swelling, pus, fever'],
  },
  {
    id: 'choking_child',
    title: 'Choking — Infant (<1 yr)',
    category: 'Airway',
    icon: 'child-care',
    color: '#1E88E5',
    steps: [
      'Hold infant face-down on your forearm, head lower than chest',
      'Give 5 firm back blows with heel of hand between shoulder blades',
      'Turn infant face-up, give 5 chest thrusts with 2 fingers on center of chest',
      'Alternate 5 back blows + 5 chest thrusts until object is cleared or infant becomes unconscious',
      'If unconscious, start infant CPR and call emergency services',
    ],
    doNot: ['Do NOT perform abdominal thrusts on infants under 1 year'],
    callIf: ['Infant loses consciousness', 'Object not cleared after several cycles'],
  },
  {
    id: 'heatstroke',
    title: 'Heat Stroke',
    category: 'Environmental',
    icon: 'thermostat',
    color: '#FB8C00',
    steps: [
      'Move person to cool, shaded area immediately',
      'Remove unnecessary clothing',
      'Cool rapidly — fan, spray with cool water, ice packs to neck/armpits/groin',
      'Give cool water to drink if conscious and not vomiting',
      'Continue cooling until temperature drops or help arrives',
    ],
    doNot: ['Do NOT give aspirin or paracetamol — does not help heat stroke'],
    callIf: ['Body temp above 40°C', 'Confusion, loss of consciousness, seizures', 'Stops sweating while skin is hot'],
  },
  {
    id: 'poisoning',
    title: 'Poisoning / Overdose',
    category: 'Toxic',
    icon: 'dangerous',
    color: '#6A1B9A',
    steps: [
      'Call poison control or emergency services immediately',
      'Do NOT induce vomiting unless instructed by medical professional',
      'If chemical is on skin, remove clothing and flush skin with water for 20 min',
      'If in eyes, flush with clean water for 10-20 minutes',
      'If unconscious and breathing, place in recovery position',
    ],
    doNot: ['Do NOT give salt water to induce vomiting', 'Do NOT give milk unless specifically instructed'],
    callIf: ['Any suspected poisoning', 'Loss of consciousness', 'Difficulty breathing', 'Seizures'],
  },
  {
    id: 'faint',
    title: 'Fainting / Unconsciousness',
    category: 'Circulation',
    icon: 'person',
    color: '#455A64',
    steps: [
      'Check if the person is responsive — tap and shout',
      'If breathing, put in recovery position (on their side)',
      'Loosen tight clothing, ensure fresh air',
      'Raise their legs 30cm if they have fainted (do NOT if head/neck injury)',
      'Check breathing and pulse every minute',
    ],
    doNot: ['Do NOT leave an unconscious person alone', 'Do NOT give anything by mouth if unconscious'],
    callIf: ['No response after 2 minutes', 'Breathing stops', 'Injury occurred during fall', 'First time fainting'],
  },
  {
    id: 'snake',
    title: 'Snake Bite',
    category: 'Environmental',
    icon: 'pest-control',
    color: '#2E7D32',
    steps: [
      'Keep the person calm and still — movement speeds venom spread',
      'Immobilize the bitten limb below heart level',
      'Remove jewelry or tight clothing from the affected area',
      'Mark the bite site with pen and note the time',
      'Get to a hospital IMMEDIATELY — antivenom may be needed',
    ],
    doNot: ['Do NOT cut and suck the wound', 'Do NOT apply ice or tourniquets', 'Do NOT apply electric shocks'],
    callIf: ['Always — snake bites require medical evaluation immediately'],
  },
  {
    id: 'eye_injury',
    title: 'Eye Injury / Chemical Splash',
    category: 'Eyes',
    icon: 'visibility',
    color: '#00897B',
    steps: [
      'Rinse the eye immediately with clean water for 15-20 minutes',
      'Hold the eye open and let water flow from inner corner outward',
      'Remove contact lenses if present before rinsing',
      'Do not rub the eye',
      'Cover with a clean, damp cloth after rinsing',
    ],
    doNot: ['Do NOT rub the eye', 'Do NOT use eye drops immediately after chemical exposure'],
    callIf: ['Chemical, acid, or alkali in eye', 'Vision loss or double vision', 'Severe pain', 'Foreign object embedded in eye'],
  },
  {
    id: 'nosebleed',
    title: 'Nosebleed',
    category: 'Head',
    icon: 'airline-seat-flat',
    color: '#E57373',
    steps: [
      'Sit upright and lean slightly forward',
      'Pinch the soft part of the nose firmly (below the bony ridge)',
      'Hold continuously for 10-15 minutes — do NOT release to check',
      'Breathe through mouth',
      'After stopping, avoid blowing nose for several hours',
    ],
    doNot: ['Do NOT tilt head back — blood may flow down throat', 'Do NOT pack nose with cotton unless doctor instructs'],
    callIf: ['Bleeding does not stop after 20 minutes', 'Nosebleed after a head injury', 'Blood loss causing dizziness'],
  },
];

const CATEGORIES = Array.from(new Set(FIRST_AID_DATA.map(g => g.category)));

export function FirstAidGuideScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const filtered = FIRST_AID_DATA.filter(g => {
    const matchSearch = !search || g.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = !category || g.category === category;
    return matchSearch && matchCat;
  });

  const selectedGuide = FIRST_AID_DATA.find(g => g.id === selectedId);
  const s = makeStyles(colors);

  if (selectedGuide) {
    return (
      <SafeAreaView style={s.safe}>
      <ScreenHeader
        title={selectedGuide.title}
        onBack={() => setSelectedId(null)}
        backgroundColor={selectedGuide.color}
      />
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={[s.infoBox, { backgroundColor: selectedGuide.color + '15', borderColor: selectedGuide.color + '30' }]}>
            <AppIcon name={selectedGuide.icon} size={24} color={selectedGuide.color} />
            <Text style={[s.infoTxt, { color: colors.textPrimary }]}>{selectedGuide.title} — {selectedGuide.category}</Text>
          </View>

          <Text style={s.sectionTitle}>Steps to Follow</Text>
          <View style={s.card}>
            {selectedGuide.steps.map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={[s.stepNum, { backgroundColor: selectedGuide.color }]}>
                  <Text style={s.stepNumTxt}>{i + 1}</Text>
                </View>
                <Text style={[s.stepTxt, { color: colors.textPrimary }]}>{step}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Do NOT</Text>
          <View style={[s.card, { backgroundColor: colors.error + '10', borderWidth: 1, borderColor: colors.error + '30' }]}>
            {selectedGuide.doNot.map((d, i) => (
              <View key={i} style={s.doNotRow}>
                <AppIcon name="block" size={16} color={colors.error} />
                <Text style={[s.doNotTxt, { color: colors.textPrimary }]}>{d}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Call Emergency If…</Text>
          <View style={[s.card, { backgroundColor: '#c62828' + '15', borderWidth: 1, borderColor: '#c62828' + '30' }]}>
            {selectedGuide.callIf.map((c, i) => (
              <View key={i} style={s.doNotRow}>
                <AppIcon name="phone" size={16} color="#c62828" />
                <Text style={[s.doNotTxt, { color: colors.textPrimary }]}>{c}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[s.emergencyBtn, { backgroundColor: '#c62828' }]}
            onPress={() => navigation.navigate('EmergencySOS')}
          >
            <AppIcon name="emergency" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Emergency SOS</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader
        title="First Aid Guide"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('EmergencySOS')}>
            <AppIcon name="emergency" size={22} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={s.searchBar}>
        <AppIcon name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search first aid guide…"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        horizontal
        data={[null, ...CATEGORIES]}
        keyExtractor={item => item ?? 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.catChip, category === item && { backgroundColor: colors.primary }]}
            onPress={() => setCategory(item)}
          >
            <Text style={[s.catTxt, category === item && { color: '#fff' }]}>{item ?? 'All'}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={g => g.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        numColumns={2}
        renderItem={({ item: guide }) => (
          <TouchableOpacity
            style={[s.guideCard, { borderTopColor: guide.color }]}
            onPress={() => setSelectedId(guide.id)}
            activeOpacity={0.85}
          >
            <View style={[s.guideIcon, { backgroundColor: guide.color + '20' }]}>
              <AppIcon name={guide.icon} size={28} color={guide.color} />
            </View>
            <Text style={[s.guideTitle, { color: colors.textPrimary }]}>{guide.title}</Text>
            <Text style={[s.guideCat, { color: guide.color }]}>{guide.category}</Text>
            <Text style={[s.guideSteps, { color: colors.textTertiary }]}>{guide.steps.length} steps</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
      paddingHorizontal: 16, paddingVertical: 12,
    },
    back: { padding: 4 },
    headerTitle: { color: colors.surface, fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 8 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 12,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
      borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
    catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    catTxt: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
    guideCard: {
      flex: 1, margin: 4, backgroundColor: colors.surface, borderRadius: 12, padding: 14,
      alignItems: 'center', borderTopWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    guideIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    guideTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
    guideCat: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    guideSteps: { fontSize: 12 },
    scroll: { padding: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
    infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginBottom: 4 },
    infoTxt: { flex: 1, fontSize: 15, fontWeight: '600' },
    card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 },
    stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    stepNum: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    stepNumTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    stepTxt: { flex: 1, fontSize: 14, lineHeight: 21 },
    doNotRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    doNotTxt: { flex: 1, fontSize: 14, lineHeight: 20 },
    emergencyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 12, marginTop: 20 },
  });
}
