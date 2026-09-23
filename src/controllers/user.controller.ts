import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from '../utils/db';

const UpdateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'STAFF']),
});

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
});

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = CreateUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = UpdateRoleSchema.parse(req.body);

    // Prevent removing the last admin? Good practice, but omitted for brevity unless required.
    const user = await prisma.user.update({
      where: { id: id as string },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    res.status(200).json({ message: 'User role updated', user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent deleting oneself
    if (req.user?.userId === id) {
      res.status(400).json({ message: 'Cannot delete yourself' });
      return;
    }

    await prisma.user.delete({
      where: { id: id as string }
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
