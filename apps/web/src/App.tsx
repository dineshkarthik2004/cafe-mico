import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Component, ReactNode } from 'react';
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

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#f5f0e8', padding: 32 }}>
          <h1 style={{ fontSize: 28, color: '#d4af37', marginBottom: 12 }}>☕ Cafe Mico</h1>
          <p style={{ color: '#a8a5b8', textAlign: 'center', maxWidth: 400 }}>
            Something went wrong. Please refresh the page or try the admin panel.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#d4af37', color: '#0f0f1a', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Refresh Page
            </button>
            <button onClick={() => { window.location.href = '/admin/login'; }} style={{ padding: '10px 20px', background: 'transparent', color: '#d4af37', border: '1px solid #d4af37', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              Admin Login
            </button>
          </div>
          {this.state.error && (
            <pre style={{ marginTop: 24, fontSize: 11, color: '#6b6880', maxWidth: 500, wordBreak: 'break-all', textAlign: 'center' }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
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

            {/* Default route → Admin Login */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
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
    </ErrorBoundary>
  );
}

export default App;
