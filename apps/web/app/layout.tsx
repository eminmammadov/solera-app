import type {Metadata} from 'next';
import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: "Solera — MEME Staking Platform on Solana",
  description: "Stake meme tokens and earn RA rewards on Solera. Real-time market data, portfolio tracking, and DeFi staking on Solana.",
  keywords: ["solera", "staking", "meme tokens", "solana", "defi", "RA token", "crypto"],
  openGraph: {
    title: "Solera — MEME Staking Platform",
    description: "Stake meme tokens and earn RA rewards on Solera.",
    type: "website",
    locale: "en_US",
    siteName: "Solera",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logos/ra-white-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

