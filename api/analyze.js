import { calculateScoresAndFindings } from './engine.js'

/**
 * Serverless API endpoint: GET /api/analyze?user=username
 * 
 * Works as a Vercel Serverless Function and via Vite dev server middleware.
 * Fetches and normalizes real public GitHub profile data using authenticated GitHub API requests.
 * Computes deterministic 100-point scores and prioritized Roast/Diagnose/Rescue findings.
 * Keeps GitHub token server-side only (never exposed to frontend/client).
 */

// Lightweight in-memory cache to prevent token exhaustion and rate-limit abuse (TTL: 3 minutes)
const profileCache = new Map()
const CACHE_TTL_MS = 3 * 60 * 1000
const MAX_CACHE_ENTRIES = 100

// In-memory sliding-window rate limiter per client IP (max 30 requests / 60 seconds)
const ipRateLimitMap = new Map()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 30

/**
 * Extracts and normalizes client IP from x-forwarded-for or socket
 * @param {import('node:http').IncomingMessage} req
 * @returns {string}
 */
export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || '127.0.0.1'
}

/**
 * Checks in-memory sliding-window rate limit per client IP
 * @param {import('node:http').IncomingMessage} req
 * @returns {boolean} True if request is allowed, false if rate-limited
 */
export function checkClientRateLimit(req) {
  const clientIp = getClientIp(req)
  const now = Date.now()
  const timestamps = ipRateLimitMap.get(clientIp) || []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRateLimitMap.set(clientIp, recent)
    return false
  }

  recent.push(now)
  ipRateLimitMap.set(clientIp, recent)

  // Periodically prune stale entries
  if (ipRateLimitMap.size > 500) {
    for (const [ip, list] of ipRateLimitMap.entries()) {
      if (list.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        ipRateLimitMap.delete(ip)
      }
    }
  }
  return true
}

/**
 * Determines whether the request origin is safe for CORS reflection
 * @param {import('node:http').IncomingMessage} req
 * @returns {string|null} Origin string if permitted, otherwise null
 */
export function getAllowedOrigin(req) {
  const origin = req.headers?.origin
  if (!origin || typeof origin !== 'string') return null
  try {
    const u = new URL(origin)
    // Allow localhost and local IP addresses
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return origin
    }
    // Allow Vercel deployments
    if (u.hostname.endsWith('.vercel.app')) {
      return origin
    }
    // Allow origin matching host header
    const host = req.headers?.host || req.headers?.['x-forwarded-host']
    if (host && (u.host === host || u.hostname === host)) {
      return origin
    }
  } catch {
    return null
  }
  return null
}

/**
 * Sanitizes external project and website URLs to prevent javascript: or malformed links
 * @param {string|null} url
 * @returns {string|null} Safe https:// URL or null
 */
export function sanitizeExternalUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return null
}

