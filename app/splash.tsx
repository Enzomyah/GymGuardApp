import { AuthSplashScreen } from '@/components/AuthSplashScreen';
import { useRouter } from 'expo-router';

export default function SplashPage() {
  const router = useRouter();

  const handleFinish = () => {
    // Redirect to main app after animation/auth
    router.replace('/(tabs)');
  };

  return <AuthSplashScreen onFinish={handleFinish} />;
}
