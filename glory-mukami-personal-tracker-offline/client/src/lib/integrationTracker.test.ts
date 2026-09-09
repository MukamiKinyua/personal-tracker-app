import { describe, expect, it } from "vitest";
import {
  emptyIntegrationConsent,
  integrationConsentSummary,
  toggleIntegrationConsent,
} from "./integrationTracker";

describe("integration consent", () => {
  it("records and clears consent without claiming a connection", () => {
    const initial = emptyIntegrationConsent();
    const recorded = toggleIntegrationConsent(
      initial,
      "banking",
      "2026-08-26T18:00:00.000Z"
    );
    expect(recorded.banking.state).toBe("consent-recorded");
    expect(recorded.banking.consentAt).toBe("2026-08-26T18:00:00.000Z");
    const cleared = toggleIntegrationConsent(
      recorded,
      "banking",
      "2026-08-26T18:01:00.000Z"
    );
    expect(cleared.banking.state).toBe("not-considered");
    expect(cleared.banking.consentAt).toBe("");
  });

  it("summarizes only the local consent states", () => {
    const consent = toggleIntegrationConsent(
      emptyIntegrationConsent(),
      "school",
      "2026-08-26T18:00:00.000Z"
    );
    expect(integrationConsentSummary(consent)).toEqual({
      recorded: 1,
      notConsidered: 4,
    });
  });
});
