import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { OrderStatus, OrderItemStatus } from '@prisma/client';

const router = Router();

// All kitchen routes require authentication
router.use(authenticate);
router.use(authorize('KITCHEN', 'ADMIN'));

// GET /api/kitchen/orders - Get active orders
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string;

    const whereClause: any = {};
    if (statusFilter && statusFilter !== 'all') {
      whereClause.status = statusFilter;
    } else {
      whereClause.status = {
        in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'],
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            menuItem: true,
            customizations: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        tableSession: {
          include: { table: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ orders });
  } catch (error) {
    console.error('Kitchen orders fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PATCH /api/kitchen/orders/:id/status - Update order status
router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            menuItem: true,
            customizations: true,
          },
        },
        tableSession: {
          include: { table: true },
        },
      },
    });

    // If accepting/preparing, also update item statuses
    if (status === 'ACCEPTED' || status === 'PREPARING') {
      await prisma.orderItem.updateMany({
        where: {
          orderId: order.id,
          status: 'PENDING',
        },
        data: { status: status as OrderItemStatus, isNew: false },
      });
    }

    if (status === 'READY') {
      await prisma.orderItem.updateMany({
        where: {
          orderId: order.id,
          status: { in: ['PENDING', 'ACCEPTED', 'PREPARING'] },
        },
        data: { status: 'READY', isNew: false },
      });
    }

    if (status === 'SERVED') {
      await prisma.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: 'SERVED', isNew: false },
      });
    }

    // Emit to customer
    const io = req.app.get('io');
    if (io) {
      const sessionId = order.tableSessionId;
      io.to(`session:${sessionId}`).emit('order_status_update', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status,
        tableNumber: order.tableSession.table.tableNumber,
      });

      // Also emit to staff
      io.to('staff').emit('order_status_update', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status,
        tableNumber: order.tableSession.table.tableNumber,
      });
    }

    return res.json({ order });
  } catch (error) {
    console.error('Order status update error:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

// PATCH /api/kitchen/items/:id/status - Update individual item status
router.patch('/items/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    if (!status || !Object.values(OrderItemStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const item = await prisma.orderItem.update({
      where: { id: req.params.id },
      data: { status, isNew: false },
      include: {
        menuItem: true,
        order: {
          include: {
            tableSession: { include: { table: true } },
          },
        },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`session:${item.order.tableSessionId}`).emit('item_status_update', {
        itemId: item.id,
        status,
        orderNumber: item.order.orderNumber,
      });
    }

    return res.json({ item });
  } catch (error) {
    console.error('Item status update error:', error);
    return res.status(500).json({ error: 'Failed to update item status' });
  }
});

export { router as kitchenRoutes };
