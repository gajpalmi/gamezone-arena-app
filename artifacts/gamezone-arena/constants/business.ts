export const BUSINESS_CATEGORIES = [
  "restaurants", "cafes", "health-wellness", "home-services", "automotive",
  "beauty-personal-care", "professional-services", "retail", "education", "arts-entertainment",
] as const;

export const BUSINESS_REPORT_REASONS = [
  "spam", "fraud", "inappropriate_content", "harassment", "incorrect_information", "other",
] as const;

export const BUSINESS_STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
} as const;