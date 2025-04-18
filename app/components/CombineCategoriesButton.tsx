'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combine } from 'lucide-react';
import { CombineCategoriesModal } from './CombineCategoriesModal';

interface Category {
  id: string;
  name: string;
  actionItems: {
    id: string;
    text: string;
    nextSteps: {
      id: string;
      text: string;
    }[];
  }[];
}

interface CombineCategoriesButtonProps {
  categories: Category[];
}

export function CombineCategoriesButton({ categories }: CombineCategoriesButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
      >
        <Combine className="h-4 w-4 mr-2" />
        Combine Categories
      </Button>

      <CombineCategoriesModal
        categories={categories}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          // Refresh the page to show updated categories
          window.location.reload();
        }}
      />
    </>
  );
} 