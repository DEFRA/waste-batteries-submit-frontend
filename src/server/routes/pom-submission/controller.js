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

function scrollTarget(intent) {
  return intent === 'update-json' ? 'request-json' : 'send-request'
}

function isJsonObject(submissionJson) {
  try {
    const parsed = JSON.parse(submissionJson)
    return (
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
    )
  } catch {
    return false
  }
}

function viewPage(h, request, values, statusCode) {
  const response = h.view(pomSubmissionView, pomSubmissionPage(request, values))

  if (statusCode === undefined) {
    return response
  }

  return response.code(statusCode)
}

async function postSubmission(request, h, page) {
  const { exampleKind, submissionJson, scrollTo } = page

  try {
    const response = await createPomSubmission({
      body: submissionJson,
      accessToken: request.auth.credentials.accessToken
    })

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
    request.logger.error(error, 'Could not post the POM submission')

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

    if (submissionJson.trim() === '') {
      return viewPage(
        h,
        request,
        {
          exampleKind,
          submissionJson,
          errorMessage: 'Enter the JSON to post',
          scrollTo
        },
        statusCodes.badRequest
      )
    }

    if (!isJsonObject(submissionJson)) {
      return viewPage(
        h,
        request,
        {
          exampleKind,
          submissionJson,
          errorMessage: 'Enter valid JSON',
          scrollTo
        },
        statusCodes.badRequest
      )
    }

    return postSubmission(request, h, {
      exampleKind,
      submissionJson,
      scrollTo
    })
  }
}
