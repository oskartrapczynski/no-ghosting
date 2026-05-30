import type { AtsSyncResult } from "@no-ghosting/shared";
import type { AtsAdapter } from "./base";

/**
 * Demo adapter for testing and development.
 * Returns fake data to demonstrate the adapter pattern.
 */
export const demoAdapter: AtsAdapter = {
  id: "demo",
  name: "Demo ATS",

  async testConnection(): Promise<boolean> {
    return true;
  },

  async sync(): Promise<AtsSyncResult> {
    return {
      pipelines: [
        {
          atsId: "demo-pipeline-1",
          name: "Software Engineer - Q1 2026",
          stages: [
            { atsId: "s1", name: "Applied", order: 0 },
            { atsId: "s2", name: "Phone Screen", order: 1 },
            { atsId: "s3", name: "Technical Interview", order: 2 },
            { atsId: "s4", name: "Final Round", order: 3 },
            { atsId: "s5", name: "Offer", order: 4 },
          ],
        },
      ],
      recruiters: [
        {
          atsId: "r1",
          email: "recruiter@example.com",
          name: "Maria Recruiter",
        },
      ],
      candidates: [
        {
          atsId: "c1",
          email: "jan.kowalski@example.com",
          name: "Jan Kowalski",
          pipelineAtsId: "demo-pipeline-1",
          currentStage: "s2",
          appliedAt: new Date("2026-01-15"),
          assignedRecruiterAtsId: "r1",
        },
        {
          atsId: "c2",
          email: "anna.nowak@example.com",
          name: "Anna Nowak",
          phone: "+48600100200",
          pipelineAtsId: "demo-pipeline-1",
          currentStage: "s3",
          appliedAt: new Date("2026-01-10"),
          assignedRecruiterAtsId: "r1",
        },
      ],
      errors: [],
    };
  },
};
