import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, Grid, Utensils, IndianRupee } from 'lucide-react';
import { api } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin_analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard Overview">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 skeleton rounded-xl"></div>)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard Overview">
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Today's Revenue" 
          value={`₹${stats?.todayRevenue?.toLocaleString() || 0}`} 
          icon={<IndianRupee />} 
          trend="+12%" 
          color="gold"
        />
        <StatCard 
          title="Orders Today" 
          value={stats?.todayOrderCount || 0} 
          icon={<Utensils />} 
          color="blue"
        />
        <StatCard 
          title="Active Tables" 
          value={`${stats?.activeTables || 0} / ${stats?.totalTables || 0}`} 
          icon={<Grid />} 
          color="green"
        />
        <StatCard 
          title="Pending Kitchen" 
          value={stats?.pendingOrders || 0} 
          icon={<TrendingUp />} 
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Top Selling Items */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-bold mb-6">Top Selling Items (Today)</h3>
          
          <div className="space-y-4">
            {stats?.topSellingItems?.length > 0 ? (
              stats.topSellingItems.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border-subtle">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-text-muted">
                      <span className="font-bold text-text-primary">{item.count}</span> ordered
                    </div>
                    <div className="w-24 text-right font-bold text-gold">
                      ₹{item.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-text-muted">No sales data for today yet</div>
            )}
          </div>
        </div>

        {/* Weekly Revenue Trend */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-6">Past 7 Days</h3>
          
          <div className="space-y-4">
            {stats?.revenueByDay?.map((day: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  <div className="text-xs text-text-muted">{day.orders} orders</div>
                </div>
                <div className="font-bold">
                  ₹{day.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

const StatCard = ({ title, value, icon, trend, color }: any) => {
  const colorMap: any = {
    gold: 'text-gold bg-gold/10 border-gold/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  };

  return (
    <div className="card p-6 border-t border-t-border-medium">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
          {React.cloneElement(icon, { size: 24 })}
        </div>
        {trend && (
          <span className="text-green-500 text-sm font-bold bg-green-500/10 px-2 py-1 rounded">
            {trend}
          </span>
        )}
      </div>
      <p className="text-text-muted text-sm font-medium mb-1">{title}</p>
      <h4 className="text-3xl font-display font-bold">{value}</h4>
    </div>
  );
};

export default AdminDashboard;
