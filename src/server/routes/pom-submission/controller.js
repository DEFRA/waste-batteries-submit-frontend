import { statusCodes } from '#/server/common/constants/status-codes.js'

import {
  buildExampleSubmission,
  defaultExampleKind,
  exampleKinds
} from './example-submission.js'
import {
  amendPomSubmission,
  createPomSubmission,
  getPomSubmission,
  listPomSubmissions,
  upsertBatchPomSubmissions
} from './pom-submission-api.js'

const pageTitle = 'POM submission test page'
const heading = 'POM submission saving'
const temporaryLabel = 'Temporary test page'
const pomSubmissionView = 'pom-submission/index'
const patchIntent = 'patch'
const upsertBatchIntent = 'upsert-batch'
const getMultiplesIntent = 'get-multiples'

function selectedKind(value) {
  return exampleKinds.some((kind) => kind.value === value)
    ? value
    : defaultExampleKind
}

function scrollTarget(intent) {
  if (intent === 'update-json') {
    return 'request-json'
  }

  if (intent === patchIntent) {
    return 'amend-single'
  }

  if (intent === upsertBatchIntent) {
    return 'batch-upsert'
  }

  if (intent === 'get-by-id') {
    return 'get-by-id'
  }

  if (intent === getMultiplesIntent) {
    return getMultiplesIntent
  }

  return 'create-single'
}

export function pomSubmissionPage(request, values = {}) {
  const exampleKind = selectedKind(values.exampleKind)

  return {
    pageTitle: values.errorMessage ? `Error: ${pageTitle}` : pageTitle,
    heading,
    temporaryLabel,
    breadcrumbs: [{ text: 'Home', href: '/' }, { text: pageTitle }],
    crumb: request.plugins.crumb,
    exampleKinds,
    exampleKind,
    submissionJson: values.submissionJson ?? '',
    response: values.response ?? null,
    errorMessage: values.errorMessage,
    scrollTo: values.scrollTo ?? null
  }
}

function postedResponse(payload) {
  const statusCode = payload?.responseStatusCode
  if (statusCode === undefined || statusCode === null || statusCode === '') {
    return null
  }

  return {
    statusCode,
    statusText: payload.responseStatusText ?? '',
    body: payload.responseBody ?? ''
  }
}

function formattedBody(body) {
  if (!body) {
    return '(empty body)'
  }

  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

export const pomSubmissionGetController = {
  handler(request, h) {
    return h.view(
      pomSubmissionView,
      pomSubmissionPage(request, {
        exampleKind: defaultExampleKind,
        submissionJson: buildExampleSubmission(defaultExampleKind)
      })
    )
  }
}

function parsedJson(submissionJson) {
  try {
    return JSON.parse(submissionJson)
  } catch {
    return undefined
  }
}

function jsonObject(value) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  return null
}

function submissionId(body) {
  return typeof body.id === 'string' ? body.id.trim() : ''
}

function viewPage(h, request, values, statusCode) {
  const response = h.view(pomSubmissionView, pomSubmissionPage(request, values))

  if (statusCode === undefined) {
    return response
  }

  return response.code(statusCode)
}

async function callApi(request, h, page, call, logMessage) {
  const { exampleKind, submissionJson, scrollTo } = page

  try {
    const response = await call()

    return viewPage(h, request, {
      exampleKind,
      submissionJson,
      scrollTo,
      response: {
        statusCode: response.statusCode,
        statusText: response.statusText,
        body: formattedBody(response.body)
      }
    })
  } catch (error) {
    request.logger.error(error, logMessage)

    return viewPage(
      h,
      request,
      {
        exampleKind,
        submissionJson,
        errorMessage: 'There was a problem calling the API',
        scrollTo
      },
      statusCodes.internalServerError
    )
  }
}

function accessToken(request) {
  return request.auth.credentials.accessToken
}

function missingJsonMessage(intent) {
  if (intent === 'post') {
    return 'Enter the JSON to post'
  }

  if (intent === patchIntent) {
    return 'Enter the JSON to amend'
  }

  if (intent === upsertBatchIntent) {
    return 'Enter the JSON to upsert'
  }

  return 'Enter the JSON to send'
}

function postSubmission(request, h, page) {
  return callApi(
    request,
    h,
    page,
    () =>
      createPomSubmission({
        body: page.submissionJson,
        accessToken: accessToken(request)
      }),
    'Could not post the POM submission'
  )
}

function upsertBatch(request, h, page) {
  return callApi(
    request,
    h,
    page,
    () =>
      upsertBatchPomSubmissions({
        body: page.submissionJson,
        accessToken: accessToken(request)
      }),
    'Could not upsert the POM submission batch'
  )
}

function amendSubmission(request, h, page) {
  return callApi(
    request,
    h,
    page,
    () =>
      amendPomSubmission({
        body: page.submissionJson,
        accessToken: accessToken(request)
      }),
    'Could not amend the POM submission'
  )
}

function readSubmission(request, h, page, id) {
  return callApi(
    request,
    h,
    page,
    () =>
      getPomSubmission({
        id,
        accessToken: accessToken(request)
      }),
    'Could not get the POM submission'
  )
}

function readSubmissions(request, h, page, filters) {
  return callApi(
    request,
    h,
    page,
    () =>
      listPomSubmissions({
        filters,
        accessToken: accessToken(request)
      }),
    'Could not list the POM submissions'
  )
}

function rejectJson(h, request, page, errorMessage) {
  return viewPage(
    h,
    request,
    {
      ...page,
      errorMessage
    },
    statusCodes.badRequest
  )
}

function batchArrayMessage(parsed) {
  return parsed === undefined ? 'Enter valid JSON' : 'Enter a JSON array'
}

function readById(request, h, page, body) {
  const id = submissionId(body)

  if (id === '') {
    return rejectJson(h, request, page, 'Enter a JSON object with an id')
  }

  return readSubmission(request, h, page, id)
}

function submitParsed(request, h, page, parsed) {
  if (request.payload.intent === upsertBatchIntent) {
    if (!Array.isArray(parsed)) {
      return rejectJson(h, request, page, batchArrayMessage(parsed))
    }

    return upsertBatch(request, h, page)
  }

  const body = jsonObject(parsed)

  if (!body) {
    return rejectJson(h, request, page, 'Enter valid JSON')
  }

  if (request.payload.intent === patchIntent) {
    return amendSubmission(request, h, page)
  }

  if (request.payload.intent === 'get-by-id') {
    return readById(request, h, page, body)
  }

  if (request.payload.intent === getMultiplesIntent) {
    return readSubmissions(request, h, page, body)
  }

  return postSubmission(request, h, page)
}

export const pomSubmissionPostController = {
  async handler(request, h) {
    const exampleKind = selectedKind(request.payload.exampleKind)
    const scrollTo = scrollTarget(request.payload.intent)

    if (request.payload.intent === 'update-json') {
      return viewPage(h, request, {
        exampleKind,
        submissionJson: buildExampleSubmission(exampleKind),
        response: postedResponse(request.payload),
        scrollTo
      })
    }

    const submissionJson = request.payload.submissionJson ?? ''
    const page = { exampleKind, submissionJson, scrollTo }

    if (submissionJson.trim() === '') {
      return rejectJson(
        h,
        request,
        page,
        missingJsonMessage(request.payload.intent)
      )
    }

    return submitParsed(request, h, page, parsedJson(submissionJson))
  }
}
