import prisma from './src/utils/db';

async function main() {
  const ads = await prisma.ad.findMany({
    where: {
      OR: [
        { district: { contains: 'ampara', mode: 'insensitive' } }
      ]
    }
  });
  console.log("Ads found by district:", ads.length);
  
  const adsByCity = await prisma.ad.findMany({
    where: {
      OR: [
        { city: { contains: 'akkaraipattu', mode: 'insensitive' } }
      ]
    }
  });
  console.log("Ads found by city:", adsByCity.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
