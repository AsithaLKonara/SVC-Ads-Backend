import { Request, Response } from 'express';
import prisma from '../utils/db';
import { getIO } from '../socket';
import { z } from 'zod';

const MessageSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(2),
});

export const createMessage = async (req: Request, res: Response) => {
  try {
    const data = MessageSchema.parse(req.body);
    const newMessage = await prisma.message.create({
      data,
    });

    const io = getIO();
    if (io) {
      io.emit('newMessage', newMessage);
    }

    res.status(201).json({ message: 'Message sent successfully', data: newMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      console.error('Create message error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = page ? parseInt(String(page)) : 1;
    const limitNumber = limit ? parseInt(String(limit)) : 50;
    const skip = (pageNumber - 1) * limitNumber;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        take: limitNumber,
        skip,
        include: { followups: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.message.count(),
    ]);

    res.json({
      data: messages,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const count = await prisma.message.count({
      where: { isRead: false }
    });
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const message = await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });
    res.json(message);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, note } = req.body;
    
    // Status should be PENDING, IN_PROGRESS, or RESOLVED
    const message = await prisma.$transaction(async (tx) => {
      const updatedMessage = await tx.message.update({
        where: { id },
        data: { status },
      });

      await tx.messageFollowup.create({
        data: {
          messageId: id,
          status,
          note: note || null,
        }
      });

      return tx.message.findUnique({
        where: { id },
        include: { followups: { orderBy: { createdAt: 'desc' } } }
      });
    });

    res.json(message);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

