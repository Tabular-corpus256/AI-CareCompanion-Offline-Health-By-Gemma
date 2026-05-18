import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { useHealthProfile } from '../context/HealthProfileContext';
import { AppText, AppButton } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { useAppDialog } from '@components/DialogProvider';
import { ScreenHeader } from '@components/ui/ScreenHeader';

const EMERGENCY_PROTOCOLS = [
  {
    id: 'cardiac',
    title: 'Cardiac Arrest / Heart Attack',
    icon: 'heart',
    color: '#E53935',
    severity: 'critical',
    steps: [
      'Call emergency services IMMEDIATELY (108 / 911 / 112)',
      'Check if the person is responsive — tap and shout',
      'If unresponsive and not breathing normally, start CPR',
      'Push hard and fast on the center of the chest — 100-120 compressions/min',
      'If trained, give 2 rescue breaths after every 30 compressions',
      'Use AED if available — follow voice prompts',
      'Do not stop until paramedics arrive or person recovers',
    ],
    signs: [
      'Chest pain or pressure',
      'Pain radiating to arm/jaw',
      'Sweating',
      'Nausea',
      'Shortness of breath',
    ],
  },
  {
    id: 'stroke',
    title: 'Stroke — F.A.S.T.',
    icon: 'brain',
    color: '#9C27B0',
    severity: 'critical',
    steps: [
      'FACE: Ask them to smile — is one side drooping?',
      'ARMS: Ask them to raise both arms — does one drift down?',
      'SPEECH: Ask them to speak — is it slurred or strange?',
      'TIME: If ANY sign is YES, call emergency services NOW',
      'Note the exact time symptoms started',
      'Keep the person calm and lying on their side',
      'Do NOT give food, water, or medication',
    ],
    signs: [
      'Face drooping',
      'Arm weakness',
      'Speech difficulty',
      'Sudden severe headache',
      'Vision loss',
    ],
  },
  {
    id: 'choking',
    title: 'Choking (Adult)',
    icon: 'alert-circle',
    color: '#FF6F00',
    severity: 'critical',
    steps: [
      'Ask "Are you choking?" — if they cannot speak or breathe, act immediately',
      'Stand behind them and lean them forward',
      'Give 5 firm back blows between shoulder blades with heel of hand',
      'If still choking, give 5 abdominal thrusts (Heimlich maneuver)',
      'Alternate 5 back blows + 5 abdominal thrusts',
      'If unconscious, lower to ground and start CPR',
      'Call emergency services if not resolved quickly',
    ],
    signs: [
      'Cannot speak or cough',
      'Clutching throat',
      'Blue lips',
      'High-pitched sound when breathing',
    ],
  },
  {
    id: 'seizure',
    title: 'Seizure / Epilepsy',
    icon: 'flash',
    color: '#6A1B9A',
    severity: 'urgent',
    steps: [
      'Stay calm and time the seizure',
      'Clear the area of sharp or hard objects',
      'Cushion their head with something soft',
      'Turn them on their side (recovery position) if possible',
      'Do NOT restrain them or put anything in their mouth',
      'Stay with them until they are fully conscious',
      'Call emergency services if: seizure > 5 min, injury occurs, second seizure, they are pregnant or diabetic',
    ],
    signs: [
      'Jerking movements',
      'Stiffening body',
      'Loss of consciousness',
      'Confusion after',
    ],
  },
  {
    id: 'anaphylaxis',
    title: 'Severe Allergic Reaction',
    icon: 'warning',
    color: '#F4511E',
    severity: 'critical',
    steps: [
      'Call emergency services immediately',
      'Use epinephrine auto-injector (EpiPen) if available — outer thigh',
      'Lay the person flat, raise their legs (unless breathing is easier sitting)',
      'If they stop breathing, start CPR',
      'A second epinephrine dose can be given after 5-15 min if no improvement',
      'Even if symptoms improve, go to hospital — biphasic reactions can occur',
    ],
    signs: [
      'Throat/tongue swelling',
      'Difficulty breathing',
      'Severe hives',
      'Drop in blood pressure',
      'Loss of consciousness',
    ],
  },
  {
    id: 'bleeding',
    title: 'Severe Bleeding',
    icon: 'water',
    color: '#C62828',
    severity: 'urgent',
    steps: [
      'Apply firm, direct pressure to the wound with a clean cloth',
      'Do NOT remove the cloth — add more cloth on top if soaked',
      'Apply pressure continuously for at least 10 minutes',
      'Elevate the injured area above heart level if possible',
      'Apply a tourniquet for limb bleeding that cannot be controlled',
      'Mark tourniquet application time on skin (e.g., "T 14:30")',
      'Get to emergency care as soon as possible',
    ],
    signs: [
      'Blood not stopping',
      'Wound longer than 2-3cm',
      'Deep puncture',
      'Arterial (bright red, pulsing) bleeding',
    ],
  },
];

