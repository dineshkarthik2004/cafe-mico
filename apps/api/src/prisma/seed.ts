import { PrismaClient, FoodType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Cafe Mico database...\n');

  // ─── Cafe Settings ──────────────────────────────────
  const settings = await prisma.cafeSettings.upsert({
    where: { id: 'cafe-mico-settings' },
    update: {},
    create: {
      id: 'cafe-mico-settings',
      cafeName: 'Cafe Mico',
      tagline: 'Good food. Good mood.',
      location: 'Dilsukhnagar, Hyderabad',
      isOpen: true,
      taxEnabled: true,
      taxPercentage: 5.0,
      taxLabel: 'GST',
      serviceCharge: 0,
      currency: 'INR',
      currencySymbol: '₹',
      openingTime: '10:00',
      closingTime: '23:00',
      orderPrefix: 'MICO',
      nextOrderNumber: 1001,
    },
  });
  console.log('✅ Cafe settings created');

  // ─── Users ──────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const kitchenPassword = await bcrypt.hash('kitchen123', 12);
  const cashierPassword = await bcrypt.hash('cashier123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cafemico.com' },
    update: {},
    create: {
      name: 'Cafe Mico Admin',
      email: 'admin@cafemico.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  const kitchenUser = await prisma.user.upsert({
    where: { email: 'kitchen@cafemico.com' },
    update: {},
    create: {
      name: 'Kitchen Staff',
      email: 'kitchen@cafemico.com',
      password: kitchenPassword,
      role: UserRole.KITCHEN,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@cafemico.com' },
    update: {},
    create: {
      name: 'Cashier',
      email: 'cashier@cafemico.com',
      password: cashierPassword,
      role: UserRole.CASHIER,
    },
  });

  console.log('✅ Demo users created');
  console.log('   Admin:   admin@cafemico.com / admin123');
  console.log('   Kitchen: kitchen@cafemico.com / kitchen123');
  console.log('   Cashier: cashier@cafemico.com / cashier123');

  // ─── Tables ─────────────────────────────────────────
  const tables = [];
  for (let i = 1; i <= 20; i++) {
    const tableNum = String(i).padStart(2, '0');
    const table = await prisma.table.upsert({
      where: { tableNumber: `T${tableNum}` },
      update: {},
      create: {
        tableNumber: `T${tableNum}`,
        displayName: `Table ${tableNum}`,
        qrToken: uuidv4(),
        capacity: i <= 5 ? 2 : i <= 15 ? 4 : 6,
      },
    });
    tables.push(table);
  }
  console.log('✅ 20 tables created');

  // ─── Menu Categories ────────────────────────────────
  const categoriesData = [
    { name: 'Recommended', slug: 'recommended', sortOrder: 0 },
    { name: 'Starters', slug: 'starters', sortOrder: 1 },
    { name: 'Bowls', slug: 'bowls', sortOrder: 2 },
    { name: 'Main Course', slug: 'main-course', sortOrder: 3 },
    { name: 'Rice', slug: 'rice', sortOrder: 4 },
    { name: 'Fried Rice & Noodles', slug: 'fried-rice-noodles', sortOrder: 5 },
    { name: 'Pasta', slug: 'pasta', sortOrder: 6 },
    { name: 'Burgers & Sandwiches', slug: 'burgers-sandwiches', sortOrder: 7 },
    { name: 'Snacks', slug: 'snacks', sortOrder: 8 },
    { name: 'Soups & Salads', slug: 'soups-salads', sortOrder: 9 },
    { name: 'Beverages', slug: 'beverages', sortOrder: 10 },
    { name: 'Desserts', slug: 'desserts', sortOrder: 11 },
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    categories[cat.slug] = await prisma.menuCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Menu categories created');

  // ─── Menu Items ─────────────────────────────────────
  const menuItemsData = [
    // Starters - Veg
    {
      name: 'Veg Manchurian',
      slug: 'veg-manchurian',
      description: 'Crispy vegetable balls tossed in a tangy manchurian sauce with spring onions.',
      price: 239,
      categorySlug: 'starters',
      foodType: FoodType.VEG,
      isRecommended: true,
      isBestseller: false,
      preparationTime: 15,
      rating: 4.2,
      tags: ['chinese', 'starter', 'spicy'],
    },
    {
      name: 'Honey Chilli Potato',
      slug: 'honey-chilli-potato',
      description: 'Crispy fried potatoes glazed with honey, chilli sauce and sesame seeds.',
      price: 279,
      categorySlug: 'starters',
      foodType: FoodType.VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 12,
      rating: 4.5,
      tags: ['chinese', 'starter', 'sweet', 'spicy'],
    },
    {
      name: 'Dragon Paneer',
      slug: 'dragon-paneer',
      description: 'Paneer cubes wok-tossed with dragon sauce, bell peppers and scallions.',
      price: 319,
      categorySlug: 'starters',
      foodType: FoodType.VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 15,
      rating: 4.6,
      tags: ['paneer', 'chinese', 'spicy'],
    },
    {
      name: 'Moroccan Kurkure Paneer',
      slug: 'moroccan-kurkure-paneer',
      description: 'Crunchy paneer coated in Moroccan spices, served with mint chutney.',
      price: 299,
      categorySlug: 'starters',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 18,
      rating: 4.3,
      tags: ['paneer', 'moroccan', 'crispy'],
    },
    {
      name: 'Stuffed Mushroom',
      slug: 'stuffed-mushroom',
      description: 'Button mushrooms stuffed with a creamy cheese and herb filling, baked golden.',
      price: 299,
      categorySlug: 'starters',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 20,
      rating: 4.1,
      tags: ['mushroom', 'cheese', 'baked'],
    },
    {
      name: 'Chilli Paneer Scallion',
      slug: 'chilli-paneer-scallion',
      description: 'Paneer cubes tossed with green chillies, scallions and soy sauce.',
      price: 299,
      categorySlug: 'starters',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 15,
      rating: 4.2,
      tags: ['paneer', 'chinese', 'spicy'],
    },
    // Starters - Non-Veg
    {
      name: 'Hyderabadi Chicken 65',
      slug: 'hyderabadi-chicken-65',
      description: 'Spicy deep-fried chicken marinated in Hyderabadi spices with curry leaves.',
      price: 315,
      categorySlug: 'starters',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 18,
      rating: 4.7,
      tags: ['chicken', 'hyderabadi', 'spicy', 'fried'],
    },
    {
      name: 'Bezzing Chicken',
      slug: 'bezzing-chicken',
      description: 'Crispy chicken strips with a buzzing honey-chilli glaze and sesame.',
      price: 329,
      categorySlug: 'starters',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 18,
      rating: 4.3,
      tags: ['chicken', 'honey', 'crispy'],
    },
    {
      name: 'Chilli Chicken Scallion',
      slug: 'chilli-chicken-scallion',
      description: 'Boneless chicken tossed with green chillies, scallions in a fiery sauce.',
      price: 329,
      categorySlug: 'starters',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 15,
      rating: 4.4,
      tags: ['chicken', 'chinese', 'spicy'],
    },
    {
      name: 'Hot Basil Chicken',
      slug: 'hot-basil-chicken',
      description: 'Chicken wok-tossed with Thai basil, chillies and garlic in a savory sauce.',
      price: 329,
      categorySlug: 'starters',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 15,
      rating: 4.2,
      tags: ['chicken', 'thai', 'basil'],
    },
    {
      name: 'Chicken Lollipop',
      slug: 'chicken-lollipop',
      description: 'Classic chicken wings frenched and fried, served with spicy schezwan sauce.',
      price: 329,
      categorySlug: 'starters',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: false,
      preparationTime: 20,
      rating: 4.5,
      tags: ['chicken', 'fried', 'appetizer'],
    },
    {
      name: 'Kung Pao Chicken',
      slug: 'kung-pao-chicken',
      description: 'Diced chicken with peanuts, dried chillies and Sichuan pepper in kung pao sauce.',
      price: 329,
      categorySlug: 'starters',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: true,
      preparationTime: 15,
      rating: 4.4,
      tags: ['chicken', 'chinese', 'peanuts'],
    },
    {
      name: 'Prawns Koliwada',
      slug: 'prawns-koliwada',
      description: 'Mumbai-style spiced prawns, deep-fried to golden perfection.',
      price: 379,
      categorySlug: 'starters',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 20,
      rating: 4.3,
      tags: ['prawns', 'seafood', 'fried'],
    },
    // Pasta
    {
      name: 'Veg Alfredo Pasta',
      slug: 'veg-alfredo-pasta',
      description: 'Penne in a rich creamy Alfredo sauce with sautéed vegetables and parmesan.',
      price: 279,
      categorySlug: 'pasta',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: true,
      preparationTime: 18,
      rating: 4.3,
      tags: ['pasta', 'italian', 'creamy'],
    },
    {
      name: 'Veg Penne Al Arrabiata',
      slug: 'veg-penne-arrabiata',
      description: 'Penne pasta in a spicy tomato and red chilli arrabiata sauce.',
      price: 269,
      categorySlug: 'pasta',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 18,
      rating: 4.1,
      tags: ['pasta', 'italian', 'spicy'],
    },
    {
      name: 'Veg Lasagna',
      slug: 'veg-lasagna',
      description: 'Layers of pasta sheets, bechamel sauce, vegetables and melted mozzarella.',
      price: 299,
      categorySlug: 'pasta',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 25,
      rating: 4.2,
      tags: ['pasta', 'italian', 'cheese', 'baked'],
    },
    {
      name: 'Creamy Chicken Ragu Pasta',
      slug: 'creamy-chicken-ragu-pasta',
      description: 'Slow-cooked chicken ragu in a creamy tomato sauce over al dente penne.',
      price: 329,
      categorySlug: 'pasta',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 20,
      rating: 4.6,
      tags: ['pasta', 'chicken', 'creamy', 'italian'],
    },
    {
      name: 'Cheese Chicken Lasagna',
      slug: 'cheese-chicken-lasagna',
      description: 'Layered lasagna with seasoned chicken, ricotta, mozzarella and bolognese sauce.',
      price: 349,
      categorySlug: 'pasta',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 25,
      rating: 4.4,
      tags: ['pasta', 'chicken', 'cheese', 'baked'],
    },
    // Burgers & Sandwiches
    {
      name: 'Aloo Tikki Burger',
      slug: 'aloo-tikki-burger',
      description: 'Crispy aloo tikki patty with lettuce, onions, and house sauce in a toasted bun.',
      price: 249,
      categorySlug: 'burgers-sandwiches',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 12,
      rating: 4.0,
      tags: ['burger', 'aloo', 'indian'],
    },
    {
      name: 'Crispy Paneer Burger',
      slug: 'crispy-paneer-burger',
      description: 'Golden crispy paneer patty with pickled jalapenos and chipotle mayo.',
      price: 279,
      categorySlug: 'burgers-sandwiches',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: true,
      preparationTime: 12,
      rating: 4.3,
      tags: ['burger', 'paneer', 'crispy'],
    },
    {
      name: 'Chicken Grilled Burger',
      slug: 'chicken-grilled-burger',
      description: 'Juicy grilled chicken breast with lettuce, tomato and garlic aioli.',
      price: 289,
      categorySlug: 'burgers-sandwiches',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 15,
      rating: 4.2,
      tags: ['burger', 'chicken', 'grilled'],
    },
    {
      name: 'Crispy Chicken Burger',
      slug: 'crispy-chicken-burger',
      description: 'Crispy fried chicken patty with lettuce, cheese and our signature house sauce.',
      price: 299,
      categorySlug: 'burgers-sandwiches',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 12,
      rating: 4.7,
      tags: ['burger', 'chicken', 'crispy', 'cheese'],
    },
    {
      name: 'Veg Grilled Sandwich',
      slug: 'veg-grilled-sandwich',
      description: 'Grilled multigrain sandwich with fresh vegetables, cheese and pesto spread.',
      price: 219,
      categorySlug: 'burgers-sandwiches',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 10,
      rating: 4.0,
      tags: ['sandwich', 'grilled', 'healthy'],
    },
    {
      name: 'Paneer Sandwich',
      slug: 'paneer-sandwich',
      description: 'Grilled sandwich with spiced paneer tikka filling, mint chutney and cheese.',
      price: 269,
      categorySlug: 'burgers-sandwiches',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 10,
      rating: 4.1,
      tags: ['sandwich', 'paneer', 'grilled'],
    },
    {
      name: 'Pesto Chicken Sandwich',
      slug: 'pesto-chicken-sandwich',
      description: 'Grilled chicken with fresh basil pesto, sun-dried tomatoes and mozzarella.',
      price: 279,
      categorySlug: 'burgers-sandwiches',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 12,
      rating: 4.3,
      tags: ['sandwich', 'chicken', 'pesto'],
    },
    // Soups & Salads
    {
      name: 'Veg Hot & Sour Soup',
      slug: 'veg-hot-sour-soup',
      description: 'Classic Chinese soup with mixed vegetables in a spicy and tangy broth.',
      price: 159,
      categorySlug: 'soups-salads',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 10,
      rating: 4.0,
      tags: ['soup', 'chinese', 'spicy'],
    },
    {
      name: 'Veg Manchow Soup',
      slug: 'veg-manchow-soup',
      description: 'Thick and spicy Indo-Chinese soup topped with crispy fried noodles.',
      price: 159,
      categorySlug: 'soups-salads',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 10,
      rating: 4.1,
      tags: ['soup', 'chinese', 'noodles'],
    },
    {
      name: 'Veg Caesar Salad',
      slug: 'veg-caesar-salad',
      description: 'Crisp romaine lettuce with Caesar dressing, croutons and shaved parmesan.',
      price: 259,
      categorySlug: 'soups-salads',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 8,
      rating: 4.0,
      tags: ['salad', 'healthy', 'caesar'],
    },
    // Bowls
    {
      name: 'Teriyaki Chicken Bowl',
      slug: 'teriyaki-chicken-bowl',
      description: 'Grilled teriyaki chicken over steamed rice with stir-fried vegetables and sesame.',
      price: 349,
      categorySlug: 'bowls',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 20,
      rating: 4.5,
      tags: ['bowl', 'chicken', 'teriyaki', 'japanese'],
    },
    {
      name: 'Paneer Tikka Bowl',
      slug: 'paneer-tikka-bowl',
      description: 'Tandoori paneer tikka over herbed rice with raita and pickled onions.',
      price: 319,
      categorySlug: 'bowls',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: true,
      preparationTime: 18,
      rating: 4.3,
      tags: ['bowl', 'paneer', 'indian'],
    },
    // Fried Rice & Noodles
    {
      name: 'Veg Fried Rice',
      slug: 'veg-fried-rice',
      description: 'Wok-tossed rice with mixed vegetables, soy sauce and scrambled eggs optional.',
      price: 229,
      categorySlug: 'fried-rice-noodles',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 15,
      rating: 4.0,
      tags: ['rice', 'chinese', 'fried'],
    },
    {
      name: 'Chicken Fried Rice',
      slug: 'chicken-fried-rice',
      description: 'Classic chicken fried rice with diced chicken, vegetables and soy.',
      price: 269,
      categorySlug: 'fried-rice-noodles',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: false,
      preparationTime: 15,
      rating: 4.3,
      tags: ['rice', 'chicken', 'chinese', 'fried'],
    },
    {
      name: 'Veg Hakka Noodles',
      slug: 'veg-hakka-noodles',
      description: 'Stir-fried hakka noodles with crunchy vegetables and Indo-Chinese sauces.',
      price: 229,
      categorySlug: 'fried-rice-noodles',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 15,
      rating: 4.1,
      tags: ['noodles', 'chinese', 'hakka'],
    },
    {
      name: 'Chicken Hakka Noodles',
      slug: 'chicken-hakka-noodles',
      description: 'Hakka noodles tossed with seasoned chicken strips and vegetables.',
      price: 279,
      categorySlug: 'fried-rice-noodles',
      foodType: FoodType.NON_VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 15,
      rating: 4.2,
      tags: ['noodles', 'chicken', 'chinese'],
    },
    // Beverages
    {
      name: 'Classic Cold Coffee',
      slug: 'classic-cold-coffee',
      description: 'Chilled blended coffee with milk, cream and a hint of vanilla.',
      price: 179,
      categorySlug: 'beverages',
      foodType: FoodType.VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 5,
      rating: 4.4,
      tags: ['coffee', 'cold', 'beverage'],
    },
    {
      name: 'Cafe Latte',
      slug: 'cafe-latte',
      description: 'Smooth espresso with steamed milk and a light foam top.',
      price: 199,
      categorySlug: 'beverages',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 5,
      rating: 4.2,
      tags: ['coffee', 'hot', 'latte'],
    },
    {
      name: 'Fresh Lime Soda',
      slug: 'fresh-lime-soda',
      description: 'Refreshing lime juice with soda, choice of sweet or salted.',
      price: 129,
      categorySlug: 'beverages',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 3,
      rating: 4.0,
      tags: ['lime', 'soda', 'refreshing'],
    },
    {
      name: 'Mango Smoothie',
      slug: 'mango-smoothie',
      description: 'Thick and creamy mango smoothie made with fresh Alphonso mangoes.',
      price: 219,
      categorySlug: 'beverages',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: true,
      preparationTime: 5,
      rating: 4.5,
      tags: ['mango', 'smoothie', 'fruit'],
    },
    {
      name: 'Oreo Milkshake',
      slug: 'oreo-milkshake',
      description: 'Thick creamy milkshake blended with Oreo cookies and vanilla ice cream.',
      price: 229,
      categorySlug: 'beverages',
      foodType: FoodType.VEG,
      isBestseller: true,
      isRecommended: false,
      preparationTime: 5,
      rating: 4.6,
      tags: ['milkshake', 'oreo', 'dessert'],
    },
    // Snacks
    {
      name: 'French Fries',
      slug: 'french-fries',
      description: 'Golden crispy French fries seasoned with peri-peri spice mix.',
      price: 179,
      categorySlug: 'snacks',
      foodType: FoodType.VEG,
      isBestseller: true,
      isRecommended: false,
      preparationTime: 10,
      rating: 4.3,
      tags: ['fries', 'snack', 'crispy'],
    },
    {
      name: 'Loaded Nachos',
      slug: 'loaded-nachos',
      description: 'Tortilla chips loaded with cheese sauce, jalapenos, salsa and sour cream.',
      price: 259,
      categorySlug: 'snacks',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: true,
      preparationTime: 10,
      rating: 4.4,
      tags: ['nachos', 'cheese', 'mexican'],
    },
    {
      name: 'Chicken Wings',
      slug: 'chicken-wings',
      description: 'Crispy chicken wings tossed in your choice of BBQ, Buffalo, or Peri-Peri sauce.',
      price: 349,
      categorySlug: 'snacks',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 18,
      rating: 4.6,
      tags: ['chicken', 'wings', 'bbq'],
    },
    // Desserts
    {
      name: 'Chocolate Brownie',
      slug: 'chocolate-brownie',
      description: 'Warm gooey chocolate brownie served with vanilla ice cream and chocolate sauce.',
      price: 249,
      categorySlug: 'desserts',
      foodType: FoodType.VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 8,
      rating: 4.7,
      tags: ['dessert', 'chocolate', 'brownie'],
    },
    {
      name: 'New York Cheesecake',
      slug: 'new-york-cheesecake',
      description: 'Classic creamy cheesecake with a buttery graham cracker crust and berry compote.',
      price: 279,
      categorySlug: 'desserts',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 5,
      rating: 4.3,
      tags: ['dessert', 'cheesecake', 'sweet'],
    },
    // Rice (Main)
    {
      name: 'Veg Biryani',
      slug: 'veg-biryani',
      description: 'Fragrant basmati rice layered with spiced vegetables, saffron and fried onions.',
      price: 259,
      categorySlug: 'rice',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 25,
      rating: 4.1,
      tags: ['biryani', 'rice', 'indian'],
    },
    {
      name: 'Chicken Biryani',
      slug: 'chicken-biryani',
      description: 'Hyderabadi-style dum biryani with tender chicken, aromatic spices and raita.',
      price: 329,
      categorySlug: 'rice',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 30,
      rating: 4.6,
      tags: ['biryani', 'chicken', 'hyderabadi'],
    },
    // Main Course
    {
      name: 'Paneer Butter Masala',
      slug: 'paneer-butter-masala',
      description: 'Soft paneer cubes in a rich, creamy tomato-butter gravy.',
      price: 299,
      categorySlug: 'main-course',
      foodType: FoodType.VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 20,
      rating: 4.5,
      tags: ['paneer', 'indian', 'curry', 'creamy'],
    },
    {
      name: 'Butter Chicken',
      slug: 'butter-chicken',
      description: 'Tender chicken in a silky tomato-cream sauce with butter and kasuri methi.',
      price: 349,
      categorySlug: 'main-course',
      foodType: FoodType.NON_VEG,
      isBestseller: true,
      isRecommended: true,
      preparationTime: 22,
      rating: 4.7,
      tags: ['chicken', 'indian', 'curry', 'creamy'],
    },
    {
      name: 'Dal Makhani',
      slug: 'dal-makhani',
      description: 'Slow-cooked black lentils with cream, butter and aromatic spices.',
      price: 249,
      categorySlug: 'main-course',
      foodType: FoodType.VEG,
      isBestseller: false,
      isRecommended: false,
      preparationTime: 20,
      rating: 4.3,
      tags: ['dal', 'indian', 'lentils', 'creamy'],
    },
  ];

  for (const item of menuItemsData) {
    const { categorySlug, ...itemData } = item;
    const category = categories[categorySlug];
    if (!category) {
      console.warn(`  ⚠ Category not found: ${categorySlug}`);
      continue;
    }
    
    await prisma.menuItem.upsert({
      where: { slug: itemData.slug },
      update: {},
      create: {
        ...itemData,
        categoryId: category.id,
      },
    });
  }
  console.log(`✅ ${menuItemsData.length} menu items created`);

  // ─── Customizations for some items ──────────────────
  const crispyBurger = await prisma.menuItem.findUnique({ where: { slug: 'crispy-chicken-burger' } });
  if (crispyBurger) {
    const sizeGroup = await prisma.customizationGroup.create({
      data: {
        name: 'Choose Size',
        menuItemId: crispyBurger.id,
        isRequired: true,
        isMultiple: false,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        options: {
          create: [
            { name: 'Regular', price: 0, isDefault: true, sortOrder: 0 },
            { name: 'Large', price: 60, isDefault: false, sortOrder: 1 },
          ],
        },
      },
    });

    await prisma.customizationGroup.create({
      data: {
        name: 'Extra Add-ons',
        menuItemId: crispyBurger.id,
        isRequired: false,
        isMultiple: true,
        minSelect: 0,
        maxSelect: 4,
        sortOrder: 1,
        options: {
          create: [
            { name: 'Extra Cheese', price: 40, sortOrder: 0 },
            { name: 'Jalapenos', price: 30, sortOrder: 1 },
            { name: 'Extra Sauce', price: 20, sortOrder: 2 },
            { name: 'Bacon', price: 60, sortOrder: 3 },
          ],
        },
      },
    });
  }

  const coldCoffee = await prisma.menuItem.findUnique({ where: { slug: 'classic-cold-coffee' } });
  if (coldCoffee) {
    await prisma.customizationGroup.create({
      data: {
        name: 'Choose Variant',
        menuItemId: coldCoffee.id,
        isRequired: true,
        isMultiple: false,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        options: {
          create: [
            { name: 'Classic', price: 0, isDefault: true, sortOrder: 0 },
            { name: 'Mocha', price: 30, isDefault: false, sortOrder: 1 },
            { name: 'Hazelnut', price: 40, isDefault: false, sortOrder: 2 },
          ],
        },
      },
    });
  }

  console.log('✅ Customization groups created');

  // ─── Print table QR tokens for dev ──────────────────
  console.log('\n📋 Table QR Tokens (for development):');
  const allTables = await prisma.table.findMany({ orderBy: { tableNumber: 'asc' } });
  for (const t of allTables) {
    console.log(`   ${t.displayName}: /menu?token=${t.qrToken}`);
  }

  console.log('\n🎉 Seeding complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
