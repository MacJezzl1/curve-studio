"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Activity, Layers, Rocket, TrendingUp, DollarSign, ShieldCheck } from "lucide-react";

import { useNetwork } from "./WalletProvider";

// Dynamic import to prevent SSR hydration mismatches on wallet button
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export const Navbar = () => {
  const pathname = usePathname();
  const { network, setNetwork } = useNetwork();

  const navLinks = [
    { href: "/", label: "Studio", icon: Activity },
    { href: "/presets", label: "Presets", icon: Layers },
    { href: "/deploy", label: "Deploy", icon: Rocket },
    { href: "/trade", label: "Trade & Migrate", icon: TrendingUp },
    { href: "/claim", label: "Claim Fees", icon: DollarSign },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-brand-meteora to-blue-600 p-0.5 shadow-lg shadow-brand-meteora/20">
              <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-background">
                <span className="font-mono text-lg font-black text-brand-meteora">∿</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-brand-meteora transition-colors">
                  CURVE STUDIO
                </span>
                <span className="rounded bg-brand-meteora/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-meteora border border-brand-meteora/20">
                  METEORA DBC
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-surface-card text-brand-meteora border border-brand-meteora/30 shadow-sm"
                      : "text-slate-400 hover:bg-surface hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Network Badge + Wallet */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Click to toggle network"
            onClick={() => setNetwork(network === "devnet" ? "mainnet-beta" : "devnet")}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium cursor-pointer transition-all hover:scale-105 ${
              network === "mainnet-beta"
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                network === "mainnet-beta" ? "bg-red-400" : "bg-emerald-400"
              }`}
            />
            {network === "mainnet-beta" ? "Mainnet" : "Devnet"}
          </button>

          <WalletMultiButton className="!h-9 !py-0 !px-4 !text-xs !font-semibold !rounded-lg !bg-blue-600 hover:!bg-blue-500 transition-all" />
        </div>
      </div>
    </header>
  );
};
