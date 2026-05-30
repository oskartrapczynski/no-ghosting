/** Represents a candidate synced from an ATS */
export interface AtsCandidate {
  atsId: string;
  email: string;
  name: string;
  phone?: string;
  pipelineAtsId?: string;
  currentStage?: string;
  appliedAt?: Date;
  /** ATS id of the recruiter responsible for this candidate. Anti-ghosting
   *  nudges are sent to this recruiter, not to the candidate. */
  assignedRecruiterAtsId?: string;
  metadata?: Record<string, unknown>;
}

/** Recruiter synced from an ATS — the person we nudge to keep candidates engaged */
export interface AtsRecruiter {
  atsId: string;
  email: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

/** Represents a pipeline/job synced from an ATS */
export interface AtsPipeline {
  atsId: string;
  name: string;
  stages: AtsStage[];
  metadata?: Record<string, unknown>;
}

export interface AtsStage {
  atsId: string;
  name: string;
  order: number;
}

/** Result of syncing data from an ATS */
export interface AtsSyncResult {
  pipelines: AtsPipeline[];
  recruiters: AtsRecruiter[];
  candidates: AtsCandidate[];
  errors: AtsSyncError[];
}

export interface AtsSyncError {
  entity: string;
  atsId?: string;
  message: string;
}

/** Recruiter-facing nudge dispatched by a channel. */
export interface FollowUpMessage {
  to: {
    email?: string;
    slackId?: string;
  };
  subject?: string;
  body: string;
  recruiterName?: string;
  candidateName: string;
  candidateEmail: string;
  pipelineName: string;
  stageName: string;
  daysSilent: number;
  attemptNumber: number;
}

/** Result of sending a message through a channel */
export interface ChannelSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
