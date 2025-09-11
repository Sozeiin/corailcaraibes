import { useState, useEffect } from 'react';

const CATEGORIES_ORDER_KEY = 'checklist_categories_order';

export function useCategoriesOrder() {
  const [categoriesOrder, setCategoriesOrder] = useState<string[]>([]);

  // Load order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem(CATEGORIES_ORDER_KEY);
    if (savedOrder) {
      try {
        setCategoriesOrder(JSON.parse(savedOrder));
      } catch (error) {
        console.error('Error parsing categories order from localStorage:', error);
      }
    }
  }, []);

  // Save order to localStorage
  const saveOrder = (order: string[]) => {
    setCategoriesOrder(order);
    localStorage.setItem(CATEGORIES_ORDER_KEY, JSON.stringify(order));
  };

  // Sort categories according to saved order, with fallback to alphabetical
  const sortCategories = (categories: string[]): string[] => {
    if (categoriesOrder.length === 0) {
      return [...categories].sort();
    }

    const ordered = [...categoriesOrder];
    const newCategories = categories.filter(cat => !ordered.includes(cat));
    
    // Add new categories at the end
    return [...ordered.filter(cat => categories.includes(cat)), ...newCategories.sort()];
  };

  // Update order with new categories if they don't exist
  const updateOrderWithNewCategories = (categories: string[]) => {
    if (categories.length === 0) return;
    
    const currentOrder = categoriesOrder.length > 0 ? categoriesOrder : [];
    const newCategories = categories.filter(cat => !currentOrder.includes(cat));
    
    // Only save if there are actually new categories to add
    if (newCategories.length > 0) {
      const existingOrderedCategories = currentOrder.filter(cat => categories.includes(cat));
      const updatedOrder = [...existingOrderedCategories, ...newCategories.sort()];
      saveOrder(updatedOrder);
    } else if (currentOrder.length === 0 && categories.length > 0) {
      // Initial setup - save all categories in alphabetical order
      saveOrder([...categories].sort());
    }
  };

  return {
    categoriesOrder,
    saveOrder,
    sortCategories,
    updateOrderWithNewCategories,
  };
}