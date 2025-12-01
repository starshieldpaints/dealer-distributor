// import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
// import { DashboardPage } from '../features/dashboard/DashboardPage';
// import { OrdersPage } from '../features/orders/OrdersPage';
// import { InventoryPage } from '../features/inventory/InventoryPage';
// import { CreditPage } from '../features/credit/CreditPage';
// import { SchemesPage } from '../features/schemes/SchemesPage';
// import { FieldOpsPage } from '../features/field/FieldOpsPage';
// import { IntegrationsPage } from '../features/integrations/IntegrationsPage';
// import { SecondarySalesPage } from '../features/secondarySales/SecondarySalesPage';
// import { ProductCatalogPage } from '../features/catalog/ProductCatalogPage';
// import { AuthGuard } from '../components/auth/AuthGuard';
// import { AppShell } from '../components/layout/AppShell';
// import { LoginPage } from '../features/auth/LoginPage';
// import { RegisterPage } from '../features/auth/RegisterPage';
// import { AuthLayout } from '../features/auth/AuthLayout';
// import { useAuthStore } from '../store/authStore';
// import { TeamPage } from '../features/team/TeamPage';
// import { ApprovalsPage } from '../features/admin/ApprovalsPage';
// import { ProfilePage } from '../features/profile/ProfilePage';

// const ProtectedLayout = () => (
//   <AuthGuard>
//     <AppShell>
//       <Outlet />
//     </AppShell>
//   </AuthGuard>
// );

// export const AppRoutes = () => {
//   const user = useAuthStore((state) => state.user);

//   return (
//     <Routes>
//       <Route element={<ProtectedLayout />}>
//         {user?.role === 'dealer' ? (
//           <>
//             <Route path="/" element={<Navigate to="/orders" replace />} />
//             <Route path="/orders" element={<OrdersPage />} />
//             <Route path="/products" element={<ProductCatalogPage />} />
//             <Route path="*" element={<Navigate to="/orders" replace />} />
//           </>
//         ) : (
//           <>
//             <Route path="/" element={<DashboardPage />} />
//             <Route path="/orders" element={<OrdersPage />} />
//             <Route path="/products" element={<ProductCatalogPage />} />
//             <Route path="/inventory" element={<InventoryPage />} />
//             <Route path="/credit" element={<CreditPage />} />
//             <Route path="/schemes" element={<SchemesPage />} />
//             <Route path="/field" element={<FieldOpsPage />} />
//             <Route path="/secondary-sales" element={<SecondarySalesPage />} />
//             <Route path="/integrations" element={<IntegrationsPage />} />
//             <Route path="/team" element={<TeamPage />} />
//             <Route path="/admin/approvals" element={<ApprovalsPage />} />
//             <Route path="/profile" element={<ProfilePage />} />
//           </>
//         )}
//       </Route>
//       <Route
//         path="/login"
//         element={
//           <AuthLayout>
//             <LoginPage />
//           </AuthLayout>
//         }
//       />
//       <Route
//         path="/register"
//         element={
//           <AuthLayout>
//             <RegisterPage />
//           </AuthLayout>
//         }
//       />
//       <Route path="/profile" element={<ProfilePage />} />
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// };
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { OrdersPage } from '../features/orders/OrdersPage';
import { ProductCatalogPage } from '../features/catalog/ProductCatalogPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { CreditPage } from '../features/credit/CreditPage';
import { SchemesPage } from '../features/schemes/SchemesPage';
import { SecondarySalesPage } from '../features/secondarySales/SecondarySalesPage';
import { FieldOpsPage } from '../features/field/FieldOpsPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { TeamPage } from '../features/team/TeamPage';
import { ApprovalsPage } from '../features/admin/ApprovalsPage';
import { IntegrationsPage } from '../features/integrations/IntegrationsPage';
import { AuthLayout } from '../features/auth/AuthLayout';
import { AppShell } from '../components/layout/AppShell';
import { AuthGuard } from '../components/auth/AuthGuard';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Routes with User ID Scope */}
      <Route
        path="/portal/:userId"
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="products" element={<ProductCatalogPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="credit" element={<CreditPage />} />
        <Route path="schemes" element={<SchemesPage />} />
        <Route path="secondary-sales" element={<SecondarySalesPage />} />
        <Route path="field" element={<FieldOpsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="admin/approvals" element={<ApprovalsPage />} />
        <Route path="admin/integrations" element={<IntegrationsPage />} />
      </Route>

      {/* Root Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};