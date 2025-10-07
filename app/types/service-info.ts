import type { ServicePlanRecommendationResult } from "./service-plan-recommendation"

export type DeviceInfo = {
  deviceName: string | null
  registrationNumber: string | null
  deviceModel: string | null
  geHostSystemNumber: string | null
  installationDate: string | null
  serviceStartDate: string | null
  serviceEndDate: string | null
}

export type OnsiteSlaItem = {
  serviceType: string | null
  responseTimeHours: number | null
  onSiteTimeHours: number | null
  coverage: string | null
  originalContractSnippet: string | null
  devices: DeviceInfo[]
}

export type YearlyMaintenanceItem = {
  serviceType: string | null
  standardPmPerYear: number | null
  smartPmPerYear: number | null
  remotePmPerYear: number | null
  scope: string[]
  deliverables: string | null
  scheduling: string | null
  originalContractSnippet: string | null
  devices: DeviceInfo[]
}

export type RemoteMaintenanceItem = {
  serviceType: string | null
  platform: string | null
  ctRemotePmPerYear: number | null
  mrRemotePmPerYear: number | null
  igsRemotePmPerYear: number | null
  drRemotePmPerYear: number | null
  mammoRemotePmPerYear: number | null
  mobileDrRemotePmPerYear: number | null
  boneDensityRemotePmPerYear: number | null
  usRemotePmPerYear: number | null
  otherRemotePmPerYear: number | null
  prerequisitesMaxUsersPerDevice: number | null
  reports: string[]
  originalContractSnippet: string | null
}

export type TrainingSupportItem = {
  serviceType: string | null
  trainingCategory: string | null
  applicableDevices: string[]
  trainingTimes: number | null
  trainingPeriod: string | null
  trainingDays: number | null
  trainingSeats: number | null
  trainingCost: string | null
  originalContractSnippet: string | null
}

export type ContractComplianceItem = {
  informationConfidentialityRequirements: boolean | null
  liabilityOfBreach: string | null
  partsReturnRequirements: string | null
  deliveryRequirements: string | null
  transportationInsurance: string | null
  deliveryLocation: string | null
}

export type AfterSalesSupportItem = {
  guaranteeRunningRate: number | null
  guaranteeMechanism: string | null
  serviceReportForm: string | null
  remoteService: string | null
  hotlineSupport: string | null
  taxFreePartsPriority: boolean | null
}

export type KeySparePartTubeItem = {
  deviceModel: string | null
  geHostSystemNumber: string | null
  xrTubeId: string | null
  manufacturer: string | null
  registrationNumber: string | null
  contractStartDate: string | null
  contractEndDate: string | null
  responseTime: number | null
}

export type KeySparePartCoilItem = {
  geHostSystemNumber: string | null
  coilOrderNumber: string | null
  coilName: string | null
  coilSerialNumber: string | null
}

export type KeySparePartItem = {
  serviceType: string | null
  coveredItems: string[]
  replacementPolicy: string | null
  oldPartReturnRequired: boolean | null
  nonReturnPenaltyPct: number | null
  logisticsBy: string | null
  leadTimeBusinessDays: number | null
  originalContractSnippet: string | null
  tubes: KeySparePartTubeItem[]
  coils: KeySparePartCoilItem[]
}

export type ServiceInfoSnapshotPayload = {
  onsiteSla: OnsiteSlaItem[]
  yearlyMaintenance: YearlyMaintenanceItem[]
  remoteMaintenance: RemoteMaintenanceItem[]
  trainingSupports: TrainingSupportItem[]
  contractCompliance: ContractComplianceItem | null
  afterSalesSupport: AfterSalesSupportItem | null
  keySpareParts: KeySparePartItem[]
  servicePlanRecommendation: ServicePlanRecommendationResult | null
}

export const createEmptyServiceInfoSnapshot = (): ServiceInfoSnapshotPayload => ({
  onsiteSla: [],
  yearlyMaintenance: [],
  remoteMaintenance: [],
  trainingSupports: [],
  contractCompliance: null,
  afterSalesSupport: null,
  keySpareParts: [],
  servicePlanRecommendation: null,
})

export const DEFAULT_SERVICE_INFO_SNAPSHOT: ServiceInfoSnapshotPayload = createEmptyServiceInfoSnapshot()
