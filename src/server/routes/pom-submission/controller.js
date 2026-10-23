import { statusCodes } from '#/server/common/constants/status-codes.js'

import {
  buildExampleSubmission,
  defaultExampleKind,
  exampleKinds
} from './example-submission.js'
import { createPomSubmission } from './pom-submission-api.js'

const pageTitle = 'POM submission create single'
const pomSubmissionView = 'pom-submission/index'

function selectedKind(value) {
  return exampleKinds.some((kind) => kind.value === value)
    ? value
    : defaultExampleKind
}

export function pomSubmissionPage(request, values = {}) {
  const exampleKind = selectedKind(values.exampleKind)

  return {
    pageTitle: values.errorMessage ? `Error: ${pageTitle}` : pageTitle,
    heading: pageTitle,
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

export const pomSubmissionPostController = {
  async handler(request, h) {
    const exampleKind = selectedKind(request.payload.exampleKind)
    const scrollTo =
      request.payload.intent === 'update-json' ? 'request-json' : 'send-request'

    if (request.payload.intent === 'update-json') {
      return h.view(
        pomSubmissionView,
        pomSubmissionPage(request, {
          exampleKind,
          submissionJson: buildExampleSubmission(exampleKind),
          response: postedResponse(request.payload),
          scrollTo
        })
      )
    }

    const submissionJson = request.payload.submissionJson ?? ''

    if (submissionJson.trim() === '') {
      return h
        .view(
          pomSubmissionView,
          pomSubmissionPage(request, {
            exampleKind,
            submissionJson,
            errorMessage: 'Enter the JSON to post',
            scrollTo
          })
        )
        .code(statusCodes.badRequest)
    }

    try {
      const parsed = JSON.parse(submissionJson)
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        throw new SyntaxError('JSON must be an object')
      }
    } catch {
      return h
        .view(
          pomSubmissionView,
          pomSubmissionPage(request, {
            exampleKind,
            submissionJson,
            errorMessage: 'Enter valid JSON',
            scrollTo
          })
        )
        .code(statusCodes.badRequest)
    }

    try {
      const response = await createPomSubmission({
        body: submissionJson,
        accessToken: request.auth.credentials.accessToken
      })

      return h.view(
        pomSubmissionView,
        pomSubmissionPage(request, {
          exampleKind,
          submissionJson,
          scrollTo,
          response: {
            statusCode: response.statusCode,
            statusText: response.statusText,
            body: formattedBody(response.body)
          }
        })
      )
    } catch (error) {
      request.logger.error(error, 'Could not post the POM submission')

      return h
        .view(
          pomSubmissionView,
          pomSubmissionPage(request, {
            exampleKind,
            submissionJson,
            errorMessage: 'There was a problem calling the API',
            scrollTo
          })
        )
        .code(statusCodes.internalServerError)
    }
  }
}
