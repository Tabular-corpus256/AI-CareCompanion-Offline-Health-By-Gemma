import React from 'react';
import { StatusBar, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider, useTheme } from '@theme';
import { HealthProfileProvider } from './src/context/HealthProfileContext';
import { DialogProvider } from './src/components/DialogProvider';
import { I18nProvider } from './src/i18n/I18nContext';
import { AppNavigator } from '@navigation/AppNavigator';
import { createPaperTheme } from '@theme/paperTheme';

// ── Error Boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err?.message || 'Unknown error' };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', err, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={eb.container}>
        <Text style={eb.title}>Something went wrong</Text>
        <Text style={eb.msg}>{this.state.message}</Text>
        <TouchableOpacity style={eb.btn} onPress={() => this.setState({ hasError: false, message: '' })}>
          <Text style={eb.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C1410', justifyContent: 'center', alignItems: 'center', padding: 32 },
  title:     { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 12 },
  msg:       { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 32 },
  btn:       { backgroundColor: '#0D7C66', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
});

// ── App ───────────────────────────────────────────────────────────────────────
function AppContent() {
  const paperTheme = createPaperTheme(useTheme() as any);

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={false}
      />
      <DialogProvider>
        <I18nProvider>
          <AppNavigator />
        </I18nProvider>
      </DialogProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <HealthProfileProvider>
            <AppContent />
          </HealthProfileProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
