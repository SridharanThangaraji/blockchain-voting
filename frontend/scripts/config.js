// scripts/config.js

export const REVIEW = 5; // 1–5: controls which features are enabled (5 = all)

export const FEATURES_BY_REVIEW = {
  1: {
    registration: true,
    userVerification: false,
    voting: false,
    voteVerification: false,
    results: false,
  },
  2: {
    registration: true,
    userVerification: true,
    voting: false,
    voteVerification: false,
    results: false,
  },
  3: {
    registration: true,
    userVerification: true,
    voting: true,
    voteVerification: false,
    results: false,
  },
  4: {
    registration: true,
    userVerification: true,
    voting: true,
    voteVerification: true,
    results: false,
  },
  5: {
    registration: true,
    userVerification: true,
    voting: true,
    voteVerification: true,
    results: true,
  },
};

export const FEATURES = FEATURES_BY_REVIEW[REVIEW];
