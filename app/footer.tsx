import Image from 'next/image';

export default function Footer() {
  return (
    <div style={{ opacity: 1, transform: 'none' }}>
      <footer className="flex items-center justify-between p-6">
        <div className="flex flex-col gap-2">
          <a target="_blank" rel="noopener noreferrer" href="https://monad.xyz">
            <Image
              alt="Monad"
              loading="lazy"
              width={129}
              height={24}
              decoding="async"
              src="/icons/monad-logo-full.svg"
              style={{ color: 'transparent' }}
            />
          </a>
          <span className="text-xs text-gray-600">© 2025 Monad Foundation</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://x.com/monad"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            <span
              className="inline-flex shrink-0"
              draggable="false"
              style={{ width: 16, height: 16 }}
            >
              <span>
                <Image
                  alt="Twitter"
                  loading="lazy"
                  width={16}
                  height={16}
                  src="/icons/twitter.svg"
                />
              </span>
            </span>
          </a>
          <a
            href="https://discord.gg/monad"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            <span
              className="inline-flex shrink-0"
              draggable="false"
              style={{ width: 16, height: 16 }}
            >
              <span>
                <Image
                  alt="Discord"
                  loading="lazy"
                  width={16}
                  height={16}
                  src="/icons/discord.svg"
                />
              </span>
            </span>
          </a>
          <a
            href="https://www.youtube.com/@MonadFoundation"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            <span
              className="inline-flex shrink-0"
              draggable="false"
              style={{ width: 16, height: 16 }}
            >
              <span>
                <Image
                  alt="YouTube"
                  loading="lazy"
                  width={16}
                  height={16}
                  src="/icons/youtube.svg"
                />
              </span>
            </span>
          </a>
          <a
            href="https://www.instagram.com/monad.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            <span
              className="inline-flex shrink-0"
              draggable="false"
              style={{ width: 16, height: 16 }}
            >
              <span>
                <Image alt="Instagram" loading="lazy" width={16} height={16} src="/icons/ins.svg" />
              </span>
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}
