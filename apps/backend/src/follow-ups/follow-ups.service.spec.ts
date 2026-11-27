import { FollowUpsService } from "./follow-ups.service";

const OLD_NEXT = new Date("2026-11-20T00:00:00Z");

function makeCp(
  rules: Array<{ id: string; maxAttempts: number }>,
  lastContactAt: Date | null = null,
) {
  return {
    id: "cp-1",
    nextFollowUpAt: OLD_NEXT,
    lastContactAt,
    candidate: { name: "Jan Kowalski" },
    stage: { followUpRules: rules },
  };
}

function setup(opts: {
  cps: unknown[];
  ignoredNudges?: number;
  claimCount?: number;
}) {
  const prisma = {
    candidatePipeline: {
      findMany: jest.fn().mockResolvedValue(opts.cps),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: opts.claimCount ?? 1 }),
    },
    followUpLog: {
      count: jest.fn().mockResolvedValue(opts.ignoredNudges ?? 0),
    },
  };
  const queue = { add: jest.fn().mockResolvedValue({}) };
  const service = new FollowUpsService(prisma as never, queue as never);
  return { service, prisma, queue };
}

describe("FollowUpsService.scheduleOverdueFollowUps", () => {
  it("claims the row and enqueues a nudge for an overdue candidate", async () => {
    const { service, prisma, queue } = setup({
      cps: [makeCp([{ id: "rule-1", maxAttempts: 3 }])],
    });

    const result = await service.scheduleOverdueFollowUps();

    expect(result).toEqual({ scheduled: 1 });
    // Optimistic lock: only update if nextFollowUpAt is still the value we read.
    expect(prisma.candidatePipeline.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cp-1", nextFollowUpAt: OLD_NEXT },
      }),
    );
    expect(queue.add).toHaveBeenCalledWith("send-follow-up", {
      candidatePipelineId: "cp-1",
      ruleId: "rule-1",
      attemptNumber: 1,
    });
  });

  it("skips stages without active rules", async () => {
    const { service, queue } = setup({ cps: [makeCp([])] });

    expect(await service.scheduleOverdueFollowUps()).toEqual({ scheduled: 0 });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("does not enqueue when a concurrent tick already claimed the row", async () => {
    const { service, queue } = setup({
      cps: [makeCp([{ id: "rule-1", maxAttempts: 3 }])],
      claimCount: 0,
    });

    expect(await service.scheduleOverdueFollowUps()).toEqual({ scheduled: 0 });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("escalates through rules by attempt index, capped at the last rule", async () => {
    const rules = [
      { id: "rule-1", maxAttempts: 5 },
      { id: "rule-2", maxAttempts: 5 },
    ];
    const { service, queue } = setup({ cps: [makeCp(rules)], ignoredNudges: 3 });

    await service.scheduleOverdueFollowUps();

    expect(queue.add).toHaveBeenCalledWith(
      "send-follow-up",
      expect.objectContaining({ ruleId: "rule-2", attemptNumber: 4 }),
    );
  });

  it("counts only delivered nudges since the last recruiter contact", async () => {
    const lastContactAt = new Date("2026-11-15T09:00:00Z");
    const { service, prisma } = setup({
      cps: [makeCp([{ id: "rule-1", maxAttempts: 3 }], lastContactAt)],
    });

    await service.scheduleOverdueFollowUps();

    // Delivered (ignored by recruiter) nudges count; failed sends don't,
    // and nudges from before the recruiter's last reply are reset.
    expect(prisma.followUpLog.count).toHaveBeenCalledWith({
      where: {
        candidatePipelineId: "cp-1",
        deliveredAt: { not: null },
        sentAt: { gte: lastContactAt },
      },
    });
  });

  it("counts all delivered nudges when the recruiter never made contact", async () => {
    const { service, prisma } = setup({
      cps: [makeCp([{ id: "rule-1", maxAttempts: 3 }], null)],
    });

    await service.scheduleOverdueFollowUps();

    expect(prisma.followUpLog.count).toHaveBeenCalledWith({
      where: { candidatePipelineId: "cp-1", deliveredAt: { not: null } },
    });
  });

  it("marks the candidate as GHOSTED once maxAttempts ignored nudges is reached", async () => {
    const { service, prisma, queue } = setup({
      cps: [makeCp([{ id: "rule-1", maxAttempts: 3 }])],
      ignoredNudges: 3,
    });

    expect(await service.scheduleOverdueFollowUps()).toEqual({ scheduled: 0 });
    expect(prisma.candidatePipeline.update).toHaveBeenCalledWith({
      where: { id: "cp-1" },
      data: { status: "GHOSTED" },
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("scopes the scan to a tenant when tenantId is given", async () => {
    const { service, prisma } = setup({ cps: [] });

    await service.scheduleOverdueFollowUps("tenant-a");

    expect(prisma.candidatePipeline.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pipeline: { tenantId: "tenant-a" } }),
      }),
    );
  });
});
