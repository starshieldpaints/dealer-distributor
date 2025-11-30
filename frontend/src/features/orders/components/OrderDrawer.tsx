import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './OrderDrawer.module.css';
import { createOrderRequest } from '../../../api/hooks';
import { useAuthStore } from '../../../store/authStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  distributorId?: string;
  retailerId?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export const OrderDrawer = ({ open, onClose }: Props) => {
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const createOrder = useMutation({
    mutationFn: createOrderRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const submit = async (values: FormValues) => {
    try {
      await createOrder.mutateAsync({
        distributorId: user?.role === 'admin' ? values.distributorId : undefined,
        retailerId: values.retailerId,
        currency: 'USD',
        items: [
          {
            productId: values.productId,
            quantity: Number(values.quantity),
            unitPrice: Number(values.unitPrice)
          }
        ],
        notes: values.notes
      });
      reset();
      onClose();
    } catch {
      // errors handled via mutation error state
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.drawer}>
        <header>
          <div>
            <p>Create Smart Order</p>
            <h3>Route to distributor + approvals</h3>
          </div>
          <button onClick={onClose} className={styles.close}>
            x
          </button>
        </header>
        <form onSubmit={handleSubmit(submit)}>
          {user?.role === 'admin' && (
            <label>
              Distributor ID
              <input {...register('distributorId', { required: true })} placeholder="UUID" />
            </label>
          )}
          <label>
            Retailer ID
            <input {...register('retailerId')} placeholder="Optional retailer UUID" />
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
            Unit Price
            <input type="number" step="0.01" {...register('unitPrice', { required: true, min: 0 })} />
          </label>
          <label>
            Notes
            <textarea {...register('notes')} rows={3} placeholder="Internal comments" />
          </label>
          {createOrder.error instanceof Error && (
            <p className={styles.error}>{createOrder.error.message}</p>
          )}
          <footer>
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={createOrder.isPending}>
              {createOrder.isPending ? 'Submitting…' : 'Submit order'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
