import { Box, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type SeasonBoxProps = {
  isActive: boolean;
  seasonIndex: number;
  isSelected: boolean;
  onSelectSeason: (seasonIndex: number) => void;
  currentWeek: number;
  totalWeeks: number;
  onChangeCurrentWeek: (week: number) => void;
};

export default function SeasonBox({
  isActive,
  seasonIndex,
  isSelected,
  onSelectSeason,
  totalWeeks,
  currentWeek,
  onChangeCurrentWeek,
}: SeasonBoxProps) {
  const handleSelectDay = () => {
    if (!isActive) {
      return;
    }

    onSelectSeason(seasonIndex);
  };

  function handleNextWeek() {
    if (!isActive || currentWeek === totalWeeks) {
      return;
    }

    const newCurrentWeek = Math.min(totalWeeks, currentWeek + 1);
    onChangeCurrentWeek(newCurrentWeek);
  }

  function handlePreviousWeek() {
    if (!isActive || currentWeek === 1) {
      return;
    }

    const newCurrentWeek = Math.max(1, currentWeek - 1);
    onChangeCurrentWeek(newCurrentWeek);
  }

  return (
    <div className="flex w-full flex-col items-center gap-6 text-center md:flex-1">
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            'flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 bg-black/30 backdrop-blur-sm transition-all duration-300',
            isActive
              ? 'border-[#7D6BF1] shadow-[inset_0_2px_18px_rgba(114,108,169,0.35)]'
              : 'border-border'
          )}
        >
          <span
            className={cn(
              'text-[11px] uppercase',
              isSelected ? 'text-primary opacity-80' : 'text-tertiary'
            )}
          >
            Season
          </span>
          <span
            className={cn(
              'text-xl font-semibold leading-5',
              isSelected ? 'text-white' : isActive ? 'text-primary' : 'text-secondary',
              isActive ? '' : 'opacity-70'
            )}
          >
            {seasonIndex}
          </span>
        </div>
        <button
          onClick={handleSelectDay}
          type="button"
          disabled={!isActive}
          className={cn(
            'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-sm font-medium transition-colors duration-200 group',
            isActive
              ? 'text-[#5C5B5E] cursor-pointer hover:text-primary shadow-[inset_0_2px_18px_rgba(114,108,169,0.35)]'
              : 'text-tertiary cursor-not-allowed opacity-60'
          )}
        >
          <ChevronRight className="h-4 w-4 rotate-180" onClick={handlePreviousWeek} />
          {isActive ? (
            <>
              <span className="text-white">{currentWeek}</span>
              <span className="text-[#5C5B5E] group-hover:text-white">/ {totalWeeks}</span>
            </>
          ) : (
            <>
              <Box className="h-4 w-4" />
              <span className="text-[#5C5B5E]">?</span>
            </>
          )}
          <ChevronRight className="h-4 w-4" onClick={handleNextWeek} />
        </button>
      </div>
    </div>
  );
}
