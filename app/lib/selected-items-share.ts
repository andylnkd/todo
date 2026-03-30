export interface ShareNextStep {
  text: string;
  completed: boolean;
  dueDate?: Date | string | null;
}

export interface ShareItem {
  actionItemId: string;
  actionItem: string;
  dueDate?: Date | string | null;
  priority?: 'high' | 'normal' | 'low';
  nextSteps: ShareNextStep[];
}

export interface ShareCategory {
  name: string;
  items: ShareItem[];
}

function priorityWeight(priority?: 'high' | 'normal' | 'low') {
  switch (priority) {
    case 'high':
      return 0;
    case 'low':
      return 2;
    default:
      return 1;
  }
}

function priorityLabel(priority?: 'high' | 'normal' | 'low') {
  switch (priority) {
    case 'high':
      return 'High';
    case 'low':
      return 'Low';
    default:
      return 'Normal';
  }
}

export function getItemDueDate(item: ShareItem): Date | null {
  if (item.dueDate) {
    return new Date(item.dueDate);
  }

  let earliest: Date | null = null;
  for (const step of item.nextSteps) {
    if (!step.dueDate) {
      continue;
    }
    const candidate = new Date(step.dueDate);
    if (!earliest || candidate < earliest) {
      earliest = candidate;
    }
  }

  return earliest;
}

export function getSelectedCategoriesForShare(categories: ShareCategory[], selectedItems: Set<string>) {
  return categories
    .map((category) => ({
      ...category,
      items: category.items
        .filter((item) => selectedItems.has(item.actionItemId))
        .sort((a, b) => {
          const dueDateA = getItemDueDate(a);
          const dueDateB = getItemDueDate(b);

          if (dueDateA && !dueDateB) return -1;
          if (!dueDateA && dueDateB) return 1;
          if (dueDateA && dueDateB) {
            const dateDiff = dueDateA.getTime() - dueDateB.getTime();
            if (dateDiff !== 0) return dateDiff;
          }

          const priorityDiff = priorityWeight(a.priority) - priorityWeight(b.priority);
          if (priorityDiff !== 0) return priorityDiff;

          return a.actionItem.localeCompare(b.actionItem);
        }),
    }))
    .filter((category) => category.items.length > 0);
}

export function formatSelectedItemsText(categories: ShareCategory[], selectedItems: Set<string>, title = 'Selected Action Items') {
  const selectedCategories = getSelectedCategoriesForShare(categories, selectedItems);
  if (selectedCategories.length === 0) {
    return null;
  }

  let text = `${title}\n\n`;

  for (const category of selectedCategories) {
    text += `${category.name}\n`;
    for (const item of category.items) {
      const dueDate = getItemDueDate(item);
      const dueDateText = dueDate ? ` | Due ${dueDate.toLocaleDateString()}` : '';
      text += `- ${item.actionItem} | ${priorityLabel(item.priority)}${dueDateText}\n`;
      for (const step of item.nextSteps) {
        const stepStatus = step.completed ? '[x]' : '[ ]';
        const stepDueDate = step.dueDate ? ` (Due ${new Date(step.dueDate).toLocaleDateString()})` : '';
        text += `  ${stepStatus} ${step.text}${stepDueDate}\n`;
      }
      text += '\n';
    }
  }

  return text.trim();
}
