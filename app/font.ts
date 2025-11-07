import localFont from 'next/font/local';

export const BrittiSans = localFont({
  src: [
    {
      path: '../public/fonts/Britti Sans Font Family/BrittiSansTrial-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/Britti Sans Font Family/BrittiSansTrial-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Britti Sans Font Family/BrittiSansTrial-Semibold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/Britti Sans Font Family/BrittiSansTrial-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-britti-sans',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

export const CommitMono = localFont({
  src: [
    {
      path: '../public/fonts/CommitMono/CommitMono-400-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/CommitMono/CommitMono-400-Italic.otf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../public/fonts/CommitMono/CommitMono-700-Regular.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/CommitMono/CommitMono-700-Italic.otf',
      weight: '700',
      style: 'italic',
    },
  ],
  variable: '--font-mono',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
