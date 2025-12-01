import faq from '@/data/faq.json';

export async function GET() {
  return Response.json(faq);
}


