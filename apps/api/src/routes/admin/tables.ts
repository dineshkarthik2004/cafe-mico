import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/tables
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tables = await prisma.table.findMany({
      include: {
        sessions: {
          where: { status: { in: ['ACTIVE', 'BILL_REQUESTED'] } },
          include: {
            orders: {
              include: {
                items: {
                  include: { menuItem: true },
                },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    const tablesWithInfo = tables.map((table) => {
      const activeSession = table.sessions[0] || null;
      const totalAmount = activeSession
        ? activeSession.orders.reduce((sum, o) => sum + o.total, 0)
        : 0;
      const itemCount = activeSession
        ? activeSession.orders.reduce((sum, o) => sum + o.items.length, 0)
        : 0;

      return {
        ...table,
        activeSession,
        totalAmount,
        itemCount,
      };
    });

    return res.json({ tables: tablesWithInfo });
  } catch (error) {
    console.error('Tables fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// POST /api/admin/tables - Create table
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tableNumber, displayName, capacity } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ error: 'Table number is required' });
    }

    const table = await prisma.table.create({
      data: {
        tableNumber,
        displayName: displayName || `Table ${tableNumber}`,
        capacity: capacity || 4,
        qrToken: uuidv4(),
      },
    });

    return res.status(201).json({ table });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Table number already exists' });
    }
    return res.status(500).json({ error: 'Failed to create table' });
  }
});

// PATCH /api/admin/tables/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { displayName, capacity, isActive, status } = req.body;
    const updateData: any = {};

    if (displayName !== undefined) updateData.displayName = displayName;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (status !== undefined) updateData.status = status;

    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ table });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update table' });
  }
});

// POST /api/admin/tables/:id/regenerate-qr
router.post('/:id/regenerate-qr', async (req: Request, res: Response) => {
  try {
    const newToken = uuidv4();
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { qrToken: newToken },
    });

    return res.json({ table, newToken });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to regenerate QR' });
  }
});

// GET /api/admin/tables/:id/qr - Generate QR code image
router.get('/:id/qr', async (req: Request, res: Response) => {
  try {
    const table = await prisma.table.findUnique({
      where: { id: req.params.id },
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const menuUrl = `${baseUrl}/menu?token=${table.qrToken}`;

    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    });

    return res.json({
      qrCode: qrDataUrl,
      url: menuUrl,
      table: {
        tableNumber: table.tableNumber,
        displayName: table.displayName,
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// DELETE /api/admin/tables/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Check for active sessions
    const activeSessions = await prisma.tableSession.count({
      where: {
        tableId: req.params.id,
        status: { in: ['ACTIVE', 'BILL_REQUESTED'] },
      },
    });

    if (activeSessions > 0) {
      return res.status(400).json({
        error: 'Cannot delete table with active sessions',
      });
    }

    await prisma.table.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Table deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete table' });
  }
});

export { router as adminTableRoutes };
