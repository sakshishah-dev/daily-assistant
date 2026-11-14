import { Pill, Sparkles, Repeat, ListChecks } from 'lucide-react';
import type { Category } from '../../types';

/** Small line icon for a reminder category (medicine, habit, routine, task). */
export default function CategoryIcon({ category, size = 18 }: { category: Category; size?: number }) {
  const Icon = category === 'medicine' ? Pill : category === 'habit' ? Sparkles : category === 'routine' ? Repeat : ListChecks;
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" />;
}
