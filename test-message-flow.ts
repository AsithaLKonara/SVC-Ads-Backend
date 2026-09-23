import prisma from './src/utils/db';

async function main() {
  console.log('Testing Database Connection and Message Table...');
  
  // 1. Create a test message
  console.log('\n1. Creating a new message...');
  const newMessage = await prisma.message.create({
    data: {
      name: 'System Test User',
      email: 'test@example.com',
      subject: 'Flow Verification',
      message: 'This is an automated test message to verify the DB flow.',
    }
  });
  console.log('Created Message:', newMessage);

  // 2. Fetch all messages (simulating Admin Dashboard)
  console.log('\n2. Fetching messages...');
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent Messages:', messages);

  // 3. Check Unread Count
  console.log('\n3. Checking unread count...');
  const unreadCount = await prisma.message.count({
    where: { isRead: false }
  });
  console.log('Unread Count:', unreadCount);

  // 4. Clean up the test message
  console.log('\n4. Cleaning up test message...');
  await prisma.message.delete({
    where: { id: newMessage.id }
  });
  console.log('Cleanup complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
