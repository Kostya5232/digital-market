import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const [u1, u2] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'u1@example.com' },
      update: {},
      create: {
        email: 'u1@example.com',
        username: 'user1',
        passwordHash: password,
        role: 'USER'
      }
    }),
    prisma.user.upsert({
      where: { email: 'u2@example.com' },
      update: {},
      create: {
        email: 'u2@example.com',
        username: 'user2',
        passwordHash: password,
        role: 'USER'
      }
    })
  ]);

  await prisma.item.createMany({
    data: [
      {
        title: 'Indie Audio Pack',
        description: '10 background music tracks (royalty-free)',
        price: new Prisma.Decimal(19.99),
        sellerId: u1.id,
        status: 'LISTED'
      },
      {
        title: 'Game Key: Space Odyssey',
        description: 'One-time activation, region free',
        price: new Prisma.Decimal(9.99),
        sellerId: u1.id,
        status: 'LISTED'
      },
      {
        title: 'UI Kit (Figma)',
        description: 'Beautiful UI kit for dashboards',
        price: new Prisma.Decimal(14.50),
        sellerId: u2.id,
        status: 'LISTED'
      }
    ]
  });

  console.log('Seed complete. Users: u1@example.com / u2@example.com, password: password123');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
