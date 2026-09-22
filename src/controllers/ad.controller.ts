import { Request, Response } from 'express';
import prisma from '../utils/db';
import slugify from 'slugify';

export const createAd = async (req: Request, res: Response) => {
  try {
    const { title, description, price, condition, images, district, city, categoryId, status, isFeatured, contactPhone, attributes } = req.body;
    
    // User from auth middleware
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Generate unique slug
    let baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.ad.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newAd = await prisma.ad.create({
      data: {
        title,
        slug,
        description,
        price: parseFloat(price),
        condition,
        images: images || [],
        district,
        city,
        categoryId,
        userId,
        status: status || 'ACTIVE',
        isFeatured: isFeatured || false,
        contactPhone: contactPhone || null,
        attributes: attributes || null,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json(newAd);
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAds = async (req: Request, res: Response) => {
  try {
    const { category, district, city, status, isFeatured, limit } = req.query;

    const where: any = {};
    if (category) {
      // Find category and its children to filter
      const cat = await prisma.category.findUnique({
        where: { slug: String(category) },
        include: { children: true }
      });
      if (cat) {
        const categoryIds = [cat.id, ...cat.children.map((c: any) => c.id)];
        where.categoryId = { in: categoryIds };
      }
    }
    if (district) where.district = String(district);
    if (city) where.city = String(city);
    if (status) where.status = String(status);
    if (isFeatured === 'true') where.isFeatured = true;

    const ads = await prisma.ad.findMany({
      where,
      take: limit ? parseInt(String(limit)) : undefined,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(ads);
  } catch (error) {
    console.error('Get ads error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdByIdOrSlug = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const idString = String(identifier);
    
    // Check if identifier is a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idString);
    
    const ad = await prisma.ad.findUnique({
      where: isUuid ? { id: idString } : { slug: idString },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    res.json(ad);
  } catch (error) {
    console.error('Get ad error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAd = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { title, description, price, condition, images, district, city, categoryId, status, isFeatured, contactPhone, attributes } = req.body;
    
    // Check if ad exists
    const existingAd = await prisma.ad.findUnique({ where: { id } });
    if (!existingAd) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    const data: any = {
      title,
      description,
      condition,
      district,
      city,
      categoryId,
    };

    if (price !== undefined) data.price = parseFloat(price);
    if (images) data.images = images;
    if (status) data.status = status;
    if (isFeatured !== undefined) data.isFeatured = isFeatured;
    if (contactPhone !== undefined) data.contactPhone = contactPhone;
    if (attributes !== undefined) data.attributes = attributes;

    // If title changed, update slug
    if (title && title !== existingAd.title) {
      let baseSlug = slugify(title, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;

      while (await prisma.ad.findFirst({ where: { slug, id: { not: id } } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      data.slug = slug;
    }

    const updatedAd = await prisma.ad.update({
      where: { id },
      data,
      include: {
        category: true
      }
    });

    res.json(updatedAd);
  } catch (error) {
    console.error('Update ad error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleAdStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updatedAd = await prisma.ad.update({
      where: { id },
      data: { status },
    });

    res.json(updatedAd);
  } catch (error) {
    console.error('Toggle ad status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteAd = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    
    await prisma.ad.delete({ where: { id } });
    
    res.json({ message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
