import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { RegisterPayload } from '../../api/auth';
import { OnboardingWizard } from './OnboardingWizard';

export const RegisterPage = () => {
  const signup = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (payload: RegisterPayload) => {
    await signup(payload);
    navigate('/', { replace: true });
  };

  return <OnboardingWizard onSubmit={handleSubmit} />;
};