export function EmergencySOSScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const { showDialog } = useAppDialog();
  const navigation = useNavigation<any>();
  const { profile } = useHealthProfile();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pulseAnim = useState(new Animated.Value(1))[0];

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const callNumber = (number: string) => {
    const url = `tel:${number}`;
    Linking.canOpenURL(url).then(can => {
      if (can) {
        Linking.openURL(url);
      } else {
        showDialog({ title: 'Cannot Call', message: `Please dial ${number} manually.`, icon: 'call', iconColor: colors.error });
      }
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Emergency SOS"
        onBack={() => navigation.goBack()}
        backgroundColor={colors.error}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* SOS Buttons */}
        <AppText
          variant="captionMedium"
          color="secondary"
          style={{
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 12,
          }}
        >
          Call Emergency Services
        </AppText>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            {
              number: '112',
              label: 'Ambulance (Global)',
              bg: colors.error,
              icon: 'medical',
            },
            {
              number: '100',
              label: 'Police (India)',
              bg: colors.info,
              icon: 'shield',
            },
            {
              number: '108',
              label: 'Ambulance (India)',
              bg: colors.warning,
              icon: 'alert-circle',
            },
            {
              number: '911',
              label: 'Emergency (US/CA)',
              bg: colors.success,
              icon: 'call',
            },
          ].map(sos => (
            <TouchableOpacity
              key={sos.number}
              onPress={() => callNumber(sos.number)}
              activeOpacity={0.8}
              style={{
                width: '47%',
                padding: 16,
                borderRadius: borderRadius.md,
                backgroundColor: sos.bg,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AppIcon
                name={sos.icon as any}
                size={28}
                color={colors.textOnPrimary}
              />
              <AppText
                variant="heading2"
                style={{ color: colors.textOnPrimary, fontSize: 28 }}
              >
                {sos.number}
              </AppText>
              <AppText
                variant="small"
                style={{
                  color: colors.textOnPrimary,
                  textAlign: 'center',
                  opacity: 0.85,
                }}
              >
                {sos.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Patient info card */}
        {profile.name ? (
          <View
            style={{
              borderRadius: borderRadius.md,
              padding: spacing.md,
              backgroundColor: colors.surfaceElevated,
              borderWidth: 1.5,
              borderColor: colors.error,
              marginBottom: spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <AppIcon name="person" size={20} color={colors.error} />
              <AppText variant="bodyMedium" color="primary" style={{ flex: 1 }}>
                My Medical ID
              </AppText>
              <AppText variant="small" color="tertiary">
                Show to first responders
              </AppText>
            </View>
            <AppText
              variant="body"
              color="secondary"
              style={{ marginBottom: 4 }}
            >
              <AppText variant="captionMedium" color="tertiary">
                Name:{' '}
              </AppText>
              {profile.name}
            </AppText>
            <AppText
              variant="body"
              color="secondary"
              style={{ marginBottom: 4 }}
            >
              <AppText variant="captionMedium" color="tertiary">
                Age:{' '}
              </AppText>
              {profile.age}
              <AppText variant="captionMedium" color="tertiary">
                Gender:{' '}
              </AppText>
              {profile.gender}
            </AppText>
            {profile.bloodGroup && (
              <AppText
                variant="body"
                color="secondary"
                style={{ marginBottom: 4 }}
              >
                <AppText variant="captionMedium" color="tertiary">
                  Blood Group:{' '}
                </AppText>
                {profile.bloodGroup}
              </AppText>
            )}
            {profile.conditions.length > 0 && (
              <AppText
                variant="body"
                color="secondary"
                style={{ marginBottom: 4 }}
              >
                <AppText variant="captionMedium" color="tertiary">
                  Conditions:{' '}
                </AppText>
                {profile.conditions.join(', ')}
              </AppText>
            )}
            {profile.allergies.length > 0 && (
              <AppText variant="body" color="error" style={{ marginBottom: 4 }}>
                <AppText variant="captionMedium" color="tertiary">
                  Allergies:{' '}
                </AppText>
                {profile.allergies.join(', ')}
              </AppText>
            )}
            {profile.currentMedications.length > 0 && (
              <AppText variant="body" color="secondary">
                <AppText variant="captionMedium" color="tertiary">
                  Medications:{' '}
                </AppText>
                {profile.currentMedications.join(', ')}
              </AppText>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              borderWidth: 1.5,
              borderColor: colors.error,
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
            onPress={() => navigation.navigate('HealthProfile')}
          >
            <AppIcon name="person-add" size={18} color={colors.error} />
            <AppText variant="bodyMedium" color="error">
              Set Up Medical ID
            </AppText>
          </TouchableOpacity>
        )}

        {/* Emergency Protocols */}
        <AppText
          variant="captionMedium"
          color="secondary"
          style={{
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 12,
          }}
        >
          Emergency Protocols
        </AppText>

        {EMERGENCY_PROTOCOLS.map(protocol => (
          <View
            key={protocol.id}
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.md,
              marginBottom: spacing.sm,
              borderLeftWidth: 4,
              borderLeftColor: protocol.color,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: spacing.md,
              }}
              onPress={() =>
                setExpandedId(prev =>
                  prev === protocol.id ? null : protocol.id,
                )
              }
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: borderRadius.full,
                  backgroundColor: protocol.color + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <AppIcon
                  name={protocol.icon}
                  size={22}
                  color={protocol.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium" color="primary">
                  {protocol.title}
                </AppText>
                <AppText
                  variant="small"
                  style={{
                    color: protocol.color,
                    marginTop: 2,
                    fontWeight: '600',
                  }}
                >
                  {protocol.severity === 'critical'
                    ? '⚠ CRITICAL — Call emergency'
                    : '⚠ URGENT — Act now'}
                </AppText>
              </View>
              <AppIcon
                name={
                  expandedId === protocol.id ? 'chevron-up' : 'chevron-down'
                }
                size={22}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {expandedId === protocol.id && (
              <View style={{ padding: spacing.md, paddingTop: 0 }}>
                <AppText
                  variant="captionMedium"
                  color="tertiary"
                  style={{ textTransform: 'uppercase', marginBottom: 6 }}
                >
                  Warning Signs:
                </AppText>
                {protocol.signs.map((sign, i) => (
                  <AppText
                    key={i}
                    variant="body"
                    color="secondary"
                    style={{ fontSize: 13, marginBottom: 3 }}
                  >
                    • {sign}
                  </AppText>
                ))}
                <AppText
                  variant="captionMedium"
                  color="tertiary"
                  style={{
                    textTransform: 'uppercase',
                    marginTop: 10,
                    marginBottom: 6,
                  }}
                >
                  Steps:
                </AppText>
                {protocol.steps.map((step, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      marginBottom: 8,
                      alignItems: 'flex-start',
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: protocol.color,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      <AppText
                        variant="smallMedium"
                        style={{ color: colors.textOnPrimary, fontSize: 12 }}
                      >
                        {i + 1}
                      </AppText>
                    </View>
                    <AppText
                      variant="body"
                      color="primary"
                      style={{ flex: 1, fontSize: 13, lineHeight: 20 }}
                    >
                      {step}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Find nearby hospitals */}
        <AppButton
          variant="primary"
          fullWidth
          size="lg"
          onPress={() => navigation.navigate('FindNearbyDoctor')}
          leftIcon={
            <AppIcon name="location" size={20} color={colors.textOnPrimary} />
          }
          style={{ marginTop: spacing.md, backgroundColor: colors.primary }}
        >
          Find Nearby Hospitals
        </AppButton>
      </ScrollView>
    </SafeAreaView>
  );
}

export default EmergencySOSScreen;
