import { CircleQuestionMark } from 'lucide-react';

import { useState } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function FAQ() {
  const [faqOpen, setFaqOpen] = useState(false);

  const ai = [
    {
      id: 0,
      question: 'How do I check if I am eligible for the MON airdrop?',
      answer:
        'Connect your wallets and accounts to reveal their eligibility status. Each eligible wallet and account adds to your claim strength.',
    },
    {
      id: 1,
      question: 'How does claim strength work?',
      answer:
        "Each eligible wallet and account connected to the claim portal adds to your claim strength. Your claim strength is indicative of the size of your airdrop. Your token allocation per eligible identifier doesn't change regardless of your strength level.",
    },
    {
      id: 2,
      question: 'Who is eligible?',
      answer: (
        <>
          Individuals of all sorts are eligible including members of the Monad community, Monad
          builders, onchain users and the broader crypto community. Eligible connections include EVM
          wallets, SVM wallets, X accounts, email addresses, Discord accounts, Telegram accounts and
          Farcaster accounts. You can read more about eligibility criteria at{' '}
          <a
            href="https://blog.monad.xyz/blog/the-mon-airdrop"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            https://blog.monad.xyz/blog/the-mon-airdrop
          </a>
        </>
      ),
    },
    {
      id: 3,
      question: 'Is my progress saved if I leave the claim?',
      answer:
        'Yes. Changes save automatically. You can come back to this page and connect other wallets and accounts until the end of the claim period.',
    },
    {
      id: 4,
      question: 'When does the claim period end?',
      answer:
        'The claim period ends on 2025-11-07, Eligible wallets and accounts which are not connected by such date will forfeit the ability to claim allocations in respect of those wallets or accounts.',
    },
    {
      id: 5,
      question: 'When will my allocation be revealed?',
      answer:
        'Your allocation will be revealed when the claim period ends on 2025-11-07, Users also have the option to reveal early, starting on 2025-11-07.',
    },
    {
      id: 6,
      question: 'When is the early reveal?',
      answer:
        'Early reveal begins on 2025-11-07, for users who choose to participate. Participation in the early reveal is optional and does not impact your airdrop allocation.',
    },
    {
      id: 7,
      question: 'Can I add more connections after revealing my allocation?',
      answer:
        'No. If you have more wallets or socials that are eligible, they will have to be used on a new account.',
    },
    {
      id: 8,
      question: 'Can I change my claim wallet after revealing my allocation?',
      answer:
        'Yes. You can change your claim wallet until the claim closes on Nov 3rd at 13:00 UTC.',
    },
    {
      id: 9,
      question: 'How do I claim my MON on Monad Mainnet?',
      answer:
        'Your MON tokens will be sent to your claim wallet immediately when Monad Mainnet launches. Initially, your claim wallet is the wallet you connected when you first entered the claim portal. You may change this by connecting a different EVM-compatible wallet in the upper right corner of this page at any time prior to the end of the claim period.',
    },
    {
      id: 10,
      question: 'What if my wallets are split across multiple devices?',
      answer:
        'You can complete the claim on each device separately. It will not affect your total claim strength.',
    },
  ];

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
          <Accordion type="single" collapsible className="w-full">
            {ai.map((item) => (
              <AccordionItem
                className="border-b last:border-b-0"
                key={item.id}
                value={item.id.toString()}
              >
                <AccordionTrigger className="cursor-pointer text-secondary font-medium text-base hover:text-primary hover:no-underline data-[state=open]:text-primary">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-4 text-secondary font-normal text-sm">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 relative text-white text-sm font-medium leading-5 rounded-full bg-radial-tertiary [&>*]:relative [&>*]:z-10 disabled:opacity-50 h-9.5 px-4 py-2 w-full">
            <span>Close</span>
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
