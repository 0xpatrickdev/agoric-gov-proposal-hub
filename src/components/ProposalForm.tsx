import {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  FormEvent,
} from "react";
import { CodeInputGroup } from "./CodeInputGroup";
import { CoreEval } from "@agoric/cosmic-proto/swingset/swingset.js";
import { Button } from "./Button";
import { ParamChange } from "cosmjs-types/cosmos/params/v1beta1/params";
import { ParameterChangeFormSection } from "./ParameterChangeForm";
import { DepositSection } from "./DepositSection";

type BaseProposalArgs = {
  title: string;
  description: string;
  deposit: string | number;
};

export type ProposalArgs = BaseProposalArgs & ProposalDetail;

export type ProposalDetail =
  | { msgType: "textProposal" }
  | { msgType: "coreEvalProposal"; evals: CoreEval[] }
  | { msgType: "parameterChangeProposal"; changes: ParamChange[] };

interface ProposalFormProps {
  title: string;
  description: string;
  handleSubmit: (proposal: ProposalArgs) => void;
  titleDescOnly?: boolean;
  msgType: QueryParams["msgType"];
}

interface ProposalFormMethods {
  reset: () => void;
}

const ProposalForm = forwardRef<ProposalFormMethods, ProposalFormProps>(
  ({ title, description, handleSubmit, msgType }, ref) => {
    const [evals, setEvals] = useState<CoreEval[]>([]);
    const formRef = useRef<HTMLFormElement>(null);
    const codeInputRef = useRef<{ reset: () => void } | null>(null);
    const paramChangeRef = useRef<{
      getChanges: () => ParamChange[];
      reset: () => void;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        formRef.current?.reset();
        codeInputRef.current?.reset();
        paramChangeRef.current?.reset();
        setEvals([]);
      },
    }));

    const onSubmit = (e: FormEvent) => {
      e.preventDefault();
      if (formRef?.current) {
        const formData = new FormData(formRef.current);
        if (formData) {
          const title = (formData.get("title") as string) || "";
          const description = (formData.get("description") as string) || "";
          const depositBld = (formData.get("deposit") as string) || "";
          const deposit = Number(depositBld) * 1_000_000;
          console.log("deposit", deposit);
          const args: BaseProposalArgs = { title, description, deposit };
          if (msgType === "coreEvalProposal" && evals.length) {
            return handleSubmit({ ...args, msgType, evals });
          } else if (msgType == "textProposal") {
            return handleSubmit({ ...args, msgType });
          } else if (msgType === "parameterChangeProposal") {
            const changes = paramChangeRef.current?.getChanges();
            if (!Array.isArray(changes)) throw new Error("No changes");
            return handleSubmit({ ...args, msgType, changes });
          }
        }
      }
      throw new Error("Error reading form data.");
    };

    return (
      <form ref={formRef} className="py-6 px-8" onSubmit={onSubmit}>
        <div className="space-y-12 sm:space-y-16">
          <div>
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              {title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              {description}
            </p>

            <div className="mt-10 space-y-8 border-b border-gray-900/10 pb-12 sm:space-y-0 sm:divide-y sm:divide-gray-900/10 sm:border-t sm:pb-0">
              <div className="sm:grid sm:grid-cols-4 sm:items-start sm:gap-4 sm:py-6">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5"
                >
                  Title
                </label>
                <div className="mt-2 sm:col-span-3 sm:mt-0">
                  <input
                    type="text"
                    name="title"
                    id="title"
                    placeholder="Title"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cardinal-600 sm:max-w-sm sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div className="sm:grid sm:grid-cols-4 sm:items-start sm:gap-4 sm:py-6">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5"
                >
                  Description
                </label>
                <div className="mt-2 sm:col-span-3 sm:mt-0">
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="block w-full max-w-2xl rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cardinal-600 sm:text-sm sm:leading-6"
                    defaultValue={""}
                    placeholder="Description"
                  />
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    Write a few sentences about the proposal and include any
                    relevant links.
                  </p>
                </div>
              </div>

              {msgType === "coreEvalProposal" ? (
                <div className="sm:grid sm:grid-cols-4 sm:items-start sm:gap-4 sm:py-6">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium leading-6 text-gray-900 sm:pt-1.5"
                  >
                    Core Eval Files
                  </label>
                  <div className="mt-2 sm:col-span-3 sm:mt-0">
                    <CodeInputGroup
                      ref={codeInputRef}
                      onPairsChange={setEvals}
                    />
                  </div>
                </div>
              ) : null}

              {msgType === "parameterChangeProposal" ? (
                <ParameterChangeFormSection ref={paramChangeRef} />
              ) : null}

              <DepositSection />
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-x-32">
          <Button
            type="submit"
            Icon={null}
            text="Sign & Submit"
            theme="dark"
            layoutStyle="flex w-1/4"
          />
        </div>
      </form>
    );
  }
);

export { ProposalForm };
