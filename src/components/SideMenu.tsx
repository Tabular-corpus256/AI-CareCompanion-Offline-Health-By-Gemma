import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { AppText } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { LlmService } from '@services/LlmService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

interface MenuSection {
  title: string;
  items: Array<{ label: string; icon: string; screen?: string; onPress?: () => void; color?: string }>;
}

export function SideMenu({ visible, onClose, onNewChat }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const navigation = useNavigation<any>();

  const navigate = (screen: string, params?: any) => {
    onClose();
    navigation.navigate(screen, params);
  };

  const SECTIONS: MenuSection[] = [
    {
      title: 'Chat',
      items: [
        { label: 'New Conversation', icon: 'add-circle', onPress: () => { onNewChat(); onClose(); } },
        { label: 'AI Specialists', icon: 'people', screen: 'AgentSelector' },
      ],
    },
    {
      title: 'Health Tracking',
      items: [
        { label: 'Health Dashboard', icon: 'stats-chart', screen: 'MainTabs' },
        { label: 'Visual Analysis', icon: 'camera', screen: 'ImageAnalysis' },
        { label: 'Drug Info', icon: 'medical', screen: 'DrugInfo' },
        { label: 'Affordable Alternatives', icon: 'cash', screen: 'AffordableAlternatives' },
      ],
    },
    {
      title: 'Emergency',
      items: [
        { label: 'Emergency SOS', icon: 'alert-circle', screen: 'EmergencySOS', color: colors.error },
        { label: 'First Aid Guide', icon: 'medkit', screen: 'FirstAidGuide' },
        { label: 'Find Hospitals', icon: 'location', screen: 'FindNearbyDoctor' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Health Profile', icon: 'person', screen: 'HealthProfile' },
        { label: 'On-Device AI', icon: 'cpu', screen: 'ModelManager' },
        { label: 'Language', icon: 'language', screen: 'LanguageSelection' },
        { label: 'App Settings', icon: 'settings', screen: 'Settings' },
      ],
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface, width: '82%', maxWidth: 340 }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: 28 }]}>
          <View style={[styles.logo, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <AppIcon name="pulse" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading3" style={{ color: '#fff' }}>AI Care Companion</AppText>
            <AppText variant="small" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 2 }} numberOfLines={1}>
              {LlmService.getCurrentModel().split('-').slice(0, 3).join(' ')}
            </AppText>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <AppIcon name="close" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Menu sections */}
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          {SECTIONS.map(section => (
            <View key={section.title}>
              <AppText
                variant="smallMedium"
                color="tertiary"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  paddingHorizontal: spacing.md,
                  paddingTop: spacing.lg,
                  paddingBottom: spacing.xs,
                }}
              >
                {section.title}
              </AppText>
              {section.items.map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 11,
                  }}
                  onPress={item.onPress ?? (() => navigate(item.screen!))}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: borderRadius.full,
                      backgroundColor: (item.color ?? colors.primary) + '15',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <AppIcon name={item.icon} size={20} color={item.color ?? colors.primary} />
                  </View>
                  <AppText variant="body" style={{ flex: 1, color: item.color ?? colors.textPrimary }}>
                    {item.label}
                  </AppText>
                  <AppIcon name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SideMenu;
