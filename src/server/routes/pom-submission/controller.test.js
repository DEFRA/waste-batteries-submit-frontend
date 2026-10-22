import { vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

import { buildExampleSubmission } from './example-submission.js'

function extractCrumb(html) {
  return html.match(/name="crumb" value="([^"]+)"/)?.[1]
}

function cookieHeader(setCookie) {
  return setCookie.map((cookie) => cookie.split(';')[0]).join('; ')
}

function memberOrgId(html) {
  return html.match(/memberOrgId(?:&quot;|"): (?:&quot;|")([0-9a-f]{24})/)?.[1]
}

const signedIn = {
  strategy: 'session',
  credentials: {
    id: 'user-123',
    sessionId: 'sid',
    scope: ['user'],
    accessToken: 'access-token'
  }
}

describe('#pomSubmissionController', () => {
  const originalFetch = globalThis.fetch
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    globalThis.fetch = originalFetch
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    globalThis.fetch = originalFetch
  })

  test('Should redirect signed-out users to sign in', async () => {
    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: '/pom-submission'
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe('/auth/sign-in?redirect=%2Fpom-submission')
  })

  test('Should render an example request for signed-in users', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/pom-submission',
      auth: signedIn
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('POM submission create single')
    expect(result).not.toContain('Example JSON')
    expect(result).toContain('Request JSON')
    expect(result).toContain('rows="38"')
    expect(result).toContain('Send request')
    expect(result).toContain('New example')
    expect(result).toContain('BPRN-EA-2026-000123')
    expect(memberOrgId(result)).toMatch(/^[0-9a-f]{24}$/)
    expect(result).toContain('name="crumb"')
  })

  test('Should replace the example with a new member', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    const getResponse = await server.inject({
      method: 'GET',
      url: '/pom-submission',
      auth: signedIn
    })
    const firstMemberOrgId = memberOrgId(getResponse.result)

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/pom-submission',
      headers: {
        cookie: cookieHeader(getResponse.headers['set-cookie'])
      },
      payload: {
        crumb: extractCrumb(getResponse.result),
        intent: 'new-example',
        submissionJson: '{not json',
        responseStatusCode: '201',
        responseStatusText: 'Created',
        responseBody: '{"id":"kept-response"}'
      },
      auth: signedIn
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(memberOrgId(result)).toMatch(/^[0-9a-f]{24}$/)
    expect(memberOrgId(result)).not.toBe(firstMemberOrgId)
    expect(result).not.toContain(firstMemberOrgId)
    expect(result).toContain('201 Created')
    expect(result).toContain('kept-response')
    expect(result).toContain('name="responseStatusCode" value="201"')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('Should show the API status and body after posting', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { id: '674a1b2c3d4e5f6789012347', status: 'Submitted' },
          { status: 201, statusText: 'Created' }
        )
      )
    globalThis.fetch = fetchMock

    const getResponse = await server.inject({
      method: 'GET',
      url: '/pom-submission',
      auth: signedIn
    })
    const submissionJson = JSON.stringify({
      schemeOrgId: '674a1b2c3d4e5f6789012345',
      memberName: 'Northwind Batteries Ltd'
    })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/pom-submission',
      headers: {
        cookie: cookieHeader(getResponse.headers['set-cookie'])
      },
      payload: {
        crumb: extractCrumb(getResponse.result),
        intent: 'post',
        submissionJson
      },
      auth: signedIn
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('201 Created')
    expect(result).toContain('674a1b2c3d4e5f6789012347')
    expect(result).toContain('Submitted')
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/pom-submissions', 'http://localhost:3001'),
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: 'Bearer access-token',
          'content-type': 'application/json'
        },
        body: submissionJson
      }
    )
  })

  test('Should show an API error body without hiding the status code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          title: 'Bad Request',
          errors: {
            Submission: [
              'A current submission already exists for this scheme, member, year and quarter.'
            ]
          }
        },
        { status: 400, statusText: 'Bad Request' }
      )
    )
    globalThis.fetch = fetchMock

    const getResponse = await server.inject({
      method: 'GET',
      url: '/pom-submission',
      auth: signedIn
    })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/pom-submission',
      headers: {
        cookie: cookieHeader(getResponse.headers['set-cookie'])
      },
      payload: {
        crumb: extractCrumb(getResponse.result),
        intent: 'post',
        submissionJson: '{"schemeOrgId":"674a1b2c3d4e5f6789012345"}'
      },
      auth: signedIn
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('400 Bad Request')
    expect(result).toContain('A current submission already exists')
  })

  test('Should reject JSON that is not an object before calling the API', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    const getResponse = await server.inject({
      method: 'GET',
      url: '/pom-submission',
      auth: signedIn
    })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/pom-submission',
      headers: {
        cookie: cookieHeader(getResponse.headers['set-cookie'])
      },
      payload: {
        crumb: extractCrumb(getResponse.result),
        intent: 'post',
        submissionJson: '[1, 2]'
      },
      auth: signedIn
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Enter valid JSON')
    expect(result).toContain('[1, 2]')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('#buildExampleSubmission', () => {
  test('Should use one or two different tonnage entries', () => {
    const counts = new Set()

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const body = JSON.parse(buildExampleSubmission())
      counts.add(body.tonnageEntries.length)

      if (body.tonnageEntries.length === 2) {
        expect(JSON.stringify(body.tonnageEntries[0].classification)).not.toBe(
          JSON.stringify(body.tonnageEntries[1].classification)
        )
      }
    }

    expect(counts).toEqual(new Set([1, 2]))
  })
})
