export default function CusChevronDown({ strokeColor }: { strokeColor: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 14 14"
      fill="none"
      className="injected-svg"
      data-src="/icons/chevron-down.svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label="chevron-down"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke={strokeColor} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
  );
}
