/**
 * GitHub API client with caching for dynamic form data
 */
class GitHubAPI {
  constructor(owner, repo, token = null) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.baseUrl = window.FORM_CONFIG?.apiBaseUrl || 'https://api.github.com';
    this.cache = new Map();
    this.cacheExpiry = window.FORM_CONFIG?.cacheExpiry || 5 * 60 * 1000;
    this.rateLimitRemaining = null;
    this.rateLimitReset = null;
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    this.cache.clear(); // Clear cache when auth changes
  }

  /**
   * Get authentication token from localStorage
   */
  static getStoredToken() {
    return localStorage.getItem('github_token');
  }

  /**
   * Store authentication token
   */
  static storeToken(token) {
    localStorage.setItem('github_token', token);
  }

  /**
   * Clear stored token
   */
  static clearToken() {
    localStorage.removeItem('github_token');
  }

  /**
   * Core fetch method with caching and error handling
   */
  async fetch(endpoint, params = {}) {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}:${!!this.token}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const url = new URL(`${this.baseUrl}/repos/${this.owner}/${this.repo}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, v);
      }
    });

    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });

    // Track rate limit
    this.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining'), 10);
    this.rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset'), 10);

    if (!response.ok) {
      if (response.status === 403 && this.rateLimitRemaining === 0) {
        const resetDate = new Date(this.rateLimitReset * 1000);
        throw new RateLimitError(`API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
      }
      if (response.status === 401) {
        throw new AuthError('Authentication failed. Please check your token.');
      }
      if (response.status === 404) {
        throw new NotFoundError(`Resource not found: ${endpoint}`);
      }
      throw new APIError(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: this.rateLimitReset ? new Date(this.rateLimitReset * 1000) : null,
      isLow: this.rateLimitRemaining !== null && this.rateLimitRemaining < (window.FORM_CONFIG?.rateLimitWarning || 10)
    };
  }

  /**
   * Fetch repository branches
   */
  async getBranches() {
    const branches = await this.fetch('branches', { per_page: 100 });
    return branches.map(b => ({
      value: b.name,
      label: b.name,
      isDefault: b.name === 'main' || b.name === 'master'
    }));
  }

  /**
   * Fetch repository releases
   */
  async getReleases() {
    const releases = await this.fetch('releases', { per_page: 30 });
    return releases.map(r => ({
      value: r.tag_name,
      label: r.name ? `${r.tag_name} - ${r.name}` : r.tag_name,
      isPrerelease: r.prerelease,
      isDraft: r.draft,
      publishedAt: r.published_at
    }));
  }

  /**
   * Fetch repository tags
   */
  async getTags() {
    const tags = await this.fetch('tags', { per_page: 50 });
    return tags.map(t => ({
      value: t.name,
      label: t.name
    }));
  }

  /**
   * Fetch repository labels with optional filtering
   */
  async getLabels(filter = null) {
    const labels = await this.fetch('labels', { per_page: 100 });
    let filtered = labels;

    if (filter) {
      try {
        const regex = new RegExp(filter);
        filtered = labels.filter(l => regex.test(l.name));
      } catch (e) {
        console.warn('Invalid label filter regex:', filter);
      }
    }

    return filtered.map(l => ({
      value: l.name,
      label: l.name,
      color: l.color,
      description: l.description
    }));
  }

  /**
   * Fetch repository contributors (public)
   */
  async getContributors() {
    const contributors = await this.fetch('contributors', { per_page: 50 });
    return contributors.map(c => ({
      value: c.login,
      label: c.login,
      avatarUrl: c.avatar_url,
      contributions: c.contributions
    }));
  }

  /**
   * Fetch repository collaborators (requires auth)
   */
  async getCollaborators() {
    if (!this.token) {
      throw new AuthError('Authentication required to fetch collaborators');
    }
    const collaborators = await this.fetch('collaborators', { per_page: 50 });
    return collaborators.map(c => ({
      value: c.login,
      label: c.login,
      avatarUrl: c.avatar_url,
      permission: c.role_name
    }));
  }

  /**
   * Fetch a specific issue by number
   */
  async getIssue(issueNumber) {
    return this.fetch(`issues/${issueNumber}`);
  }

  /**
   * Create a new issue (requires auth)
   */
  async createIssue(title, body, labels = [], assignees = []) {
    if (!this.token) {
      throw new AuthError('Authentication required to create issues');
    }

    const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body, labels, assignees })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(`Failed to create issue: ${response.status} - ${error.message || response.statusText}`);
    }

    return response.json();
  }
}

// Custom error classes
class APIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'APIError';
  }
}

class RateLimitError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

class AuthError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

class NotFoundError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Export for use
window.GitHubAPI = GitHubAPI;
window.APIError = APIError;
window.RateLimitError = RateLimitError;
window.AuthError = AuthError;
window.NotFoundError = NotFoundError;
