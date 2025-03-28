import React from 'react';

interface NextStep {
  actionItem: string;
  nextSteps: string[];
}

interface Category {
  name: string;
  items: NextStep[];
}

interface ActionItemsTableProps {
  categories: Category[];
}

const ActionItemsTable: React.FC<ActionItemsTableProps> = ({ categories }) => {
  return (
    <div className="space-y-6">
      {categories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="bg-white rounded-lg shadow">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h2 className="text-xl font-semibold">{category.name}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Steps
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {category.items.map((item, itemIndex) => (
                  <tr key={itemIndex}>
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="text-sm text-gray-900">{item.actionItem}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-normal">
                      <ul className="list-disc list-inside text-sm text-gray-900">
                        {item.nextSteps.map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActionItemsTable; 