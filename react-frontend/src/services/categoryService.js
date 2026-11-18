/**
 * Category Management Service
 */

import { storageService } from './storageService.js';

export class CategoryService {
  constructor() {
    this.collectionName = 'CATEGORIES';
  }

  getCategories() {
    return storageService.getCollection(this.collectionName);
  }

  addCategory(categoryName) {
    const trimmed = String(categoryName || '').trim();
    if (!trimmed) return { success: false, message: 'Category name cannot be empty.' };

    const categories = this.getCategories();
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, message: 'Category already exists.' };
    }

    const updated = [...categories, trimmed];
    storageService.setCollection(this.collectionName, updated);
    return { success: true, category: trimmed, categories: updated };
  }

  deleteCategory(categoryName) {
    const categories = this.getCategories();
    const updated = categories.filter(c => c.toLowerCase() !== String(categoryName).trim().toLowerCase());
    storageService.setCollection(this.collectionName, updated);
    return { success: true, categories: updated };
  }

  getCategoryProductCounts() {
    const products = storageService.getCollection('PRODUCTS');
    const categories = this.getCategories();
    const counts = {};

    categories.forEach(cat => {
      counts[cat] = 0;
    });

    products.forEach(p => {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return counts;
  }
}

export const categoryService = new CategoryService();
