import { type ClassValue, clsx } from 'clsx';
import numbro from 'numbro';
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

export function formatNumber(num: string | number) {
  if (isNaN(Number(num))) {
    return String(num);
  }

  return numbro(num).format({
    thousandSeparated: true,
    mantissa: 4,
    trimMantissa: true,
    roundingFunction: Math.floor,
  });
}
