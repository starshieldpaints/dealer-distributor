import { useForm } from 'react-hook-form';
import { type Location, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import styles from './LoginPage.module.css';

interface LoginValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const { register, handleSubmit } = useForm<LoginValues>();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch {
      // error handled in store state
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <label>
        Email address
        <input type="email" placeholder="admin@ddms.io" {...register('email', { required: true })} />
      </label>
      <label>
        Password
        <input type="password" placeholder="••••••••" {...register('password', { required: true })} />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className="btn" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p className={styles.hint}>
        First time?{' '}
        <Link to="/register" className={styles.link}>
          Create distributor/dealer account
        </Link>
      </p>
    </form>
  );
};
