import { NotFoundException } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";

function setup(opts: { cp?: unknown; rule?: unknown }) {
  const prisma = {
    candidatePipeline: {
      findFirst: jest.fn().mockResolvedValue(opts.cp ?? null),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
    followUpRule: {
      findFirst: jest.fn().mockResolvedValue(opts.rule ?? null),
    },
  };
  return { controller: new WebhooksController(prisma as never), prisma };
}

describe("WebhooksController.recruiterReplied", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-27T12:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());

  it("resets lastContactAt and schedules the next check by the stage rule delay", async () => {
    const { controller } = setup({
      cp: { id: "cp-1", currentStageId: "stage-1" },
      rule: { delayDays: 5 },
    });

    const result = await controller.recruiterReplied("tenant-a", {
      candidatePipelineId: "cp-1",
    });

    expect(result).toEqual({
      lastContactAt: new Date("2026-11-27T12:00:00Z"),
      nextFollowUpAt: new Date("2026-12-02T12:00:00Z"),
    });
  });

  it("falls back to a 3-day delay when the stage has no active rule", async () => {
    const { controller } = setup({ cp: { id: "cp-1", currentStageId: "s" } });

    const result = (await controller.recruiterReplied("tenant-a", {
      candidatePipelineId: "cp-1",
    })) as unknown as { nextFollowUpAt: Date };

    expect(result.nextFollowUpAt).toEqual(new Date("2026-11-30T12:00:00Z"));
  });

  it("looks candidates up within the caller's tenant only", async () => {
    const { controller, prisma } = setup({ cp: { id: "cp-1" } });

    await controller.recruiterReplied("tenant-a", { candidateAtsId: "ats-42" });

    expect(prisma.candidatePipeline.findFirst).toHaveBeenCalledWith({
      where: { candidate: { tenantId: "tenant-a", atsId: "ats-42" } },
    });
  });

  it("throws 404 when the candidate is not found", async () => {
    const { controller } = setup({});

    await expect(
      controller.recruiterReplied("tenant-a", { candidatePipelineId: "nope" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws 404 when neither id is provided", async () => {
    const { controller, prisma } = setup({ cp: { id: "cp-1" } });

    await expect(controller.recruiterReplied("tenant-a", {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.candidatePipeline.findFirst).not.toHaveBeenCalled();
  });
});
