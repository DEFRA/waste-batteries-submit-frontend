import { statusCodes } from '#/server/common/constants/status-codes.js'

import {
  buildExampleSubmission,
  defaultExampleKind,
  exampleKinds
} from './example-submission.js'
import {
  createPomSubmission,
  getPomSubmission,
  listPomSubmissions
} from './pom-submission-api.js'

const pageTitle = 'POM submission test page'
const heading = 'POM submission saving'
const temporaryLabel = 'Temporary test page'
const pomSubmissionView = 'pom-submission/index'

function selectedKind(value) {
  return exampleKinds.some((kind) => kind.value === value)
    ? value
    : defaultExampleKind
}

function scrollTarget(intent) {
  if (intent === 'update-json') {
    return 'request-json'
  }

  if (intent === 'get-by-id') {
    return 'get-by-id'
  }

  if (intent === 'get-multiples') {
    return 'get-multiples'
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

function jsonObject(submissionJson) {
  try {
    const parsed = JSON.parse(submissionJson)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed
    }
  } catch {
    return null
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
      return viewPage(
        h,
        request,
        {
          ...page,
          errorMessage:
            request.payload.intent === 'post'
              ? 'Enter the JSON to post'
              : 'Enter the JSON to send'
        },
        statusCodes.badRequest
      )
    }

    const body = jsonObject(submissionJson)

    if (!body) {
      return viewPage(
        h,
        request,
        {
          ...page,
          errorMessage: 'Enter valid JSON'
        },
        statusCodes.badRequest
      )
    }

    if (request.payload.intent === 'get-by-id') {
      const id = submissionId(body)

      if (id === '') {
        return viewPage(
          h,
          request,
          {
            ...page,
            errorMessage: 'Enter a JSON object with an id'
          },
          statusCodes.badRequest
        )
      }

      return readSubmission(request, h, page, id)
    }

    if (request.payload.intent === 'get-multiples') {
      return readSubmissions(request, h, page, body)
    }

    return postSubmission(request, h, page)
  }
}
