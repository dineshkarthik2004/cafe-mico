import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/session/start - Start or join a table session
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { tableToken } = req.body;

    if (!tableToken) {
      return res.status(400).json({ error: 'Table token is required' });
    }

    // Validate table
    const table = await prisma.table.findUnique({
      where: { qrToken: tableToken },
    });

    if (!table || !table.isActive) {
      return res.status(404).json({ error: 'Invalid or disabled table' });
    }

    // Check cafe status
    const settings = await prisma.cafeSettings.findFirst();
    if (settings && !settings.isOpen) {
      return res.status(403).json({ error: 'Cafe is currently closed' });
    }

    // Check for active session on this table
    let session = await prisma.tableSession.findFirst({
      where: {
        tableId: table.id,
        status: { in: ['ACTIVE', 'BILL_REQUESTED'] },
      },
      include: {
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
      },
    });

    if (!session) {
      // Create new session
      session = await prisma.tableSession.create({
        data: {
          tableId: table.id,
          status: 'ACTIVE',
        },
        include: {
          orders: {
            include: {
              items: {
                include: {
                  menuItem: true,
                  customizations: true,
                },
              },
            },
          },
        },
      });

      // Update table status
      await prisma.table.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' },
      });
    }

    return res.json({
      session,
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        displayName: table.displayName,
      },
      isNewSession: session.orders.length === 0,
    });
  } catch (error) {
    console.error('Session start error:', error);
    return res.status(500).json({ error: 'Failed to start session' });
  }
});

// GET /api/session/:id - Get session details
router.get('/:id', async (req: Request, res: Response) => {
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

    // Calculate session total
    const sessionTotal = session.orders.reduce((sum, order) => sum + order.total, 0);

    return res.json({ session, sessionTotal });
  } catch (error) {
    console.error('Session fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/session/:id/request-bill
router.post('/:id/request-bill', async (req: Request, res: Response) => {
  try {
    const session = await prisma.tableSession.findUnique({
      where: { id: req.params.id },
      include: { table: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'CLOSED') {
      return res.status(400).json({ error: 'Session is already closed' });
    }

    await prisma.tableSession.update({
      where: { id: session.id },
      data: { status: 'BILL_REQUESTED' },
    });

    // Update table status
    await prisma.table.update({
      where: { id: session.tableId },
      data: { status: 'RESERVED' }, // Use RESERVED to indicate bill requested
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('bill_requested', {
        sessionId: session.id,
        tableNumber: session.table.tableNumber,
        displayName: session.table.displayName,
      });
    }

    return res.json({ message: 'Bill requested successfully' });
  } catch (error) {
    console.error('Bill request error:', error);
    return res.status(500).json({ error: 'Failed to request bill' });
  }
});

export { router as sessionRoutes };
