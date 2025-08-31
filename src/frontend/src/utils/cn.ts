/**
 * CSS 类名合并工具
 * 基于 clsx 和 tailwind-merge 实现
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 CSS 类名，支持条件类名和 Tailwind 类冲突解决
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
