import {
  assert,
  assertDefinedAndNotNull,
  isNonNullObject,
} from "@cosmjs/utils";
import { AminoConverters, AminoMsgSubmitProposal } from "@cosmjs/stargate";
import { MsgSubmitProposal } from "cosmjs-types/cosmos/gov/v1beta1/tx";
import { TextProposal } from "cosmjs-types/cosmos/gov/v1beta1/gov";
import { CoreEvalProposal } from "@agoric/cosmic-proto/swingset/swingset.js";
import { Any } from "cosmjs-types/google/protobuf/any";
import { toBech32, fromBase64, toBase64 } from "@cosmjs/encoding";
import { toAccAddress } from "@cosmjs/stargate/build/queryclient/utils";

/**
 * @type {AminoConverters}
 */
export const GovConverter: AminoConverters = {
  "/cosmos.gov.v1beta1.MsgSubmitProposal": {
    aminoType: "cosmos-sdk/MsgSubmitProposal",
    toAmino: ({
      initialDeposit,
      proposer,
      content,
    }: MsgSubmitProposal): AminoMsgSubmitProposal["value"] => {
      assertDefinedAndNotNull(content);
      console.log("toAmino called", { initialDeposit, proposer, content });
      let proposalContent: {
        type: string;
        value: CoreEvalProposal | TextProposal;
      };
      switch (content.typeUrl) {
        case "/cosmos.gov.v1beta1.TextProposal": {
          proposalContent = {
            type: "cosmos-sdk/TextProposal",
            value: TextProposal.decode(content.value),
          };
          break;
        }
        case "/agoric.swingset.CoreEvalProposal": {
          proposalContent = {
            type: "swingset/CoreEvalProposal",
            value: CoreEvalProposal.decode(content.value),
          };
          console.log("proposalContent", proposalContent);
          break;
        }
        default:
          throw new Error(`Unsupported proposal type: '${content.typeUrl}'`);
      }
      return {
        initial_deposit: initialDeposit,
        proposer,
        content: proposalContent,
      };
    },
    fromAmino: ({
      initial_deposit,
      proposer,
      content,
    }: AminoMsgSubmitProposal["value"]): MsgSubmitProposal => {
      console.log("fromAmino called", { initial_deposit, proposer, content });
      let proposalContent: MsgSubmitProposal["content"];
      switch (content.type) {
        case "cosmos-sdk/TextProposal": {
          const { value } = content;
          assert(isNonNullObject(value));
          const { title, description } = value as TextProposal;
          assert(typeof title === "string");
          assert(typeof description === "string");
          proposalContent = Any.fromPartial({
            typeUrl: "/cosmos.gov.v1beta1.TextProposal",
            value: TextProposal.encode(
              TextProposal.fromPartial({
                title: title,
                description: description,
              })
            ).finish(),
          });
          break;
        }
        case "swingset/CoreEvalProposal": {
          const { value } = content;
          assert(isNonNullObject(value));
          const { title, description, evals } = value as CoreEvalProposal;
          assert(typeof title === "string");
          assert(typeof description === "string");
          assert(Array.isArray(evals));
          for (const { jsCode, jsonPermits } of evals) {
            assert(typeof jsonPermits === "string");
            assert(typeof jsCode === "string");
          }
          proposalContent = Any.fromPartial({
            typeUrl: "/agoric.swingset.CoreEvalProposal",
            value: CoreEvalProposal.encode(
              CoreEvalProposal.fromPartial({
                title,
                description,
                evals,
              })
            ).finish(),
          });
          break;
        }
        default:
          throw new Error(`Unsupported proposal type: '${content.type}'`);
      }
      return {
        initialDeposit: Array.from(initial_deposit),
        proposer,
        content: proposalContent,
      };
    },
  },
};

export const BundleConverter: AminoConverters = {
  "/agoric.swingset.MsgInstallBundle": {
    aminoType: "swingset/InstallBundle",
    toAmino: ({ bundle, submitter }) => ({
      bundle,
      submitter: toBech32("agoric", fromBase64(submitter)),
    }),
    fromAmino: ({ bundle, submitter }) => ({
      bundle,
      submitter: toBase64(toAccAddress(submitter)),
    }),
  },
};
