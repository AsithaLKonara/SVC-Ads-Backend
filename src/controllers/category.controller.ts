import { Request, Response } from 'express';
import prisma from '../utils/db';

// Public: Get all active top-level categories with their children
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      include: {
        children: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// Admin: Get all top-level categories with children counts
export const getAdminCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null,
      },
      include: {
        _count: {
          select: { children: true },
        },
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin categories' });
  }
};

// Admin: Create a new category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, description, icon, parentId, isActive, sortOrder, attributes } = req.body;
    
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      res.status(400).json({ message: 'Category with this slug already exists' });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        icon,
        parentId: parentId || null,
        isActive: isActive ?? true,
        sortOrder: sortOrder || 0,
        attributes: attributes || null,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create category' });
  }
};

// Admin: Update a category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, slug, description, icon, parentId, isActive, sortOrder, attributes } = req.body;

    if (slug) {
      const existing = await prisma.category.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) {
        res.status(400).json({ message: 'Category with this slug already exists' });
        return;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        icon,
        parentId: parentId !== undefined ? parentId : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        attributes: attributes !== undefined ? attributes : undefined,
      },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update category' });
  }
};

// Admin: Delete a category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Check for children
    const childrenCount = await prisma.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      res.status(400).json({ message: 'Cannot delete category with subcategories' });
      return;
    }

    // Since we don't have Ads yet, we skip checking for ads
    await prisma.category.delete({
      where: { id },
    });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

// Admin: Toggle category active status
export const toggleCategoryActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: { isActive },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle category status' });
  }
};
