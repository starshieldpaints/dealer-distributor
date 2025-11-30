import { useState } from 'react';
import styles from './CreditPage.module.css';
import { useAuthStore } from '../../store/authStore';
import {
  useCreditLedger,
  useCreditSummary,
  useCreditHolds,
  useCreditAging,
  updateCreditLimitRequest,
  createCreditHoldRequest,
  recordPaymentRequest
} from '../../api/hooks';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface HoldFormValues {
  distributorId?: string;
  orderId: string;
  reason: string;
}

interface PaymentFormValues {
  distributorId?: string;
  amount: number;
  receiptReference: string;
  paymentDate: string;
  notes?: string;
}

export const CreditPage = () => {
  const user = useAuthStore((state) => state.user);
  const [adminDistributorId, setAdminDistributorId] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [limitStatus, setLimitStatus] = useState<string | null>(null);
  const distributorId = user?.role === 'admin' ? adminDistributorId : user?.distributorId ?? '';

  const summaryQuery = useCreditSummary(distributorId, {
    enabled: user?.role === 'admin' ? Boolean(adminDistributorId) : Boolean(distributorId)
  });
  const ledgerQuery = useCreditLedger(distributorId, {
    enabled: user?.role === 'admin' ? Boolean(adminDistributorId) : Boolean(distributorId)
  });
  const holdsQuery = useCreditHolds(distributorId, {
    enabled: user?.role === 'admin' ? Boolean(adminDistributorId) : Boolean(distributorId)
  });
  const agingQuery = useCreditAging(distributorId, {
    enabled: user?.role === 'admin' ? Boolean(adminDistributorId) : Boolean(distributorId)
  });

  const queryClient = useQueryClient();
  const holdForm = useForm<HoldFormValues>();
  const paymentForm = useForm<PaymentFormValues>({
    defaultValues: {
      paymentDate: new Date().toISOString().slice(0, 10)
    }
  });

  const holdMutation = useMutation({
    mutationFn: createCreditHoldRequest,
    onSuccess: () => {
      holdForm.reset({ orderId: '', reason: '' });
      void queryClient.invalidateQueries({ queryKey: ['credit-holds'] });
      void queryClient.invalidateQueries({ queryKey: ['credit-ledger'] });
    }
  });

  const paymentMutation = useMutation({
    mutationFn: recordPaymentRequest,
    onSuccess: () => {
      paymentForm.reset({
        amount: 0,
        receiptReference: '',
        paymentDate: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      void queryClient.invalidateQueries({ queryKey: ['credit-ledger'] });
      void queryClient.invalidateQueries({ queryKey: ['credit-summary'] });
    }
  });

  const submitHold = holdForm.handleSubmit(async (values) => {
    await holdMutation.mutateAsync({
      distributorId: user?.role === 'admin' ? values.distributorId : undefined,
      orderId: values.orderId,
      reason: values.reason
    });
  });

  const submitPayment = paymentForm.handleSubmit(async (values) => {
    await paymentMutation.mutateAsync({
      distributorId: user?.role === 'admin' ? values.distributorId : undefined,
      amount: Number(values.amount),
      receiptReference: values.receiptReference,
      paymentDate: values.paymentDate,
      notes: values.notes
    });
  });

  const submitLimit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!distributorId || !limitInput) return;
    setLimitStatus('Saving...');
    try {
      await updateCreditLimitRequest(distributorId, Number(limitInput));
      setLimitStatus('Limit updated');
      void summaryQuery.refetch();
    } catch (error) {
      setLimitStatus(error instanceof Error ? error.message : 'Update failed');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Credit & Collections</p>
          <h3>Live exposure and promises-to-pay</h3>
        </div>
        {user?.role === 'admin' && (
          <label className={styles.filter}>
            Distributor ID
            <input
              value={adminDistributorId}
              onChange={(event) => setAdminDistributorId(event.target.value)}
              placeholder="UUID"
            />
          </label>
        )}
      </div>

      <div className={styles.summary}>
        {summaryQuery.data && (
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <p>Credit Limit</p>
              <strong>${summaryQuery.data.creditLimit ?? 0}</strong>
            </div>
            <div className={styles.summaryCard}>
              <p>Outstanding</p>
              <strong>${summaryQuery.data.outstanding ?? 0}</strong>
            </div>
            <div className={styles.summaryCard}>
              <p>Utilization</p>
              <strong
                className={
                  summaryQuery.data.utilization >= 0.9
                    ? styles.danger
                    : summaryQuery.data.utilization >= 0.75
                      ? styles.warning
                      : styles.success
                }
              >
                {(summaryQuery.data.utilization * 100).toFixed(1)}%
              </strong>
            </div>
            <div className={styles.summaryCard}>
              <p>Holds</p>
              <strong>{summaryQuery.data.holds}</strong>
            </div>
          </div>
        )}
        {user?.role === 'admin' && (
          <form className={styles.limitForm} onSubmit={submitLimit}>
            <label>
              Edit credit limit
              <input
                type="number"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                placeholder="New limit"
              />
            </label>
            <button className="btn secondary" type="submit">Update limit</button>
            {limitStatus && <p className={styles.message}>{limitStatus}</p>}
          </form>
        )}
      </div>

      <div className={styles.forms}>
        <form className={styles.form} onSubmit={submitHold}>
          <h4>Place Credit Hold</h4>
          {user?.role === 'admin' && (
            <label>
              Distributor ID
              <input {...holdForm.register('distributorId', { required: true })} placeholder="UUID" />
            </label>
          )}
          <label>
            Order ID
            <input {...holdForm.register('orderId', { required: true })} placeholder="Order UUID" />
          </label>
          <label>
            Reason
            <textarea rows={3} {...holdForm.register('reason', { required: true })} placeholder="Reason" />
          </label>
          {holdMutation.error instanceof Error && (
            <p className={styles.error}>{holdMutation.error.message}</p>
          )}
          <button className="btn secondary" type="submit" disabled={holdMutation.isPending}>
            {holdMutation.isPending ? 'Saving…' : 'Place Hold'}
          </button>
        </form>

        <form className={styles.form} onSubmit={submitPayment}>
          <h4>Log Payment</h4>
          {user?.role === 'admin' && (
            <label>
              Distributor ID
              <input {...paymentForm.register('distributorId', { required: true })} placeholder="UUID" />
            </label>
          )}
          <label>
            Amount
            <input
              type="number"
              step="0.01"
              {...paymentForm.register('amount', { required: true, min: 0 })}
              placeholder="1500"
            />
          </label>
          <label>
            Receipt Reference
            <input {...paymentForm.register('receiptReference', { required: true })} placeholder="Receipt #" />
          </label>
          <label>
            Payment Date
            <input type="date" {...paymentForm.register('paymentDate', { required: true })} />
          </label>
          <label>
            Notes
            <textarea rows={3} {...paymentForm.register('notes')} placeholder="Optional notes" />
          </label>
          {paymentMutation.error instanceof Error && (
            <p className={styles.error}>{paymentMutation.error.message}</p>
          )}
          <button className="btn" type="submit" disabled={paymentMutation.isPending}>
            {paymentMutation.isPending ? 'Recording…' : 'Record Payment'}
          </button>
        </form>
      </div>

      {ledgerQuery.isLoading && <p className={styles.message}>Loading ledger…</p>}
      {ledgerQuery.error instanceof Error && (
        <p className={styles.error}>{ledgerQuery.error.message}</p>
      )}
      {!ledgerQuery.isLoading && !ledgerQuery.data?.length && (
        <p className={styles.message}>No ledger entries yet.</p>
      )}

      {ledgerQuery.data && ledgerQuery.data.length > 0 && (
        <div className={styles.table}>
          <div className={styles.head}>
            <span>Date</span>
            <span>Type</span>
            <span>Reference</span>
            <span>Debit</span>
            <span>Credit</span>
            <span>Balance</span>
          </div>
          {ledgerQuery.data.map((entry: any) => (
            <div key={entry.id} className={styles.row}>
              <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
              <span>{entry.txnType}</span>
              <span>{entry.referenceId ?? '—'}</span>
              <span>{entry.debit ? `$${entry.debit}` : '—'}</span>
              <span>{entry.credit ? `$${entry.credit}` : '—'}</span>
              <span>${entry.balanceAfter}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.split}>
        <div className={styles.panel}>
          <h4>Holds history</h4>
          {holdsQuery.isLoading && <p className={styles.message}>Loading holds…</p>}
          {holdsQuery.error instanceof Error && <p className={styles.error}>{holdsQuery.error.message}</p>}
          {holdsQuery.data && holdsQuery.data.length > 0 && (
            <div className={styles.table}>
              <div className={styles.head}>
                <span>Order</span>
                <span>Reason</span>
                <span>Created</span>
              </div>
              {holdsQuery.data.map((h: any) => (
                <div key={h.id} className={styles.row}>
                  <span>{h.orderId}</span>
                  <span>{h.reason}</span>
                  <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.panel}>
          <h4>Aging buckets</h4>
          {agingQuery.isLoading && <p className={styles.message}>Loading aging…</p>}
          {agingQuery.error instanceof Error && <p className={styles.error}>{agingQuery.error.message}</p>}
          {agingQuery.data && (
            <div className={styles.agingGrid}>
              <div><span>Current</span><strong>${agingQuery.data.current}</strong></div>
              <div><span>1-30</span><strong>${agingQuery.data.bucket30}</strong></div>
              <div><span>31-60</span><strong>${agingQuery.data.bucket60}</strong></div>
              <div><span>61-90</span><strong>${agingQuery.data.bucket90}</strong></div>
              <div><span>90+</span><strong>${agingQuery.data.bucket90plus}</strong></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
