// scripts/app.js
import { api } from "./api.js";
import { applyLocks } from "./ui.js";
import { FEATURES } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.id;
  const isLocked = applyLocks(page);

  // If phase is locked, stop execution for this page
  if (isLocked) return;

  /* REGISTER */
  if (page === "register") {
    const btn = document.querySelector("#registerBtn");
    const status = document.querySelector(".status-msg");

    btn?.addEventListener("click", async () => {
      const wallet = document.getElementById("wallet").value.trim();

      if (!wallet) {
        status.textContent = "Please enter wallet address";
        status.className = "status-msg error";
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = "PROCESSING...";
        await api.register(wallet);
        localStorage.setItem("userWallet", wallet);
        status.textContent = "Registration successful!";
        status.className = "status-msg success";
      } catch (e) {
        status.textContent = e.message;
        status.className = "status-msg error";
      } finally {
        btn.disabled = false;
        btn.textContent = "REGISTER CITIZEN";
      }
    });
  }

  /* VOTE */
  if (page === "vote") {
    const container = document.getElementById("voteGrid");
    const status = document.getElementById("voteStatus") || document.querySelector(".status-msg");
    const userWallet = localStorage.getItem("userWallet");

    if (!userWallet) {
      if (status) {
        status.textContent = "Please Register or Verify your Identity first.";
        status.className = "status-msg error";
      }
      return;
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
            await api.vote(c.id, userWallet);
            status.textContent = `Vote for ${c.name} recorded!`;
            status.className = "status-msg success";
            container.classList.add("disabled");
          } catch (error) {
            status.textContent = error.message;
            status.className = "status-msg error";
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
        status.textContent = e.message;
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

      (candidates || []).forEach((c) => {
        const count = Number(c.voteCount) || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const row = document.createElement("div");
        row.className = "result-card";
        row.innerHTML = `
          <div class="result-info">
            <strong>${c.name}</strong>
            <span>${count} votes</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>
        `;
        container.appendChild(row);
      });
    } catch {
      if (container) {
        container.innerHTML = "<p class='status-msg error'>Failed to load results.</p>";
      }
    }
  }

  /* HOME / DASHBOARD */
  if (page === "home") {
    const adminPanel = document.getElementById("adminPanel");
    const startBtn = document.getElementById("startVotingBtn");

    try {
      const res = await api.status();
      const phase = res.phase;

      if (phase === 0) { // Registration
        adminPanel.style.display = "block";
        startBtn.onclick = async () => {
          try {
            await api.startVoting();
            alert("Voting phase started!");
            window.location.reload();
          } catch (e) {
            alert("Error: " + e.message);
          }
        };
      }
    } catch (e) {
      console.warn("Could not fetch status:", e.message);
    }
  }
});
