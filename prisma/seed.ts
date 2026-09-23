import prisma from '../src/utils/db';
import bcrypt from 'bcrypt';

async function main() {
  const adminEmail = 'admin@laklandreality.com';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        password: hashedPassword,
        role: 'ADMIN',
      }
    });

    console.log(`✅ Admin user seeded successfully. Email: ${adminEmail}`);
  } else {
    console.log(`⚠️ Admin user already exists. Email: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
