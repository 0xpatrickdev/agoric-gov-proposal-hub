import React, { useEffect, useRef, useState } from "react";
import { useNetwork } from "../hooks/useNetwork";
import type {
  DepositParams,
  VotingParams,
} from "cosmjs-types/cosmos/gov/v1beta1/gov";
import { useWallet } from "../hooks/useWallet";
import type { Coin } from "./ParameterChangeForm";

const logged =
  (label: string) =>
  <T,>(x: T) => {
    console.log(label, x);
    return x;
  };

const Unit6 = 1_000_000;

const coinsUnit = (coins: Coin[] | undefined) =>
  coins && coins.length === 1 ? Number(coins[0].amount) / Unit6 : NaN;

const renderCoin = ({ denom, amount }: Coin) => {
  if (denom.startsWith("u")) {
    const bigd = denom.slice(1).toUpperCase();
    const amt = Number(amount) / Unit6;
    return `${amt} ${bigd}`;
  }
  return `${amount} ${denom}`;
};

const renderCoins = (coins: Coin[]) =>
  coins.length > 0 ? coins.map(renderCoin).join(",") : "empty";

export const DepositSection: React.FC<unknown> = () => {
  const { networkConfig } = useNetwork();
  const { walletAddress } = useWallet();
  const depositRef = useRef<HTMLInputElement>(null);

  const [govParams, setGovParams] = useState<{
    deposit: DepositParams & {
      //  camelCase vs. snake_case
      min_deposit: Coin[];
    };
    voting: VotingParams & {
      //  camelCase vs. snake_case
      voting_period: string;
    };
  } | null>(null);
  const [balances, setBalances] = useState<Coin[] | null>(null);

  const getJSON = async (url: string) =>
    await fetch(url)
      .then((resp) => resp.text()) // TODO: check resp.ok
      .then((s) => JSON.parse(s));

  useEffect(() => {
    const getGovParams = async () => {
      if (!networkConfig) return;
      const base = networkConfig.api[0]; // round-robin etc.
      const [deposit, voting] = await Promise.all([
        getJSON(`${base}/cosmos/gov/v1beta1/params/deposit`),
        getJSON(`${base}/cosmos/gov/v1beta1/params/voting`),
      ]);

      setGovParams({
        deposit: deposit.deposit_params,
        voting: voting.voting_params,
      });
    };
    getGovParams();
  }, [networkConfig]); // should also depend on a "governance epoch"
  // that changes once per voting period / 2 (nyquist)

  useEffect(() => {
    if (depositRef.current && depositRef.current.value === "") {
      depositRef.current.value = `${coinsUnit(govParams?.deposit.min_deposit)}`;
    }
  }, [govParams]);

  useEffect(() => {
    const getBalances = async () => {
      if (!networkConfig) return;
      if (!walletAddress) return;
      const base = networkConfig.api[0]; // round-robin etc.
      const balances = await getJSON(
        `${base}/cosmos/bank/v1beta1/balances/${walletAddress}`
      );
      setBalances(logged("@@Bal")(balances.balances));
    };
    getBalances();
  }, [networkConfig, walletAddress]);

  const bldCoins = balances?.filter((x) => x.denom === "ubld") || [];

  return (
    <div className="sm:grid sm:grid-cols-4 sm:items-start sm:gap-4 sm:py-6">
      <label
        htmlFor="description"
        className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5"
      >
        Deposit
      </label>
      <div className="mt-2 sm:col-span-3 sm:mt-0">
        <input
          type="number"
          min="0"
          step="1" // ensures integer
          name="deposit"
          id="deposit"
          ref={depositRef}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cardinal-600 sm:max-w-sm sm:text-sm sm:leading-6"
        />
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {govParams && (
            <span>
              A proposal requires{" "}
              <span className="font-semibold">
                {renderCoins(govParams.deposit.min_deposit)}
              </span>{" "}
              to enter voting period.
            </span>
          )}
          <br />
          {balances && (
            <span>
              Current balance
              <span className="font-semibold"> {renderCoins(bldCoins)}</span>.
            </span>
          )}
          <br />
          {govParams && (
            <span>
              Voting Period:{" "}
              <span className="font-semibold">
                {govParams.voting.voting_period}
              </span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