export default async function handler(req, res) {
  const allowedOrigin = getAllowedOrigin(req)

  // Helper to send JSON responses across Node HTTP and Vercel runtimes
  const send = (status, data, customHeaders = {}) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    if (allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
      res.setHeader('Vary', 'Origin')
    }
    for (const [k, v] of Object.entries(customHeaders)) {
      res.setHeader(k, v)
    }

    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(status).json(data)
    }
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  }

  // Handle CORS preflight if called cross-origin
  if (req.method === 'OPTIONS') {
    if (!allowedOrigin) {
      res.statusCode = 403
      res.end()
      return
    }
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Vary', 'Origin')
    res.end()
    return
  }

  // Only allow GET requests
  if (req.method && req.method !== 'GET') {
    return send(405, { error: 'Method not allowed. Use GET.' })
  }

  // Check rate limiting per client IP
  if (!checkClientRateLimit(req)) {
    return send(
      429,
      {
        error: 'Too many requests. Please wait a minute before trying again.',
        rateLimited: true,
      },
      { 'Retry-After': '60' }
    )
  }

  try {
    const url = new URL(req.url, 'http://localhost')
    const usernameParam = req.query?.user || url.searchParams.get('user')

    // 1. Validate presence of username
    if (!usernameParam || typeof usernameParam !== 'string') {
      return send(400, {
        error: 'Username is required. Please provide ?user=username.',
      })
    }

    const username = usernameParam.trim()
    if (!username) {
      return send(400, {
        error: 'Username is required. Please provide ?user=username.',
      })
    }

    // 2. Validate username format (GitHub rules: 1-39 chars, alphanumeric + single hyphens)
    const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/
    if (!usernameRegex.test(username)) {
      return send(400, {
        error:
          'Invalid GitHub username format. Usernames can only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.',
      })
    }

    // Check in-memory cache to prevent redundant GitHub API requests
    const cacheKey = username.toLowerCase()
    const cached = profileCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return send(200, cached.data, {
        'X-Cache': 'HIT',
        ...(cached.metaHeaders || {}),
      })
    }

    // 3. Strictly verify GITHUB_TOKEN from process.env.GITHUB_TOKEN
    const rawToken = process.env.GITHUB_TOKEN
    const token = typeof rawToken === 'string' ? rawToken.replace(/^Bearer\s+/i, '').trim() : ''

    if (!token) {
      return send(500, {
        error: 'GitHub API service is not configured on the server.',
        configured: false,
      })
    }

    // Required authenticated headers for every GitHub API request
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitHub-Roast-Rescue-App',
    }

    // 4. Fetch user profile from GitHub API
    const userRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      { headers }
    )

    const rateLimitLimit = userRes.headers.get('x-ratelimit-limit')
    const rateLimitRemaining = userRes.headers.get('x-ratelimit-remaining')
    const rateLimitReset = userRes.headers.get('x-ratelimit-reset')

    const responseMetaHeaders = {}
    if (rateLimitLimit) responseMetaHeaders['X-GitHub-RateLimit-Limit'] = rateLimitLimit
    if (rateLimitRemaining) responseMetaHeaders['X-GitHub-RateLimit-Remaining'] = rateLimitRemaining

    // Handle rate-limiting (403/429)
    if (userRes.status === 403 || userRes.status === 429) {
      let resetDate = null
      if (rateLimitReset) {
        resetDate = new Date(parseInt(rateLimitReset, 10) * 1000).toLocaleTimeString()
      }
      return send(429, {
        error: `GitHub API rate limit exceeded${
          resetDate ? ` (resets at ${resetDate})` : ''
        }. Please try again later.`,
        rateLimited: true,
        remaining: rateLimitRemaining,
        limit: rateLimitLimit,
        resetTime: rateLimitReset,
      }, responseMetaHeaders)
    }

    // Handle user not found (404)
    if (userRes.status === 404) {
      return send(404, {
        error: `GitHub user "${username}" was not found. Please verify the handle and try again.`,
      }, responseMetaHeaders)
    }

    // Handle bad token / auth error (401)
    if (userRes.status === 401) {
      return send(401, {
        error: 'GitHub API authentication failed. Please check server credentials.',
      })
    }

    if (!userRes.ok) {
      return send(userRes.status, {
        error: `GitHub API error: ${userRes.status} ${userRes.statusText}`,
      }, responseMetaHeaders)
    }

    const userData = await userRes.json()

    // 5. Fetch public repositories (up to 100, sorted by pushed)
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(
        username
      )}/repos?per_page=100&sort=pushed`,
      { headers }
    )

    let rawRepos = []
    if (reposRes.ok) {
      rawRepos = await reposRes.json()
    }

    // 6. Aggregate data and normalize repositories
    let totalStars = 0
    let totalForks = 0
    const languageCounts = {}
    let mostRecentPush = null

    const normalizedRepos = rawRepos.map((repo) => {
      const stars = repo.stargazers_count || 0
      const forks = repo.forks_count || 0
      totalStars += stars
      totalForks += forks

      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1
      }

      if (repo.pushed_at) {
        if (!mostRecentPush || new Date(repo.pushed_at) > new Date(mostRecentPush)) {
          mostRecentPush = repo.pushed_at
        }
      }

      return {
        name: repo.name,
        description: repo.description || null,
        stars,
        forks,
        language: repo.language || null,
        createdAt: repo.created_at,
        pushedAt: repo.pushed_at,
        homepage: sanitizeExternalUrl(repo.homepage),
        url: repo.html_url,
        isFork: Boolean(repo.fork),
        archived: Boolean(repo.archived),
        hasReadme: null, // Populated below where practical
      }
    })

    // Ordered list of top languages
    const languages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang)

    // Select top repositories (sort by: original non-fork first, then stars desc, then push recency)
    const topRepos = [...normalizedRepos]
      .sort((a, b) => {
        if (a.isFork !== b.isFork) return a.isFork ? 1 : -1
        if (b.stars !== a.stars) return b.stars - a.stars
        return new Date(b.pushedAt) - new Date(a.pushedAt)
      })
      .slice(0, 6)

    // Check README availability where practical
    const hasProfileRepo = rawRepos.some(
      (r) => r.name.toLowerCase() === username.toLowerCase()
    )

    let hasProfileReadme = hasProfileRepo

    // Authenticated calls have higher rate limit budget (5,000/hr)
    await Promise.allSettled(
      topRepos.slice(0, 4).map(async (repo) => {
        try {
          const readmeRes = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(
              username
            )}/${encodeURIComponent(repo.name)}/readme`,
            { method: 'HEAD', headers }
          )
          repo.hasReadme = readmeRes.status === 200
        } catch {
          repo.hasReadme = null
        }
      })
    )

    if (hasProfileRepo) {
      try {
        const profileReadmeRes = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(
            username
          )}/${encodeURIComponent(username)}/readme`,
          { method: 'HEAD', headers }
        )
        hasProfileReadme = profileReadmeRes.status === 200
      } catch {
        hasProfileReadme = true
      }
    }

    let daysSinceLastPush = null
    if (mostRecentPush) {
      const pDate = new Date(mostRecentPush)
      if (!isNaN(pDate.getTime())) {
        daysSinceLastPush = Math.max(0, Math.floor((Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24)))
      }
    }

    // 7. Normalized clean JSON response structure
    const payload = {
      user: {
        username: userData.login,
        name: userData.name || userData.login,
        avatar: userData.avatar_url,
        bio: userData.bio || null,
        location: userData.location || null,
        company: userData.company || null,
        blog: sanitizeExternalUrl(userData.blog),
        twitter: userData.twitter_username || null,
        followers: userData.followers || 0,
        following: userData.following || 0,
        publicRepoCount: userData.public_repos || 0,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
        profileUrl: userData.html_url,
        hasProfileReadme,
      },
      stats: {
        totalStars,
        totalForks,
        languages,
        languageCounts,
        lastPushedAt: mostRecentPush,
        daysSinceLastPush,
        nonForkRepoCount: normalizedRepos.filter((r) => !r.isFork).length,
        forkRepoCount: normalizedRepos.filter((r) => r.isFork).length,
      },
      topRepositories: topRepos,
      repositories: normalizedRepos,
    }

    // 8. Deterministic scoring and prioritized findings
    const { scores, findings } = calculateScoresAndFindings(payload)
    payload.scores = scores
    payload.findings = findings

    // 9. Cache computed profile payload in memory
    if (profileCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = profileCache.keys().next().value
      if (oldestKey) profileCache.delete(oldestKey)
    }
    profileCache.set(cacheKey, {
      timestamp: Date.now(),
      data: payload,
      metaHeaders: responseMetaHeaders,
    })

    return send(200, payload, responseMetaHeaders)
  } catch (err) {
    console.error(
      'API /api/analyze error:',
      err?.message ? err.message.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]') : 'Unexpected error'
    )
    return send(500, {
      error: 'An unexpected error occurred while analyzing the GitHub profile.',
    })
  }
}
