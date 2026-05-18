import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme';
import { ModelManager, LOCAL_MODEL_ID } from '@services/ModelManager';
import type { ModelInfo } from '@services/ModelManager';
import { LocalLlmService } from '@services/LocalLlmService';
import { AppText } from '@components/ui/AppText';
import { AppIcon } from '@components/AppIcon';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { useAppDialog } from '@components/DialogProvider';

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function ModelManagerScreen() {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { showDialog, hideDialog } = useAppDialog();
  const navigation = useNavigation<any>();

  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(
    ModelManager.getOfflineModelInfo(),
  );
  const [downloadedSize, setDownloadedSize] = useState(0);
  const [isLoaded, setIsLoaded] = useState(ModelManager.isLocalModelLoaded());
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState('');

  // On mount, ensure ModelManager has checked the actual file on disk.
  // This catches cases where the app was just installed over existing data
  // or where init ran before the DB was ready.
  useEffect(() => {
    ModelManager.init().then(() => {
      setModelInfo(ModelManager.getOfflineModelInfo());
      setIsLoaded(ModelManager.isLocalModelLoaded());
    });
  }, []);

  useEffect(() => {
    const unsub = ModelManager.onModelsChanged(models => {
      const m = models.find(x => x.id === LOCAL_MODEL_ID);
      setModelInfo(m || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    ModelManager.getDownloadedSize(LOCAL_MODEL_ID).then(setDownloadedSize);
  }, [modelInfo?.status]);

  const refreshLoaded = useCallback(() => {
    setIsLoaded(ModelManager.isLocalModelLoaded());
  }, []);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    setLoadingAction('Connecting…');
    const ok = await ModelManager.downloadModel(LOCAL_MODEL_ID, pct => {
      setLoadingAction(`Downloading ${pct}%`);
    });
    setLoading(false);
    setLoadingAction('');
    if (!ok) {
      showDialog({
        title: 'Download Failed',
        message: 'Could not download the model. Make sure you have a stable internet connection and enough free storage (~1.5 GB).',
        icon: 'cloud-offline',
        iconColor: colors.error,
      });
    }
  };

  const handleDelete = () => {
    showDialog({
      title: 'Delete Model',
      message: 'This will remove Gemma 4 4B from your device and free ~1.5 GB of storage.',
      icon: 'trash',
      iconColor: colors.error,
      buttons: [
        { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
        {
          text: 'Delete',
          variant: 'danger',
          onPress: async () => {
            hideDialog();
            setLoading(true);
            setLoadingAction('Deleting…');
            await ModelManager.deleteModel(LOCAL_MODEL_ID);
            setDownloadedSize(0);
            setIsLoaded(false);
            setLoading(false);
            setLoadingAction('');
          },
        },
      ],
    });
  };

  const handleLoad = async () => {
    if (loading) return;
    setLoading(true);
    setLoadingAction('Initialising… (may take 10–30 s)');
    try {
      const ok = await LocalLlmService.ensureLoaded();
      if (!ok) {
        showDialog({
          title: 'Load Failed',
          message: 'Could not load the model. Close other apps to free RAM (~2 GB required).',
          icon: 'alert-circle',
          iconColor: colors.error,
        });
      }
    } catch (e: any) {
      showDialog({ title: 'Load Error', message: e?.message || 'Unexpected error during model load.', icon: 'alert-circle', iconColor: colors.error });
    } finally {
      setLoading(false);
      setLoadingAction('');
      refreshLoaded();
    }
  };

  const handleUnload = async () => {
    if (loading) return;
    setLoading(true);
    setLoadingAction('Unloading…');
    await LocalLlmService.unload();
    setLoading(false);
    setLoadingAction('');
    refreshLoaded();
  };

  const status = modelInfo?.status || 'not_downloaded';
  const progress = modelInfo?.progress || 0;
  const llamaAvailable = LocalLlmService.isAvailable();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="On-Device AI"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60, gap: 16 }}>

        {/* llama.rn availability warning */}
        {!llamaAvailable && (
          <View style={[s.warnBanner, { backgroundColor: '#FFF3CD', borderColor: '#FFEAA7' }]}>
            <AppIcon name="warning" size={18} color="#B7791F" />
            <AppText style={{ color: '#744210', fontSize: 13, flex: 1, lineHeight: 19 }}>
              <AppText style={{ fontWeight: '700' }}>llama.rn not installed.</AppText>
              {' Run: '}
              <AppText style={{ fontFamily: 'monospace', fontSize: 12 }}>npm install llama.rn</AppText>
              {' then rebuild the app.'}
            </AppText>
          </View>
        )}

        {/* Model card */}
        <View style={[s.card, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderColor: colors.borderLight, ...shadows.sm }]}>
          {/* Icon + title */}
          <View style={[s.heroRow, { backgroundColor: colors.primaryMuted, borderRadius: borderRadius.lg }]}>
            <View style={[s.modelIcon, { backgroundColor: colors.surface, borderRadius: borderRadius.lg }]}>
              <AppIcon name="hardware-chip" size={32} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.2 }}>
                Gemma 4 4B
              </AppText>
              <AppText style={{ fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 }}>
                On-Device · Fully Offline
              </AppText>
              <View style={[s.statusPill, {
                backgroundColor: status === 'ready'
                  ? (colors.successMuted ?? 'rgba(76,175,80,0.12)')
                  : status === 'downloading'
                    ? colors.primaryMuted
                    : colors.surfaceVariant,
                borderRadius: borderRadius.full,
                marginTop: 8,
              }]}>
                <View style={[s.statusDot, {
                  backgroundColor: status === 'ready'
                    ? (colors.success ?? '#4CAF50')
                    : status === 'downloading'
                      ? colors.primary
                      : colors.textTertiary,
                }]} />
                <AppText style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: status === 'ready'
                    ? (colors.success ?? '#4CAF50')
                    : status === 'downloading'
                      ? colors.primary
                      : colors.textTertiary,
                }}>
                  {status === 'ready' ? 'Downloaded' : status === 'downloading' ? `Downloading ${progress}%` : status === 'error' ? 'Error' : 'Not Downloaded'}
                </AppText>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View style={[s.statsRow, { borderColor: colors.borderLight }]}>
            <StatCell label="Model Size" value="~1.5 GB" icon="save-outline" colors={colors} />
            <View style={[s.statDivider, { backgroundColor: colors.borderLight }]} />
            <StatCell label="RAM Needed" value="~2.0 GB" icon="hardware-chip" colors={colors} />
            <View style={[s.statDivider, { backgroundColor: colors.borderLight }]} />
            <StatCell label="On Disk" value={downloadedSize > 0 ? fmtBytes(downloadedSize) : '—'} icon="folder" colors={colors} />
          </View>

          {/* Download progress bar */}
          {status === 'downloading' && (
            <View style={s.progressWrap}>
              <View style={[s.progressTrack, { backgroundColor: colors.primaryMuted }]}>
                <View style={[s.progressFill, { width: `${progress}%` as any, backgroundColor: colors.primary }]} />
              </View>
              <AppText style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
                {fmtBytes((1_500_000_000 * progress) / 100)} / 1.5 GB
              </AppText>
            </View>
          )}

          {/* Info rows */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            <InfoRow icon="sparkle" label="Quantization" value="IQ2_M Unsloth Dynamic · Smallest & fastest" colors={colors} />
            <InfoRow icon="wifi-outline" label="Works Offline" value="No internet required after download" colors={colors} />
            <InfoRow icon="shield-checkmark" label="Privacy" value="All inference runs locally on device" colors={colors} />
            <InfoRow icon="phone-portrait" label="Architecture" value="Gemma 4 E4B Instruct (Google / Unsloth)" colors={colors} />
          </View>
        </View>

        {/* RAM warning */}
        <View style={[s.warnBanner, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '40' }]}>
          <AppIcon name="information-circle" size={18} color={colors.primary} />
          <AppText style={{ color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 }}>
            Requires a device with at least <AppText style={{ fontWeight: '700', color: colors.textPrimary }}>3 GB RAM</AppText>. IQ2_M is the smallest quantization — fast inference, lower quality. First load takes 10–30 seconds.
          </AppText>
        </View>

        {/* Status label */}
        {loading && loadingAction ? (
          <AppText style={{ textAlign: 'center', color: colors.primary, fontWeight: '600', fontSize: 14 }}>
            {loadingAction}
          </AppText>
        ) : null}

        {/* Action buttons */}
        {status === 'not_downloaded' || status === 'error' ? (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: loading ? colors.primaryMuted : colors.primary, borderRadius: borderRadius.lg }]}
            onPress={handleDownload}
            disabled={loading || !llamaAvailable}
            activeOpacity={0.8}
          >
            <AppIcon name="cloud-download" size={20} color="#fff" />
            <AppText style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {status === 'error' ? 'Retry Download' : 'Download Model (~2.7 GB)'}
            </AppText>
          </TouchableOpacity>
        ) : null}

        {status === 'downloading' ? (
          <View style={[s.primaryBtn, { backgroundColor: colors.primaryMuted, borderRadius: borderRadius.lg }]}>
            <AppIcon name="cloud-download" size={20} color={colors.primary} />
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
              Downloading… {progress}%
            </AppText>
          </View>
        ) : null}

        {status === 'ready' ? (
          <View style={{ gap: 10 }}>
            {isLoaded ? (
              <TouchableOpacity
                style={[s.outlineBtn, { borderColor: colors.primary, borderRadius: borderRadius.lg }]}
                onPress={handleUnload}
                disabled={loading}
                activeOpacity={0.8}
              >
                <AppIcon name="stop-circle" size={20} color={colors.primary} />
                <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
                  Unload from RAM
                </AppText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: loading ? colors.primaryMuted : colors.primary, borderRadius: borderRadius.lg }]}
                onPress={handleLoad}
                disabled={loading || !llamaAvailable}
                activeOpacity={0.8}
              >
                <AppIcon name="flash" size={20} color="#fff" />
                <AppText style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  Load into RAM
                </AppText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[s.outlineBtn, { borderColor: colors.error, borderRadius: borderRadius.lg }]}
              onPress={handleDelete}
              disabled={loading}
              activeOpacity={0.8}
            >
              <AppIcon name="trash" size={18} color={colors.error} />
              <AppText style={{ color: colors.error, fontSize: 15, fontWeight: '600' }}>
                Delete from Device
              </AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Loaded badge */}
        {isLoaded && (
          <View style={[s.loadedBadge, { backgroundColor: (colors.successMuted ?? 'rgba(76,175,80,0.12)'), borderRadius: borderRadius.lg }]}>
            <AppIcon name="checkmark-circle" size={20} color={colors.success ?? '#4CAF50'} />
            <AppText style={{ color: colors.success ?? '#4CAF50', fontWeight: '700', fontSize: 14 }}>
              Model is loaded and ready — select it in Chat
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ label, value, icon, colors }: { label: string; value: string; icon: string; colors: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 }}>
      <AppIcon name={icon} size={18} color={colors.primary} />
      <AppText style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>{value}</AppText>
      <AppText style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center' }}>{label}</AppText>
    </View>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <AppIcon name={icon} size={16} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 12, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</AppText>
        <AppText style={{ fontSize: 14, color: colors.textPrimary, marginTop: 1 }}>{value}</AppText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, margin: 16, marginBottom: 0 },
  modelIcon: { width: 58, height: 58, justifyContent: 'center', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, marginHorizontal: 16, marginTop: 14 },
  statDivider: { width: 1 },
  progressWrap: { paddingHorizontal: 16, paddingTop: 12 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderWidth: 1.5 },
  warnBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  loadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
});

export default ModelManagerScreen;
