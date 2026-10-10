import type { Metadata } from 'next';
import { LoginScreen } from './LoginScreen';

export const metadata: Metadata = {
  title: 'Log in — Pulse',
  description: 'Log in or create a demo account to open your personalised Pulse feed.',
};

// Server component: owns the metadata. The interactive client boundary lives in LoginScreen.
export default function LoginPage() {
  return <LoginScreen />;
}
