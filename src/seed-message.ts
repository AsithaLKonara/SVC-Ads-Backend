import prisma from './utils/db';
async function run() {
  await prisma.message.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      subject: "Hello World",
      message: "This is a test message to ensure the dashboard displays messages correctly."
    }
  });
  console.log('Seeded 1 test message.');
  process.exit(0);
}
run();
