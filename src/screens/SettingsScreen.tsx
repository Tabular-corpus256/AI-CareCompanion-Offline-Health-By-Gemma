import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useTheme } from '@theme';
import { AppText, ScreenHeader, AppCard, SectionTitle } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { LlmService } from '@services/LlmService';
import { AuthService } from '@services/FirebaseService';
import { DatabaseService } from '@services/DatabaseService';
import { useAppDialog } from '@components/DialogProvider';
import { useHealthProfile } from '../context/HealthProfileContext';
import {
  getDynamicModelRecommendations,
  type ModelRecommendation,
} from '../data/modelGuide';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type SettingsScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, toggleTheme, spacing, borderRadius } = useTheme();
  const { profile } = useHealthProfile();
  const { showDialog, hideDialog } = useAppDialog();
  const [modelList, setModelList] = useState<ModelRecommendation[]>([]);
  const [selectedModelId, setSelectedModelId] = useState(
    LlmService.getCurrentModel(),
  );

  useEffect(() => {
    (async () => {
      const models = getDynamicModelRecommendations();
      setModelList(models);
      setSelectedModelId(LlmService.getCurrentModel());
    })();
  }, []);

  const selectModel = (id: string) => {
    LlmService.setModel(id);
    setSelectedModelId(id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* User Profile */}
        <TouchableOpacity
          onPress={() => navigation.navigate('HealthProfile')}
          activeOpacity={0.9}
          style={{ marginHorizontal: spacing.md, marginTop: spacing.md }}
        >
          <AppCard variant="elevated" padding="md">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.primaryMuted,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <AppIcon name="person" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="heading3">
                  {profile.name || 'Your Profile'}
                </AppText>
                <AppText variant="body" color="secondary">
                  Tap to manage health profile
                </AppText>
              </View>
              <AppIcon
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </View>
          </AppCard>
        </TouchableOpacity>

        {/* AI Model */}
        <SectionTitle title="AI Model" size="lg" />
        <AppCard
          variant="default"
          padding="none"
          style={{ marginHorizontal: spacing.md }}
        >
          {modelList.map((m, i) => (
            <TouchableOpacity
              key={m.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                gap: spacing.md,
                borderBottomWidth: i < modelList.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderLight,
              }}
              onPress={() => selectModel(m.id)}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: borderRadius.md,
                  backgroundColor: m.medical
                    ? colors.successMuted
                    : colors.primaryMuted,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <AppIcon
                  name={m.medical ? 'medical' : 'brain'}
                  size={20}
                  color={m.medical ? colors.success : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{m.name}</AppText>
                <AppText variant="small" color="tertiary">
                  {m.description}
                </AppText>
              </View>
              {selectedModelId === m.id && (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <AppIcon name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </AppCard>

        {/* Appearance */}
        <SectionTitle title="Appearance" size="lg" />
        <AppCard
          variant="default"
          padding="none"
          style={{ marginHorizontal: spacing.md }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                backgroundColor: colors.primaryMuted,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AppIcon
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">Dark Mode</AppText>
              <AppText variant="small" color="tertiary">
                {isDark
                  ? 'Tap to switch to Light Mode'
                  : 'Tap to switch to Dark Mode'}
              </AppText>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </AppCard>

        {/* Account */}
        <SectionTitle title="Account" size="lg" />
        <AppCard
          variant="default"
          padding="none"
          style={{ marginHorizontal: spacing.md }}
        >
          <TouchableOpacity
            onPress={() => {
              showDialog({
                title: 'Sign Out',
                message: 'Are you sure you want to sign out?',
                icon: 'log-out-outline',
                iconColor: '#e74c3c',
                buttons: [
                  { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
                  {
                    text: 'Sign Out',
                    onPress: () => { hideDialog(); AuthService.signOut(); },
                    variant: 'danger',
                  },
                ],
              });
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                backgroundColor: colors.errorMuted,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AppIcon name="log-out-outline" size={20} color={colors.error} />
            </View>
            <AppText
              variant="bodyMedium"
              style={{ flex: 1, color: colors.error }}
            >
              Sign Out
            </AppText>
          </TouchableOpacity>
        </AppCard>

        {/* Data */}
        <SectionTitle title="Data" size="lg" />
        <AppCard
          variant="default"
          padding="none"
          style={{ marginHorizontal: spacing.md }}
        >
          <TouchableOpacity
            onPress={() => {
              showDialog({
                title: 'Clear Cache',
                message: 'Remove cached AI responses and temporary data?',
                icon: 'trash-outline',
                iconColor: colors.warning,
                buttons: [
                  { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
                  {
                    text: 'Clear',
                    variant: 'danger',
                    onPress: async () => {
                      hideDialog();
                      await DatabaseService.execute('DELETE FROM cached_results');
                      showDialog({ title: 'Done', message: 'Cache cleared successfully.', icon: 'checkmark-circle', iconColor: colors.success });
                    },
                  },
                ],
              });
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                backgroundColor: colors.warningMuted,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AppIcon name="trash-outline" size={20} color={colors.warning} />
            </View>
            <AppText variant="bodyMedium" style={{ flex: 1 }}>
              Clear Cache
            </AppText>
            <AppIcon
              name="chevron-forward"
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </AppCard>

        {/* About */}
        <SectionTitle title="About" size="lg" />
        <AppCard
          variant="default"
          padding="none"
          style={{ marginHorizontal: spacing.md }}
        >
          {[
            {
              label: 'Version',
              value: '1.0.0',
              icon: 'code-slash',
              iconColor: colors.secondary,
              iconBg: colors.secondaryMuted,
            },
            {
              label: 'AI Engine',
              value: 'Google GenAI',
              icon: 'hardware-chip',
              iconColor: colors.primary,
              iconBg: colors.primaryMuted,
            },
            {
              label: 'Status',
              value:
                LlmService.getModelStatus().state === 'ready'
                  ? '● Online'
                  : '● Offline',
              valueColor:
                LlmService.getModelStatus().state === 'ready'
                  ? colors.success
                  : colors.error,
              icon: 'pulse',
              iconColor: colors.success,
              iconBg: colors.successMuted,
            },
          ].map((item, i) => (
            <View
              key={item.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing.md,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: colors.borderLight,
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: borderRadius.md,
                    backgroundColor: item.iconBg,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <AppIcon
                    name={item.icon as any}
                    size={20}
                    color={item.iconColor}
                  />
                </View>
                <AppText variant="body" color="secondary">
                  {item.label}
                </AppText>
              </View>
              <AppText
                variant="bodyMedium"
                style={{
                  color: (item as any).valueColor || colors.textPrimary,
                }}
              >
                {item.value}
              </AppText>
            </View>
          ))}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;
