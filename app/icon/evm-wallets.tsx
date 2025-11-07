export default function EVMWallets({ fillColor }: { fillColor: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={48}
      height={48}
      viewBox="0 0 20 20"
      fill="none"
      className="injected-svg"
      data-src="/icons/evm-wallets.svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      role="img"
      aria-label="evm-wallets"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    >
      <path d="M9.71408 2L5 9.82186L9.71408 12.6084L9.71412 7.67918L9.71408 2Z" fill={fillColor} />
      <path d="M9.71408 14.1421L9.65606 14.2129V17.8305L9.71408 18L14.431 11.357L9.71408 14.1421Z" fill={fillColor} />
      <path d="M9.71408 18V14.1421L5 11.357L9.71408 18Z" fill={fillColor} />
      <path d="M5 9.82186L9.71408 12.6084L9.71412 7.67918L5 9.82186Z" fill={fillColor} />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.71408 2L9.61111 2.34998V12.5056L9.71408 12.6084L9.71412 7.67918L9.71408 2Z"
        fill={fillColor}
      />
      <path d="M9.71408 12.6084L14.4282 9.82186L9.71412 7.67918L9.71408 12.6084Z" fill={fillColor} />
      <path d="M14.4282 9.82186L9.71408 2L9.71412 7.67918L14.4282 9.82186Z" fill={fillColor} />
    </svg>
  );
}
