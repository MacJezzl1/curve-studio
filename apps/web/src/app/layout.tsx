import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Curve Studio | Meteora DBC & DAMM v2 Bonding Curve Platform",
  description:
    "Design, simulate, validate, and deploy battle-tested Meteora Dynamic Bonding Curves with seamless DAMM v2 and DLMM conviction pool migrations.",
  keywords: [
    "Meteora",
    "Dynamic Bonding Curve",
    "DBC",
    "DAMM v2",
    "DLMM",
    "Solana",
    "DeFi",
    "Bonding Curve Simulator",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 flex flex-col">
        <WalletProvider>
          <Navbar />
          <main className="flex-1 pb-16">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
