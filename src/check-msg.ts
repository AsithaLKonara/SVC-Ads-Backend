import prisma from './utils/db';
async function run() {
  const messages = await prisma.message.findMany();
  console.log('Messages in DB:', messages);
  process.exit(0);
}
run();
