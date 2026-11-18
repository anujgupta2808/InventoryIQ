import React from 'react';
import { render } from '@testing-library/react';
import { InventoryProvider } from '../../src/context/InventoryContext';

export function renderWithInventory(ui, options = {}) {
  return render(
    <InventoryProvider>
      {ui}
    </InventoryProvider>,
    options
  );
}
