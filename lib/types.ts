export interface Deadline {
  what: string
  when: string
  consequence: string
}

export interface AnalysisData {
  document_type: string
  summary: string
  deadlines: Deadline[]
  required_actions: string[]
  risks: string[]
  next_steps: string[]
  uncertain_points: string[]
  official_sources_to_check: string[]
}
