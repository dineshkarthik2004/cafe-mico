import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'STAFF', 'CASHIER'));

// GET /api/admin/sessions - Get all sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const whereClause: any = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const sessions = await prisma.tableSession.findMany({
      where: whereClause,
      include: {
        table: true,
        orders: {
          include: {
            items: {
              include: {
                menuItem: true,
                customizations: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        bill: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ sessions });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/admin/sessions/:id/close - Close session
router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const session = await prisma.tableSession.findUnique({
      where: { id: req.params.id },
      include: {
        table: true,
        orders: {
          include: {
            items: { include: { customizations: true } },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'CLOSED') {
      return res.status(400).json({ error: 'Session is already closed' });
    }

    // Calculate final bill
    const settings = await prisma.cafeSettings.findFirst();
    const subtotal = session.orders.reduce((sum, o) => sum + o.subtotal, 0);
    const taxPercentage = settings?.taxPercentage || 5;
    const taxAmount = settings?.taxEnabled
      ? Math.round(subtotal * (taxPercentage / 100) * 100) / 100
      : 0;
    const serviceCharge = settings?.serviceCharge || 0;
    const discount = parseFloat(req.body.discount) || 0;
    const total = subtotal + taxAmount + serviceCharge - discount;

    // Generate bill number
    const billCount = await prisma.bill.count();
    const billNumber = `BILL-${String(billCount + 1).padStart(4, '0')}`;

    // Create bill
    const bill = await prisma.bill.create({
      data: {
        billNumber,
        tableSessionId: session.id,
        subtotal,
        taxAmount,
        taxPercentage,
        serviceCharge,
        discount,
        total,
        paymentMethod: req.body.paymentMethod || null,
        paymentStatus: req.body.paymentMethod ? 'PAID' : 'PENDING',
        paidAt: req.body.paymentMethod ? new Date() : null,
      },
    });

    // Close session
    await prisma.tableSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        billingStatus: req.body.paymentMethod ? 'PAID' : 'GENERATED',
        closedAt: new Date(),
      },
    });

    // Free up the table
    await prisma.table.update({
      where: { id: session.tableId },
      data: { status: 'AVAILABLE' },
    });

    // Mark all orders as served
    await prisma.order.updateMany({
      where: {
        tableSessionId: session.id,
        status: { not: 'CANCELLED' },
      },
      data: { status: 'SERVED' },
    });

    // Emit session closed event
    const io = req.app.get('io');
    if (io) {
      io.to(`session:${session.id}`).emit('session_closed', {
        sessionId: session.id,
        tableNumber: session.table.tableNumber,
        bill,
      });
      io.to('staff').emit('table_freed', {
        tableId: session.tableId,
        tableNumber: session.table.tableNumber,
      });
    }

    return res.json({ bill, message: 'Session closed and bill generated' });
  } catch (error) {
    console.error('Close session error:', error);
    return res.status(500).json({ error: 'Failed to close session' });
  }
});

// GET /api/admin/sessions/:id/bill
router.get('/:id/bill', async (req: Request, res: Response) => {
  try {
    const session = await prisma.tableSession.findUnique({
      where: { id: req.params.id },
      include: {
        table: true,
        orders: {
          include: {
            items: {
              include: {
                menuItem: true,
                customizations: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        bill: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const settings = await prisma.cafeSettings.findFirst();

    return res.json({ session, settings });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

export { router as adminSessionRoutes };
