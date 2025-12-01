// import { type ReactNode } from 'react';
// import { Navigate, useLocation } from 'react-router-dom';
// import { useAuthStore } from '../../store/authStore';

// interface Props {
//   children: ReactNode;
// }

// export const AuthGuard = ({ children }: Props) => {
//   const user = useAuthStore((state) => state.user);
//   const location = useLocation();

//   if (!user) {
//     return <Navigate to="/login" state={{ from: location }} replace />;
//   }

//   return <>{children}</>;
// };
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, token, setCredentials, logout } = useAuthStore();
  const location = useLocation();
  const { userId: urlUserId } = useParams<{ userId: string }>();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setIsVerifying(false);
        return;
      }

      try {
        // If we have a user in store, we are good to go mostly
        // But in a real prod app, you might want to validate the token validity here periodically
        if (!user) {
             const { data } = await apiClient.get('/auth/me');
             setCredentials(data.data, token);
        }
      } catch (error) {
        logout();
      } finally {
        setIsVerifying(false);
      }
    };

    verifySession();
  }, [token, setCredentials, logout, user]);

  if (isVerifying) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--color-bg)' 
      }}>
        Loading session...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // URL ID Enforcement
  // Ensure the logged-in user is accessing their own URL namespace.
  // Exception: Admins might need to impersonate, but for now we enforce strict ownership
  // to satisfy "each person should have a unique id in the url".
  if (urlUserId && urlUserId !== user.id) {
    // Redirect to the correct user namespace
    return <Navigate to={`/portal/${user.id}/dashboard`} replace />;
  }

  return <>{children}</>;
};