import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '@theme';
import { AppText } from '@components/ui';
import { AppIcon } from '@components/AppIcon';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { useAppDialog } from '@components/DialogProvider';
import { ReportService, getContextStats } from '@services/ReportService';
import type { ChatReport, ReportSection } from '@services/ReportService';
import { DatabaseService } from '@services/DatabaseService';
import { useHealthProfile } from '../context/HealthProfileContext';

type RouteParams = RouteProp<RootStackParamList, 'ChatReports'>;

type Tab = 'clinical' | 'patient';

function ReportCard({
  report,
  profileSummary,
  onDelete,
}: {
  report: ChatReport;
  profileSummary: string;
  onDelete: () => void;
}) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { showDialog, hideDialog } = useAppDialog();
  const [activeTab, setActiveTab] = useState<Tab>('patient');
  const [expanded, setExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);

  const date = new Date(report.createdAt).toLocaleDateString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const time = new Date(report.createdAt).toLocaleTimeString('en', {
    hour: 'numeric', minute: '2-digit',
  });

  const sections: ReportSection[] =
    activeTab === 'clinical' ? report.contentClinical : report.contentPatient;

  const handleShare = async () => {
    setSharing(true);
    try {
      await ReportService.shareReport(report, profileSummary);
    } catch (e: any) {
      showDialog({
        title: 'Share Failed',
        message: e?.message || 'Could not share report.',
        icon: 'alert-circle',
        iconColor: colors.error,
      });
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = () => {
    showDialog({
      title: 'Delete Report',
      message: 'This will permanently remove this report. It cannot be recovered.',
      icon: 'trash',
      iconColor: colors.error,
      buttons: [
        { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
        { text: 'Delete', onPress: () => { hideDialog(); onDelete(); }, variant: 'danger' },
      ],
    });
  };

  return (
    <View style={[s.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, ...shadows.sm }]}>
      {/* Card header row */}
      <TouchableOpacity
        style={s.cardHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.75}
      >
        <View style={[s.cardIconWrap, { backgroundColor: colors.primary + '15' }]}>
          <AppIcon name="document-text" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyMedium" color="primary" numberOfLines={1}>
            {report.title}
          </AppText>
          <AppText variant="small" color="tertiary" style={{ marginTop: 2 }}>
            {date} · {time} · {report.messageCount} messages
          </AppText>
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.primaryMuted }]}
            onPress={handleShare}
            disabled={sharing}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            {sharing
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <AppIcon name="share" size={16} color={colors.primary} />
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: (colors.errorMuted as string) ?? '#FFE5E5' }]}
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <AppIcon name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
          <AppIcon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textTertiary}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          {/* Tab row */}
          <View style={[s.tabRow, { backgroundColor: colors.background }]}>
            {(['patient', 'clinical'] as Tab[]).map(tab => {
              const active = activeTab === tab;
              const label = tab === 'patient' ? 'Patient Summary' : 'Clinical Report';
              const accentColor = tab === 'patient' ? '#2e7d32' : '#c0392b';
              const bgActive = tab === 'patient' ? '#e8f5e9' : '#fce4e4';
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    s.tab,
                    active && { backgroundColor: bgActive, borderBottomColor: accentColor },
                  ]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.75}
                >
                  <AppText
                    variant="captionMedium"
                    style={{ color: active ? accentColor : colors.textTertiary, fontWeight: active ? '700' : '500' }}
                  >
                    {tab === 'patient' ? '🟢' : '🔴'} {label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sections */}
          <View style={{ padding: spacing.md }}>
            {sections.length === 0 ? (
              <AppText variant="body" color="tertiary" style={{ textAlign: 'center', paddingVertical: 12 }}>
                No content for this section.
              </AppText>
            ) : (
              sections.map((section, i) => (
                <View key={i} style={[s.section, i < sections.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                  <AppText
                    variant="captionMedium"
                    style={{ color: activeTab === 'clinical' ? '#c0392b' : '#2e7d32', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}
                  >
                    {section.title}
                  </AppText>
                  <AppText variant="body" color="secondary" style={{ lineHeight: 22 }}>
                    {section.content}
                  </AppText>
                </View>
              ))
            )}

            {/* File badge */}
            {(() => {
              const fp = report.pdfPath;
              const isPdf = fp?.toLowerCase().endsWith('.pdf');
              const label = fp
                ? (isPdf ? 'PDF ready — tap Share to export' : 'HTML report ready — tap Share to open in browser')
                : 'Tap Share to generate file';
              return (
                <View style={[s.pdfBadge, { borderColor: colors.borderLight, backgroundColor: colors.background }]}>
                  <AppIcon name={fp ? 'document' : 'download'} size={14} color={colors.textTertiary} />
                  <AppText variant="small" color="tertiary">{label}</AppText>
                </View>
              );
            })()}
          </View>
        </View>
      )}
    </View>
  );
}

