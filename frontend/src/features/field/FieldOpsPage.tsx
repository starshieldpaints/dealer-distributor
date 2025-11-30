import styles from './FieldOpsPage.module.css';
import { useAuthStore } from '../../store/authStore';
import {
  createVisitRequest,
  completeVisitRequest,
  useVisits,
  useOrders,
  createSecondarySaleRequest
} from '../../api/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

interface VisitFormValues {
  retailerId?: string;
  notes?: string;
}

interface LeadFormValues {
  retailerId: string;
  productId: string;
  quantity: number;
  amount: number;
  saleDate: string;
}

export const FieldOpsPage = () => {
  const user = useAuthStore((state) => state.user);
  const isFieldRep = user?.role === 'field_rep';
  const scopedDistributorId = user?.distributorId ?? undefined;
  const queryClient = useQueryClient();
  const visitsQuery = useVisits({}, isFieldRep);
  const { register, handleSubmit, reset } = useForm<VisitFormValues>();
  const leadsForm = useForm<LeadFormValues>({
    defaultValues: {
      retailerId: '',
      productId: '',
      quantity: 1,
      amount: 0,
      saleDate: new Date().toISOString().slice(0, 10)
    }
  });
  const ordersQuery = useOrders({ distributorId: scopedDistributorId }, { enabled: isFieldRep });

  const createMutation = useMutation({
    mutationFn: createVisitRequest,
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ['visits'] });
    }
  });
  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => completeVisitRequest(id, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visits'] });
    }
  });
  const leadMutation = useMutation({
    mutationFn: createSecondarySaleRequest,
    onSuccess: () => {
      leadsForm.reset({
        retailerId: '',
        productId: '',
        quantity: 1,
        amount: 0,
        saleDate: new Date().toISOString().slice(0, 10)
      });
      void queryClient.invalidateQueries({ queryKey: ['secondary-sales'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const onCreate = async (values: VisitFormValues) => {
    await createMutation.mutateAsync(values);
  };

  const onLeadSubmit = async (values: LeadFormValues) => {
    await leadMutation.mutateAsync({
      distributorId: scopedDistributorId,
      retailerId: values.retailerId,
      productId: values.productId,
      quantity: Number(values.quantity),
      amount: Number(values.amount),
      saleDate: values.saleDate
    });
  };

  const handleComplete = async (id: string) => {
    await completeMutation.mutateAsync({ id });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Field Force Control</p>
          <h3>{isFieldRep ? 'Your visit log' : 'Beat compliance & geo performance'}</h3>
        </div>
        {!isFieldRep && (
          <div className={styles.actions}>
            <button className="btn secondary">Assign beat</button>
            <button className="btn">Ping reps</button>
          </div>
        )}
      </div>

      {isFieldRep && (
        <form className={styles.form} onSubmit={handleSubmit(onCreate)}>
          <label>
            Retailer ID
            <input {...register('retailerId')} placeholder="Optional retailer UUID" />
          </label>
          <label>
            Notes
            <input {...register('notes')} placeholder="Visit notes" />
          </label>
          <button className="btn" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Starting visit...' : 'Start Visit'}
          </button>
        </form>
      )}

      {isFieldRep && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Inbound orders</p>
              <h4>Orders from your dealer/distributor</h4>
            </div>
          </div>
          {ordersQuery.isLoading && <p className={styles.message}>Loading orders...</p>}
          {ordersQuery.error instanceof Error && <p className={styles.error}>{ordersQuery.error.message}</p>}
          {!scopedDistributorId && (
            <p className={styles.message}>No distributor linked to your account.</p>
          )}
          {ordersQuery.data && ordersQuery.data.length > 0 && (
            <div className={styles.list}>
              {ordersQuery.data.map((order: any) => (
                <div key={order.id} className={styles.row}>
                  <div>
                    <h4>Order #{order.id?.slice(0, 8) ?? '—'}</h4>
                    <p>{order.retailerId ?? 'Unassigned retailer'}</p>
                  </div>
                  <div>
                    <p>Status: {order.status}</p>
                    <p>Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <p>Value: {order.totalAmount ?? '—'}</p>
                    <p>Items: {order.items?.length ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {ordersQuery.data && ordersQuery.data.length === 0 && (
            <p className={styles.message}>No orders yet for your linked dealer/distributor.</p>
          )}
        </section>
      )}

      {isFieldRep && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Lead capture</p>
              <h4>Log secondary sales / leads</h4>
            </div>
          </div>
          <form className={styles.form} onSubmit={leadsForm.handleSubmit(onLeadSubmit)}>
            <label>
              Retailer ID
              <input {...leadsForm.register('retailerId', { required: true })} placeholder="Retailer UUID" />
            </label>
            <label>
              Product ID
              <input {...leadsForm.register('productId', { required: true })} placeholder="Product UUID" />
            </label>
            <label>
              Quantity
              <input type="number" min={1} {...leadsForm.register('quantity', { required: true })} />
            </label>
            <label>
              Amount
              <input type="number" min={0} step="0.01" {...leadsForm.register('amount', { required: true })} />
            </label>
            <label>
              Sale date
              <input type="date" {...leadsForm.register('saleDate', { required: true })} />
            </label>
            <button className="btn" type="submit" disabled={leadMutation.isPending}>
              {leadMutation.isPending ? 'Saving lead...' : 'Save lead'}
            </button>
          </form>
          {leadMutation.error instanceof Error && <p className={styles.error}>{leadMutation.error.message}</p>}
        </section>
      )}

      {visitsQuery.isLoading && isFieldRep && (
        <p className={styles.message}>Loading visits...</p>
      )}
      {visitsQuery.error instanceof Error && (
        <p className={styles.error}>{visitsQuery.error.message}</p>
      )}

      {visitsQuery.data && visitsQuery.data.length > 0 && (
        <div className={styles.list}>
          {visitsQuery.data.map((visit: any) => (
            <div key={visit.id} className={styles.row}>
              <div>
                <h4>{visit.retailerId ?? 'Unassigned'}</h4>
                <p>{new Date(visit.checkInTime ?? visit.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p>Status: {visit.status ?? 'pending'}</p>
                {visit.notes && <p>{visit.notes}</p>}
              </div>
              <div>
                {visit.checkOutTime ? (
                  <p>Checkout: {new Date(visit.checkOutTime).toLocaleString()}</p>
                ) : (
                  isFieldRep && (
                    <button
                      className="btn secondary"
                      onClick={() => handleComplete(visit.id)}
                      disabled={completeMutation.isPending}
                    >
                      Complete
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
