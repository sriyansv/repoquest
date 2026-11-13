import type { GitHubError } from "./github/client";

export function errorStatus(e: GitHubError): number {
  switch (e.kind) {
    case "not_found":
      return 404;
    case "rate_limited":
      return 429;
    case "forbidden":
      return 403;
    case "invalid":
      return 400;
    case "unavailable":
      return 503;
    default:
      return 502;
  }
}
