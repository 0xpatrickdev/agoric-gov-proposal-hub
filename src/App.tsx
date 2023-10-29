import { StdFee } from "@cosmjs/amino";
import { BundleForm, BundleFormArgs } from "./components/BundleForm";
import { ProposalForm, ProposalArgs } from "./components/ProposalForm";
import { ParameterChangeForm } from "./components/ParameterChangeForm";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { NetworkDropdown } from "./components/NetworkDropdown";
import { WalletConnectButton } from "./components/WalletConnectButton";
import { Tabs } from "./components/Tabs";
import { useWallet } from "./hooks/useWallet";
import {
  makeCoreEvalProposalMsg,
  makeTextProposalMsg,
  makeInstallBundleMsg,
  // makeFeeObject,
} from "./lib/messageBuilder";
import { isValidBundle } from "./utils/validate";

const App = () => {
  const { walletAddress, stargateClient } = useWallet();

  // @todo i think the type for proposalMsg should be import('@cosmjs/proto-signing').EncodeObject[]
  // @ts-expect-error proposalMsg
  async function signAndBroadcast(proposalMsg, feeArgs = {}) {
    if (!stargateClient) throw new Error("stargateClient not found");
    if (!walletAddress) throw new Error("wallet not connected");
    // const fee = makeFeeObject(feeArgs);
    let proposalResult;
    try {
      proposalResult = await stargateClient.signAndBroadcast(proposalMsg);
    } catch (e) {
      console.error("broadcast error", e);
    }

    console.log("proposalResult", proposalResult);
  }

  async function handleBundle(vals: BundleFormArgs) {
    if (!walletAddress) throw new Error("wallet not connected");
    if (!isValidBundle(vals.bundle)) throw new Error("Invalid bundle.");
    const proposalMsg = makeInstallBundleMsg({
      bundle: JSON.stringify(JSON.parse(vals.bundle)),
      submitter: walletAddress,
    });
    // @todo gas estiates
    const feeArgs: Partial<StdFee> = { gas: "50000000" };
    await signAndBroadcast(proposalMsg, feeArgs);
  }

  function handleProposal(msgType: QueryParams["msgType"]) {
    return async (vals: ProposalArgs) => {
      if (!walletAddress) throw new Error("wallet not connected");

      let proposalMsg;
      const feeArgs: Partial<StdFee> = {};
      if (msgType === "coreEvalProposal") {
        proposalMsg = makeCoreEvalProposalMsg({
          ...vals,
          proposer: walletAddress,
        });
        // @todo gas estiates
        // @ts-expect-error gas
        feeArgs.gas = "2500000";
      }
      if (msgType === "textProposal") {
        proposalMsg = makeTextProposalMsg({
          ...vals,
          proposer: walletAddress,
        });
      }
      if (!proposalMsg) throw new Error("Error parsing query or inputs.");

      await signAndBroadcast(proposalMsg, feeArgs);
    };
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Nav
        title="Gov Proposal Hub"
        showLogo={true}
        rightContent={
          <>
            <div className="mr-6 relative">
              <NetworkDropdown />
            </div>
            <WalletConnectButton theme="white" />
          </>
        }
      />
      <main className="flex-grow mx-auto max-w-7xl min-w-full py-6 sm:px-6 lg:px-8">
        <Tabs
          tabs={[
            {
              title: "Text Proposal",
              msgType: "textProposal",
              content: (
                <ProposalForm
                  handleSubmit={handleProposal("textProposal")}
                  titleDescOnly={true}
                  title="/cosmos.gov.v1beta1.TextProposal"
                  description="This is a governance proposal that includes a title and description."
                />
              ),
            },
            {
              title: "CoreEval Proposal",
              msgType: "coreEvalProposal",
              content: (
                <ProposalForm
                  handleSubmit={handleProposal("coreEvalProposal")}
                  titleDescOnly={false}
                  title="/agoric.swingset.CoreEvalProposal"
                  description="This is a governance proposal that executes code. You will need to provide a JS Bundle, and a JSON Permit file."
                />
              ),
            },
            {
              title: "Install Bundle",
              msgType: "installBundle",
              content: (
                <BundleForm
                  title="/agoric.swingset.MsgInstallBundle"
                  handleSubmit={handleBundle}
                  description="The install bundle message deploys and installs an external bundle that can be referenced in a CoreEval proposal."
                />
              ),
            },
            {
              title: "Parameter Change Proposal",
              msgType: "parameterChangeProposal",
              content: (
                <ParameterChangeForm
                  title="/cosmos.gov.v1.MsgUpdateParams"
                  description="This is a governance proposal to change chain configuration parameters."
                />
              ),
            },
          ]}
        />
      </main>
      <Footer />
    </div>
  );
};

export default App;
