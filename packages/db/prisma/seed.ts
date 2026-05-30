import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      id: "demo-tenant",
      name: "Demo Company",
      slug: "demo",
      domain: "demo.example.com",
    },
  });
  console.log(`  Tenant: ${tenant.name}`);

  // Users
  const usersData = [
    {
      id: "demo-user-admin",
      email: "admin@demo.example.com",
      name: "Demo Admin",
      role: "ADMIN" as const,
    },
    {
      id: "demo-user-recruiter",
      email: "recruiter@demo.example.com",
      name: "Demo Recruiter",
      role: "RECRUITER" as const,
    },
  ];
  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email_tenantId: { email: u.email, tenantId: tenant.id } },
      update: { name: u.name, role: u.role },
      create: {
        id: u.id,
        tenantId: tenant.id,
        email: u.email,
        name: u.name,
        role: u.role,
      },
    });
  }
  console.log(`  Users: ${usersData.length} upserted`);

  // Recruiters — anti-ghosting nudges target these people
  const recruitersData = [
    {
      id: "demo-recruiter-1",
      email: "maria.recruiter@demo.example.com",
      name: "Maria Recruiter",
      atsId: "r1",
    },
    {
      id: "demo-recruiter-2",
      email: "john.recruiter@demo.example.com",
      name: "John Recruiter",
      atsId: "r2",
    },
  ];
  const recruiterIdByAtsId: Record<string, string> = {};
  for (const r of recruitersData) {
    const rec = await prisma.recruiter.upsert({
      where: { email_tenantId: { email: r.email, tenantId: tenant.id } },
      update: { name: r.name, atsId: r.atsId },
      create: {
        id: r.id,
        tenantId: tenant.id,
        email: r.email,
        name: r.name,
        atsId: r.atsId,
      },
    });
    recruiterIdByAtsId[r.atsId] = rec.id;
  }
  console.log(`  Recruiters: ${recruitersData.length} upserted`);

  // Pipeline
  const pipelineId = "demo-pipeline-1";
  const pipeline = await prisma.pipeline.upsert({
    where: { id: pipelineId },
    update: { name: "Software Engineer - Q1 2026", active: true },
    create: {
      id: pipelineId,
      tenantId: tenant.id,
      name: "Software Engineer - Q1 2026",
      atsSource: "demo",
      atsId: "demo-pipeline-1",
    },
  });

  // Stages
  const stagesData = [
    { name: "Applied", order: 0 },
    { name: "Phone Screen", order: 1 },
    { name: "Technical Interview", order: 2 },
    { name: "Final Round", order: 3 },
    { name: "Offer", order: 4 },
  ];

  const stages: Record<string, string> = {};
  for (const s of stagesData) {
    const stageId = `demo-stage-${s.name.toLowerCase().replace(/\s+/g, "-")}`;
    const stage = await prisma.stage.upsert({
      where: { id: stageId },
      update: { name: s.name, order: s.order, pipelineId: pipeline.id },
      create: {
        id: stageId,
        pipelineId: pipeline.id,
        name: s.name,
        order: s.order,
      },
    });
    stages[s.name] = stage.id;
  }
  console.log(`  Pipeline: ${pipeline.name} (${stagesData.length} stages)`);

  // Follow-up rules — these nudge the RECRUITER, not the candidate.
  // Trigger: recruiter has gone silent on a candidate for `delayDays`.
  const rulesData = [
    {
      id: "demo-rule-applied",
      stage: "Applied",
      delayDays: 3,
      channelType: "EMAIL" as const,
      templateSubject: "{{candidateName}} is waiting on you ({{daysSilent}}d)",
      templateBody:
        "Hi {{recruiterName}},\n\n{{candidateName}} applied to {{pipelineName}} and has been at the {{stageName}} stage for {{daysSilent}} days without a reply from you.\n\nCandidate email: {{candidateEmail}}\n\nKeep them engaged — even a quick acknowledgement prevents ghosting.\n\n— No Ghosting",
      maxAttempts: 2,
      escalate: false,
    },
    {
      id: "demo-rule-phone-screen",
      stage: "Phone Screen",
      delayDays: 5,
      channelType: "EMAIL" as const,
      templateSubject: "{{candidateName}} hasn't heard back ({{daysSilent}}d)",
      templateBody:
        "Hi {{recruiterName}},\n\n{{candidateName}} is at the {{stageName}} stage for {{pipelineName}} and has been waiting {{daysSilent}} days for your follow-up.\n\nReach out to keep the process moving.\n\n— No Ghosting",
      maxAttempts: 3,
      escalate: false,
    },
    {
      id: "demo-rule-technical-interview",
      stage: "Technical Interview",
      delayDays: 5,
      channelType: "EMAIL" as const,
      templateSubject: "Reminder: {{candidateName}} post-interview ({{daysSilent}}d silent)",
      templateBody:
        "Hi {{recruiterName}},\n\n{{candidateName}} completed their technical interview {{daysSilent}} days ago for {{pipelineName}} and is still waiting for next steps.\n\nThis is attempt {{attemptNumber}} — please get back to them today.\n\n— No Ghosting",
      maxAttempts: 3,
      escalate: true,
    },
    {
      id: "demo-rule-final-round",
      stage: "Final Round",
      delayDays: 3,
      channelType: "EMAIL" as const,
      templateSubject: "URGENT: {{candidateName}} post final round ({{daysSilent}}d)",
      templateBody:
        "Hi {{recruiterName}},\n\n{{candidateName}} has been waiting {{daysSilent}} days after the final round for {{pipelineName}}. This is the critical decision window — close them or release them.\n\n— No Ghosting",
      maxAttempts: 2,
      escalate: true,
    },
  ];

  const ruleIdsByStage: Record<string, string> = {};
  for (const r of rulesData) {
    const rule = await prisma.followUpRule.upsert({
      where: { id: r.id },
      update: {
        stageId: stages[r.stage],
        delayDays: r.delayDays,
        channelType: r.channelType,
        templateSubject: r.templateSubject,
        templateBody: r.templateBody,
        maxAttempts: r.maxAttempts,
        escalate: r.escalate,
      },
      create: {
        id: r.id,
        stageId: stages[r.stage],
        delayDays: r.delayDays,
        channelType: r.channelType,
        templateSubject: r.templateSubject,
        templateBody: r.templateBody,
        maxAttempts: r.maxAttempts,
        escalate: r.escalate,
      },
    });
    ruleIdsByStage[r.stage] = rule.id;
  }
  console.log(`  Follow-up rules: ${rulesData.length} upserted`);

  // Candidates
  const candidatesData: Array<{
    email: string;
    name: string;
    phone: string | null;
    atsId: string;
    stage: string;
    status: "ACTIVE" | "HIRED" | "REJECTED" | "WITHDRAWN" | "GHOSTED";
    lastContactDaysAgo: number;
    nextFollowUpDays: number | null;
    recruiterAtsId: string;
  }> = [
    {
      email: "jan.kowalski@example.com",
      name: "Jan Kowalski",
      phone: null,
      atsId: "c1",
      stage: "Phone Screen",
      status: "ACTIVE",
      lastContactDaysAgo: 0,
      nextFollowUpDays: 3,
      recruiterAtsId: "r1",
    },
    {
      email: "anna.nowak@example.com",
      name: "Anna Nowak",
      phone: "+48600100200",
      atsId: "c2",
      stage: "Technical Interview",
      status: "ACTIVE",
      lastContactDaysAgo: 0,
      nextFollowUpDays: 3,
      recruiterAtsId: "r1",
    },
    {
      email: "tomasz.wisniewski@example.com",
      name: "Tomasz Wiśniewski",
      phone: "+48601111222",
      atsId: "c3",
      stage: "Phone Screen",
      status: "GHOSTED",
      lastContactDaysAgo: 14,
      nextFollowUpDays: null,
      recruiterAtsId: "r1",
    },
    {
      email: "katarzyna.zielinska@example.com",
      name: "Katarzyna Zielińska",
      phone: null,
      atsId: "c4",
      stage: "Technical Interview",
      status: "GHOSTED",
      lastContactDaysAgo: 21,
      nextFollowUpDays: null,
      recruiterAtsId: "r2",
    },
    {
      email: "michal.kowalczyk@example.com",
      name: "Michał Kowalczyk",
      phone: "+48602333444",
      atsId: "c5",
      stage: "Offer",
      status: "HIRED",
      lastContactDaysAgo: 2,
      nextFollowUpDays: null,
      recruiterAtsId: "r1",
    },
    {
      email: "agnieszka.lewandowska@example.com",
      name: "Agnieszka Lewandowska",
      phone: null,
      atsId: "c6",
      stage: "Technical Interview",
      status: "REJECTED",
      lastContactDaysAgo: 5,
      nextFollowUpDays: null,
      recruiterAtsId: "r2",
    },
    {
      email: "piotr.mazur@example.com",
      name: "Piotr Mazur",
      phone: "+48603555666",
      atsId: "c7",
      stage: "Final Round",
      status: "ACTIVE",
      lastContactDaysAgo: 4,
      nextFollowUpDays: 1,
      recruiterAtsId: "r1",
    },
    {
      email: "ewa.kaminska@example.com",
      name: "Ewa Kamińska",
      phone: "+48604777888",
      atsId: "c8",
      stage: "Applied",
      status: "ACTIVE",
      lastContactDaysAgo: 10,
      nextFollowUpDays: -3,
      recruiterAtsId: "r2",
    },
    {
      email: "marek.wojcik@example.com",
      name: "Marek Wójcik",
      phone: null,
      atsId: "c9",
      stage: "Phone Screen",
      status: "WITHDRAWN",
      lastContactDaysAgo: 3,
      nextFollowUpDays: null,
      recruiterAtsId: "r1",
    },
    {
      email: "julia.dabrowska@example.com",
      name: "Julia Dąbrowska",
      phone: "+48605999000",
      atsId: "c10",
      stage: "Applied",
      status: "ACTIVE",
      lastContactDaysAgo: 0,
      nextFollowUpDays: 3,
      recruiterAtsId: "r1",
    },
  ];

  const candidatePipelineIdByEmail: Record<string, string> = {};
  for (const c of candidatesData) {
    const now = new Date();
    const lastContact = new Date(now);
    lastContact.setDate(lastContact.getDate() - c.lastContactDaysAgo);

    let nextFollowUp: Date | null = null;
    if (c.nextFollowUpDays !== null) {
      nextFollowUp = new Date(now);
      nextFollowUp.setDate(nextFollowUp.getDate() + c.nextFollowUpDays);
    }

    const candidate = await prisma.candidate.upsert({
      where: { email_tenantId: { email: c.email, tenantId: tenant.id } },
      update: { name: c.name, phone: c.phone, atsId: c.atsId },
      create: {
        tenantId: tenant.id,
        email: c.email,
        name: c.name,
        phone: c.phone,
        atsId: c.atsId,
      },
    });

    const cp = await prisma.candidatePipeline.upsert({
      where: {
        candidateId_pipelineId: {
          candidateId: candidate.id,
          pipelineId: pipeline.id,
        },
      },
      update: {
        currentStageId: stages[c.stage],
        assignedRecruiterId: recruiterIdByAtsId[c.recruiterAtsId],
        lastContactAt: lastContact,
        nextFollowUpAt: nextFollowUp,
        status: c.status,
      },
      create: {
        candidateId: candidate.id,
        pipelineId: pipeline.id,
        currentStageId: stages[c.stage],
        assignedRecruiterId: recruiterIdByAtsId[c.recruiterAtsId],
        lastContactAt: lastContact,
        nextFollowUpAt: nextFollowUp,
        status: c.status,
      },
    });
    candidatePipelineIdByEmail[c.email] = cp.id;
  }
  console.log(`  Candidates: ${candidatesData.length} upserted`);

  // Follow-up logs — history for ghosted + one overdue active candidate
  const logsData = [
    {
      id: "demo-log-1",
      candidateEmail: "tomasz.wisniewski@example.com",
      stage: "Phone Screen",
      attemptNumber: 1,
      sentDaysAgo: 11,
      delivered: true,
    },
    {
      id: "demo-log-2",
      candidateEmail: "tomasz.wisniewski@example.com",
      stage: "Phone Screen",
      attemptNumber: 2,
      sentDaysAgo: 6,
      delivered: true,
    },
    {
      id: "demo-log-3",
      candidateEmail: "katarzyna.zielinska@example.com",
      stage: "Technical Interview",
      attemptNumber: 1,
      sentDaysAgo: 16,
      delivered: true,
    },
    {
      id: "demo-log-4",
      candidateEmail: "katarzyna.zielinska@example.com",
      stage: "Technical Interview",
      attemptNumber: 2,
      sentDaysAgo: 11,
      delivered: true,
    },
    {
      id: "demo-log-5",
      candidateEmail: "katarzyna.zielinska@example.com",
      stage: "Technical Interview",
      attemptNumber: 3,
      sentDaysAgo: 6,
      delivered: false,
      failureReason: "SMTP connection timeout",
    },
    {
      id: "demo-log-6",
      candidateEmail: "ewa.kaminska@example.com",
      stage: "Applied",
      attemptNumber: 1,
      sentDaysAgo: 7,
      delivered: true,
    },
  ];

  for (const l of logsData) {
    const sentAt = new Date();
    sentAt.setDate(sentAt.getDate() - l.sentDaysAgo);
    await prisma.followUpLog.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        candidatePipelineId: candidatePipelineIdByEmail[l.candidateEmail],
        ruleId: ruleIdsByStage[l.stage],
        channelType: "EMAIL",
        attemptNumber: l.attemptNumber,
        sentAt,
        deliveredAt: l.delivered ? sentAt : null,
        failedAt: l.delivered ? null : sentAt,
        failureReason: l.delivered ? null : l.failureReason,
      },
    });
  }
  console.log(`  Follow-up logs: ${logsData.length} upserted`);

  // Channel config
  await prisma.channelConfig.upsert({
    where: {
      tenantId_channelType: { tenantId: tenant.id, channelType: "EMAIL" },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      channelType: "EMAIL",
      config: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "noreply@demo.example.com",
        pass: "changeme",
        fromName: "Demo Company Recruiting",
        fromEmail: "noreply@demo.example.com",
      },
    },
  });
  console.log("  Channel config: EMAIL configured");

  console.log("\nDone! Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
