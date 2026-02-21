// scripts/ui.js
import { FEATURES } from "./config.js";

export function lockPage(message) {
  const panel = document.querySelector(".panel");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="text-align:center;">🚧 Phase Locked</h2>
    <p style="text-align:center; margin-top:12px; color: var(--text-dim);">
      ${message}
    </p>
    <div style="text-align:center; margin-top:24px;">
      <a href="../index.html" class="primary" style="padding: 10px 20px; text-decoration: none; border-radius: 8px;">Back to Dashboard</a>
    </div>
  `;
}

export function applyLocks(page) {
  if (page === "register" && !FEATURES.registration) {
    lockPage("Voter registration will be enabled in Review Phase 1.");
    return true;
  }

  if (page === "verify" && !FEATURES.userVerification && !FEATURES.voteVerification) {
    lockPage("Verification services will be available in Review Phase 2 (User Discovery) and Phase 4 (Vote Validation).");
    return true;
  }

  if (page === "vote" && !FEATURES.voting) {
    lockPage("Voting portal will be active in Review Phase 3.");
    return true;
  }

  if (page === "results" && !FEATURES.results) {
    lockPage("Election results and platform finalization are scheduled for Review Phase 5.");
    return true;
  }

  return false;
}
