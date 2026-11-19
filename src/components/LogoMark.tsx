import Image from "next/image";

/**
 * SupportIQ mark (indigo tile, chat bubble, AI sparkle). Generated with ChatGPT;
 * the master file is brand/supportiq-logo.png and every size is built by
 * scripts/make_icons.py.
 */
export function LogoMark({ className = "size-8", title }: { className?: string; title?: string }) {
  return <Image src="/logo-mark.png" alt={title ?? ""} width={128} height={128} className={className} priority />;
}
