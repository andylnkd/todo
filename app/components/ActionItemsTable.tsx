import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card, CardContent } from "./ui/card";

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
        <Card key={categoryIndex}>
          <CardContent className="p-0">
            <div className="bg-blue-50 p-4 border-b">
              <h2 className="text-lg font-semibold text-blue-900">{category.name}</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action Item</TableHead>
                  <TableHead>Next Steps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.items.map((item, itemIndex) => (
                  <TableRow key={itemIndex}>
                    <TableCell className="font-medium">{item.actionItem}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside space-y-1">
                        {item.nextSteps.map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
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