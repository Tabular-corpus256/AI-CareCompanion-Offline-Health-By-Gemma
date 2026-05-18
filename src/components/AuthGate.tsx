import React, { useState } from 'react';
import { LoginScreen } from '@screens/LoginScreen';
import { SignupScreen } from '@screens/SignupScreen';
import { ForgotPasswordScreen } from '@screens/ForgotPasswordScreen';

type AuthScreen = 'login' | 'signup' | 'forgot';

interface Props {
  onAuthSuccess: () => void;
}

export function AuthGate({ onAuthSuccess }: Props) {
  const [screen, setScreen] = useState<AuthScreen>('login');

  switch (screen) {
    case 'signup':
      return (
        <SignupScreen
          onAuthSuccess={onAuthSuccess}
          onNavigateLogin={() => setScreen('login')}
        />
      );
    case 'forgot':
      return (
        <ForgotPasswordScreen
          onNavigateLogin={() => setScreen('login')}
        />
      );
    default:
      return (
        <LoginScreen
          onAuthSuccess={onAuthSuccess}
          onNavigateSignup={() => setScreen('signup')}
          onNavigateForgot={() => setScreen('forgot')}
        />
      );
  }
}

export default AuthGate;
