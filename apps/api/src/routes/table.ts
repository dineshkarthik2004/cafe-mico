import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/table/:token - Validate QR token and get table info
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const table = await prisma.table.findUnique({
      where: { qrToken: token },
    });

    if (!table) {
      return res.status(404).json({ error: 'Invalid QR code. Table not found.' });
    }

    if (!table.isActive) {
      return res.status(403).json({ error: 'This table is currently disabled.' });
    }

    // Get cafe settings to check if open
    const settings = await prisma.cafeSettings.findFirst();
    if (settings && !settings.isOpen) {
      return res.status(403).json({
        error: 'Cafe Mico is currently closed. Ordering is temporarily unavailable.',
        cafeStatus: 'closed',
        cafeName: settings.cafeName,
        location: settings.location,
      });
    }

    // Check if there's an active session for this table
    const activeSession = await prisma.tableSession.findFirst({
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

    return res.json({
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        capacity: table.capacity,
      },
      activeSession: activeSession || null,
      cafe: settings ? {
        name: settings.cafeName,
        tagline: settings.tagline,
        location: settings.location,
        isOpen: settings.isOpen,
      } : null,
    });
  } catch (error) {
    console.error('Table lookup error:', error);
    return res.status(500).json({ error: 'Failed to look up table' });
  }
});

export { router as tableRoutes };
