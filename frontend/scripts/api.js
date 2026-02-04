// scripts/api.js

const BASE = "http://localhost:3000/api";

async function request(path, method = "GET", body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Request failed");
  }

  return res.json();
}

export const api = {
  register: (wallet) =>
    request("/register", "POST", { wallet }),

  vote: (candidate) =>
    request("/vote", "POST", { candidate }),

  verify: (wallet) =>
    request("/verify", "POST", { wallet }),

  results: () =>
    request("/results"),
};
