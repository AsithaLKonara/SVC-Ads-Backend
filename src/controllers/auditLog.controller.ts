import { Request, Response } from 'express';
import prisma from '../utils/db';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { entity, action, actorId, search, page, limit } = req.query;

    const pageNumber = page ? parseInt(String(page)) : 1;
    const limitNumber = limit ? parseInt(String(limit)) : 25;
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {};

    if (entity && entity !== 'All') where.entity = String(entity);
    if (action) where.action = String(action);
    if (actorId) where.actorId = String(actorId);
    if (search) {
      where.OR = [
        { entityName: { contains: String(search), mode: 'insensitive' } },
        { actorName: { contains: String(search), mode: 'insensitive' } },
        { action: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limitNumber,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      limit: limitNumber,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
