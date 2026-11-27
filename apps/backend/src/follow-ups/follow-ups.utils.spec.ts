import { daysSince, renderTemplate } from "./follow-ups.utils";

describe("daysSince", () => {
  const now = new Date("2026-11-27T12:00:00Z");

  it("returns 0 when there was no contact yet", () => {
    expect(daysSince(null, now)).toBe(0);
  });

  it("counts whole elapsed days, rounding down", () => {
    expect(daysSince(new Date("2026-11-24T12:00:00Z"), now)).toBe(3);
    expect(daysSince(new Date("2026-11-24T13:00:00Z"), now)).toBe(2);
  });

  it("never returns a negative number for future dates", () => {
    expect(daysSince(new Date("2026-12-01T00:00:00Z"), now)).toBe(0);
  });
});

describe("renderTemplate", () => {
  const vars = { recruiterName: "Anna", candidateName: "Jan", daysSilent: "5" };

  it("replaces known variables", () => {
    expect(
      renderTemplate(
        "Hi {{recruiterName}}, {{candidateName}} has waited {{daysSilent}} days",
        vars,
      ),
    ).toBe("Hi Anna, Jan has waited 5 days");
  });

  it("renders unknown variables as empty string", () => {
    expect(renderTemplate("Stage: {{stageName}}.", vars)).toBe("Stage: .");
  });

  it("does not leak Object.prototype members", () => {
    expect(renderTemplate("{{constructor}}{{toString}}", vars)).toBe("");
  });
});
