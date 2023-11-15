import { useRef, useState } from "react";
import { assertIsDeliverTxSuccess, DeliverTxResponse } from "@cosmjs/stargate";
import { EncodeObject } from "@cosmjs/proto-signing";
import { createId } from "@paralleldrive/cuid2";
import { toast, ToastContainer } from "react-toastify";
import { Code } from "./components/inline";
import { BundleForm, BundleFormArgs } from "./components/BundleForm";
import { ProposalForm, ProposalArgs } from "./components/ProposalForm";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { NetworkDropdown } from "./components/NetworkDropdown";
import { WalletConnectButton } from "./components/WalletConnectButton";
import { Tabs } from "./components/Tabs";
import { TxToastMessage } from "./components/TxToastMessage";
import { useNetwork, NetName } from "./hooks/useNetwork";
import { useWallet } from "./hooks/useWallet";
import { compressBundle } from "./lib/compression";
import {
  makeCoreEvalProposalMsg,
  makeTextProposalMsg,
  makeInstallBundleMsg,
  makeFeeObject,
  makeParamChangeProposalMsg,
} from "./lib/messageBuilder";
import { parseError } from "./utils/transactionParser";
import { isValidBundle } from "./utils/validate";
import { Modal } from "./components/Modal";

const App = () => {
  const { netName } = useNetwork();
  const { walletAddress, stargateClient } = useWallet();
  const proposalFormRef = useRef<HTMLFormElement>(null);
  const corEvalFormRef = useRef<HTMLFormElement>(null);
  const bundleFormRef = useRef<HTMLFormElement>(null);
  const [showModal, setShowModal] = useState(false);

  setTimeout(() => setShowModal(true), 500);
  async function signAndBroadcast(
    proposalMsg: EncodeObject,
    type: "bundle" | "proposal"
  ) {
    if (!stargateClient) {
      toast.error("Network not connected.", { autoClose: 3000 });
      throw new Error("stargateClient not found");
    }
    if (!walletAddress) throw new Error("wallet not connected");
    const toastId = createId();
    toast.loading("Broadcasting transaction...", {
      toastId,
    });
    let txResult: DeliverTxResponse | undefined;
    try {
      const estimate = await stargateClient.simulate(
        walletAddress,
        [proposalMsg],
        undefined
      );
      const adjustment = 1.2;
      const gas = estimate * adjustment;
      txResult = await stargateClient.signAndBroadcast(
        walletAddress,
        [proposalMsg],
        makeFeeObject({ gas })
      );
      assertIsDeliverTxSuccess(txResult);
    } catch (e) {
      console.error(e);
      toast.update(toastId, {
        render: parseError(e as Error),
        type: "error",
        isLoading: false,
        autoClose: 10000,
      });
    }
    if (txResult && txResult.code === 0) {
      toast.update(toastId, {
        render: ({ closeToast }) => (
          <TxToastMessage
            resp={txResult as DeliverTxResponse}
            netName={netName as NetName}
            closeToast={closeToast as () => void}
            type={type}
          />
        ),
        type: "success",
        isLoading: false,
      });
      if (type === "proposal") {
        proposalFormRef.current?.reset();
        corEvalFormRef.current?.reset();
      }
      if (type === "bundle") bundleFormRef.current?.reset();
    }
  }

  async function handleBundle(vals: BundleFormArgs) {
    if (!walletAddress) {
      toast.error("Wallet not connected.", { autoClose: 3000 });
      throw new Error("wallet not connected");
    }
    if (!isValidBundle(vals.bundle)) throw new Error("Invalid bundle.");
    const { compressedBundle, uncompressedSize } = await compressBundle(
      JSON.parse(vals.bundle)
    );
    const proposalMsg = makeInstallBundleMsg({
      compressedBundle,
      uncompressedSize,
      submitter: walletAddress,
    });
    await signAndBroadcast(proposalMsg, "bundle");
  }

  function handleProposal(msgType: QueryParams["msgType"]) {
    return async (vals: ProposalArgs) => {
      if (!walletAddress) {
        toast.error("Wallet not connected.", { autoClose: 3000 });
        throw new Error("wallet not connected");
      }
      let proposalMsg;
      if (msgType === "coreEvalProposal") {
        if (!("evals" in vals)) throw new Error("Missing evals");
        proposalMsg = makeCoreEvalProposalMsg({
          ...vals,
          proposer: walletAddress,
        });
      }
      if (msgType === "textProposal") {
        proposalMsg = makeTextProposalMsg({
          ...vals,
          proposer: walletAddress,
        });
      }
      if (msgType === "parameterChangeProposal") {
        if (vals.msgType !== "parameterChangeProposal") return;
        proposalMsg = makeParamChangeProposalMsg({
          ...vals,
          proposer: walletAddress,
        });
      }
      if (!proposalMsg) throw new Error("Error parsing query or inputs.");

      await signAndBroadcast(proposalMsg, "proposal");
    };
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Nav
        title="Gov Proposal Builder"
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
                  ref={proposalFormRef}
                  handleSubmit={handleProposal("textProposal")}
                  titleDescOnly={true}
                  title="Text Proposal"
                  msgType="textProposal"
                  governanceForumLink="https://community.agoric.com/c/governance/signaling-proposals/17"
                  description={
                    <>
                      This is a governance proposal that can be used for
                      signaling support or agreement on a certain topic or idea.
                      Text proposals do not contain any code, and do not
                      directly enact changes after a passing vote.
                    </>
                  }
                />
              ),
            },
            {
              title: "CoreEval Proposal",
              msgType: "coreEvalProposal",
              content: (
                <ProposalForm
                  ref={corEvalFormRef}
                  handleSubmit={handleProposal("coreEvalProposal")}
                  titleDescOnly={false}
                  title="CoreEval Proposal"
                  msgType="coreEvalProposal"
                  governanceForumLink="https://community.agoric.com/c/governance/core-eval/31"
                  description={
                    <>
                      This is a governance proposal that executes code after a
                      passing vote. The JSON Permit grants{" "}
                      <a
                        className="cursor-pointer hover:text-gray-900 underline"
                        href="https://docs.agoric.com/guides/coreeval/permissions.html"
                      >
                        capabilities
                      </a>{" "}
                      and the JS Script can start or update a contract. These
                      files can be generated with the <Code>agoric run</Code>{" "}
                      command. For more details, see the{" "}
                      <a
                        className="cursor-pointer hover:text-gray-900 underline"
                        href="https://docs.agoric.com/guides/coreeval/"
                      >
                        official docs
                      </a>
                      .
                    </>
                  }
                />
              ),
            },
            {
              title: "Install Bundle",
              msgType: "installBundle",
              content: (
                <BundleForm
                  ref={bundleFormRef}
                  title="Install Bundle"
                  handleSubmit={handleBundle}
                  description={
                    <>
                      The install bundle message deploys and installs an
                      external bundle generated during the{" "}
                      <Code>agoric run</Code> process. The resulting
                      installation can be referenced in a{" "}
                      <a
                        className="cursor-pointer hover:text-gray-900 underline"
                        href="https://docs.agoric.com/guides/coreeval/"
                      >
                        CoreEval proposal
                      </a>{" "}
                      that starts or updates a contract.
                    </>
                  }
                />
              ),
            },
            {
              title: "Parameter Change Proposal",
              msgType: "parameterChangeProposal",
              content: (
                <ProposalForm
                  title="Parameter Change Proposal"
                  handleSubmit={handleProposal("parameterChangeProposal")}
                  description="This is a governance proposal to change chain configuration parameters."
                  governanceForumLink="https://community.agoric.com/c/governance/parameter-changes/16"
                  msgType="parameterChangeProposal"
                />
              ),
            },
          ]}
        />
      </main>
      <Footer />
      {showModal && (
        <Modal title="New Website URL" open={true}>
          <div className="space-y-12 sm:space-y-16 px-6 py-6">
            <h2 className="text-base font-regular leading-7 text-gray-900">
              Please visit{" "}
              <a
                href="https://cosgov.org"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                cosgov.org
              </a>{" "}
              to access the latest version of this website.
            </h2>
          </div>
        </Modal>
      )}

      <ToastContainer
        autoClose={false}
        position="bottom-right"
        closeOnClick={false}
        closeButton={true}
        bodyClassName="text-sm font-medium text-gray-900"
      />
    </div>
  );
};

export default App;
