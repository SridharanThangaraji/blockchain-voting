// scripts/api.js

const BASE = `${window.location.origin}/api`;

async function request(path, method = "GET", body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const err = await res.json();
      if (err && err.message) message = err.message;
    } catch (_) {
      message = res.statusText || `Error ${res.status}`;
    }
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  register: (wallet) =>
    request("/register", "POST", { wallet }),

  candidates: () =>
    request("/candidates"),

  vote: (candidateId, wallet) =>
    request("/vote", "POST", { candidate: candidateId, wallet }),

  verify: (wallet) =>
    request("/verify", "POST", { wallet }),

  results: () =>
    request("/results"),

  status: () =>
    request("/status"),

  startVoting: () =>
    request("/admin/start", "POST"),

  endVoting: () =>
    request("/admin/end", "POST"),
};
