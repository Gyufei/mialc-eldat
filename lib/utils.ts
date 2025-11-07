import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtAddr(
  address: string,
  args: {
    prefix: number;
    suffix: number;
  } = {
    prefix: 5,
    suffix: 4,
  }
) {
  if (!address) return '';
  if (address.length < args.prefix + args.suffix) return address;
  return `${address.slice(0, args.prefix)}...${address.slice(-args.suffix)}`;
}
