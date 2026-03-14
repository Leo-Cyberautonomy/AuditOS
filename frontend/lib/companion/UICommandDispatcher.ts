import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { UICommand } from "./types";

export function dispatchUICommand(
  cmd: UICommand,
  router: AppRouterInstance,
  activeCaseId: string | null,
) {
  switch (cmd.command) {
    case "navigate_to": {
      const page = cmd.args.page as string;
      const caseId = (cmd.args.case_id as string) || activeCaseId;
      if (["dashboard", "cases"].includes(page)) {
        router.push(`/${page}`);
      } else if (caseId) {
        router.push(`/cases/${caseId}/${page}`);
      }
      break;
    }
    case "highlight_finding": {
      const findingId = cmd.args.finding_id as string;
      const el = document.getElementById(`finding-${findingId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-amber-400");
        setTimeout(() => el.classList.remove("ring-2", "ring-amber-400"), 3000);
      }
      break;
    }
    case "filter_findings": {
      const params = new URLSearchParams(window.location.search);
      if (cmd.args.severity) params.set("severity", cmd.args.severity as string);
      if (cmd.args.type) params.set("type", cmd.args.type as string);
      window.history.replaceState(null, "", `?${params.toString()}`);
      break;
    }
    case "show_regulation": {
      // Agent reads regulation content via audio — no frontend action needed
      break;
    }
    case "scroll_to": {
      const target = document.getElementById(cmd.args.element_id as string);
      target?.scrollIntoView({ behavior: "smooth" });
      break;
    }
  }
}
