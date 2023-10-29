import { CoreEvalProposal } from "@agoric/cosmic-proto/swingset/swingset.js";
import { MsgInstallBundle } from "@agoric/cosmic-proto/swingset/msgs.js";
import { StdFee } from "@cosmjs/amino";
import { coins } from "@cosmjs/proto-signing";
import { TextProposal } from "cosmjs-types/cosmos/gov/v1beta1/gov";
import { Any } from "cosmjs-types/google/protobuf/any";
import { toAccAddress } from "@cosmjs/stargate/build/queryclient/utils";
// import { toBase64 } from "@cosmjs/encoding";

export const registryTypes = [
  ["/agoric.swingset.MsgInstallBundle", MsgInstallBundle],
];

interface MakeTextProposalArgs {
  title: string;
  description: string;
  proposer: string;
  depositAmount?: number;
}

export const makeTextProposalMsg = ({
  title,
  description,
  proposer,
  depositAmount = 1,
}: MakeTextProposalArgs) => ({
  typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposal",
  value: {
    content: Any.fromPartial({
      typeUrl: "/cosmos.gov.v1beta1.TextProposal",
      value: TextProposal.encode(
        TextProposal.fromPartial({
          title,
          description,
        })
      ).finish(),
    }),
    proposer,
    initialDeposit: coins(depositAmount, "ubld"),
  },
});

export const makeCoreEvalProposalMsg = ({
  title,
  description,
  evals,
  proposer,
  depositAmount = 1,
}: CoreEvalProposal & { proposer: string; depositAmount?: number }) => ({
  typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposal",
  value: {
    content: Any.fromPartial({
      typeUrl: "/agoric.swingset.CoreEvalProposal",
      value: CoreEvalProposal.encode(
        CoreEvalProposal.fromPartial({
          title,
          description,
          evals,
        })
      ).finish(),
    }),
    proposer,
    initialDeposit: coins(depositAmount || 0, "ubld"),
  },
});

export interface MsgInstallArgs {
  bundle: string;
  submitter: string;
}

export const makeInstallBundleMsg = ({ bundle, submitter }: MsgInstallArgs) => ({
  typeUrl: "/agoric.swingset.MsgInstallBundle",
  value: MsgInstallBundle.encode(
    MsgInstallBundle.fromPartial({
      bundle,
      // submitter: toBase64(toAccAddress(submitter)),
      submitter: toAccAddress(submitter),
    })
  ).finish(),
});

interface MakeFeeObjectArgs {
  denom?: string;
  amount?: string | number;
  gas?: string | number;
}

export const makeFeeObject = ({ denom, amount, gas }: MakeFeeObjectArgs) =>
  ({
    amount: coins(amount || 2000, denom || "ubld"),
    gas: gas ? String(gas) : "180000",
  } as StdFee);

