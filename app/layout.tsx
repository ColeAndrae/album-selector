import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Album Roulette',
  description: 'Discover a random album from any year',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
