const REVIEW = 3;

const FEATURES_BY_REVIEW = {
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

module.exports = {
  review: REVIEW,
  features: FEATURES_BY_REVIEW[REVIEW],
};
