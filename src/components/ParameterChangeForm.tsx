import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useNetwork } from "../hooks/useNetwork";
import type { ParamChange } from "cosmjs-types/cosmos/params/v1beta1/params";

type StringBeans = { key: string; beans: string };
type PowerFlagFee = { power_flag: string; fee: Coin[] };
export type Coin = { denom: string; amount: string };
/**
 * TODO: import from "@agoric/cosmic-proto/swingset/swingset.js"
 * which uses camelCase
 */
type SwingsetParams = {
  beans_per_unit: StringBeans[];
  fee_unit_price: Coin[];
  bootstrap_vat_config: string;
  power_flag_fees: PowerFlagFee[];
};

export const Unit6 = 1_000_000;

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

type ParameterChangeFormMethods = {
  getChanges: () => ParamChange[];
};

const ParameterChangeFormSection = forwardRef<ParameterChangeFormMethods>(
  (_props, ref) => {
    const { networkConfig } = useNetwork();
    const [params, setParams] = useState<SwingsetParams | null>(null);

    useEffect(() => {
      const getParams = async () => {
        if (!networkConfig) return;
        const content = await fetch(
          `${networkConfig.api[0]}/agoric/swingset/params`
        ).then((resp) => resp.text());
        setParams(JSON.parse(content).params);
      };
      getParams();
    }, [networkConfig]); // should also depend on a "governance epoch"
    // that changes once per voting period / 2 (nyquist)

    const findBean = (items: StringBeans[], target: string) =>
      items.find(({ key }) => key === target) || ({} as StringBeans);

    useImperativeHandle(ref, () => ({
      reset: () => {
        // todo, reset form state after succesful submission, or to initial values
      },
      getChanges: () => {
        if (!params?.beans_per_unit) throw new Error("No params");
        // to do, throw error/warning if there's no diff
        return [
          {
            subspace: "swingset",
            key: "beans_per_unit",
            value: JSON.stringify(params.beans_per_unit),
            // deposit: Number(deposit) * Unit6,
          },
        ];
      },
    }));

    const renderFees = (fees: PowerFlagFee[]) => [
      <tr>
        <th>power_flag</th>
        <th>fee</th>
      </tr>,
      ...fees.map(({ power_flag, fee }) => (
        <tr>
          <td>{power_flag}</td>
          <td>{renderCoins(fee)}</td>
        </tr>
      )),
    ];

    const changeBeans = (key: string, ist: number) => {
      if (!params) return;
      const { beans_per_unit } = params;
      const { beans: feeUnit } = findBean(beans_per_unit, "feeUnit");
      const beans = ist * Number(feeUnit);
      beans_per_unit.forEach(({ key: candidate }, ix) => {
        if (candidate === key) {
          beans_per_unit[ix].beans = `${beans}`;
        }
      });
      setParams({ ...params, beans_per_unit });
    };

    const renderBeans = (items: StringBeans[]) => {
      // We assume fee_unit_price remains 1IST
      const { beans: feeUnit } = findBean(items, "feeUnit");

      return [
        <thead>
          <tr>
            <th>key</th>
            <th>beans</th>
            <th>IST</th>
          </tr>
        </thead>,
        <tbody>
          {items.map(({ key, beans }) => (
            <tr>
              <td>{key}</td>
              <td>{beans}</td>
              <td>
                <input
                  type="number"
                  name={key}
                  onChange={({ target }) =>
                    changeBeans(key, Number(target.value))
                  }
                  value={Number(beans) / Number(feeUnit)}
                  readOnly={key !== "storageByte"}
                />
              </td>
            </tr>
          ))}
        </tbody>,
      ];
    };

    const renderParams = (params: SwingsetParams) => (
      <section>
        <h3>Swingset Params</h3>

        <table>
          <tr>
            <th>beans_per_unit</th>
          </tr>
          {renderBeans(params.beans_per_unit)}
          <tr>
            <th>fee_unit_price</th>
          </tr>
          <tr>
            <td>{renderCoins(params.fee_unit_price)}</td>
          </tr>
          <tr>
            <th>bootstrap_vat_config</th>
          </tr>
          <tr>
            <td>{params.bootstrap_vat_config}</td>
          </tr>
          <tr>
            <th>power_flag_fees</th>
          </tr>
          {renderFees(params.power_flag_fees)}
        </table>
      </section>
    );

    return (
      <div className="py-6 px-8">
        <div className="space-y-12 sm:space-y-16">
          <div className="mt-10 space-y-8 border-b border-gray-900/10 pb-12 sm:space-y-0 sm:divide-y sm:divide-gray-900/10 sm:border-t sm:pb-0">
            {params ? renderParams(params) : null}
          </div>
        </div>
      </div>
    );
  }
);

export { ParameterChangeFormSection };
