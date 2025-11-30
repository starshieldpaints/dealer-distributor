import { useState } from 'react';
import styles from './SecondarySalesPage.module.css';
import { useSecondarySales, createSecondarySaleRequest } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FormValues {
  distributorId?: string;
  retailerId: string;
  productId: string;
  quantity: number;
  amount: number;
  saleDate: string;
}

export const SecondarySalesPage = () => {
  const user = useAuthStore((state) => state.user);
  const [adminDistributorId, setAdminDistributorId] = useState('');
  const requiresDistributor = user?.role === 'admin';

  const salesQuery = useSecondarySales({
    distributorId: requiresDistributor ? adminDistributorId || undefined : undefined
  });

  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      saleDate: new Date().toISOString().slice(0, 10)
    }
  });
  const mutation = useMutation({
    mutationFn: createSecondarySaleRequest,
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ['secondary-sales'] });
    }
  });

  const onSubmit = async (values: FormValues) => {
    await mutation.mutateAsync({
      distributorId: requiresDistributor ? values.distributorId : undefined,
      retailerId: values.retailerId,
      productId: values.productId,
      quantity: Number(values.quantity),
      amount: Number(values.amount),
      saleDate: values.saleDate
    });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Secondary Sales</p>
          <h3>Capture distributor to retailer sell-out</h3>
        </div>
        {requiresDistributor && (
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

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        {requiresDistributor && (
          <label>
            Distributor ID
            <input {...register('distributorId', { required: true })} placeholder="UUID" />
          </label>
        )}
        <label>
          Retailer ID
          <input {...register('retailerId', { required: true })} placeholder="Retailer UUID" />
        </label>
        <label>
          Product ID
          <input {...register('productId', { required: true })} placeholder="Product UUID" />
        </label>
        <label>
          Quantity
          <input type="number" step="1" {...register('quantity', { required: true, min: 1 })} />
        </label>
        <label>
          Amount
          <input type="number" step="0.01" {...register('amount', { required: true, min: 0 })} />
        </label>
        <label>
          Sale Date
          <input type="date" {...register('saleDate', { required: true })} />
        </label>
        {mutation.error instanceof Error && <p className={styles.error}>{mutation.error.message}</p>}
        <button className="btn" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Record Sale'}
        </button>
      </form>

      {salesQuery.isLoading && <p className={styles.message}>Loading secondary sales…</p>}
      {salesQuery.error instanceof Error && (
        <p className={styles.error}>{salesQuery.error.message}</p>
      )}
      {salesQuery.data && salesQuery.data.length > 0 && (
        <div className={styles.table}>
          <div className={styles.head}>
            <span>Date</span>
            <span>Retailer</span>
            <span>Product</span>
            <span>Quantity</span>
            <span>Amount</span>
          </div>
          {salesQuery.data.map((sale: any) => (
            <div key={sale.id} className={styles.row}>
              <span>{new Date(sale.saleDate).toLocaleDateString()}</span>
              <span>{sale.retailerId}</span>
              <span>{sale.productId}</span>
              <span>{sale.quantity}</span>
              <span>${sale.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
