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
    { 
      name: 'Properties', 
      slug: 'properties', 
      icon: 'Home', 
      image: '/images/pexels-naveen-annam-734127-2002431.jpg',
      attributes: [
        { name: 'Bedrooms', type: 'number', required: false },
        { name: 'Bathrooms', type: 'number', required: false },
        { name: 'Floor Area (Sqft)', type: 'number', required: false },
        { name: 'Furnishing', type: 'select', options: 'Unfurnished, Semi-Furnished, Fully Furnished', required: false },
        { name: 'Parking Spaces', type: 'number', required: false }
      ],
      children: [
        { name: 'Houses & Villas', slug: 'houses-villas' },
        { name: 'Apartments & Condos', slug: 'apartments-condos' },
        { name: 'Bungalows', slug: 'bungalows' },
      ]
    },
    { 
      name: 'Lands', 
      slug: 'lands', 
      icon: 'Map', 
      image: '/images/pexels-jakub-pabis-147246622-19963719.jpg',
      attributes: [
        { name: 'Land Size (Perches)', type: 'number', required: true },
        { name: 'Deed Type', type: 'select', options: 'Clear Deed / Sinnakkara, Bim Saviya First Class, Freehold, Other', required: false },
        { name: 'Road Access Width', type: 'select', options: '12 Feet, 15 Feet, 20 Feet, 30+ Feet Main Road', required: false },
        { name: 'Electricity & Water', type: 'select', options: 'Both Available, Electricity Only, Water Only, Nearby', required: false }
      ],
      children: [
        { name: 'Commercial Lands', slug: 'commercial-lands' },
        { name: 'Residential Lands', slug: 'residential-lands' },
        { name: 'Agricultural Lands', slug: 'agricultural-lands' },
        { name: 'Beachfront Lands', slug: 'beachfront-lands' },
      ]
    },
    { 
      name: 'Rentals', 
      slug: 'rentals', 
      icon: 'Key', 
      image: '/images/pexels-the-ghazi-2152398165-33747708.jpg',
      attributes: [
        { name: 'Property Type', type: 'select', options: 'House, Apartment, Commercial Space, Annex', required: false },
        { name: 'Rental Term', type: 'select', options: 'Monthly, Yearly, Short-term', required: false },
        { name: 'Deposit Period', type: 'select', options: '3 Months, 6 Months, 1 Year', required: false }
      ],
      children: [
        { name: 'Houses for Rent', slug: 'houses-for-rent' },
        { name: 'Apartments for Rent', slug: 'apartments-for-rent' },
        { name: 'Commercial Spaces', slug: 'commercial-spaces' },
      ]
    },
    { 
      name: 'Commercial', 
      slug: 'commercial', 
      icon: 'Building', 
      image: '/images/pexels-nikitapishchugin-29282319.jpg',
      attributes: [
        { name: 'Floor Area (Sqft)', type: 'number', required: false },
        { name: 'Commercial Type', type: 'select', options: 'Office Space, Building, Retail / Shop, Warehouse, Hotel / Resort', required: false },
        { name: 'Floors', type: 'number', required: false }
      ],
      children: [
        { name: 'Commercial Buildings', slug: 'commercial-buildings' },
        { name: 'Office Spaces', slug: 'office-spaces' },
        { name: 'Retail & Shops', slug: 'retail-shops' },
        { name: 'Warehouses & Storage', slug: 'warehouses-storage' },
      ]
    },
  ];

  const createdCategories: any = {};
  for (const cat of categoriesData) {
    const { children, ...parentCatData } = cat;
    const upserted = await prisma.category.upsert({
      where: { slug: parentCatData.slug },
      update: {
        attributes: parentCatData.attributes,
      },
      create: parentCatData,
    });
    createdCategories[parentCatData.slug] = upserted.id;

    if (children && children.length > 0) {
      for (const child of children) {
        await prisma.category.upsert({
          where: { slug: child.slug },
          update: { parentId: upserted.id },
          create: {
            name: child.name,
            slug: child.slug,
            parentId: upserted.id,
            isActive: true,
          }
        });
      }
    }
  }
  console.log(`✅ Categories and subcategories seeded successfully.`);

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
    let condition = '';

    const district = getRandomItem(districts);
    const city = getRandomItem(cities[district as keyof typeof cities]);

    if (typeInt === 0) {
      typeSlug = 'properties';
      title = `Luxury House in ${city}`;
      description = `A beautiful and spacious luxury house located in ${city}, ${district}. It features modern architecture, large bedrooms, and a stunning garden perfect for families.`;
      price = Math.floor(Math.random() * 50000000) + 15000000;
      condition = getRandomItem(['Brand New', 'Ready to Move', 'Renovated / Existing', 'Fully Furnished']);
      attributes = { beds: Math.floor(Math.random() * 4) + 2, baths: Math.floor(Math.random() * 3) + 1, size: Math.floor(Math.random() * 3000) + 1000 + ' sqft' };
    } else if (typeInt === 1) {
      typeSlug = 'lands';
      title = `Prime Land for Sale in ${city}`;
      description = `Excellent investment opportunity! Prime land available in ${city}, ${district}. Perfect for residential or commercial development. Close to main roads and amenities.`;
      price = Math.floor(Math.random() * 20000000) + 5000000;
      condition = getRandomItem(['Bare Land', 'Ready to Build', 'Commercial Plot', 'Agricultural / Estate']);
      attributes = { size: (Math.floor(Math.random() * 100) + 10) + ' perches' };
    } else if (typeInt === 2) {
      typeSlug = 'rentals';
      title = `Modern Apartment for Rent in ${city}`;
      description = `Fully furnished modern apartment available for rent in the heart of ${city}, ${district}. Features amazing city views, 24/7 security, and a swimming pool.`;
      price = Math.floor(Math.random() * 150000) + 40000;
      condition = getRandomItem(['Fully Furnished', 'Semi-Furnished', 'Brand New']);
      attributes = { beds: Math.floor(Math.random() * 3) + 1, baths: Math.floor(Math.random() * 2) + 1, term: 'Per Month' };
    } else {
      typeSlug = 'commercial';
      title = `Premium Office Space in ${city}`;
      description = `Spacious and modern office space in a prime commercial area of ${city}, ${district}. Perfect for startups or corporate branches.`;
      price = Math.floor(Math.random() * 500000) + 100000;
      condition = getRandomItem(['Commercial Plot', 'Ready to Build', 'Brand New', 'Under Construction']);
      attributes = { size: (Math.floor(Math.random() * 5000) + 1000) + ' sqft', floor: Math.floor(Math.random() * 10) + 1 };
    }

    const baseSlug = slugify(title, { lower: true, strict: true }) + '-' + index;

    return {
      title,
      slug: baseSlug,
      description,
      price,
      condition,
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
