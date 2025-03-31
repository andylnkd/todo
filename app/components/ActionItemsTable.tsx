'use client'; // Make this a client component

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card, CardContent } from "./ui/card";
import EditableActionItem from './EditableActionItem'; // Import the new component
import { useRouter } from 'next/navigation'; // For refreshing data after update

// Define the detailed structure for a next step
interface NextStepDetail {
  id: string;
  text: string;
  completed: boolean; // Keep track of completion status
}

// Define the structure for an action item, containing its details and next steps
interface ActionItemWithNextSteps {
  actionItemId: string;
  actionItem: string;
  nextSteps: NextStepDetail[]; // Use the detailed structure
}

// Define the structure for a category, containing its details and action items
interface Category {
  id: string;
  name: string;
  items: ActionItemWithNextSteps[]; // Use the updated action item structure
}

// Define the props for the table component
interface ActionItemsTableProps {
  categories: Category[]; // Expect an array of the updated Category structure
}

const ActionItemsTable: React.FC<ActionItemsTableProps> = ({ categories }) => {
  const router = useRouter();

  // Function to handle saving category edits
  const handleSaveCategory = async (id: string, newName: string) => {
    // Call the API endpoint
    const response = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newName }),
    });

    if (!response.ok) {
      // Handle error (toast notification is handled within EditableActionItem)
      console.error('Failed to update category');
      throw new Error('Failed to update category'); // Propagate error to EditableActionItem
    }
    // Optionally refresh data or update state locally
    router.refresh(); // Simple refresh for now
  };

  // Function to handle saving action item edits
  const handleSaveActionItem = async (id: string, newText: string) => {
    // Call the API endpoint
    const response = await fetch('/api/action-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, actionItem: newText }), // Only updating text here
    });

    if (!response.ok) {
      // Handle error
      console.error('Failed to update action item');
      throw new Error('Failed to update action item');
    }
    // Optionally refresh data or update state locally
    router.refresh();
  };

  // Function to handle saving next step edits
  const handleSaveNextStep = async (id: string, newText: string) => {
    // Call the API endpoint
    const response = await fetch('/api/next-steps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, step: newText }),
    });

    if (!response.ok) {
      // Handle error
      console.error('Failed to update next step');
      throw new Error('Failed to update next step');
    }
    // Optionally refresh data or update state locally
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <Card key={category.id}> {/* Use category.id as key */}
          <CardContent className="p-0">
            <div className="bg-blue-50 p-4 border-b">
              {/* Use EditableActionItem for category name */}
              <EditableActionItem
                id={category.id}
                text={category.name}
                type="category"
                onSave={handleSaveCategory}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action Item</TableHead>
                  <TableHead>Next Steps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.items.map((item) => (
                  <TableRow key={item.actionItemId}> {/* Use item.actionItemId as key */}
                    <TableCell className="font-medium">
                      {/* Use EditableActionItem for action item text */}
                      <EditableActionItem
                        id={item.actionItemId}
                        text={item.actionItem}
                        type="actionItem"
                        onSave={handleSaveActionItem}
                      />
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside space-y-1">
                        {/* Map over the detailed next step objects */}
                        {item.nextSteps.map((nextStepObj) => (
                          <li key={nextStepObj.id}> {/* Use the next step ID */}
                            <EditableActionItem
                              id={nextStepObj.id}      // Pass ID
                              text={nextStepObj.text}    // Pass text
                              type="actionItem" // Consider a type="nextStep"?
                              onSave={handleSaveNextStep} // Use the correct handler
                            />
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ActionItemsTable; 