export function ChatReportsScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { conversationId, conversationTitle } = route.params;
  const { getProfileSummary } = useHealthProfile();
  const { showDialog, hideDialog } = useAppDialog();

  const [reports, setReports] = useState<ChatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const profileSummary = getProfileSummary() || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reps, msgs] = await Promise.all([
        ReportService.getReportsForConversation(conversationId),
        DatabaseService.query<any>(
          'SELECT * FROM agent_chat_history WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT 200',
          [conversationId],
        ),
      ]);
      setReports(reps);
      setMessages(msgs);
    } catch (e) {
      console.warn('[ChatReportsScreen] loadData failed:', e);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    if (messages.length === 0) {
      showDialog({
        title: 'No Messages',
        message: 'This conversation has no messages yet. Start chatting first to generate a report.',
        icon: 'chatbubble',
        iconColor: colors.warning,
      });
      return;
    }

    // Show context stats to user
    const { includedMessages, totalMessages } = getContextStats(
      messages.map((m: any) => ({
        id: m.id, role: m.role, content: m.content, timestamp: m.timestamp, agentDisplayName: m.agent_id,
        imageUri: m.image_uri,
      })),
    );
    const trimNote = includedMessages < totalMessages
      ? `\n\nNote: Only the most recent ${includedMessages} of ${totalMessages} messages will be included (context limit).`
      : '';

    showDialog({
      title: 'Generate Health Report',
      message: `This will create a clinical report (for your doctor) and a patient summary (in plain language) based on your ${totalMessages}-message conversation.${trimNote}\n\nThis may take 15–30 seconds.`,
      icon: 'document-text',
      iconColor: colors.primary,
      buttons: [
        { text: 'Cancel', onPress: hideDialog, variant: 'ghost' },
        {
          text: 'Generate',
          onPress: async () => {
            hideDialog();
            setGenerating(true);
            try {
              const agentMessages = messages.map((m: any) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                timestamp: Number(m.timestamp),
                agentId: m.agent_id,
                agentDisplayName: m.agent_id,
                imageUri: m.image_uri || undefined,
                imageMimeType: m.image_mime_type || undefined,
              }));

              const report = await ReportService.generateReport(
                conversationId,
                conversationTitle || 'Consultation',
                agentMessages,
                profileSummary,
              );
              setReports(prev => [report, ...prev]);
              showDialog({
                title: 'Report Generated',
                message: 'Your health report is ready. Expand it below to view or tap Share to export as PDF.',
                icon: 'checkmark-circle',
                iconColor: colors.success ?? '#4CAF50',
              });
            } catch (e: any) {
              showDialog({
                title: 'Generation Failed',
                message: e?.message || 'Could not generate report. Please try again.',
                icon: 'alert-circle',
                iconColor: colors.error,
              });
            } finally {
              setGenerating(false);
            }
          },
          variant: 'primary',
        },
      ],
    });
  }, [generating, messages, conversationId, conversationTitle, profileSummary, colors, showDialog, hideDialog]);

  const handleDelete = useCallback(async (id: string) => {
    await ReportService.deleteReport(id);
    setReports(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Chat Reports"
        subtitle={conversationTitle || undefined}
        onBack={() => navigation.goBack()}
        variant="light"
        rightAction={
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={generating}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {generating
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <AppIcon name="add-circle" size={26} color={colors.primary} />
            }
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {reports.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
                <AppIcon name="document-text" size={36} color={colors.primary} />
              </View>
              <AppText variant="heading3" color="primary" style={{ marginTop: 16, marginBottom: 8 }}>
                No reports yet
              </AppText>
              <AppText variant="body" color="tertiary" style={{ textAlign: 'center', lineHeight: 22 }}>
                Generate a clinical or patient report from this conversation with one tap.
              </AppText>
              <TouchableOpacity
                style={[s.generateBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
                onPress={handleGenerate}
                disabled={generating}
                activeOpacity={0.8}
              >
                {generating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <AppIcon name="document-text" size={20} color="#fff" />
                }
                <AppText variant="bodyMedium" style={{ color: '#fff', marginLeft: 8 }}>
                  {generating ? 'Generating…' : 'Generate Report'}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Context stats banner */}
              <View style={[s.statsBanner, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + '30' }]}>
                <AppIcon name="information-circle" size={16} color={colors.primary} />
                <AppText variant="small" color="secondary" style={{ flex: 1, marginLeft: 8 }}>
                  {messages.length} messages in this conversation · {reports.length} report{reports.length !== 1 ? 's' : ''} generated
                </AppText>
                <TouchableOpacity onPress={handleGenerate} disabled={generating}>
                  {generating
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <AppText variant="captionMedium" style={{ color: colors.primary }}>+ New</AppText>
                  }
                </TouchableOpacity>
              </View>

              {reports.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  profileSummary={profileSummary}
                  onDelete={() => handleDelete(report.id)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  section: {
    paddingVertical: 14,
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
});

export default ChatReportsScreen;
