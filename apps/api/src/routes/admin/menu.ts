import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Admin menu routes require auth
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/menu - Get all menu items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.menuItem.findMany({
      include: {
        category: true,
        customizationGroups: {
          include: { options: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });

    return res.json({ items });
  } catch (error) {
    console.error('Admin menu fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// POST /api/admin/menu - Create menu item
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name, description, price, categoryId, foodType,
      image, isAvailable, isBestseller, isRecommended,
      preparationTime, tags,
    } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const item = await prisma.menuItem.create({
      data: {
        name,
        slug: `${slug}-${Date.now()}`,
        description: description || null,
        price: parseFloat(price),
        categoryId,
        foodType: foodType || 'VEG',
        image: image || null,
        isAvailable: isAvailable !== false,
        isBestseller: isBestseller || false,
        isRecommended: isRecommended || false,
        preparationTime: preparationTime || 15,
        tags: tags || [],
      },
      include: { category: true },
    });

    // Notify via socket that menu updated
    const io = req.app.get('io');
    if (io) {
      io.emit('menu_updated');
    }

    return res.status(201).json({ item });
  } catch (error) {
    console.error('Create menu item error:', error);
    return res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PATCH /api/admin/menu/:id - Update menu item
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = {};
    const allowedFields = [
      'name', 'description', 'price', 'categoryId', 'foodType',
      'image', 'isAvailable', 'isBestseller', 'isRecommended',
      'preparationTime', 'rating', 'tags', 'sortOrder',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    // If availability changed, notify customers
    const io = req.app.get('io');
    if (io) {
      if (req.body.isAvailable === false) {
        io.emit('item_unavailable', { itemId: item.id, name: item.name });
      }
      io.emit('menu_updated');
    }

    return res.json({ item });
  } catch (error) {
    console.error('Update menu item error:', error);
    return res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// DELETE /api/admin/menu/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// POST /api/admin/menu/import - CSV import
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Expect array of items from frontend CSV parsing

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    let imported = 0;
    for (const item of items) {
      const category = await prisma.menuCategory.findFirst({
        where: { name: { equals: item.category, mode: 'insensitive' } },
      });

      if (!category) continue;

      const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      await prisma.menuItem.upsert({
        where: { slug },
        update: {
          price: parseFloat(item.price) || 0,
          description: item.description || null,
          foodType: item.foodType || 'VEG',
          isAvailable: item.available !== 'false',
          isBestseller: item.bestseller === 'true',
          isRecommended: item.recommended === 'true',
          preparationTime: parseInt(item.preparationTime) || 15,
        },
        create: {
          name: item.name,
          slug,
          description: item.description || null,
          price: parseFloat(item.price) || 0,
          categoryId: category.id,
          foodType: item.foodType || 'VEG',
          isAvailable: item.available !== 'false',
          isBestseller: item.bestseller === 'true',
          isRecommended: item.recommended === 'true',
          preparationTime: parseInt(item.preparationTime) || 15,
        },
      });
      imported++;
    }

    return res.json({ message: `Successfully imported ${imported} items` });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: 'Import failed' });
  }
});

export { router as adminMenuRoutes };
