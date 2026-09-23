import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/db';
import crypto from 'crypto';
import { logAuditEvent } from '../utils/audit';
// import nodemailer from 'nodemailer'; // Skipping actual email transport for mockup

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

// Validation Schemas
const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = RegisterSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // By default, open registrations become STAFF. Only ADMIN can promote to ADMIN.
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STAFF',
      },
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const expiresIn = rememberMe ? '30d' : '24h';

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn }
    );

    await logAuditEvent({
      action: 'AUTH_LOGIN',
      entity: 'User',
      entityId: user.id,
      entityName: user.name,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return 200 even if user not found to prevent email enumeration
      res.status(200).json({ message: 'If an account exists, a reset link was sent' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Mock sending email
    console.log(`[Email Mock] To: ${email}, Reset Token: ${resetToken}`);
    // In production, use nodemailer to send an actual link: http://frontend/reset-password?token=${resetToken}

    res.status(200).json({ message: 'If an account exists, a reset link was sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // token hasn't expired
        },
      },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};
