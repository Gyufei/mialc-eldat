export default function EligibleBadge() {
  return (
    <div
      className="border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent text-primary-foreground rounded-[0.375rem] shrink-0 bg-primary-foreground p-1 flex items-center gap-1 hover:bg-button-secondary"
      title="Not eligible for airdrop"
    >
      <p className="text-2xs font-semibold text-secondary">NOT ELIGIBLE</p>
    </div>
  );
}
