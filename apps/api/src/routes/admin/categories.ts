import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ categories });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/admin/categories
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, image, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const category = await prisma.menuCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        sortOrder: sortOrder || 0,
      },
    });

    return res.status(201).json({ category });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

// PATCH /api/admin/categories/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, image, sortOrder, isActive } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.menuCategory.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ category });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/admin/categories/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const itemCount = await prisma.menuItem.count({
      where: { categoryId: req.params.id },
    });

    if (itemCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category with ${itemCount} items. Move or delete items first.`,
      });
    }

    await prisma.menuCategory.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Category deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete category' });
  }
});

export { router as adminCategoryRoutes };
