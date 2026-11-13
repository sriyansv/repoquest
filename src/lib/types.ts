/**
 * Shared data model for RepoQuest.
 *
 * Everything here is plain JSON so it can be passed from Server Components
 * to Client Components and cached safely.
 */

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface RepoMeta {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  homepage: string | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  topics: string[];
  primaryLanguage: string | null;
  ownerAvatar: string | null;
  htmlUrl: string;
  pushedAt: string | null;
  archived: boolean;
  fork: boolean;
  sizeKb: number;
}

export interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

/** A file we actually downloaded and read. */
export interface SourceFile {
  path: string;
  content: string;
  size: number;
}

export interface LanguageStat {
  language: string;
  bytes: number;
  percent: number;
  color: string;
}

export interface EntryPoint {
  path: string;
  /** Human-readable reason this file was flagged, e.g. "package.json \"main\" field". */
  reason: string;
  /** "confirmed" = declared in a manifest; "convention" = matched a well-known filename. */
  evidence: "confirmed" | "convention";
}

export type EdgeKind = "confirmed" | "inferred";

export interface ModuleNode {
  id: string;
  label: string;
  /** Directory path, or "" for repository root files. */
  path: string;
  fileCount: number;
  languages: string[];
  role: string | null;
  isEntry: boolean;
}

export interface ModuleEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  /** Number of import statements backing a confirmed edge. */
  weight: number;
  /** Why the edge exists, e.g. "src/app/page.tsx imports src/lib/github". */
  evidence: string[];
}

export interface FileDependency {
  from: string;
  to: string;
  /** The raw specifier as written in the source. */
  specifier: string;
  /** import = code import; script/stylesheet = loaded by HTML/CSS; link = hyperlink to another page. */
  relation: DependencyRelation;
}

export type DependencyRelation = "import" | "script" | "stylesheet" | "link";

export interface ArchitectureGraph {
  nodes: ModuleNode[];
  edges: ModuleEdge[];
  fileDependencies: FileDependency[];
  externalPackages: { name: string; importedBy: number }[];
  analyzedFiles: number;
}

export interface FlowStep {
  depth: number;
  file: string;
  calls: string[];
}

export interface Fact {
  text: string;
  /** Where this fact came from - a file path or "GitHub API". */
  source: string;
}

export interface GroundedSummary {
  headline: string;
  whatItDoes: Fact[];
  techStack: Fact[];
  howToRun: Fact[];
  structure: Fact[];
  executionFlow: FlowStep[];
  caveats: string[];
}

export interface IssueAssessment {
  number: number;
  title: string;
  url: string;
  labels: string[];
  author: string | null;
  comments: number;
  createdAt: string;
  updatedAt: string;
  assigned: boolean;
  bodyExcerpt: string;
  score: number;
  verdict: "good-first" | "possible" | "not-recommended";
  reasons: { positive: boolean; text: string }[];
  relevantFiles: { path: string; evidence: "mentioned" | "keyword" }[];
  prerequisites: string[];
}

export interface RepoAnalysis {
  meta: RepoMeta;
  ref: string;
  generatedAt: string;
  tree: TreeEntry[];
  treeTruncated: boolean;
  totalFiles: number;
  readme: { path: string; content: string } | null;
  languages: LanguageStat[];
  entryPoints: EntryPoint[];
  graph: ArchitectureGraph;
  summary: GroundedSummary;
  issues: IssueAssessment[];
  issuesError: string | null;
  contributingPath: string | null;
  rateLimit: RateLimitInfo | null;
  /** Notes about limits we hit (large repo, skipped files, etc.). */
  notices: string[];
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  authenticated: boolean;
}
