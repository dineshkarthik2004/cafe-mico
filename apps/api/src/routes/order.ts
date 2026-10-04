import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { OrderStatus, OrderItemStatus } from '@prisma/client';

const router = Router();

// POST /api/orders - Place a new order
router.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, items, customerName, customerPhone, notes } = req.body;

    if (!sessionId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Session ID and items are required' });
    }

    // Validate session
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: { table: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'CLOSED') {
      return res.status(400).json({ error: 'This session has been closed. Please scan the QR code again.' });
    }

    // Get cafe settings for tax and order number
    const settings = await prisma.cafeSettings.findFirst();
    if (!settings) {
      return res.status(500).json({ error: 'Cafe settings not found' });
    }

    // Generate order number
    const orderNumber = `${settings.orderPrefix}-${settings.nextOrderNumber}`;

    // Update next order number
    await prisma.cafeSettings.update({
      where: { id: settings.id },
      data: { nextOrderNumber: settings.nextOrderNumber + 1 },
    });

    // SERVER-SIDE PRICE VALIDATION — never trust frontend prices
    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        include: {
          customizationGroups: {
            include: { options: true },
          },
        },
      });

      if (!menuItem) {
        return res.status(400).json({ error: `Menu item not found: ${item.menuItemId}` });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({ error: `${menuItem.name} is currently unavailable` });
      }

      let itemPrice = menuItem.price;
      const customizationData: any[] = [];

      // Validate and calculate customization prices
      if (item.customizations && Array.isArray(item.customizations)) {
        for (const custId of item.customizations) {
          const option = await prisma.customizationOption.findUnique({
            where: { id: custId },
            include: { group: true },
          });

          if (option) {
            itemPrice += option.price;
            customizationData.push({
              customizationOptionId: option.id,
              optionName: option.name,
              optionPrice: option.price,
            });
          }
        }
      }

      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const totalPrice = itemPrice * quantity;
      subtotal += totalPrice;

      validatedItems.push({
        menuItemId: menuItem.id,
        quantity,
        unitPrice: itemPrice, // snapshot with customizations
        totalPrice,
        specialInstructions: item.specialInstructions || null,
        status: OrderItemStatus.PENDING,
        isNew: true,
        customizations: customizationData,
      });
    }

    // Calculate tax
    const taxAmount = settings.taxEnabled
      ? Math.round(subtotal * (settings.taxPercentage / 100) * 100) / 100
      : 0;
    const total = subtotal + taxAmount;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        tableSessionId: sessionId,
        status: OrderStatus.PENDING,
        subtotal,
        tax: taxAmount,
        total,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        notes: notes || null,
        items: {
          create: validatedItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            specialInstructions: item.specialInstructions,
            status: item.status,
            isNew: item.isNew,
            customizations: {
              create: item.customizations,
            },
          })),
        },
      },
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

    // Emit real-time event to kitchen
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('new_order', {
        order,
        tableNumber: order.tableSession.table.tableNumber,
        displayName: order.tableSession.table.displayName,
      });
    }

    return res.status(201).json({ order });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({ error: 'Failed to place order' });
  }
});

// POST /api/orders/:id/items - Add items to existing order
router.post('/:id/items', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const orderId = req.params.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tableSession: { include: { table: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot add items to a cancelled order' });
    }

    const settings = await prisma.cafeSettings.findFirst();
    if (!settings) {
      return res.status(500).json({ error: 'Cafe settings not found' });
    }

    // Validate and price items server-side
    let additionalSubtotal = 0;
    const newItems: any[] = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        include: {
          customizationGroups: { include: { options: true } },
        },
      });

      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({
          error: `${menuItem?.name || 'Item'} is unavailable`,
        });
      }

      let itemPrice = menuItem.price;
      const customizationData: any[] = [];

      if (item.customizations && Array.isArray(item.customizations)) {
        for (const custId of item.customizations) {
          const option = await prisma.customizationOption.findUnique({
            where: { id: custId },
          });
          if (option) {
            itemPrice += option.price;
            customizationData.push({
              customizationOptionId: option.id,
              optionName: option.name,
              optionPrice: option.price,
            });
          }
        }
      }

      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const totalPrice = itemPrice * quantity;
      additionalSubtotal += totalPrice;

      newItems.push({
        menuItemId: menuItem.id,
        quantity,
        unitPrice: itemPrice,
        totalPrice,
        specialInstructions: item.specialInstructions || null,
        status: OrderItemStatus.PENDING,
        isNew: true,
        customizations: customizationData,
      });
    }

    // Create new order items
    for (const item of newItems) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          specialInstructions: item.specialInstructions,
          status: item.status,
          isNew: true,
          customizations: {
            create: item.customizations,
          },
        },
      });
    }

    // Recalculate order totals
    const newSubtotal = order.subtotal + additionalSubtotal;
    const newTax = settings.taxEnabled
      ? Math.round(newSubtotal * (settings.taxPercentage / 100) * 100) / 100
      : 0;
    const newTotal = newSubtotal + newTax;

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
      },
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

    // Emit to kitchen
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('items_added', {
        order: updatedOrder,
        tableNumber: updatedOrder.tableSession.table.tableNumber,
        displayName: updatedOrder.tableSession.table.displayName,
        newItems: newItems.map(i => ({
          ...i,
        })),
      });
    }

    return res.json({ order: updatedOrder });
  } catch (error) {
    console.error('Add items error:', error);
    return res.status(500).json({ error: 'Failed to add items' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
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
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({ order });
  } catch (error) {
    console.error('Order fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// GET /api/orders/session/:sessionId - Get all orders for a session
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { tableSessionId: req.params.sessionId },
      include: {
        items: {
          include: {
            menuItem: true,
            customizations: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

export { router as orderRoutes };
