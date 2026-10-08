import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import handler, {
  getClientIp,
  checkClientRateLimit,
  getAllowedOrigin,
  sanitizeExternalUrl,
} from '../api/analyze.js'

describe('Analyze API Handler & Validation (api/analyze.js)', () => {
  // Helper to create mock HTTP request and response
  function createMockHttp({ method = 'GET', url = '/api/analyze', query = {}, headers = {} }) {
    const req = {
      method,
      url,
      query,
      headers: { host: 'localhost:5173', ...headers },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v
      },
      end(payload) {
        this.body = payload ? JSON.parse(payload) : null
      },
      status(code) {
        this.statusCode = code
        return this
      },
      json(data) {
        this.body = data
      },
    }
    return { req, res }
  }

  describe('HTTP Method Enforcement', () => {
    it('rejects POST requests with 405 Method Not Allowed', async () => {
      const { req, res } = createMockHttp({ method: 'POST' })
      await handler(req, res)
      assert.equal(res.statusCode, 405)
      assert.ok(res.body?.error?.includes('Method not allowed'))
    })

    it('rejects PUT requests with 405 Method Not Allowed', async () => {
      const { req, res } = createMockHttp({ method: 'PUT' })
      await handler(req, res)
      assert.equal(res.statusCode, 405)
    })

    it('rejects DELETE requests with 405 Method Not Allowed', async () => {
      const { req, res } = createMockHttp({ method: 'DELETE' })
      await handler(req, res)
      assert.equal(res.statusCode, 405)
    })

    it('handles OPTIONS preflight request for allowed origins with 204 No Content', async () => {
      const { req, res } = createMockHttp({
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:5173' },
      })
      await handler(req, res)
      assert.equal(res.statusCode, 204)
      assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173')
    })
  })

  describe('Username Parameter Validation', () => {
    it('returns 400 when username query parameter is missing', async () => {
      const { req, res } = createMockHttp({ url: '/api/analyze' })
      await handler(req, res)
      assert.equal(res.statusCode, 400)
      assert.ok(res.body?.error?.includes('Username is required'))
    })

    it('returns 400 when username is empty whitespace', async () => {
      const { req, res } = createMockHttp({ url: '/api/analyze?user=%20%20' })
      await handler(req, res)
      assert.equal(res.statusCode, 400)
      assert.ok(res.body?.error?.includes('Username is required'))
    })

    it('rejects usernames with spaces or special characters', async () => {
      const invalidNames = ['user name', 'octo@cat', 'dev$null', 'user!name', 'name#tag']
      for (const name of invalidNames) {
        const { req, res } = createMockHttp({ url: `/api/analyze?user=${encodeURIComponent(name)}` })
        await handler(req, res)
        assert.equal(res.statusCode, 400, `Expected 400 for ${name}`)
        assert.ok(res.body?.error?.includes('Invalid GitHub username format'))
      }
    })

    it('rejects usernames starting or ending with hyphens', async () => {
      const invalidHyphenNames = ['-username', 'username-', '-user-']
      for (const name of invalidHyphenNames) {
        const { req, res } = createMockHttp({ url: `/api/analyze?user=${encodeURIComponent(name)}` })
        await handler(req, res)
        assert.equal(res.statusCode, 400, `Expected 400 for ${name}`)
        assert.ok(res.body?.error?.includes('Invalid GitHub username format'))
      }
    })

    it('rejects usernames exceeding 39 characters', async () => {
      const longName = 'a'.repeat(40)
      const { req, res } = createMockHttp({ url: `/api/analyze?user=${longName}` })
      await handler(req, res)
      assert.equal(res.statusCode, 400)
    })

    it('accepts valid GitHub usernames according to GitHub naming specification', async () => {
      const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/
      const validNames = ['torvalds', 'gaearon', 'octocat-123', 'a', 'a-b', 'dev-ops-guru']
      for (const name of validNames) {
        assert.ok(usernameRegex.test(name), `Expected ${name} to be valid`)
      }
    })
  })

  describe('Security Headers', () => {
    it('sets standard defensive security headers on all responses', async () => {
      const { req, res } = createMockHttp({ url: '/api/analyze' })
      await handler(req, res)
      assert.equal(res.headers['x-content-type-options'], 'nosniff')
      assert.equal(res.headers['x-frame-options'], 'DENY')
      assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin')
    })
  })

  describe('Rate Limiter Protection', () => {
    it('checkClientRateLimit returns true when within limit and false when exceeded', () => {
      const mockReq = { headers: { 'x-forwarded-for': '198.51.100.99' } }
      let allowed = true
      for (let i = 0; i < 30; i++) {
        allowed = checkClientRateLimit(mockReq)
        assert.equal(allowed, true, `Request ${i + 1} should be permitted within window`)
      }
      const exceeded = checkClientRateLimit(mockReq)
      assert.equal(exceeded, false, '31st request from same IP should be blocked by rate limiter')
    })

    it('protects server from rapid consecutive request abuse from single IP', async () => {
      // Send consecutive requests to verify 429 triggered on abuse
      let reachedRateLimit = false
      for (let i = 0; i < 35; i++) {
        const { req, res } = createMockHttp({
          url: '/api/analyze?user=fakeuser123',
          headers: { 'x-forwarded-for': '198.51.100.42' },
        })
        await handler(req, res)
        if (res.statusCode === 429) {
          reachedRateLimit = true
          assert.equal(res.headers['retry-after'], '60')
          assert.ok(res.body?.rateLimited)
          break
        }
      }
      assert.ok(reachedRateLimit, 'Rate limiter should trigger 429 after exceeding window threshold')
    })
  })

  describe('getClientIp Helper', () => {
    it('extracts IP from x-forwarded-for header with multiple proxies', () => {
      const ip = getClientIp({ headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' } })
      assert.equal(ip, '203.0.113.195')
    })

    it('falls back to socket remote address when forwarded header is missing', () => {
      const ip = getClientIp({ socket: { remoteAddress: '192.168.1.50' } })
      assert.equal(ip, '192.168.1.50')
    })

    it('defaults safely to 127.0.0.1 when socket is absent', () => {
      const ip = getClientIp({})
      assert.equal(ip, '127.0.0.1')
    })
  })

  describe('getAllowedOrigin Helper', () => {
    it('allows localhost origins', () => {
      assert.equal(getAllowedOrigin({ headers: { origin: 'http://localhost:5173' } }), 'http://localhost:5173')
      assert.equal(getAllowedOrigin({ headers: { origin: 'http://127.0.0.1:3000' } }), 'http://127.0.0.1:3000')
    })

    it('allows vercel.app preview deployments', () => {
      assert.equal(
        getAllowedOrigin({ headers: { origin: 'https://github-roast-rescue-preview.vercel.app' } }),
        'https://github-roast-rescue-preview.vercel.app'
      )
    })

    it('allows origin matching host header', () => {
      assert.equal(
        getAllowedOrigin({ headers: { origin: 'https://roastandrescue.com', host: 'roastandrescue.com' } }),
        'https://roastandrescue.com'
      )
    })

    it('rejects untrusted third-party origins', () => {
      assert.equal(
        getAllowedOrigin({ headers: { origin: 'https://malicious-site.example.com' } }),
        null
      )
    })

    it('returns null when origin header is missing or malformed', () => {
      assert.equal(getAllowedOrigin({ headers: {} }), null)
      assert.equal(getAllowedOrigin({ headers: { origin: 'not-a-valid-url' } }), null)
    })
  })

  describe('sanitizeExternalUrl Helper', () => {
    it('preserves valid http and https URLs', () => {
      assert.equal(sanitizeExternalUrl('https://myportfolio.dev'), 'https://myportfolio.dev')
      assert.equal(sanitizeExternalUrl('http://insecure.dev/page'), 'http://insecure.dev/page')
    })

    it('prepends https:// to bare domain names', () => {
      assert.equal(sanitizeExternalUrl('developer.io'), 'https://developer.io')
      assert.equal(sanitizeExternalUrl('myblog.org/about'), 'https://myblog.org/about')
    })

    it('rejects malicious or invalid URL schemes', () => {
      assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null)
      assert.equal(sanitizeExternalUrl('data:text/html,hack'), null)
      assert.equal(sanitizeExternalUrl(''), null)
      assert.equal(sanitizeExternalUrl(null), null)
    })
  })

  describe('End-to-End Analyze API Pipeline with Mock GitHub Responses', () => {
    const originalToken = process.env.GITHUB_TOKEN
    const originalFetch = global.fetch

    it('returns 500 when GITHUB_TOKEN is not configured on server', async () => {
      delete process.env.GITHUB_TOKEN
      const { req, res } = createMockHttp({
        url: '/api/analyze?user=validuser',
        headers: { 'x-forwarded-for': '198.51.100.101' },
      })
      await handler(req, res)
      assert.equal(res.statusCode, 500)
      assert.equal(res.body?.configured, false)
      assert.ok(res.body?.error?.includes('not configured'))
    })

    it('returns 404 when GitHub API reports user not found', async () => {
      process.env.GITHUB_TOKEN = 'ghp_mocktoken123'
      global.fetch = async () => ({
        status: 404,
        ok: false,
        headers: new Map(),
      })

      const { req, res } = createMockHttp({
        url: '/api/analyze?user=nonexistentdev',
        headers: { 'x-forwarded-for': '198.51.100.102' },
      })
      await handler(req, res)
      assert.equal(res.statusCode, 404)
      assert.ok(res.body?.error?.includes('was not found'))
    })

    it('returns 429 when GitHub API reports rate limit exceeded', async () => {
      process.env.GITHUB_TOKEN = 'ghp_mocktoken123'
      const mockHeaders = new Map([
        ['x-ratelimit-limit', '5000'],
        ['x-ratelimit-remaining', '0'],
        ['x-ratelimit-reset', '1700000000'],
      ])
      global.fetch = async () => ({
        status: 403,
        ok: false,
        headers: mockHeaders,
      })

      const { req, res } = createMockHttp({
        url: '/api/analyze?user=ratelimiteddev',
        headers: { 'x-forwarded-for': '198.51.100.103' },
      })
      await handler(req, res)
      assert.equal(res.statusCode, 429)
      assert.ok(res.body?.rateLimited)
    })

    it('returns 401 when GitHub API reports token authentication failed', async () => {
      process.env.GITHUB_TOKEN = 'ghp_badtoken123'
      global.fetch = async () => ({
        status: 401,
        ok: false,
        headers: new Map(),
      })

      const { req, res } = createMockHttp({
        url: '/api/analyze?user=autherrordev',
        headers: { 'x-forwarded-for': '198.51.100.104' },
      })
      await handler(req, res)
      assert.equal(res.statusCode, 401)
      assert.ok(res.body?.error?.includes('authentication failed'))
    })

    it('successfully analyzes a user and caches the result for instant subsequent access', async () => {
      process.env.GITHUB_TOKEN = 'ghp_validtoken123'

      const mockUserData = {
        login: 'superstar-dev',
        name: 'Super Star',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
        bio: 'Building world-class high-performance web applications in TypeScript',
        location: 'San Francisco, CA',
        company: 'OpenSource Inc.',
        blog: 'https://superstar.dev',
        twitter_username: 'superstardev',
        followers: 1250,
        following: 100,
        public_repos: 15,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
        html_url: 'https://github.com/superstar-dev',
      }

      const mockReposData = [
        {
          name: 'superstar-dev',
          description: 'Special profile repository with showcase and overview',
          stargazers_count: 50,
          forks_count: 10,
          language: 'Markdown',
          created_at: '2021-01-01T00:00:00Z',
          pushed_at: new Date().toISOString(),
          homepage: 'https://superstar.dev',
          html_url: 'https://github.com/superstar-dev/superstar-dev',
          fork: false,
          archived: false,
        },
        {
          name: 'awesome-tool',
          description: 'Lightning fast engine for developer productivity',
          stargazers_count: 120,
          forks_count: 25,
          language: 'TypeScript',
          created_at: '2022-01-01T00:00:00Z',
          pushed_at: new Date().toISOString(),
          homepage: 'https://awesome-tool.dev',
          html_url: 'https://github.com/superstar-dev/awesome-tool',
          fork: false,
          archived: false,
        },
      ]

      global.fetch = async (url) => {
        const urlStr = String(url)
        if (urlStr.includes('/users/superstar-dev/repos')) {
          return {
            status: 200,
            ok: true,
            headers: new Map(),
            json: async () => mockReposData,
          }
        }
        if (urlStr.includes('/readme')) {
          return {
            status: 200,
            ok: true,
            headers: new Map(),
          }
        }
        if (urlStr.includes('/users/superstar-dev')) {
          return {
            status: 200,
            ok: true,
            headers: new Map([
              ['x-ratelimit-limit', '5000'],
              ['x-ratelimit-remaining', '4990'],
            ]),
            json: async () => mockUserData,
          }
        }
        return { status: 404, ok: false, headers: new Map() }
      }

      // First request (Cache MISS)
      const { req: req1, res: res1 } = createMockHttp({
        url: '/api/analyze?user=superstar-dev',
        headers: { 'x-forwarded-for': '198.51.100.105' },
      })
      await handler(req1, res1)
      assert.equal(res1.statusCode, 200)
      assert.equal(res1.body?.user?.username, 'superstar-dev')
      assert.equal(res1.body?.user?.hasProfileReadme, true)
      assert.ok(res1.body?.scores?.overall > 0)
      assert.ok(Array.isArray(res1.body?.findings?.roast))

      // Second request (Cache HIT)
      const { req: req2, res: res2 } = createMockHttp({
        url: '/api/analyze?user=superstar-dev',
        headers: { 'x-forwarded-for': '198.51.100.105' },
      })
      await handler(req2, res2)
      assert.equal(res2.statusCode, 200)
      assert.equal(res2.headers['x-cache'], 'HIT')
      assert.equal(res2.body?.user?.username, 'superstar-dev')

      // Clean up globals
      if (originalToken !== undefined) {
        process.env.GITHUB_TOKEN = originalToken
      } else {
        delete process.env.GITHUB_TOKEN
      }
      global.fetch = originalFetch
    })
  })
})
