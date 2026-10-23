import { vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { pomSubmissionPage } from './controller.js'

import {
  buildExampleSubmission,
  defaultExampleKind,
  exampleKinds
} from './example-submission.js'

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

  async function signedInPost(payload) {
    const getResponse = await server.inject({
      method: 'GET',
      url: '/pom-submission',
      auth: signedIn
    })

    return server.inject({
      method: 'POST',
      url: '/pom-submission',
      headers: {
        cookie: cookieHeader(getResponse.headers['set-cookie'])
      },
      payload: {
        ...payload,
        crumb: extractCrumb(getResponse.result)
      },
      auth: signedIn
    })
  }

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
    expect(result).toContain('rows="33"')
    expect(result).not.toContain('data-scroll-to')
    expect(result).toContain('formaction="/pom-submission#request-json"')
    expect(result).toContain('formaction="/pom-submission#send-request"')
    expect(result).toContain('Send request')
    expect(result).toContain('Update json')
    expect(result).not.toContain('New example')
    expect(result).toContain('value="full" selected')
    expect(result.match(/batteryCategory/g)).toHaveLength(2)
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
        intent: 'update-json',
        exampleKind: 'min-exclude',
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
    expect(result).toContain('value="min-exclude" selected')
    expect(result).toContain('data-scroll-to="request-json"')
    expect(result).not.toContain('subCategory')
    expect(result.match(/batteryCategory/g)).toHaveLength(1)
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
    expect(result).toContain('data-scroll-to="send-request"')
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

  test('Should reject JSON that cannot be parsed before calling the API', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    const { result, statusCode } = await signedInPost({
      intent: 'post',
      submissionJson: '{not json'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Enter valid JSON')
    expect(result).toContain('{not json')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('Should say the request could not be read when the payload is invalid', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    const withJson = await signedInPost({
      exampleKind: 'full',
      submissionJson: '{"kept":true}'
    })

    expect(withJson.statusCode).toBe(statusCodes.badRequest)
    expect(withJson.result).toContain('The request could not be read')
    expect(withJson.result).toMatch(/\{(?:&quot;|")kept(?:&quot;|"):true\}/)

    const withoutJson = await signedInPost({
      intent: 'nope'
    })

    expect(withoutJson.statusCode).toBe(statusCodes.badRequest)
    expect(withoutJson.result).toContain('The request could not be read')
    expect(withoutJson.result).toContain('name="submissionJson"')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('Should ask for JSON when the submission is empty', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    const { result, statusCode } = await signedInPost({
      intent: 'post'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Enter the JSON to post')
    expect(result).toContain('data-scroll-to="send-request"')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('Should drop a stored response when the status code is blank', async () => {
    const { result, statusCode } = await signedInPost({
      intent: 'update-json',
      exampleKind: 'full',
      responseStatusCode: '',
      responseStatusText: 'Created',
      responseBody: 'should-not-keep'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).not.toContain('should-not-keep')
    expect(result).not.toContain('name="responseStatusCode"')
    expect(result).toContain('data-scroll-to="request-json"')
  })

  test('Should keep a response when the status text and body are missing', async () => {
    const { result, statusCode } = await signedInPost({
      intent: 'update-json',
      exampleKind: 'full',
      responseStatusCode: '201'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('201')
    expect(result).toContain('name="responseStatusText" value=""')
    expect(result).toContain('name="responseBody" value=""')
  })

  test('Should show an empty API body', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 204, statusText: 'No Content' })
      )

    const { result, statusCode } = await signedInPost({
      intent: 'post',
      submissionJson: '{"schemeOrgId":"674a1b2c3d4e5f6789012345"}'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('204 No Content')
    expect(result).toContain('(empty body)')
  })

  test('Should show a non-JSON API body unchanged', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('plain text', {
        status: 200,
        statusText: 'OK'
      })
    )

    const { result, statusCode } = await signedInPost({
      intent: 'post',
      submissionJson: '{"schemeOrgId":"674a1b2c3d4e5f6789012345"}'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('200 OK')
    expect(result).toContain('plain text')
  })

  test('Should show a problem when the API call fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    const { result, statusCode } = await signedInPost({
      intent: 'post',
      submissionJson: '{"schemeOrgId":"674a1b2c3d4e5f6789012345"}'
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('There was a problem calling the API')
    expect(result).toContain('Error: POM submission create single')
  })

  test('Should fall back when the example kind or JSON is missing', () => {
    const page = pomSubmissionPage(
      { plugins: { crumb: 'crumb-token' } },
      { exampleKind: 'not-a-kind' }
    )

    expect(page.exampleKind).toBe(defaultExampleKind)
    expect(page.submissionJson).toBe('')
    expect(page.crumb).toBe('crumb-token')
    expect(page.pageTitle).toBe('POM submission create single')
  })
})

function parsedExample(kind) {
  return JSON.parse(buildExampleSubmission(kind))
}

describe('#buildExampleSubmission', () => {
  test('Should fall back to the full example for an unknown kind', () => {
    const body = parsedExample('not-a-kind')

    expect(body.tonnageEntries).toHaveLength(2)
    expect(body.compliancePeriodYear).toBe(2026)
  })

  test('Should default to a full submission with two tonnage entries', () => {
    const body = parsedExample()

    expect(defaultExampleKind).toBe('full')
    expect(body.tonnageEntries).toHaveLength(2)
    expect(body.tonnageEntries[0].classification.subCategory).toEqual(
      expect.any(String)
    )
    expect(body.tonnageEntries[0].classification).not.toEqual(
      body.tonnageEntries[1].classification
    )
  })

  test('Should build a minimum submission without optional classification fields', () => {
    const classification =
      parsedExample('min-exclude').tonnageEntries[0].classification

    expect(parsedExample('min-exclude').tonnageEntries).toHaveLength(1)
    expect(Object.keys(classification)).toEqual([
      'batteryCategory',
      'chemistry'
    ])
  })

  test('Should set optional classification fields to null, blank or whitespace', () => {
    expect(
      parsedExample('min-null').tonnageEntries[0].classification
    ).toMatchObject({
      subCategory: null,
      cellType: null,
      equipmentState: null
    })
    expect(
      parsedExample('min-blank').tonnageEntries[0].classification
    ).toMatchObject({
      subCategory: '',
      cellType: '',
      equipmentState: ''
    })

    const whitespace =
      parsedExample('min-whitespace').tonnageEntries[0].classification
    expect(whitespace.subCategory.trim()).toBe('')
    expect(whitespace.cellType.trim()).toBe('')
    expect(whitespace.equipmentState.trim()).toBe('')
    expect(whitespace.subCategory.length).toBeGreaterThan(0)
  })

  test('Should pad every string when the example is trim', () => {
    const body = parsedExample('trim')

    expect(body.tonnageEntries).toHaveLength(2)
    expect(body.schemeOrgId).toMatch(/^ {2}\S.*\S {2}$/)
    expect(body.compliancePeriodYear).toBe(2026)
    expect(body.tonnageEntries[0].tonnes).toMatch(/^ {2}\d+\.\d{3} {2}$/)
    expect(body.tonnageEntries[0].classification.subCategory).toMatch(
      /^ {2}\S.*\S {2}$/
    )
  })

  test('Should build each invalid example', () => {
    expect(parsedExample('invalid-missing')).toEqual({})

    const nulled = parsedExample('invalid-null')
    expect(nulled.schemeOrgId).toBeNull()
    expect(nulled.compliancePeriodYear).toBeNull()
    expect(nulled.tonnageEntries[0].classification).toBeNull()
    expect(nulled.tonnageEntries[0].tonnes).toBeNull()

    const blank = parsedExample('invalid-blank')
    expect(blank.memberName).toBe('')
    expect(blank.compliancePeriodYear).toBe('')
    expect(blank.tonnageEntries[0].classification.chemistry).toBe('')
    expect(blank.tonnageEntries[0].tonnes).toBe('')

    const format = parsedExample('invalid-format')
    expect(format.schemeOrgId).toBe('not-an-object-id')
    expect(format.memberOrgId).toBe('not-an-object-id')
    expect(format.memberBprn).toBe('not-a-bprn')
    expect(format.compliancePeriodYear).toBe(999)
    expect(format.tonnageEntries[0].tonnes.startsWith('-')).toBe(true)

    const duplicate = parsedExample('invalid-duplicate')
    expect(duplicate.tonnageEntries[0].classification).toEqual(
      duplicate.tonnageEntries[1].classification
    )

    const mismatch = parsedExample('invalid-bprn-year')
    expect(mismatch.memberBprn).toBe('BPRN-EA-2025-000123')
    expect(mismatch.compliancePeriodYear).toBe(2026)

    const unknown = parsedExample('invalid-unknown')
    expect(unknown.regulatorNote).toBe('ignore me')
    expect(unknown.tonnageEntries).toHaveLength(1)
  })

  test('Should list the examples in dropdown order', () => {
    expect(exampleKinds.map((kind) => kind.text)).toEqual([
      'Full submission',
      'Min submission - exclude optional fields',
      'Min submission - NULL optional fields',
      'Min submission - blank optional fields',
      'Min submission - white space optional fields',
      'Trim',
      'Invalid - missing req fields',
      'Invalid - NULL req fields',
      'Invalid - blank req fields',
      'Invalid - wrong field format',
      'Invalid - duplicate classification',
      'Invalid - BPRN year mismatch',
      'Invalid - unknown property'
    ])
  })
})
