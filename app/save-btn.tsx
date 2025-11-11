import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SaveBtn() {
  function handleSave() {
    toast.info('Your progress was saved.');
  }

  return (
    <button
      onClick={handleSave}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-britti-sans transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 text-white text-sm font-medium leading-5 bg-radial-tertiary [&>*]:relative [&>*]:z-10 disabled:opacity-50 fixed bottom-8 right-8 z-50 size-10 p-0 rounded-full shadow-lg"
    >
      <span>
        <Save className="w-5 h-5" />
      </span>
    </button>
  );
}
