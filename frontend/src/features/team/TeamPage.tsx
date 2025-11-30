import { useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { OnboardingWizard } from '../auth/OnboardingWizard';
import { createManagedAccount } from '../../api/users';
import type { RegisterPayload } from '../../api/auth';
import { useState } from 'react';
import styles from './TeamPage.module.css';

export const TeamPage = () => {
  const user = useAuthStore((state) => state.user);
  const allowedRoles = useMemo(() => {
    if (user?.role === 'dealer') return ['field_rep'] as Array<'dealer' | 'field_rep'>;
    if (user?.role === 'distributor') return ['dealer', 'field_rep'] as Array<'dealer' | 'field_rep'>;
    return ['distributor', 'dealer', 'field_rep'] as Array<'distributor' | 'dealer' | 'field_rep'>;
  }, [user]);

  const presetDistributor = user?.distributorId ?? null;
  const presetParent = user && user.role !== 'admin' ? user.id : null;

  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (payload: RegisterPayload) => {
    await createManagedAccount({
      ...payload,
      distributorId: payload.distributorId ?? presetDistributor ?? undefined,
      parentUserId: presetParent ?? undefined
    });
    setMessage('Submitted for approval. The superadmin will review shortly.');
  };

  if (user?.role === 'field_rep') {
    return (
      <div className={styles.wrapper}>
        <p>You do not have permission to onboard team members.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>Team onboarding</h2>
        <p>Collect verified KYC details for every dealer or field rep you onboard.</p>
      </div>
      {message && <p className={styles.success}>{message}</p>}
      <OnboardingWizard
        allowedRoles={allowedRoles}
        presetDistributorId={presetDistributor}
        presetParentUserId={presetParent}
        hideLoginLink
        onSubmit={handleSubmit}
      />
    </div>
  );
};
