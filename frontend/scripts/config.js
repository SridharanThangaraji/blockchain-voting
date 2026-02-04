// scripts/config.js

export const REVIEW = 3; // 1 | 2 | 3

export const FEATURES_BY_REVIEW = {
  1: {
    registration: true,
    voting: false,
    verification: false,
    results: false,
  },
  2: {
    registration: true,
    voting: true,
    verification: false,
    results: false,
  },
  3: {
    registration: true,
    voting: true,
    verification: true,
    results: true,
  },
};

export const FEATURES = FEATURES_BY_REVIEW[REVIEW];
