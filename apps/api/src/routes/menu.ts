import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/menu - Get full menu with categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            customizationGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return res.json({ categories });
  } catch (error) {
    console.error('Menu fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// GET /api/menu/all - Get all items including unavailable (for admin)
router.get('/all', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            customizationGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return res.json({ categories });
  } catch (error) {
    console.error('Menu fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// GET /api/menu/search?q=query
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) {
      return res.json({ items: [] });
    }

    const items = await prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query.toLowerCase()] } },
        ],
      },
      include: {
        category: true,
        customizationGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    return res.json({ items });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/menu/item/:slug
router.get('/item/:slug', async (req: Request, res: Response) => {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: true,
        customizationGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.json({ item });
  } catch (error) {
    console.error('Item fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch item' });
  }
});

export { router as menuRoutes };
