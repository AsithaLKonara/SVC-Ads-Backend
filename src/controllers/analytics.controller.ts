import { Request, Response } from 'express';
import prisma from '../utils/db';
import crypto from 'crypto';

export const trackVisit = async (req: Request, res: Response) => {
  try {
    const { path, adId, adSlug } = req.body;
    if (!path) {
      return res.status(400).json({ message: 'Path is required' });
    }

    let finalAdId = adId;

    if (!finalAdId && adSlug) {
      const ad = await prisma.ad.findUnique({ where: { slug: adSlug }, select: { id: true }});
      if (ad) finalAdId = ad.id;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Generate a unique session ID for the day based on IP and User-Agent
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hash = crypto.createHash('sha256');
    hash.update(`${ip}-${userAgent}-${today}`);
    const sessionId = hash.digest('hex');

    // Create SiteVisit record
    await prisma.siteVisit.create({
      data: {
        sessionId,
        path,
        adId: finalAdId || null,
      }
    });

    // If it's an ad visit, increment the views count on the Ad
    if (finalAdId) {
      // Check if we already incremented for this session to avoid spam (optional, but good practice)
      const existingVisit = await prisma.siteVisit.findFirst({
        where: {
          sessionId,
          adId: finalAdId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)) // start of today
          }
        }
      });

      // If existingVisit count is 1 (the one we just created), it means it's the first visit today
      const visitsToday = await prisma.siteVisit.count({
        where: { sessionId, adId: finalAdId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
      });

      if (visitsToday === 1) {
        await prisma.ad.update({
          where: { id: finalAdId },
          data: { views: { increment: 1 } }
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking visit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const { timeframe } = req.query; // '7d', '30d', '90d', 'all'
    
    let startDate: Date | undefined;
    const now = new Date();
    
    if (timeframe === '7d') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (timeframe === '30d') {
      startDate = new Date(now.setDate(now.getDate() - 30));
    } else if (timeframe === '90d') {
      startDate = new Date(now.setDate(now.getDate() - 90));
    }

    const whereClause = startDate ? { createdAt: { gte: startDate } } : {};

    // 1. Total Site Views
    const totalSiteViews = await prisma.siteVisit.count({ where: whereClause });

    // 2. Total Ad Views
    const totalAdViews = await prisma.siteVisit.count({
      where: {
        ...whereClause,
        adId: { not: null }
      }
    });

    // 3. Unique Visitors
    // Prisma doesn't have COUNT DISTINCT out of the box for string fields easily, so we can group by
    const uniqueVisitorsCount = await prisma.siteVisit.groupBy({
      by: ['sessionId'],
      where: whereClause,
      _count: { sessionId: true }
    });
    const uniqueVisitors = uniqueVisitorsCount.length;

    // 4. Traffic Over Time
    // Get all visits to aggregate by day
    const visits = await prisma.siteVisit.findMany({
      where: whereClause,
      select: { createdAt: true }
    });
    
    const trafficMap: Record<string, number> = {};
    visits.forEach(v => {
      const dateStr = v.createdAt.toISOString().split('T')[0];
      trafficMap[dateStr] = (trafficMap[dateStr] || 0) + 1;
    });

    const trafficOverTime = Object.keys(trafficMap).sort().map(date => ({
      date,
      views: trafficMap[date]
    }));

    // 5. Top Performing Ads
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 5;
    const topPerformingAds = await prisma.ad.findMany({
      take: limit,
      orderBy: { views: 'desc' },
      select: {
        id: true,
        title: true,
        views: true,
        price: true
      }
    });

    // 6. Total Listed Value (Sum of prices of all active ads)
    const activeAds = await prisma.ad.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { price: true }
    });
    const totalListedValue = activeAds._sum.price || 0;

    res.status(200).json({
      totalSiteViews,
      totalAdViews,
      uniqueVisitors,
      trafficOverTime,
      topPerformingAds,
      totalListedValue
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
