// scripts/ui.js
import { FEATURES } from "./config.js";

export function lockPage(message) {
  const panel = document.querySelector(".panel");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="text-align:center;">🚧 Feature Locked</h2>
    <p style="text-align:center; margin-top:12px;">
      ${message}
    </p>
  `;
}

export function applyLocks(page) {
  if (page === "register" && !FEATURES.registration) {
    lockPage("Voter registration will be enabled in Review-2.");
  }

  if (page === "vote" && !FEATURES.voting) {
    lockPage("Voting phase has not started yet.");
  }

  if (page === "verify" && !FEATURES.verification) {
    lockPage("Vote verification will be available in Review-3.");
  }

  if (page === "results" && !FEATURES.results) {
    lockPage("Results are locked until final review.");
  }
}
