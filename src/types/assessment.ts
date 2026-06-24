export type AssessmentType = "QUIZ" | "PROJECT";

export type AssessmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type AssessmentReviewTiming = "AFTER_GRADED" | "AFTER_SUBMISSION";

export type AssessmentReviewContent = "SCORE_ONLY" | "SCORE_AND_ANSWERS";

export type AssessmentQuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_IN_THE_BLANK";

export type AssessmentAttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADED"
  | "EXPIRED";

export type ProjectSubmissionStatus = "SUBMITTED" | "GRADED" | "RETURNED";

export type LearnerAssessmentState =
  | "CAN_START"
  | "CAN_CONTINUE"
  | "COMPLETED"
  | "MAX_ATTEMPTS_REACHED"
  | "NOT_AVAILABLE"
  | "LOCKED";

export type LearnerAssessmentAction =
  | "START"
  | "CONTINUE"
  | "VIEW_RESULT"
  | "NONE";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedAssessmentResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type Assessment = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  type: AssessmentType;
  order: number;
  totalPoints: number;
  passingScore?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  status?: AssessmentStatus;
  isActive?: boolean;
  assessmentReviewTiming?: AssessmentReviewTiming | null;
  assessmentReviewContent?: AssessmentReviewContent | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type CreateAssessmentPayload = {
  title: string;
  description?: string;
  type: AssessmentType;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number;
  availableFrom?: string;
  availableUntil?: string;
};

export type UpdateAssessmentPayload = {
  title?: string;
  description?: string | null;
  type?: AssessmentType;
  order?: number;
  passingScore?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  isActive?: boolean;
};

export type UpdatePublishedAssessmentPayload = {
  availableFrom?: string | null;
  availableUntil?: string | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  assessmentReviewTiming?: AssessmentReviewTiming | null;
  assessmentReviewContent?: AssessmentReviewContent | null;
  isActive?: boolean;
};
export type AssessmentAnswer = {
  id: string;
  questionId: string;
  correctOptionAnswer?: string | null;
  correctTextAnswer?: string | null;
  wrongAnswers?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpsertAssessmentAnswerPayload = {
  correctOptionAnswer?: string;
  correctTextAnswer?: string;
  wrongAnswers?: string[];
};

export type AssessmentQuestion = {
  id: string;
  assessmentId: string;
  questionText: string;
  type: AssessmentQuestionType;
  explanation?: string | null;
  points: number;
  order: number;
  isActive?: boolean;
  answer?: AssessmentAnswer | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type CreateAssessmentQuestionPayload = {
  questionText: string;
  type: AssessmentQuestionType;
  explanation?: string;
  points?: number;
};

export type UpdateAssessmentQuestionPayload =
  Partial<CreateAssessmentQuestionPayload>;

export type DetailedAssessment = Assessment & {
  status: AssessmentStatus;
  questions: AssessmentQuestion[];
};

export type LearnerLatestAttempt = {
  attemptId: string;
  attemptNumber: number;
  status: string;
  score?: number | null;
  maxScore?: number | null;
  passed: boolean;
  startedAt: string;
  submittedAt?: string | null;
  expiresAt?: string | null;
  remainingSeconds?: number | null;
};

export type LearnerAssessment = {
  assessmentId: string;
  title: string;
  description?: string | null;
  type: AssessmentType;
  totalPoints: number;
  passingScore?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  attemptsUsed: number;
  attemptsRemaining?: number | null;
  state: LearnerAssessmentState;
  primaryAction: LearnerAssessmentAction;
  latestAttempt?: LearnerLatestAttempt | null;
  serverNow: string;
  message?: string | null;
};

export type CreateAttemptResponse = {
  action: "CREATED" | "RESUMED";
  attemptId: string;
  assessmentId: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  expiresAt?: string | null;
  remainingSeconds?: number | null;
  serverNow: string;
};

export type ActiveAttemptQuestion = {
  questionId: string;
  questionText: string;
  type: AssessmentQuestionType;
  points: number;
  order: number;
  options?: string[] | null;
};

export type ActiveAttemptSavedAnswer = {
  questionId: string;
  answer?: string | null;
  savedAt: string;
};

export type ActiveProjectRequirement = {
  title: string;
  description?: string | null;
  requirement: string;
  totalPoints: number;
  note?: string | null;
};

export type ActiveAttempt = {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentDescription?: string | null;
  type: AssessmentType;
  status: AssessmentAttemptStatus;
  attemptNumber: number;
  totalPoints: number;
  passingScore?: number | null;
  startedAt: string;
  expiresAt?: string | null;
  remainingSeconds?: number | null;
  serverNow: string;
  questions: ActiveAttemptQuestion[];
  savedAnswers: ActiveAttemptSavedAnswer[];
  projectRequirement?: ActiveProjectRequirement | null;
};

export type SaveAttemptAnswerPayload = {
  answer: string;
  answerSnapshot?: string;
};

export type SaveAttemptAnswerResponse = {
  attemptId: string;
  questionId: string;
  saved: boolean;
  savedAt: string;
  remainingSeconds?: number | null;
  serverNow: string;
};

export type SubmitProjectPayload = {
  githubUrl?: string;
  deployUrl?: string;
  documentUrl?: string;
  note?: string;
};

export type SubmitProjectResponse = {
  submissionId: string;
  attemptId: string;
  status: ProjectSubmissionStatus;
  githubUrl?: string | null;
  deployUrl?: string | null;
  documentUrl?: string | null;
  note?: string | null;
  submittedAt: string;
  score?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
  serverNow: string;
};

export type AttemptHistoryItem = {
  attemptId: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  score?: number | null;
  maxScore?: number | null;
  passed: boolean;
  startedAt: string;
  submittedAt?: string | null;
  canContinue: boolean;
  canViewResult: boolean;
};

export type AttemptHistory = {
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: AssessmentType;
  maxAttempts?: number | null;
  attemptsUsed: number;
  attemptsRemaining?: number | null;
  attempts: AttemptHistoryItem[];
  serverNow: string;
};

export type AttemptResultAnswer = {
  questionId: string;
  questionText: string;
  questionType: AssessmentQuestionType;
  points: number;
  pointsEarned?: number | null;
  learnerAnswer?: string | null;
  isCorrect?: boolean | null;
  correctAnswer?: string | null;
  explanation?: string | null;
};

export type AttemptResultProjectSubmission = {
  submissionId: string;
  status: ProjectSubmissionStatus;
  githubUrl?: string | null;
  deployUrl?: string | null;
  documentUrl?: string | null;
  note?: string | null;
  score?: number | null;
  feedback?: string | null;
  submittedAt: string;
  gradedAt?: string | null;
};

export type AttemptResult = {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: AssessmentType;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  score?: number | null;
  maxScore?: number | null;
  passed: boolean;
  startedAt: string;
  submittedAt?: string | null;
  canRetake: boolean;
  canReview: boolean;
  answers?: AttemptResultAnswer[];
  projectSubmission?: AttemptResultProjectSubmission | null;
  serverNow: string;
};