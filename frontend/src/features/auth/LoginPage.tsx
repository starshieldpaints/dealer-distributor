// import { useForm } from 'react-hook-form';
// import { type Location, Link, useLocation, useNavigate } from 'react-router-dom';
// import { useAuthStore } from '../../store/authStore';
// import styles from './LoginPage.module.css';

// interface LoginValues {
//   email: string;
//   password: string;
// }

// export const LoginPage = () => {
//   const { register, handleSubmit } = useForm<LoginValues>();
//   const login = useAuthStore((state) => state.login);
//   const loading = useAuthStore((state) => state.loading);
//   const error = useAuthStore((state) => state.error);
//   const navigate = useNavigate();
//   const location = useLocation();
//   const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

//   const onSubmit = async (values: LoginValues) => {
//     try {
//       await login(values);
//       navigate(from, { replace: true });
//     } catch {
//       // error handled in store state
//     }
//   };

//   return (
//     <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
//       <label>
//         Email address
//         <input type="email" placeholder="admin@ddms.io" {...register('email', { required: true })} />
//       </label>
//       <label>
//         Password
//         <input type="password" placeholder="••••••••" {...register('password', { required: true })} />
//       </label>
//       {error && <p className={styles.error}>{error}</p>}
//       <button type="submit" className="btn" disabled={loading}>
//         {loading ? 'Signing in…' : 'Sign in'}
//       </button>
//       <p className={styles.hint}>
//         First time?{' '}
//         <Link to="/register" className={styles.link}>
//           Create distributor/dealer account
//         </Link>
//       </p>
//     </form>
//   );
// };
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { login } from '../../api/auth';
import styles from './LoginPage.module.css';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const response = await login(data);
      setCredentials(response.user, response.token);
      
      // Navigate to the user-specific URL structure
      navigate(`/portal/${response.user.id}/dashboard`);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || 'Invalid email or password');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Welcome Back</h1>
        <p>Sign in to your account</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email">Email Address</label>
          <input
            {...register('email')}
            type="email"
            id="email"
            placeholder="name@company.com"
            autoComplete="email"
          />
          {errors.email && (
            <span className={styles.fieldError}>{errors.email.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            {...register('password')}
            type="password"
            id="password"
            autoComplete="current-password"
          />
          {errors.password && (
            <span className={styles.fieldError}>{errors.password.message}</span>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>

        <div className={styles.footer}>
          Don't have an account? <Link to="/register">Register</Link>
        </div>
      </form>
    </div>
  );
};