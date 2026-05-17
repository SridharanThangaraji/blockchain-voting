// scripts/app.js
import { api } from "./api.js";
import { applyLocks } from "./ui.js";
import { FEATURES } from "./config.js";

// Reusable QR scanner: opens modal, scans, fills targetInput, closes.
function attachQrScanner({ openBtn, modal, video, statusEl, closeBtn, targetInput }) {
  if (!openBtn || !modal || !video) return;
  let stream = null;
  let rafId = null;

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    modal.style.display = "none";
  }

  function tick() {
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) { rafId = requestAnimationFrame(tick); return; }
    const cv = document.createElement("canvas");
    cv.width = video.videoWidth; cv.height = video.videoHeight;
    const ctx = cv.getContext("2d");
    ctx.drawImage(video, 0, 0, cv.width, cv.height);
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const code = window.jsQR && window.jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (code && code.data) {
      if (targetInput) targetInput.value = code.data.trim();
      if (statusEl) { statusEl.textContent = "✓ QR detected!"; statusEl.className = "qr-status success"; }
      stop();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  openBtn.addEventListener("click", async () => {
    modal.style.display = "flex";
    if (statusEl) { statusEl.textContent = "Initializing camera…"; statusEl.className = "qr-status"; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
      if (statusEl) { statusEl.textContent = "Scanning — hold QR code steady in the frame…"; statusEl.className = "qr-status scanning"; }
      rafId = requestAnimationFrame(tick);
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions."
          : "Could not open camera.";
        statusEl.className = "qr-status";
      }
    }
  });

  closeBtn?.addEventListener("click", stop);
  modal.addEventListener("click", (e) => { if (e.target === modal) stop(); });
}

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
    const captureBtn = document.getElementById("captureFace");
    const retakeBtn = document.getElementById("retakeFace");
    const faceStatus = document.getElementById("faceScanStatus");
    const faceVideo = document.getElementById("faceVideo");
    const faceCanvas = document.getElementById("faceCanvas");
    const faceFrame = document.getElementById("faceFrame");
    const faceInstruction = document.getElementById("faceInstruction");
    let faceCameraStream = null;

    async function openCamera() {
      try {
        faceCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
        faceVideo.srcObject = faceCameraStream;
        faceFrame.classList.add("camera-active");
        faceFrame.classList.remove("captured");
        faceInstruction.textContent = "Look straight ahead, then press CAPTURE";
        faceStatus.textContent = "Camera active.";
        faceStatus.className = "face-status face-status-active";
        faceBtn.style.display = "none";
        captureBtn.style.display = "";
        retakeBtn.style.display = "none";
      } catch (err) {
        faceStatus.textContent = err.name === "NotAllowedError"
          ? "Camera access denied — please allow camera permissions and try again."
          : "Could not access camera. Make sure a webcam is connected.";
        faceStatus.className = "face-status";
      }
    }

    // QR scanner for wallet input on register page
    attachQrScanner({
      openBtn: document.getElementById("scanQrBtnReg"),
      modal: document.getElementById("qrScanModalReg"),
      video: document.getElementById("qrVideoReg"),
      statusEl: document.getElementById("qrScanStatusReg"),
      closeBtn: document.getElementById("closeQrBtnReg"),
      targetInput: document.getElementById("wallet"),
    });

    faceBtn?.addEventListener("click", openCamera);

    captureBtn?.addEventListener("click", () => {
      if (!faceVideo.srcObject) return;
      const ctx = faceCanvas.getContext("2d");
      faceCanvas.width = faceVideo.videoWidth || 640;
      faceCanvas.height = faceVideo.videoHeight || 480;
      ctx.drawImage(faceVideo, 0, 0, faceCanvas.width, faceCanvas.height);
      faceCameraStream?.getTracks().forEach(t => t.stop());
      faceCameraStream = null;
      faceFrame.classList.remove("camera-active");
      faceFrame.classList.add("captured");
      faceInstruction.textContent = "✓ Face captured";
      faceStatus.textContent = "Biometric sample captured successfully.";
      faceStatus.className = "face-status face-status-active";
      captureBtn.style.display = "none";
      retakeBtn.style.display = "";
    });

    retakeBtn?.addEventListener("click", () => {
      faceFrame.classList.remove("captured");
      retakeBtn.style.display = "none";
      openCamera();
    });

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
  }

  /* VOTE */
  if (page === "vote") {
    const container = document.getElementById("voteGrid");
    const status = document.getElementById("voteStatus") || document.querySelector(".status-msg");
    const walletInput = document.getElementById("voteWallet");
    const storedWallet = localStorage.getItem("userWallet") || "";

    if (walletInput && !walletInput.value && storedWallet) {
      walletInput.value = storedWallet;
    }

    // ---- QR Scanner (vote page) ----
    attachQrScanner({
      openBtn: document.getElementById("scanQrBtn"),
      modal: document.getElementById("qrScanModal"),
      video: document.getElementById("qrVideo"),
      statusEl: document.getElementById("qrScanStatus"),
      closeBtn: document.getElementById("closeQrBtn"),
      targetInput: walletInput,
    });

    // ---- Confirm Modal ----
    const confirmModal = document.getElementById("voteConfirmModal");
    const confirmCandidateName = document.getElementById("confirmCandidateName");
    const confirmWalletAddr = document.getElementById("confirmWalletAddr");
    const confirmVoteBtn = document.getElementById("confirmVoteBtn");
    const cancelVoteBtn = document.getElementById("cancelVoteBtn");
    let pendingVote = null; // { candidateId, candidateName, wallet, cardEl }

    cancelVoteBtn?.addEventListener("click", () => {
      if (confirmModal) confirmModal.style.display = "none";
      if (pendingVote?.cardEl) pendingVote.cardEl.classList.remove("selected", "loading");
      pendingVote = null;
    });

    confirmModal?.addEventListener("click", (e) => {
      if (e.target === confirmModal) cancelVoteBtn?.click();
    });

    confirmVoteBtn?.addEventListener("click", async () => {
      if (!pendingVote) return;
      const { candidateId, candidateName, wallet, cardEl } = pendingVote;
      pendingVote = null;
      if (confirmModal) confirmModal.style.display = "none";

      cardEl.classList.add("selected", "loading");
      if (status) { status.textContent = "Recording vote on blockchain…"; status.className = "status-msg"; }

      try {
        await api.vote(candidateId, wallet);
        localStorage.setItem("userWallet", wallet);
        if (status) { status.textContent = `✓ Vote for ${candidateName} recorded successfully on the blockchain.`; status.className = "status-msg success"; }
        container.classList.add("disabled");
        container.querySelectorAll(".vote-option").forEach((el) => el.classList.remove("selected", "loading"));
      } catch (error) {
        if (status) { status.textContent = friendlyMessage(error.message); status.className = "status-msg error"; }
        cardEl.classList.remove("selected", "loading");
      }
    });

    // ---- Load Candidates ----
    try {
      const res = await api.candidates();
      const candidates = res.data;

      container.innerHTML = "";
      candidates.forEach((c) => {
        const div = document.createElement("div");
        div.className = "vote-option";
        div.innerHTML = `<strong>${c.name}</strong><span>Candidate ID: ${c.id}</span>`;
        div.addEventListener("click", () => {
          const wallet = (walletInput?.value || "").trim() || localStorage.getItem("userWallet") || "";
          if (!wallet) {
            if (status) { status.textContent = "Please enter a registered wallet address above before voting."; status.className = "status-msg error"; }
            walletInput?.focus();
            return;
          }
          // Show confirm modal
          pendingVote = { candidateId: c.id, candidateName: c.name, wallet, cardEl: div };
          if (confirmCandidateName) confirmCandidateName.textContent = c.name;
          if (confirmWalletAddr) confirmWalletAddr.textContent = wallet;
          if (confirmModal) confirmModal.style.display = "flex";
        });
        container.appendChild(div);
      });
    } catch (e) {
      if (status) { status.textContent = "Failed to load candidates"; status.className = "status-msg error"; }
    }
  }

  /* VERIFY */
  if (page === "verify") {
    attachQrScanner({
      openBtn: document.getElementById("scanQrBtnVerify"),
      modal: document.getElementById("qrScanModalVerify"),
      video: document.getElementById("qrVideoVerify"),
      statusEl: document.getElementById("qrScanStatusVerify"),
      closeBtn: document.getElementById("closeQrBtnVerify"),
      targetInput: document.getElementById("wallet"),
    });

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

    // Results are only visible after voting has ended (phase 2)
    try {
      const statusRes = await api.status();
      const phase = statusRes.phase;
      const isEnded = phase === 2 || phase === "Ended";

      if (!isEnded) {
        if (container) {
          container.innerHTML = `
            <div style="text-align:center; padding: 32px 0;">
              <div style="font-size:3rem; margin-bottom:16px;">🔒</div>
              <p style="font-size:1.1rem; font-weight:600; color:var(--text-main); margin-bottom:8px;">Results Not Yet Available</p>
              <p style="color:var(--text-dim); font-size:0.9rem;">Results will be visible once the voting phase is closed by the admin.</p>
            </div>`;
        }
        if (totalEl) totalEl.textContent = "–";
        return;
      }
    } catch (e) {
      console.warn("Could not check phase:", e.message);
    }

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
    const stopBtn = document.getElementById("stopVotingBtn");

    try {
      const res = await api.status();
      const phase = res.phase; // 0=Registration, 1=Voting, 2=Ended

      if (adminPanel && (phase === 0 || phase === "Registration")) {
        adminPanel.style.display = "block";
        startBtn.style.display = "";
        startBtn.onclick = async () => {
          try {
            startBtn.disabled = true;
            startBtn.textContent = "Starting…";
            await api.startVoting();
            window.location.reload();
          } catch (e) {
            alert("Error: " + friendlyMessage(e.message));
            startBtn.disabled = false;
            startBtn.textContent = "START VOTING PHASE";
          }
        };
      }

      if (adminPanel && (phase === 1 || phase === "Voting")) {
        adminPanel.style.display = "block";
        stopBtn.style.display = "";
        stopBtn.onclick = async () => {
          if (!confirm("Stop the voting phase? Results will become visible to everyone.")) return;
          try {
            stopBtn.disabled = true;
            stopBtn.textContent = "Stopping…";
            await api.endVoting();
            window.location.reload();
          } catch (e) {
            alert("Error: " + friendlyMessage(e.message));
            stopBtn.disabled = false;
            stopBtn.textContent = "STOP VOTING PHASE";
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
