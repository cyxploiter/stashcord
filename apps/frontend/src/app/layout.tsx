import { Toaster } from 'react-hot-toast';
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import TransferManager from "@/components/common/TransferManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Stashcord",
  description: "Cloud storage with Discord UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <TransferManager />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
