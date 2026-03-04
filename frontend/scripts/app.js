// scripts/app.js
import { api } from "./api.js";
import { applyLocks } from "./ui.js";
import { FEATURES } from "./config.js";

function friendlyMessage(msg) {
  if (!msg || typeof msg !== "string") return msg;
  const m = msg.toLowerCase();
  if (m.includes("registration period closed") || m.includes("registration closed")) return "Registration is closed. Voting has already started.";
  if (m.includes("already registered")) return "This wallet is already registered.";
  if (m.includes("already cast") || m.includes("already voted")) return "You have already cast your vote.";
  if (m.includes("not registered") || m.includes("voter is not registered")) return "This wallet is not registered. Please register first.";
  if (m.includes("invalid candidate") || m.includes("candidate id")) return "Invalid candidate selected.";
  if (m.includes("voting is not active") || m.includes("not active")) return "Voting is not active yet.";
  if (m.includes("revert")) return "Transaction failed. You may be too late or the action is not allowed.";
  return msg;
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.id;
  const isLocked = applyLocks(page);

  // If phase is locked, stop execution for this page
  if (isLocked) return;

  /* REGISTER */
  if (page === "register") {
    const btn = document.querySelector("#registerBtn");
    const status = document.querySelector(".status-msg");
     const faceBtn = document.getElementById("openFaceScan");
     const faceStatus = document.getElementById("faceScanStatus");

    btn?.addEventListener("click", async () => {
      const wallet = document.getElementById("wallet").value.trim();

      if (!wallet) {
        status.textContent = "Please enter wallet address";
        status.className = "status-msg error";
        return;
      }

      try {
        btn.disabled = true;
        btn.classList.add("loading");
        btn.textContent = "Registering…";
        status.textContent = "";
        status.className = "status-msg";
        await api.register(wallet);
        localStorage.setItem("userWallet", wallet);
        status.textContent = "Registration successful! You can now vote when the phase opens.";
        status.className = "status-msg success";
      } catch (e) {
        status.textContent = friendlyMessage(e.message);
        status.className = "status-msg error";
      } finally {
        btn.disabled = false;
        btn.classList.remove("loading");
        btn.textContent = "REGISTER CITIZEN";
      }
    });

    faceBtn?.addEventListener("click", () => {
      if (!faceStatus) return;
      faceStatus.textContent = "Face capture simulated for demo. (No real biometric processed.)";
      faceStatus.classList.add("face-status-active");
    });
  }

  /* VOTE */
  if (page === "vote") {
    const container = document.getElementById("voteGrid");
    const status = document.getElementById("voteStatus") || document.querySelector(".status-msg");
    const walletInput = document.getElementById("voteWallet");
    const storedWallet = localStorage.getItem("userWallet") || "";

    // Pre-fill from last registration where possible
    if (walletInput && !walletInput.value && storedWallet) {
      walletInput.value = storedWallet;
    }

    try {
      const res = await api.candidates();
      const candidates = res.data;

      container.innerHTML = "";
      candidates.forEach((c) => {
        const div = document.createElement("div");
        div.className = "vote-option";
        div.innerHTML = `
          <strong>${c.name}</strong>
          <span>ID: ${c.id}</span>
        `;
        div.addEventListener("click", async () => {
          try {
            const wallet =
              (walletInput?.value || "").trim() ||
              localStorage.getItem("userWallet") ||
              "";

            if (!wallet) {
              if (status) {
                status.textContent =
                  "Please enter a registered wallet address above before voting.";
                status.className = "status-msg error";
              }
              return;
            }

            div.classList.add("selected", "loading");
            const statusEl = document.getElementById("voteStatus") || document.querySelector(".status-msg");
            if (statusEl) {
              statusEl.textContent = "Recording vote on blockchain…";
              statusEl.className = "status-msg";
            }
            await api.vote(c.id, wallet);
            // Remember the last wallet used successfully
            localStorage.setItem("userWallet", wallet);
            if (status) {
              status.textContent = `Vote for ${c.name} recorded successfully.`;
              status.className = "status-msg success";
            }
            container.classList.add("disabled");
            container.querySelectorAll(".vote-option").forEach((el) => el.classList.remove("selected", "loading"));
          } catch (error) {
            if (status) {
              status.textContent = friendlyMessage(error.message);
              status.className = "status-msg error";
            }
            div.classList.remove("selected", "loading");
          }
        });
        container.appendChild(div);
      });
    } catch (e) {
      if (status) {
        status.textContent = "Failed to load candidates";
        status.className = "status-msg error";
      }
    }
  }

  /* VERIFY */
  if (page === "verify") {
    document.getElementById("verifyForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const wallet = document.getElementById("wallet").value.trim();
      const status = document.querySelector(".status-msg");
      if (!status || !wallet) return;

      try {
        const res = await api.verify(wallet);

        if (FEATURES.voteVerification) {
          status.textContent = res.verified
            ? "CONFIRMED: Your vote is cryptographically secured on the ledger."
            : "NOT FOUND: No record of participation for this address.";
          status.className = `status-msg ${res.verified ? "success" : "error"}`;
        } else if (FEATURES.userVerification) {
          if (res.registered) {
            status.textContent = "USER DISCOVERED: This wallet is registered and ready to vote.";
            status.className = "status-msg success";
            localStorage.setItem("userWallet", wallet);
          } else {
            status.textContent = "USER NOT FOUND: Please register first.";
            status.className = "status-msg error";
          }
        } else {
          status.textContent = res.registered
            ? (res.verified ? "Registered and voted." : "Registered, not voted yet.")
            : "Wallet not registered.";
          status.className = `status-msg ${res.registered ? "success" : "error"}`;
        }
      } catch (e) {
        status.textContent = friendlyMessage(e.message);
        status.className = "status-msg error";
      }
    });
  }

  /* RESULTS */
  if (page === "results") {
    const container = document.getElementById("resultsContainer");
    const totalEl = document.getElementById("totalVotes");

    try {
      const res = await api.results();
      const { totalVotes, candidates } = res.data;
      const total = Number(totalVotes) || 0;

      if (totalEl) totalEl.textContent = total;

      container.innerHTML = "";
      if (!candidates || candidates.length === 0) {
        container.innerHTML = '<p class="note" style="text-align:center; padding: 24px;">No candidates or results yet.</p>';
        return;
      }

      (candidates || []).forEach((c) => {
        const count = Number(c.voteCount) || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const row = document.createElement("div");
        row.className = "result-card";
        row.innerHTML = `
          <div class="result-info">
            <strong>${c.name}</strong>
            <span>${count} vote${count !== 1 ? "s" : ""}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>
        `;
        container.appendChild(row);
      });
    } catch {
      if (container) {
        container.innerHTML = '<p class="status-msg error">Unable to load results. Please try again later.</p>';
      }
    }
  }

  /* HOME / DASHBOARD */
  if (page === "home") {
    const adminPanel = document.getElementById("adminPanel");
    const startBtn = document.getElementById("startVotingBtn");

    try {
      const res = await api.status();
      const phase = res.phase; // 0=Registration, 1=Voting, 2=Ended

      // Show Start Voting button when in Registration phase (no card status changes — all pages Available for demo)
      if (adminPanel && (phase === 0 || phase === "Registration")) {
        adminPanel.style.display = "block";
        startBtn.onclick = async () => {
          try {
            startBtn.disabled = true;
            startBtn.textContent = "Starting…";
            await api.startVoting();
            alert("Voting phase started!");
            window.location.reload();
          } catch (e) {
            alert("Error: " + friendlyMessage(e.message));
          } finally {
            startBtn.disabled = false;
            startBtn.textContent = "START VOTING PHASE";
          }
        };
      }
    } catch (e) {
      console.warn("Could not fetch status:", e.message);
    }

    // Load demo wallet addresses for demo day
    const listEl = document.getElementById("demoAccountsList");
    if (listEl) {
      try {
        const { accounts } = await api.demoAccounts();
        listEl.innerHTML = accounts
          .map(
            (a) =>
              `<div class="demo-account"><span class="demo-role">${a.role}</span><code class="demo-address" title="Click to copy">${a.address}</code></div>`
          )
          .join("");
        listEl.querySelectorAll(".demo-address").forEach((code) => {
          code.addEventListener("click", () => {
            navigator.clipboard.writeText(code.textContent);
            code.classList.add("copied");
            setTimeout(() => code.classList.remove("copied"), 800);
          });
        });
      } catch (_) {
        listEl.innerHTML = '<span class="demo-error">Start the app to see demo wallets.</span>';
      }
    }
  }
});
