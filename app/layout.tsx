import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Cookies } from '@/components/common/Cookies';
import { FirstPopup } from '@/components/modals/FirstPopup';
import { StakeModal } from '@/components/modals/StakeModal';

export const metadata: Metadata = {
  title: "RA Staking",
  description: "MEME Staking Platform",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <Cookies />
        <FirstPopup />
        <StakeModal />
      </body>
    </html>
  );
}
