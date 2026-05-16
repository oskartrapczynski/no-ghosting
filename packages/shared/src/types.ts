/** Represents a candidate synced from an ATS */
export interface AtsCandidate {
  atsId: string;
  email: string;
  name: string;
  phone?: string;
  currentStage?: string;
  appliedAt?: Date;
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
  candidates: AtsCandidate[];
  errors: AtsSyncError[];
}

export interface AtsSyncError {
  entity: string;
  atsId?: string;
  message: string;
}

/** Message to be sent through a channel */
export interface FollowUpMessage {
  to: {
    email?: string;
    phone?: string;
    atsId?: string;
  };
  subject?: string;
  body: string;
  candidateName: string;
  pipelineName: string;
  stageName: string;
  attemptNumber: number;
}

/** Result of sending a message through a channel */
export interface ChannelSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
