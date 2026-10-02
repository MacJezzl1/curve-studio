"use client";

import React, { FC, ReactNode, useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

export const DEVNET_RPC = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet");

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [endpoint] = useState<string>(DEVNET_RPC);

  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
