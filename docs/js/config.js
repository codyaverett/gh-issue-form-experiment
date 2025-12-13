/**
 * Configuration for the dynamic form application
 * Auto-detects repository from current URL or uses defaults
 */
(function() {
  'use strict';

  // Try to detect repo from GitHub Pages URL pattern: {owner}.github.io/{repo}
  function detectRepoFromUrl() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    // Pattern: {owner}.github.io
    const ghPagesMatch = hostname.match(/^([^.]+)\.github\.io$/);
    if (ghPagesMatch) {
      const owner = ghPagesMatch[1];
      // Repo is first path segment: /{repo}/...
      const pathParts = pathname.split('/').filter(Boolean);
      const repo = pathParts[0] || null;
      if (repo) {
        return { owner, repo };
      }
    }

    return null;
  }

  // Default configuration - update these for your repository
  const defaults = {
    owner: 'caavere',
    repo: 'gh-issue-form-experiment'
  };

  // Merge detected values with defaults
  const detected = detectRepoFromUrl();

  window.FORM_CONFIG = {
    owner: detected?.owner || defaults.owner,
    repo: detected?.repo || defaults.repo,

    // Cache settings
    cacheExpiry: 5 * 60 * 1000, // 5 minutes

    // API settings
    apiBaseUrl: 'https://api.github.com',

    // Rate limit thresholds
    rateLimitWarning: 10, // Warn when remaining < 10

    // Default form if none specified in URL
    defaultForm: 'stage-2-dynamic'
  };

  // Log config in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Form Config:', window.FORM_CONFIG);
  }
})();
