import { Request, Response } from 'express';
import prisma from '../utils/db';

export const getLocations = async (req: Request, res: Response) => {
  try {
    // We get unique district and city combinations from ads.
    // Group by district and city, and count the active ads in each.
    const groupedLocations = await prisma.ad.groupBy({
      by: ['district', 'city'],
      _count: {
        id: true,
      },
      where: {
        status: 'ACTIVE',
      },
      orderBy: [
        { district: 'asc' },
        { city: 'asc' },
      ],
    });

    res.json(groupedLocations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
