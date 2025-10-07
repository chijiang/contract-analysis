export type ServicePlanClauseType =
  | "onsite_sla"
  | "yearly_maintenance"
  | "remote_maintenance"
  | "training_support"
  | "key_spare_parts"

export type ClausePlanRecommendation = {
  clauseId: string
  clauseType: ServicePlanClauseType | string
  recommendedPlanId: string | null
  recommendedPlanName: string | null
  rationale: string
  alternativePlanIds: string[]
  alternativePlanNames: string[]
}

export type ServicePlanRecommendationResult = {
  summary: string
  overallPlanId: string | null
  overallPlanName: string | null
  overallAdjustmentNotes: string | null
  matches: ClausePlanRecommendation[]
}
