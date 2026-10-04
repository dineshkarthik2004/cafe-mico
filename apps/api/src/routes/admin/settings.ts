import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// GET /api/cafe/status - Public route for cafe status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.cafeSettings.findFirst();
    if (!settings) {
      return res.json({
        cafeName: 'Cafe Mico',
        tagline: 'Good food. Good mood.',
        location: 'Dilsukhnagar, Hyderabad',
        isOpen: true,
      });
    }

    return res.json({
      cafeName: settings.cafeName,
      tagline: settings.tagline,
      location: settings.location,
      isOpen: settings.isOpen,
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
      currencySymbol: settings.currencySymbol,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch cafe status' });
  }
});

// GET /api/admin/settings - Full settings (admin only)
router.get('/', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.cafeSettings.findFirst();
    return res.json({ settings });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PATCH /api/admin/settings - Update settings
router.patch('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const settings = await prisma.cafeSettings.findFirst();
    if (!settings) {
      return res.status(500).json({ error: 'Settings not found' });
    }

    const allowedFields = [
      'cafeName', 'tagline', 'location', 'isOpen',
      'taxEnabled', 'taxPercentage', 'taxLabel',
      'serviceCharge', 'openingTime', 'closingTime',
      'orderPrefix',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updated = await prisma.cafeSettings.update({
      where: { id: settings.id },
      data: updateData,
    });

    // Emit cafe status change
    const io = req.app.get('io');
    if (io && req.body.isOpen !== undefined) {
      io.emit('cafe_status_change', { isOpen: req.body.isOpen });
    }

    return res.json({ settings: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as adminSettingsRoutes };
