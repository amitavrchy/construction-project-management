export const money = (minor: number, compact = false) => '৳' + new Intl.NumberFormat('en-BD', { maximumFractionDigits: compact ? 1 : 2, minimumFractionDigits: compact ? 0 : 2, ...(compact ? { notation: 'compact' as const } : {}) }).format(minor / 100);
export const number = (n: number) => new Intl.NumberFormat('en-BD', { maximumFractionDigits: 3 }).format(n);
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
export const readableDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(date));
export const label = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/Minor$/, '').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
