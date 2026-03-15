import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { UICommand } from "./types";

/**
 * Callback to send an image (screenshot) back to the companion WebSocket.
 * Set by CompanionProvider when dispatching commands.
 */
type SendImageFn = (blob: Blob) => void;
type SendTextFn = (text: string) => void;

export function dispatchUICommand(
  cmd: UICommand,
  router: AppRouterInstance,
  activeCaseId: string | null,
  sendImage?: SendImageFn,
  sendText?: SendTextFn,
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
        setTimeout(
          () => el.classList.remove("ring-2", "ring-amber-400"),
          3000,
        );
      }
      break;
    }

    case "filter_findings": {
      const params = new URLSearchParams(window.location.search);
      if (cmd.args.severity)
        params.set("severity", cmd.args.severity as string);
      if (cmd.args.type) params.set("type", cmd.args.type as string);
      window.history.replaceState(null, "", `?${params.toString()}`);
      break;
    }

    case "show_regulation": {
      // Agent reads regulation content via audio — no extra frontend action
      break;
    }

    case "scroll_to": {
      const target = document.getElementById(cmd.args.element_id as string);
      target?.scrollIntoView({ behavior: "smooth" });
      break;
    }

    case "capture_screen": {
      // Take a screenshot of the current page and send it as an image
      capturePageScreenshot().then((blob) => {
        if (blob && sendImage) {
          sendImage(blob);
        }
      });
      break;
    }

    case "read_page_content": {
      // Extract visible text from the page and send it back as a text message
      const text = extractPageText();
      if (text && sendText) {
        sendText(`[PAGE_CONTENT]\n${text}\n[/PAGE_CONTENT]`);
      }
      break;
    }

    case "click_element": {
      const elementText = cmd.args.element_text as string;
      const elementType = (cmd.args.element_type as string) || "button";
      const clicked = clickElementByText(elementText, elementType);
      if (!clicked && sendText) {
        sendText(
          `[SYSTEM] Could not find ${elementType} with text "${elementText}" on the current page.`,
        );
      }
      break;
    }
  }
}

/**
 * Capture a screenshot of the main content area as a JPEG blob.
 */
async function capturePageScreenshot(): Promise<Blob | null> {
  try {
    // Target the main content area (exclude sidebars)
    const main =
      document.querySelector("main") || document.querySelector("body");
    if (!main) return null;

    // Use html-to-image if available, otherwise canvas approach
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(main as HTMLElement, {
      quality: 0.8,
      type: "image/jpeg",
      backgroundColor: "#0F1117",
    });
    return blob;
  } catch {
    // Fallback: create a simple canvas capture
    try {
      const canvas = document.createElement("canvas");
      const rect = document.querySelector("main")?.getBoundingClientRect();
      if (!rect) return null;
      canvas.width = Math.min(rect.width, 1280);
      canvas.height = Math.min(rect.height, 960);
      // Cannot directly render DOM to canvas without html-to-image,
      // so just send the text content instead
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Extract visible text content from the main content area.
 * Returns a structured text representation of what's on screen.
 */
function extractPageText(): string {
  const main = document.querySelector("main");
  if (!main) return "";

  const parts: string[] = [];

  // Get headings
  main.querySelectorAll("h1, h2, h3").forEach((el) => {
    const text = el.textContent?.trim();
    if (text) parts.push(`[${el.tagName}] ${text}`);
  });

  // Get table data
  main.querySelectorAll("table").forEach((table) => {
    const rows: string[] = [];
    table.querySelectorAll("tr").forEach((row) => {
      const cells: string[] = [];
      row.querySelectorAll("th, td").forEach((cell) => {
        const text = cell.textContent?.trim();
        if (text) cells.push(text);
      });
      if (cells.length > 0) rows.push(cells.join(" | "));
    });
    if (rows.length > 0) parts.push(`[TABLE]\n${rows.join("\n")}`);
  });

  // Get buttons and links
  const actions: string[] = [];
  main
    .querySelectorAll('button, a[href], [role="button"]')
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 50) {
        actions.push(`[${el.tagName}] ${text}`);
      }
    });
  if (actions.length > 0) {
    parts.push(`[ACTIONS] ${actions.join(", ")}`);
  }

  // Get KPI/stat cards
  main
    .querySelectorAll('[class*="card"], [class*="stat"], [class*="kpi"]')
    .forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) parts.push(`[CARD] ${text}`);
    });

  // Fallback: get all paragraph text
  if (parts.length === 0) {
    const text = main.textContent?.trim() || "";
    return text.slice(0, 3000); // Limit to 3000 chars
  }

  return parts.join("\n\n").slice(0, 5000); // Limit to 5000 chars
}

/**
 * Find and click an element by its visible text content.
 * Searches buttons, links, and tabs. Returns true if clicked.
 */
function clickElementByText(text: string, type: string): boolean {
  const textLower = text.toLowerCase().trim();

  // Build selector based on type
  let selectors: string[];
  switch (type) {
    case "button":
      selectors = ["button", '[role="button"]', 'input[type="submit"]'];
      break;
    case "link":
      selectors = ["a[href]", '[role="link"]'];
      break;
    case "tab":
      selectors = ['[role="tab"]', "a[href]", "button"];
      break;
    default:
      selectors = ["button", "a[href]", '[role="button"]', '[role="tab"]'];
  }

  // Search in main content area first, then entire document
  const searchAreas = [
    document.querySelector("main"),
    document.body,
  ].filter(Boolean);

  for (const area of searchAreas) {
    for (const selector of selectors) {
      const elements = area!.querySelectorAll(selector);
      for (const el of elements) {
        const elText = el.textContent?.toLowerCase().trim() || "";
        const ariaLabel =
          el.getAttribute("aria-label")?.toLowerCase().trim() || "";
        const title = el.getAttribute("title")?.toLowerCase().trim() || "";

        // Match by text content, aria-label, or title
        if (
          elText.includes(textLower) ||
          ariaLabel.includes(textLower) ||
          title.includes(textLower)
        ) {
          (el as HTMLElement).click();
          console.log(
            `[UICommand] Clicked ${selector}: "${el.textContent?.trim()}"`,
          );
          return true;
        }
      }
    }
  }

  console.warn(`[UICommand] Could not find ${type} with text "${text}"`);
  return false;
}
