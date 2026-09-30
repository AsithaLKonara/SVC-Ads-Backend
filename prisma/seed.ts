import prisma from '../src/utils/db';
import bcrypt from 'bcrypt';
import slugify from 'slugify';

async function main() {
  const adminEmail = 'admin@laklandreality.com';
  
  let existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    existingAdmin = await prisma.user.create({
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

  const userId = existingAdmin.id;

  // Categories
  const categoriesData = [
    { name: 'Properties', slug: 'properties', icon: 'Home', image: '/images/pexels-naveen-annam-734127-2002431.jpg' },
    { name: 'Lands', slug: 'lands', icon: 'Map', image: '/images/pexels-jakub-pabis-147246622-19963719.jpg' },
    { name: 'Rentals', slug: 'rentals', icon: 'Key', image: '/images/pexels-the-ghazi-2152398165-33747708.jpg' },
    { name: 'Commercial', slug: 'commercial', icon: 'Building', image: '/images/pexels-nikitapishchugin-29282319.jpg' },
  ];

  const createdCategories: any = {};
  for (const cat of categoriesData) {
    const upserted = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCategories[cat.slug] = upserted.id;
  }
  console.log(`✅ Categories seeded successfully.`);

  // Ads Generation
  const districts = ['Colombo', 'Gampaha', 'Kandy', 'Galle', 'Kurunegala'];
  const cities = {
    Colombo: ['Colombo 1', 'Mount Lavinia', 'Moratuwa', 'Nugegoda'],
    Gampaha: ['Negombo', 'Kelaniya', 'Wattala', 'Gampaha'],
    Kandy: ['Kandy City', 'Peradeniya', 'Katugastota'],
    Galle: ['Galle Fort', 'Hikkaduwa', 'Unawatuna'],
    Kurunegala: ['Kurunegala City', 'Kuliyapitiya', 'Narammala']
  };

  const getRandomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

  const generateAd = (index: number) => {
    const isFeatured = index <= 5; // First 5 are featured
    const typeInt = index % 4;
    let typeSlug = '';
    let title = '';
    let description = '';
    let attributes = {};
    let price = 0;

    const district = getRandomItem(districts);
    const city = getRandomItem(cities[district as keyof typeof cities]);

    if (typeInt === 0) {
      typeSlug = 'properties';
      title = `Luxury House in ${city}`;
      description = `A beautiful and spacious luxury house located in ${city}, ${district}. It features modern architecture, large bedrooms, and a stunning garden perfect for families.`;
      price = Math.floor(Math.random() * 50000000) + 15000000;
      attributes = { beds: Math.floor(Math.random() * 4) + 2, baths: Math.floor(Math.random() * 3) + 1, size: Math.floor(Math.random() * 3000) + 1000 + ' sqft' };
    } else if (typeInt === 1) {
      typeSlug = 'lands';
      title = `Prime Land for Sale in ${city}`;
      description = `Excellent investment opportunity! Prime land available in ${city}, ${district}. Perfect for residential or commercial development. Close to main roads and amenities.`;
      price = Math.floor(Math.random() * 20000000) + 5000000;
      attributes = { size: (Math.floor(Math.random() * 100) + 10) + ' perches' };
    } else if (typeInt === 2) {
      typeSlug = 'rentals';
      title = `Modern Apartment for Rent in ${city}`;
      description = `Fully furnished modern apartment available for rent in the heart of ${city}, ${district}. Features amazing city views, 24/7 security, and a swimming pool.`;
      price = Math.floor(Math.random() * 150000) + 40000;
      attributes = { beds: Math.floor(Math.random() * 3) + 1, baths: Math.floor(Math.random() * 2) + 1, term: 'Per Month' };
    } else {
      typeSlug = 'commercial';
      title = `Premium Office Space in ${city}`;
      description = `Spacious and modern office space in a prime commercial area of ${city}, ${district}. Perfect for startups or corporate branches.`;
      price = Math.floor(Math.random() * 500000) + 100000;
      attributes = { size: (Math.floor(Math.random() * 5000) + 1000) + ' sqft', floor: Math.floor(Math.random() * 10) + 1 };
    }

    const baseSlug = slugify(title, { lower: true, strict: true }) + '-' + index;

    return {
      title,
      slug: baseSlug,
      description,
      price,
      condition: 'New',
      images: [`/seed-images/${index}.jpg`],
      isFeatured,
      contactPhone: '0712345678',
      attributes,
      district,
      city,
      categoryId: createdCategories[typeSlug],
      userId: userId,
      status: 'ACTIVE' as const,
    };
  };

  const adsToCreate = [];
  for (let i = 1; i <= 25; i++) {
    adsToCreate.push(generateAd(i));
  }

  let createdCount = 0;
  for (const adData of adsToCreate) {
    const exists = await prisma.ad.findUnique({ where: { slug: adData.slug } });
    if (!exists) {
      await prisma.ad.create({ data: adData });
      createdCount++;
    }
  }

  console.log(`✅ ${createdCount} ads seeded successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
