import React, { useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';

export const CustomersPage = () => {
  const { setCurrentPage } = useInventory();

  useEffect(() => {
    setCurrentPage('dashboard');
  }, [setCurrentPage]);

  return null;
};
