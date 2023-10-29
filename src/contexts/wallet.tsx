import { createContext, useEffect, useState, useRef, ReactNode } from "react";
import { Decimal } from "@cosmjs/math";
import { SigningStargateClient } from "@cosmjs/stargate";
import { AccountData } from "@keplr-wallet/types";
import { useNetwork, NetName } from "../hooks/useNetwork";
import { suggestChain } from "../lib/suggestChain";
import { getNetConfigUrl } from "../lib/getNetworkConfig";
import { registryTypes } from "../lib/messageBuilder";
import { makeInteractiveSigner } from "@agoric/web-components";
import { BundleConverter, GovConverter } from "../lib/amino";

type SigningClient = Awaited<ReturnType<typeof makeInteractiveSigner>>;

interface WalletContext {
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  stargateClient: SigningClient | undefined;
  isLoading: boolean;
}

export const WalletContext = createContext<WalletContext>({
  walletAddress: null,
  connectWallet: () => Promise.resolve(undefined),
  stargateClient: undefined,
  isLoading: false,
});

export const WalletContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const stargateClient = useRef<SigningClient | undefined>(undefined);
  const { netName } = useNetwork();
  const [currNetName, setCurrNetName] = useState(netName);
  const [walletAddress, setWalletAddress] = useState<
    WalletContext["walletAddress"]
  >(() => {
    if (window.localStorage.getItem("walletAddress")) {
      return window.localStorage.getItem("walletAddress") || null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const saveAddress = ({ address }: AccountData) => {
    window.localStorage.setItem("walletAddress", address);
    setWalletAddress(address);
  };

  const connectWallet = async () => {
    setIsLoading(true);
    const { chainId, rpc } = await suggestChain(
      getNetConfigUrl(netName as NetName)
    );
    if (chainId) {
      await window.keplr.enable(chainId);
      const offlineSigner = window.keplr.getOfflineSigner(chainId);
      const accounts = await offlineSigner.getAccounts();
      if (accounts?.[0].address !== walletAddress) {
        saveAddress(accounts[0]);
      }

      try {
        stargateClient.current = await makeInteractiveSigner(
          chainId,
          rpc,
          // @ts-expect-error window.keplr (sdk version mismatch)
          window.keplr,
          SigningStargateClient.connectWithSigner,
          {
            gasPrice: {
              denom: "uist",
              amount: Decimal.fromUserInput("50000000", 0),
            },
            registryTypes,
            converters: {
              ...BundleConverter,
              ...GovConverter,
            },
          }
        );
      } catch (e) {
        console.error("error stargateClient setup", e);
        window.localStorage.removeItem("walletAddress");
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (currNetName !== netName) {
    if (walletAddress) connectWallet();
    setCurrNetName(netName);
  }

  useEffect(() => {
    if (walletAddress && !stargateClient.current) {
      connectWallet();
    }
  }, [walletAddress, stargateClient]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        connectWallet,
        stargateClient: stargateClient.current,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
