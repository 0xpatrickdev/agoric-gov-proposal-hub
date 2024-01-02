import { Fragment, ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { classNames } from "../utils/classNames";

interface ModalProps {
  title: string;
  open?: boolean;
  children: ReactNode;
  onClose?: () => void;
}

const Modal = ({ title, open, children, onClose }: ModalProps) => {
  const handleOnClose = () => {
    if (typeof onClose === "function") onClose();
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleOnClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex flex-col h-full min-h-full min-w-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={classNames(
                  "relative transform rounded-lg bg-white text-left shadow-xl transition-all",
                  "flex flex-col max-h-[80%] max-w-[70%]",
                  "overflow-hidden"
                )}
              >
                <div className="flex flex-shrink-0 items-center justify-between rounded-t-md border-b-2 border-neutral-100 border-opacity-100 p-4">
                  <h5
                    className="text-lg font-medium text-black break-all max-w-[70%]"
                    id="exampleModalScrollableLabel"
                  >
                    {title}
                  </h5>

                  <button
                    type="button"
                    className="box-content rounded-none border-none hover:no-underline hover:opacity-75 focus:opacity-100 focus:shadow-none focus:outline-none"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="relative overflow-y-auto p-4 flex-grow">
                  {children}
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center justify-end rounded-b-md border-t-2 border-neutral-100 border-opacity-100 p-4">
                  <button
                    type="button"
                    className="inline-block rounded bg-cardinal-100 px-6 pb-2 pt-2.5 text-xs font-medium uppercase text-black hover:bg-cardinl-50 focus:bg-cardinal-50 focus:outline-none focus:ring-0 active:bg-cardinal-200"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export { Modal };
