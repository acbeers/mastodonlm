const config = {
  moduleNameMapper: {
    "ComlinkHook.js": "<rootDir>/jest_ComlinkHook.js",
  },
  modulePathIgnorePatterns: ['<rootDir>/dist']
};

module.exports = config;
