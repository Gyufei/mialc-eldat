export const dynamic = 'force-dynamic';

export async function GET() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isPreview = process.env.NEXT_PUBLIC_IS_PREVIEW === '1';
  const isProd = isProduction && !isPreview;

  // 在目标域名下，禁止所有爬虫抓取整站
  if (!isProd) {
    const content = ['User-agent: *', 'Disallow: /'].join('\n');
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  // 默认允许抓取（如果你需要更细的规则，可在此扩展）
  const defaultContent = ['User-agent: *', 'Allow: /'].join('\n');

  return new Response(defaultContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
