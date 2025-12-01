// import { useMemo } from 'react';
// import { useAuthStore } from '../../store/authStore';
// import { OnboardingWizard } from '../auth/OnboardingWizard';
// import { createManagedAccount } from '../../api/users';
// import type { RegisterPayload } from '../../api/auth';
// import { useState } from 'react';
// import styles from './TeamPage.module.css';

// export const TeamPage = () => {
//   const user = useAuthStore((state) => state.user);
//   const allowedRoles = useMemo(() => {
//     if (user?.role === 'dealer') return ['field_rep'] as Array<'dealer' | 'field_rep'>;
//     if (user?.role === 'distributor') return ['dealer', 'field_rep'] as Array<'dealer' | 'field_rep'>;
//     return ['distributor', 'dealer', 'field_rep'] as Array<'distributor' | 'dealer' | 'field_rep'>;
//   }, [user]);

//   const presetDistributor = user?.distributorId ?? null;
//   const presetParent = user && user.role !== 'admin' ? user.id : null;

//   const [message, setMessage] = useState<string | null>(null);

//   const handleSubmit = async (payload: RegisterPayload) => {
//     await createManagedAccount({
//       ...payload,
//       distributorId: payload.distributorId ?? presetDistributor ?? undefined,
//       parentUserId: presetParent ?? undefined
//     });
//     setMessage('Submitted for approval. The superadmin will review shortly.');
//   };

//   if (user?.role === 'field_rep') {
//     return (
//       <div className={styles.wrapper}>
//         <p>You do not have permission to onboard team members.</p>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.wrapper}>
//       <div className={styles.header}>
//         <h2>Team onboarding</h2>
//         <p>Collect verified KYC details for every dealer or field rep you onboard.</p>
//       </div>
//       {message && <p className={styles.success}>{message}</p>}
//       <OnboardingWizard
//         allowedRoles={allowedRoles}
//         presetDistributorId={presetDistributor}
//         presetParentUserId={presetParent}
//         hideLoginLink
//         onSubmit={handleSubmit}
//       />
//     </div>
//   );
// };

import { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { OnboardingWizard } from '../auth/OnboardingWizard';
import { createManagedAccount } from '../../api/users';
import type { RegisterPayload } from '../../api/auth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import styles from './TeamPage.module.css';
import { StatusBadge } from '../../components/common/StatusBadge';

// Fetch users scoped to the current distributor
const useTeamMembers = (distributorId?: string) => {
  return useQuery({
    queryKey: ['team', distributorId],
    queryFn: async () => {
      // We use the search endpoint which is now scoped in the backend
      const { data } = await apiClient.get('/users/search', {
        params: { limit: 50, distributorId }
      });
      return data.data;
    },
    enabled: !!distributorId
  });
};

export const TeamPage = () => {
  const user = useAuthStore((state) => state.user);
  const [view, setView] = useState<'list' | 'create'>('list');
  
  const presetDistributor = user?.distributorId ?? undefined;
  const presetParent = user && user.role !== 'admin' ? user.id : undefined;

  const teamQuery = useTeamMembers(presetDistributor || (user?.role === 'admin' ? undefined : '')); // If admin, might want to select dist first, but let's keep simple

  const allowedRoles = useMemo(() => {
    if (user?.role === 'dealer') return ['field_rep'] as Array<'dealer' | 'field_rep'>;
    if (user?.role === 'distributor') return ['dealer', 'field_rep'] as Array<'dealer' | 'field_rep'>;
    return ['distributor', 'dealer', 'field_rep'] as Array<'distributor' | 'dealer' | 'field_rep'>;
  }, [user]);

  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (payload: RegisterPayload) => {
    await createManagedAccount({
      ...payload,
      distributorId: payload.distributorId ?? presetDistributor,
      parentUserId: presetParent
    });
    setMessage('Submitted for approval. The superadmin will review shortly.');
    setTimeout(() => {
      setMessage(null);
      setView('list');
      teamQuery.refetch();
    }, 3000);
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
        <div>
          <h2>Team Management</h2>
          <p>Manage your Dealers and Field Representatives.</p>
        </div>
        {view === 'list' ? (
          <button className="btn" onClick={() => setView('create')}>
            + Onboard New Member
          </button>
        ) : (
          <button className="btn secondary" onClick={() => setView('list')}>
            Back to List
          </button>
        )}
      </div>

      {message && <div className={styles.successMessage}>{message}</div>}

      {view === 'list' && (
        <div className={styles.card}>
          {teamQuery.isLoading && <p>Loading team...</p>}
          {teamQuery.data && teamQuery.data.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamQuery.data.map((member: any) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td><StatusBadge label={member.role} tone="info" /></td>
                    <td>
                      <button className={styles.actionBtn}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !teamQuery.isLoading && <p className={styles.empty}>No team members found. Start onboarding!</p>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className={styles.wizardContainer}>
          <OnboardingWizard
            allowedRoles={allowedRoles}
            presetDistributorId={presetDistributor}
            presetParentUserId={presetParent}
            hideLoginLink
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </div>
  );
};