"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import LeadForm, { useLandingUtm, type LeadExtras } from "./lead-form";
import RoofEstimator from "./roof-estimator";

// The homepage is a server page (fast first load). Only these pieces run in the browser:
// the roof estimator, the lead form, and the hand-off of the estimator's choices into the form.
type EstimateState = { extras: LeadExtras; setExtras: (extras: LeadExtras) => void };
const EstimateContext = createContext<EstimateState | null>(null);

export function HomeEstimateProvider({ children }: { children: ReactNode }) {
  const { landing } = useLandingUtm();
  // The estimator's selections ride along with the lead form (roof size, pitch, shingle, estimate).
  const [extras, setExtras] = useState<LeadExtras>({});

  // Remember the visitor's ad/UTM tags so a lead sent later still shows where they came from.
  useEffect(() => {
    const params = new URLSearchParams(landing ? new URL(landing).search : "");
    const data: Record<string, string> = {
      source: params.get("utm_source") || params.get("source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      content: params.get("utm_content") || "",
      term: params.get("utm_term") || "",
      gclid: params.get("gclid") || "",
      fbclid: params.get("fbclid") || "",
      landing,
    };
    Object.entries(data).forEach(([key, value]) => {
      if (value) localStorage.setItem(`utm_${key}`, value);
    });
  }, [landing]);

  return <EstimateContext.Provider value={{ extras, setExtras }}>{children}</EstimateContext.Provider>;
}

export function HomeLeadForm({ footer }: { footer?: ReactNode }) {
  const estimate = useContext(EstimateContext);
  return <LeadForm extras={estimate?.extras} footer={footer} />;
}

export function HomeEstimator() {
  const estimate = useContext(EstimateContext);
  return <RoofEstimator onChange={estimate?.setExtras} />;
}
