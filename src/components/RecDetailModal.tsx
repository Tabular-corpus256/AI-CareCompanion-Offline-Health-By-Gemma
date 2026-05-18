import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { JSONUIProvider, Renderer } from '@json-render/react-native';
import type { Spec } from '@json-render/react-native';
import { useTheme } from '@theme';
import { AppIcon } from './AppIcon';
import { AppText } from './ui';
import type { DynamicRecommendation } from '../services/RecommendationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function buildRecSpec(rec: DynamicRecommendation, colors: any): Spec {
  const steps = rec.steps ?? [];
  const bodyChildren: string[] = ['descLabel', 'spacer2', 'desc'];
  if (steps.length > 0) {
    bodyChildren.push('divider', 'stepsLabel', 'stepsSpacer', ...steps.map((_, i) => `step${i}`));
  }

  const elements: Record<string, any> = {
    root: {
      type: 'Column',
      props: { gap: null, alignItems: null, justifyContent: null, padding: null, flex: null },
      children: ['header', 'body'],
    },
    header: {
      type: 'Container',
      props: {
        padding: 24,
        paddingHorizontal: null,
        paddingVertical: null,
        margin: null,
        backgroundColor: rec.bgColor,
        borderRadius: null,
        flex: null,
      },
      children: ['chip', 'spacer1', 'htitle', 'spacer1b', 'hsub'],
    },
    chip: {
      type: 'Chip',
      props: { label: rec.sub, selected: null, backgroundColor: rec.accentColor + '50' },
      children: [],
    },
    spacer1: { type: 'Spacer', props: { size: 12, flex: null }, children: [] },
    htitle: {
      type: 'Heading',
      props: { text: rec.title, level: 'h2', color: rec.textColor, align: null },
      children: [],
    },
    spacer1b: { type: 'Spacer', props: { size: 4, flex: null }, children: [] },
    hsub: {
      type: 'Label',
      props: { text: 'Personalized recommendation', color: rec.textColor + 'aa', bold: null, size: 'sm' },
      children: [],
    },
    body: {
      type: 'Container',
      props: {
        padding: 20,
        paddingHorizontal: null,
        paddingVertical: null,
        margin: null,
        backgroundColor: null,
        borderRadius: null,
        flex: null,
      },
      children: bodyChildren,
    },
    descLabel: {
      type: 'Label',
      props: { text: 'ABOUT THIS PLAN', color: colors.textTertiary, bold: true, size: 'xs' },
      children: [],
    },
    spacer2: { type: 'Spacer', props: { size: 10, flex: null }, children: [] },
    desc: {
      type: 'Paragraph',
      props: {
        text: rec.description ?? 'Talk to an AI specialist to get a personalized plan tailored specifically to your health needs.',
        color: colors.textSecondary,
        align: null,
        numberOfLines: null,
        fontSize: 15,
      },
      children: [],
    },
  };

  if (steps.length > 0) {
    elements.divider = {
      type: 'Divider',
      props: { color: colors.borderLight, margin: 20, direction: null, thickness: null },
      children: [],
    };
    elements.stepsLabel = {
      type: 'Label',
      props: { text: 'ACTION STEPS', color: colors.textTertiary, bold: true, size: 'xs' },
      children: [],
    };
    elements.stepsSpacer = { type: 'Spacer', props: { size: 10, flex: null }, children: [] };
    steps.forEach((step, i) => {
      elements[`step${i}`] = {
        type: 'Paragraph',
        props: {
          text: `${i + 1}.   ${step}`,
          color: colors.textPrimary,
          align: null,
          numberOfLines: null,
          fontSize: 14,
        },
        children: [],
      };
    });
  }

  return { root: 'root', elements };
}

interface Props {
  rec: DynamicRecommendation | null;
  visible: boolean;
  onClose: () => void;
  onStartChat: (agentId?: string) => void;
}

export function RecDetailModal({ rec, visible, onClose, onStartChat }: Props) {
  const { colors, shadows } = useTheme();

  if (!rec) return null;

  const spec = buildRecSpec(rec, colors);
  const ctaColor = rec.accentColor || colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.background, ...shadows.lg }]}>
          {/* Drag handle row */}
          <View style={styles.handleRow}>
            <View style={[styles.handleBar, { backgroundColor: colors.borderLight }]} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <AppIcon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content via json-render */}
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <JSONUIProvider initialState={{}}>
              <Renderer spec={spec} />
            </JSONUIProvider>
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Sticky CTA */}
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: ctaColor }]}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                onStartChat(rec.agentId);
              }}
            >
              <AppText variant="bodyMedium" style={{ color: '#fff', fontWeight: '700', flex: 1, textAlign: 'center' }}>
                Chat with AI Specialist
              </AppText>
              <AppIcon name="chevron-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
    position: 'relative',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 10,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
    paddingHorizontal: 20,
  },
});

export default RecDetailModal;
