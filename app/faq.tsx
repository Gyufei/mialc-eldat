 'use client';

import { CircleQuestionMark } from 'lucide-react';

import { useEffect, useState } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type FaqItem = {
  id: number;
  question: string;
  answer: string;
  linkUrl?: string;
};

export default function FAQ() {
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaq = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/faq');
        if (!res.ok) {
          throw new Error('Failed to load FAQ');
        }
        const data = (await res.json()) as FaqItem[];
        setFaqItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load FAQ');
      } finally {
        setLoading(false);
      }
    };

    fetchFaq();
  }, []);

  return (
    <>
      <button
        onClick={() => setFaqOpen(true)}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans rounded-full transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 w-fit h-8 sm:w-20"
      >
        <span className="flex flex-row items-center gap-2 text-secondary">
          <CircleQuestionMark className="w-4 h-4" />
          <span className="hidden sm:inline">FAQ</span>
        </span>
      </button>
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="py-8 px-6 border-border outline-none overflow-y-auto max-h-[90vh] flex-col gap-6 sm:max-w-md shadow-[0_-10px_50px_0_rgba(154,137,230,0.20)_inset,0_10px_15px_-3px_rgba(0,0,0,0.10),0_4px_6px_-2px_rgba(0,0,0,0.05)]">
          <DialogHeader className="flex flex-col text-center sm:text-left gap-1.5">
            <DialogTitle className="text-2xl font-semibold text-foreground text-left">
              Frequently Asked Questions
            </DialogTitle>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive">Failed to load FAQ: {error}</p>
          )}
          {!error && (
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem
                  className="border-b last:border-b-0"
                  key={item.id}
                  value={item.id.toString()}
                >
                  <AccordionTrigger className="cursor-pointer text-secondary font-medium text-base hover:text-primary hover:no-underline data-[state=open]:text-primary">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-4 text-secondary font-normal text-sm">
                    {item.linkUrl ? (
                      <>
                        {item.answer}{' '}
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80"
                        >
                          {item.linkUrl}
                        </a>
                      </>
                    ) : (
                      item.answer
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
              {!loading && faqItems.length === 0 && (
                <p className="text-sm text-secondary">No FAQ available.</p>
              )}
            </Accordion>
          )}
          <button
            onClick={() => setFaqOpen(false)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-tertiary [&>*]:relative [&>*]:z-10 disabled:opacity-50 h-9.5 px-4 py-2 w-full"
          >
            <span>Close</span>
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

