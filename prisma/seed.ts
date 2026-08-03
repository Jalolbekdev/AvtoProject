import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedCategories = [
  { id: "c1", name: "Двигател қисмлари" },
  { id: "c2", name: "Мой" },
  { id: "c3", name: "Фильтрлар" },
  { id: "c4", name: "Тормоз тизими" },
  { id: "c5", name: "Электр қисмлари" },
  { id: "c6", name: "Подвеска" },
  { id: "c7", name: "Аксессуарлар" },
];

const seedProducts = [
  { id: "p1", barcode: "8600001", name: "Мотор мойи 5W-30 4л", model: "Shell Helix", categoryId: "c2", purchasePrice: 180000, sellingPrice: 240000, quantity: 25 },
  { id: "p2", barcode: "8600002", name: "Ҳаво фильтри", model: "Gentra / Cobalt", categoryId: "c3", purchasePrice: 35000, sellingPrice: 55000, quantity: 40 },
  { id: "p3", barcode: "8600003", name: "Мой фильтри", model: "Spark / Nexia 3", categoryId: "c3", purchasePrice: 25000, sellingPrice: 42000, quantity: 3 },
  { id: "p4", barcode: "8600004", name: "Тормоз колодкалари", model: "Lacetti / Gentra", categoryId: "c4", purchasePrice: 120000, sellingPrice: 180000, quantity: 15 },
  { id: "p5", barcode: "8600005", name: "Аккумулятор 60Аh", model: "Delkor", categoryId: "c5", purchasePrice: 650000, sellingPrice: 850000, quantity: 6 },
  { id: "p6", barcode: "8600006", name: "Свеча зажигание (4 дона)", model: "NGK Cobalt", categoryId: "c1", purchasePrice: 60000, sellingPrice: 95000, quantity: 30 },
  { id: "p7", barcode: "8600007", name: "Амортизатор олд", model: "Damas / Labo", categoryId: "c6", purchasePrice: 320000, sellingPrice: 460000, quantity: 8 },
  { id: "p8", barcode: "8600008", name: "Полиёл салфетка", model: "Universal", categoryId: "c7", purchasePrice: 8000, sellingPrice: 15000, quantity: 100 },
];

async function main() {
  console.log('Seeding database...');

  for (const cat of seedCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }

  for (const prod of seedProducts) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {},
      create: prod,
    });
  }

  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      storeName: "Авто Эҳтиёт Қисмлари До'кони",
      phone: "+998 90 123 45 67",
      address: "Тошкент шаҳри",
      employee: "Сотувчи",
    },
  });

  // Seed default users
  const defaultUsers = [
    { username: 'admin', password: 'admin', role: 'admin', name: 'Администратор' },
    { username: 'kassir', password: 'kassir', role: 'kassir', name: 'Кассир' },
    { username: 'sklad', password: 'sklad', role: 'sklad', name: 'Омборчи' },
  ];

  const crypto = require('crypto');
  for (const user of defaultUsers) {
    const hashedPassword = crypto.createHash('sha256').update(user.password).digest('hex');
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        password: hashedPassword,
        role: user.role,
        name: user.name,
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
