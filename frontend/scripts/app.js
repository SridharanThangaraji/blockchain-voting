// scripts/app.js
import { api } from "./api.js";
import { applyLocks } from "./ui.js";
import { FEATURES } from "./config.js";

const page = document.body.id;
applyLocks(page);

/* REGISTER */
if (page === "register") {
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.id;

  /* REGISTER */
  if (page === "register") {
    const btn = document.querySelector("button");

    btn.addEventListener("click", async () => {
      const wallet = document.getElementById("wallet").value.trim();

      if (!wallet) {
        alert("Please enter wallet address");
        return;
      }

      try {
        await api.register(wallet);
        alert("Registration successful");
      } catch (e) {
        alert(e.message);
      }
    });
  }

});

}

/* VOTE */
if (page === "vote") {
  document.querySelectorAll(".vote-option").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!FEATURES.voting) return;

      try {
        await api.vote(btn.dataset.candidate);
        document.querySelector(".vote-status").textContent =
          "Vote recorded successfully.";
      } catch (e) {
        document.querySelector(".vote-status").textContent = e.message;
      }
    });
  });
}

/* VERIFY */
if (page === "verify") {
  document.getElementById("verifyForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const wallet = document.getElementById("wallet").value.trim();
    if (!wallet) return;

    try {
      const res = await api.verify(wallet);
      document.querySelector(".verify-status").textContent =
        res.verified ? "Vote found on blockchain." : "No vote found.";
    } catch (e) {
      document.querySelector(".verify-status").textContent = e.message;
    }
  });
}

/* RESULTS */
if (page === "results" && FEATURES.results) {
  try {
    const data = await api.results();
    const container = document.getElementById("resultsContainer");

    container.innerHTML = "";
    Object.entries(data)
      .filter(([k]) => k.startsWith("candidate"))
      .forEach(([k, v]) => {
        const row = document.createElement("div");
        row.textContent = `${k}: ${v}`;
        container.appendChild(row);
      });
  } catch {
    document.getElementById("resultsContainer").textContent =
      "Failed to load results.";
  }
}
