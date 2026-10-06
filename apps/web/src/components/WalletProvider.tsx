"use client";

import React, { FC, ReactNode, useMemo, useState, createContext, useContext } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

export type NetworkType = "devnet" | "mainnet-beta";

interface NetworkContextType {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  endpoint: string;
}

const NetworkContext = createContext<NetworkContextType>({
  network: "devnet",
  setNetwork: () => {},
  endpoint: clusterApiUrl("devnet"),
});

export const useNetwork = () => useContext(NetworkContext);

export const DEVNET_RPC = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet");
export const MAINNET_RPC = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || clusterApiUrl("mainnet-beta");

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [network, setNetwork] = useState<NetworkType>("devnet");

  const endpoint = useMemo(() => {
    return network === "mainnet-beta" ? MAINNET_RPC : DEVNET_RPC;
  }, [network]);

  const wallets = useMemo(() => [], []);

  return (
    <NetworkContext.Provider value={{ network, setNetwork, endpoint }}>
      <ConnectionProvider endpoint={endpoint}>
        <SolanaWalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
};
