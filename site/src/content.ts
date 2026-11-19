import data from './data/projects.json'
import profileData from './data/profile.json'

export type Media = { loop: string[]; poster: string | null; hero: string | null; full: string | null }
export type Project = Omit<(typeof data)[number], 'media'> & { media: Media }
export const projects = data as Project[]
/** Only these become binders on the shelf; the rest are website-only. */
export const roomProjects = projects.filter((p) => p.inRoom)

export const GLIMPSE_COPY: Record<string, string> = {
  'recorded screen loop': 'Looping recording (placeholder)',
  'interactive-demo': 'Interactive demo (placeholder)',
  'small interactive demo': 'Interactive demo (placeholder)',
}

export const SHOW_GAPS = import.meta.env.DEV // TODO markers only visible in dev
export const bySlug = (slug?: string) => projects.find((p) => p.slug === slug)

export const profile = profileData as typeof profileData & { linkedin?: string | null }
