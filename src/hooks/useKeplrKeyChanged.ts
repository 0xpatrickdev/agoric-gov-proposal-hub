import { useEffect } from "react";

type KeplrKeyChangedCallback = () => void;

/**
 * @param {KeplrChangedCallback} callback
 * @link https://docs.keplr.app/api/#change-key-store-event
 */
function useKeplrKeyChanged(callback: KeplrKeyChangedCallback) {
  useEffect(() => {
    document.addEventListener("keplr_keystorechange", callback);
    return () => {
      document.removeEventListener("keplr_keystorechange", callback);
    };
  }, [callback]);
}

export { useKeplrKeyChanged };
