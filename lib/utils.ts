import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 

// Emoji mapping function
export function getEmojiForCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/(google|roadmap|work|GLVM|office|job|project)/.test(lower)) return '💼';
  if (/startup|business|company|entrepreneur|founder|investor|vc|venture|angel|fund|seed|seriesd/.test(lower)) return '🚀';
  if (/(personal|home|family)/.test(lower)) return '🏠';
  if (/(sport|game|fitness|exercise)/.test(lower)) return '🏅';
  if (/(health|doctor|wellness|medicine)/.test(lower)) return '🩺';
  return '👨';
} 