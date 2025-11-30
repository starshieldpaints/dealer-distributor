import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approveUser, fetchPendingUsers, rejectUser } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import styles from './ApprovalsPage.module.css';

export const ApprovalsPage = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role !== 'admin') {
    return <p>You do not have access to this page.</p>;
  }
  const queryClient = useQueryClient();
  const approvalsQuery = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: fetchPendingUsers
  });
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const approveMutation = useMutation({
    mutationFn: ({ userId, notes }: { userId: string; notes?: string }) => approveUser(userId, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pendingUsers'] })
  });
  const rejectMutation = useMutation({
    mutationFn: ({ userId, notes }: { userId: string; notes?: string }) => rejectUser(userId, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pendingUsers'] })
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>Pending approvals</h2>
        <p>Review KYC submissions before granting access.</p>
      </div>
      {approvalsQuery.isLoading && <p>Loading…</p>}
      {approvalsQuery.error instanceof Error && <p className={styles.error}>{approvalsQuery.error.message}</p>}
      <div className={styles.list}>
        {approvalsQuery.data?.map((user) => (
          <div key={user.id} className={styles.card}>
            <div>
              <h4>{user.name}</h4>
              <p>{user.email}</p>
              <p>Role: {user.role}</p>
              <p>PINs: {user.pinCodes.join(', ') || 'None'}</p>
              <p>Requested: {new Date(user.createdAt).toLocaleString()}</p>
            </div>
            <div className={styles.actions}>
              <textarea
                placeholder="Approval notes"
                value={noteMap[user.id] ?? ''}
                onChange={(event) =>
                  setNoteMap((prev) => ({ ...prev, [user.id]: event.target.value }))
                }
              />
              <div className={styles.buttons}>
                <button
                  className="btn"
                  onClick={() =>
                    approveMutation.mutate({
                      userId: user.id,
                      notes: noteMap[user.id]
                    })
                  }
                  disabled={approveMutation.isPending}
                >
                  Approve
                </button>
                <button
                  className="btn secondary"
                  onClick={() =>
                    rejectMutation.mutate({
                      userId: user.id,
                      notes: noteMap[user.id]
                    })
                  }
                  disabled={rejectMutation.isPending}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
        {!approvalsQuery.isLoading && approvalsQuery.data?.length === 0 && (
          <p>No pending users.</p>
        )}
      </div>
    </div>
  );
};
