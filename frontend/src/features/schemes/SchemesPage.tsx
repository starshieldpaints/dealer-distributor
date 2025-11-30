import { useMemo, useState } from 'react';
import styles from './SchemesPage.module.css';
import { useSchemes, submitSchemeClaimRequest, evaluateSchemeEligibilityRequest } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ClaimFormValues {
  schemeId: string;
  distributorId?: string;
  claimedAmount: number;
  notes?: string;
}

interface EligibilityFormValues {
  schemeId: string;
  quantity?: number;
  amount?: number;
}

export const SchemesPage = () => {
  const user = useAuthStore((state) => state.user);
  const schemesQuery = useSchemes({ status: 'active' });
  const queryClient = useQueryClient();
  const [eligibilityResult, setEligibilityResult] = useState<string | null>(null);

  const claimForm = useForm<ClaimFormValues>({
    defaultValues: {
      schemeId: '',
      claimedAmount: 0
    }
  });

  const eligibilityForm = useForm<EligibilityFormValues>({
    defaultValues: {
      schemeId: ''
    }
  });

  const claimMutation = useMutation({
    mutationFn: submitSchemeClaimRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schemes'] });
      claimForm.reset({ schemeId: '', claimedAmount: 0, notes: '' });
    }
  });

  const eligibilityMutation = useMutation({
    mutationFn: async (values: EligibilityFormValues) => {
      return await evaluateSchemeEligibilityRequest(values.schemeId, {
        quantity: values.quantity ? Number(values.quantity) : undefined,
        amount: values.amount ? Number(values.amount) : undefined
      });
    },
    onSuccess: (result) => {
      setEligibilityResult(result.message);
    }
  });

  const onSubmitClaim = claimForm.handleSubmit(async (values) => {
    await claimMutation.mutateAsync({
      schemeId: values.schemeId,
      distributorId: user?.role === 'admin' ? values.distributorId : undefined,
      claimedAmount: Number(values.claimedAmount),
      notes: values.notes
    });
  });

  const onCheckEligibility = eligibilityForm.handleSubmit(async (values) => {
    const data = await eligibilityMutation.mutateAsync(values);
    setEligibilityResult(`${data.message} (${data.eligible ? 'Eligible' : 'Not eligible'})`);
  });

  const schemeOptions = useMemo(() => schemesQuery.data ?? [], [schemesQuery.data]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Scheme & Promotion Studio</p>
          <h3>Trade offers and claims workflow</h3>
        </div>
        <button className="btn" disabled>
          New scheme
        </button>
      </div>

      {schemesQuery.isLoading && <p className={styles.message}>Loading schemes…</p>}
      {schemesQuery.error instanceof Error && (
        <p className={styles.error}>{schemesQuery.error.message}</p>
      )}

      <div className={styles.list}>
        {schemeOptions.map((scheme: any) => (
          <div key={scheme.id} className={styles.item}>
            <div>
              <h4>{scheme.name}</h4>
              <p>
                {scheme.startDate} → {scheme.endDate}
              </p>
              <p>{scheme.geoScope ?? '—'}</p>
            </div>
            <div className={styles.meta}>
              <span>{scheme.type}</span>
              <strong>{scheme.budget ? `$${scheme.budget}` : '—'}</strong>
              <div className={styles.progress}>
                <div style={{ width: `${scheme.progress ?? 50}%` }} />
              </div>
              <small>{scheme.progress ?? 50}% utilized</small>
            </div>
          </div>
        ))}
        {!schemesQuery.isLoading && schemeOptions.length === 0 && (
          <p className={styles.message}>No active schemes.</p>
        )}
      </div>

      <div className={styles.forms}>
        <form className={styles.form} onSubmit={onSubmitClaim}>
          <h4>Submit Scheme Claim</h4>
          <label>
            Scheme
            <select {...claimForm.register('schemeId', { required: true })}>
              <option value="">Select scheme</option>
              {schemeOptions.map((scheme: any) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name}
                </option>
              ))}
            </select>
          </label>
          {user?.role === 'admin' && (
            <label>
              Distributor ID
              <input {...claimForm.register('distributorId', { required: true })} placeholder="UUID" />
            </label>
          )}
          <label>
            Claimed Amount
            <input
              type="number"
              step="0.01"
              {...claimForm.register('claimedAmount', { required: true, min: 0 })}
              placeholder="1000"
            />
          </label>
          <label>
            Notes
            <textarea rows={3} {...claimForm.register('notes')} placeholder="Optional notes" />
          </label>
          {claimMutation.error instanceof Error && (
            <p className={styles.error}>{claimMutation.error.message}</p>
          )}
          <button className="btn" type="submit" disabled={claimMutation.isPending}>
            {claimMutation.isPending ? 'Submitting…' : 'Submit Claim'}
          </button>
        </form>

        <form className={styles.form} onSubmit={onCheckEligibility}>
          <h4>Check Eligibility</h4>
          <label>
            Scheme
            <select {...eligibilityForm.register('schemeId', { required: true })}>
              <option value="">Select scheme</option>
              {schemeOptions.map((scheme: any) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input type="number" step="1" {...eligibilityForm.register('quantity')} placeholder="Optional" />
          </label>
          <label>
            Amount
            <input type="number" step="0.01" {...eligibilityForm.register('amount')} placeholder="Optional" />
          </label>
          {eligibilityMutation.error instanceof Error && (
            <p className={styles.error}>{eligibilityMutation.error.message}</p>
          )}
          {eligibilityResult && <p className={styles.message}>{eligibilityResult}</p>}
          <button className="btn secondary" type="submit" disabled={eligibilityMutation.isPending}>
            {eligibilityMutation.isPending ? 'Checking…' : 'Check Eligibility'}
          </button>
        </form>
      </div>
    </div>
  );
};
