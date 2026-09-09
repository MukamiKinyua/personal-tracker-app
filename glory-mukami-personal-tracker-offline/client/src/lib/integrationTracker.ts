export type IntegrationKey =
  | "banking"
  | "school"
  | "calendar"
  | "device"
  | "cloud";
export type IntegrationConsentState = "not-considered" | "consent-recorded";

export type IntegrationConsent = {
  key: IntegrationKey;
  state: IntegrationConsentState;
  consentAt: string;
};

export const integrationOptions: Array<{
  key: IntegrationKey;
  title: string;
  note: string;
  boundary: string;
}> = [
  {
    key: "banking",
    title: "Banking overview",
    note: "A future place for balances or transactions you choose to import.",
    boundary:
      "No bank is connected and no financial credentials are collected.",
  },
  {
    key: "school",
    title: "School or learning",
    note: "A future place for course calendars, assignments, or study context.",
    boundary:
      "No school account is connected and no grades or coursework are imported.",
  },
  {
    key: "calendar",
    title: "Calendar",
    note: "A future place for time blocks and commitments you choose to share.",
    boundary: "No calendar is connected and no events are read or created.",
  },
  {
    key: "device",
    title: "Device or health",
    note: "A future place for data you explicitly choose to bring into the journal.",
    boundary: "No device, health, or sensor data is read.",
  },
  {
    key: "cloud",
    title: "Cloud documents",
    note: "A future place for links to documents you choose to reference.",
    boundary: "No cloud drive is connected and no files are scanned.",
  },
];

export function toggleIntegrationConsent(
  current: Record<IntegrationKey, IntegrationConsent>,
  key: IntegrationKey,
  now: string
): Record<IntegrationKey, IntegrationConsent> {
  const existing = current[key];
  return {
    ...current,
    [key]:
      existing?.state === "consent-recorded"
        ? { key, state: "not-considered", consentAt: "" }
        : { key, state: "consent-recorded", consentAt: now },
  };
}

export function integrationConsentSummary(
  consents: Record<IntegrationKey, IntegrationConsent>
) {
  const values = integrationOptions.map(option => consents[option.key]);
  return {
    recorded: values.filter(value => value?.state === "consent-recorded")
      .length,
    notConsidered: values.filter(value => value?.state !== "consent-recorded")
      .length,
  };
}

export function emptyIntegrationConsent(): Record<
  IntegrationKey,
  IntegrationConsent
> {
  return Object.fromEntries(
    integrationOptions.map(option => [
      option.key,
      { key: option.key, state: "not-considered", consentAt: "" },
    ])
  ) as Record<IntegrationKey, IntegrationConsent>;
}
