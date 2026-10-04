import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import CustomerMenu from './pages/customer/CustomerMenu';
import CustomerCart from './pages/customer/CustomerCart';
import CustomerOrders from './pages/customer/CustomerOrders';
import KitchenLogin from './pages/kitchen/KitchenLogin';
import KitchenDashboard from './pages/kitchen/KitchenDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMenuPage from './pages/admin/AdminMenuPage';
import AdminTablesPage from './pages/admin/AdminTablesPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Customer Routes */}
          <Route path="/menu" element={<CustomerMenu />} />
          <Route path="/cart" element={<CustomerCart />} />
          <Route path="/orders" element={<CustomerOrders />} />

          {/* Kitchen Routes */}
          <Route path="/kitchen" element={<KitchenDashboard />} />
          <Route path="/kitchen/login" element={<KitchenLogin />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/menu" element={<AdminMenuPage />} />
          <Route path="/admin/tables" element={<AdminTablesPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />

          {/* Default */}
          <Route path="/" element={<CustomerMenu />} />
        </Routes>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1a1a2e',
              color: '#f5f0e8',
              borderRadius: '12px',
              border: '1px solid rgba(212, 175, 55, 0.3)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
