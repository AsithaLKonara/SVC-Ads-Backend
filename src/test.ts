import prisma from './utils/db';
async function run() {
  const messages = await prisma.message.findMany();
  console.log('Total Messages:', messages.length);
  process.exit(0);
}
run();
