export default function Email({ fillColor }: { fillColor: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={48}
      height={48}
      viewBox="0 0 17 16"
      fill="none"
      className="injected-svg"
      data-src="/icons/email.svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label="email"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    >
      <path
        d="M15.1666 4.66797L9.18659 8.46797C8.98077 8.59692 8.7428 8.66531 8.49992 8.66531C8.25704 8.66531 8.01907 8.59692 7.81325 8.46797L1.83325 4.66797M3.16659 2.66797H13.8333C14.5696 2.66797 15.1666 3.26492 15.1666 4.0013V12.0013C15.1666 12.7377 14.5696 13.3346 13.8333 13.3346H3.16659C2.43021 13.3346 1.83325 12.7377 1.83325 12.0013V4.0013C1.83325 3.26492 2.43021 2.66797 3.16659 2.66797Z"
        stroke={fillColor}
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
