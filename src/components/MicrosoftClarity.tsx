import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

const CLARITY_PROJECT_ID = "qrmct59k1u";

const MicrosoftClarity = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as typeof window & { __clarityInitialized?: boolean })
      .__clarityInitialized) {
      return;
    }

    try {
      Clarity.init(CLARITY_PROJECT_ID);
      (window as typeof window & { __clarityInitialized?: boolean })
        .__clarityInitialized = true;
    } catch (error) {
      console.error("Microsoft Clarity initialization failed:", error);
    }
  }, []);

  return null;
};

export default MicrosoftClarity;

