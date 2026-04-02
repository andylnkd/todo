'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SelectedItemsContextType {
  selectedItems: Set<string>;
  toggleItem: (actionItemId: string) => void;
  setItemsSelected: (actionItemIds: string[], selected: boolean) => void;
  clearSelection: () => void;
  isSelected: (actionItemId: string) => boolean;
}

const SelectedItemsContext = createContext<SelectedItemsContextType | undefined>(undefined);

export function SelectedItemsProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleItem = (actionItemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionItemId)) {
        newSet.delete(actionItemId);
      } else {
        newSet.add(actionItemId);
      }
      return newSet;
    });
  };

  const setItemsSelected = (actionItemIds: string[], selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      actionItemIds.forEach((actionItemId) => {
        if (selected) {
          newSet.add(actionItemId);
        } else {
          newSet.delete(actionItemId);
        }
      });
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const isSelected = (actionItemId: string) => {
    return selectedItems.has(actionItemId);
  };

  return (
    <SelectedItemsContext.Provider value={{ selectedItems, toggleItem, setItemsSelected, clearSelection, isSelected }}>
      {children}
    </SelectedItemsContext.Provider>
  );
}

export function useSelectedItems() {
  const context = useContext(SelectedItemsContext);
  if (context === undefined) {
    throw new Error('useSelectedItems must be used within a SelectedItemsProvider');
  }
  return context;
} 
