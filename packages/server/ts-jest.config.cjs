/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "\\.ts?$": ["ts-jest", { useESM: true }],
  },
};
