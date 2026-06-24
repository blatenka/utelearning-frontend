import api from "@/lib/api";
import type {
  ActiveAttempt,
  Assessment,
  AssessmentAnswer,
  AssessmentQuestion,
  AttemptHistory,
  AttemptResult,
  CreateAssessmentPayload,
  CreateAssessmentQuestionPayload,
  CreateAttemptResponse,
  DetailedAssessment,
  LearnerAssessment,
  PaginatedAssessmentResponse,
  SaveAttemptAnswerPayload,
  SaveAttemptAnswerResponse,
  SubmitProjectPayload,
  SubmitProjectResponse,
  UpdateAssessmentPayload,
  UpdateAssessmentQuestionPayload,
  UpdatePublishedAssessmentPayload,
  UpsertAssessmentAnswerPayload,
} from "@/types/assessment";

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data;
}

export const assessmentService = {
  getInstructorAssessments(courseId: string, params?: Record<string, any>) {
    return api
      .get<PaginatedAssessmentResponse<Assessment>>(
        `/v1/instructor/course/${courseId}/assessments`,
        { params }
      )
      .then(unwrap<PaginatedAssessmentResponse<Assessment>>);
  },

  getInstructorAssessmentDetail(courseId: string, assessmentId: string) {
    return api
      .get<DetailedAssessment>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/detail`
      )
      .then(unwrap<DetailedAssessment>);
  },

  createAssessment(courseId: string, payload: CreateAssessmentPayload) {
    return api
      .post<Assessment>(
        `/v1/instructor/course/${courseId}/assessments/draft`,
        payload
      )
      .then(unwrap<Assessment>);
  },

  updateAssessment(
    courseId: string,
    assessmentId: string,
    payload: UpdateAssessmentPayload
  ) {
    return api
      .patch<Assessment>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}`,
        payload
      )
      .then(unwrap<Assessment>);
  },

  deleteAssessment(courseId: string, assessmentId: string) {
    return api
      .delete(`/v1/instructor/course/${courseId}/assessments/${assessmentId}`)
      .then(unwrap);
  },

  updatePublishedAssessment(
    courseId: string,
    assessmentId: string,
    payload: UpdatePublishedAssessmentPayload
  ) {
    return api
      .patch<Assessment>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/published-assessment`,
        payload
      )
      .then(unwrap<Assessment>);
  },

  publishAssessment(courseId: string, assessmentId: string) {
    return api
      .patch<Assessment>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/publish`
      )
      .then(unwrap<Assessment>);
  },

  getAssessmentQuestions(courseId: string, assessmentId: string) {
    return api
      .get<AssessmentQuestion[]>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/questions`
      )
      .then(unwrap<AssessmentQuestion[]>);
  },

  createQuestion(
    courseId: string,
    assessmentId: string,
    payload: CreateAssessmentQuestionPayload
  ) {
    return api
      .post<AssessmentQuestion>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/questions`,
        payload
      )
      .then(unwrap<AssessmentQuestion>);
  },

  updateQuestion(
    courseId: string,
    assessmentId: string,
    questionId: string,
    payload: UpdateAssessmentQuestionPayload
  ) {
    return api
      .patch<AssessmentQuestion>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/questions/${questionId}`,
        payload
      )
      .then(unwrap<AssessmentQuestion>);
  },

  deleteQuestion(courseId: string, assessmentId: string, questionId: string) {
    return api
      .delete(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/questions/${questionId}`
      )
      .then(unwrap);
  },

  upsertAnswer(
    courseId: string,
    assessmentId: string,
    questionId: string,
    payload: UpsertAssessmentAnswerPayload
  ) {
    return api
      .patch<AssessmentAnswer>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/questions/${questionId}/answer`,
        payload
      )
      .then(unwrap<AssessmentAnswer>);
  },

  getAnswer(courseId: string, assessmentId: string, questionId: string) {
    return api
      .get<AssessmentAnswer>(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/questions/${questionId}/answer`
      )
      .then(unwrap<AssessmentAnswer>);
  },

  deleteAnswer(courseId: string, assessmentId: string, questionId: string) {
    return api
      .delete(
        `/v1/instructor/course/${courseId}/assessments/${assessmentId}/questions/${questionId}/answer`
      )
      .then(unwrap);
  },

  getLearnerAssessments(courseId: string) {
    return api
      .get<LearnerAssessment[]>(`/v1/learner/courses/${courseId}/assessments`)
      .then(unwrap<LearnerAssessment[]>);
  },

  getLearnerAssessmentDetail(assessmentId: string) {
    return api
      .get<LearnerAssessment>(`/v1/learner/assessments/${assessmentId}`)
      .then(unwrap<LearnerAssessment>);
  },

  startAttempt(assessmentId: string) {
    return api
      .post<CreateAttemptResponse>(
        `/v1/learner/assessments/${assessmentId}/attempts`
      )
      .then(unwrap<CreateAttemptResponse>);
  },

  getActiveAttempt(attemptId: string) {
    return api
      .get<ActiveAttempt>(`/v1/learner/attempts/${attemptId}`)
      .then(unwrap<ActiveAttempt>);
  },

  saveAttemptAnswer(
    attemptId: string,
    questionId: string,
    payload: SaveAttemptAnswerPayload
  ) {
    return api
      .patch<SaveAttemptAnswerResponse>(
        `/v1/learner/attempts/${attemptId}/answers/${questionId}`,
        payload
      )
      .then(unwrap<SaveAttemptAnswerResponse>);
  },

  submitAttempt(attemptId: string) {
    return api
      .post<AttemptResult>(`/v1/learner/attempts/${attemptId}/submit`)
      .then(unwrap<AttemptResult>);
  },

  submitProject(attemptId: string, payload: SubmitProjectPayload) {
    return api
      .post<SubmitProjectResponse>(
        `/v1/learner/attempts/${attemptId}/project-submission`,
        payload
      )
      .then(unwrap<SubmitProjectResponse>);
  },

  getAttemptResult(attemptId: string) {
    return api
      .get<AttemptResult>(`/v1/learner/attempts/${attemptId}/result`)
      .then(unwrap<AttemptResult>);
  },

  getAttemptHistory(assessmentId: string) {
    return api
      .get<AttemptHistory>(`/v1/learner/assessments/${assessmentId}/attempts`)
      .then(unwrap<AttemptHistory>);
  },
};