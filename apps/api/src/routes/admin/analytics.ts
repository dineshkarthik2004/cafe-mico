import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/analytics
router.get('/', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's orders
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: 'CANCELLED' },
      },
      include: {
        items: { include: { menuItem: true } },
      },
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayOrderCount = todayOrders.length;

    // Active tables
    const activeTables = await prisma.table.count({
      where: { status: 'OCCUPIED' },
    });

    const totalTables = await prisma.table.count({
      where: { isActive: true },
    });

    // Pending kitchen orders
    const pendingOrders = await prisma.order.count({
      where: { status: { in: ['PENDING', 'ACCEPTED', 'PREPARING'] } },
    });

    // Completed orders today
    const completedOrders = await prisma.order.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { in: ['SERVED', 'READY'] },
      },
    });

    // Average order value
    const avgOrderValue = todayOrderCount > 0
      ? Math.round(todayRevenue / todayOrderCount)
      : 0;

    // Top selling items today
    const topItems: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of todayOrders) {
      for (const item of order.items) {
        const key = item.menuItemId;
        if (!topItems[key]) {
          topItems[key] = { name: item.menuItem.name, count: 0, revenue: 0 };
        }
        topItems[key].count += item.quantity;
        topItems[key].revenue += item.totalPrice;
      }
    }

    const topSellingItems = Object.values(topItems)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Revenue by day (last 7 days)
    const revenueByDay: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          status: { not: 'CANCELLED' },
        },
      });

      revenueByDay.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length,
      });
    }

    // Orders by category today
    const ordersByCategory: Record<string, number> = {};
    for (const order of todayOrders) {
      for (const item of order.items) {
        const catName = item.menuItem.name; // We need category info
        if (!ordersByCategory[catName]) ordersByCategory[catName] = 0;
        ordersByCategory[catName] += item.quantity;
      }
    }

    return res.json({
      todayRevenue,
      todayOrderCount,
      activeTables,
      totalTables,
      pendingOrders,
      completedOrders,
      avgOrderValue,
      topSellingItems,
      revenueByDay,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export { router as adminAnalyticsRoutes };
