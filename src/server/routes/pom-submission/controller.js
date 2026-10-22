import { statusCodes } from '#/server/common/constants/status-codes.js'

import { buildExampleSubmission } from './example-submission.js'
import { createPomSubmission } from './pom-submission-api.js'

const pageTitle = 'POM submission create single'
const pomSubmissionView = 'pom-submission/index'

function viewContext(request, values = {}) {
  return {
    pageTitle: values.errorMessage ? `Error: ${pageTitle}` : pageTitle,
    heading: pageTitle,
    breadcrumbs: [{ text: 'Home', href: '/' }, { text: pageTitle }],
    crumb: request.plugins.crumb,
    submissionJson: '',
    response: null,
    ...values
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
      viewContext(request, {
        submissionJson: buildExampleSubmission()
      })
    )
  }
}

export const pomSubmissionPostController = {
  async handler(request, h) {
    if (request.payload.intent === 'new-example') {
      return h.view(
        pomSubmissionView,
        viewContext(request, {
          submissionJson: buildExampleSubmission(),
          response: postedResponse(request.payload)
        })
      )
    }

    const submissionJson = request.payload.submissionJson ?? ''

    if (submissionJson.trim() === '') {
      return h
        .view(
          pomSubmissionView,
          viewContext(request, {
            submissionJson,
            errorMessage: 'Enter the JSON to post'
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
          viewContext(request, {
            submissionJson,
            errorMessage: 'Enter valid JSON'
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
        viewContext(request, {
          submissionJson,
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
          viewContext(request, {
            submissionJson,
            errorMessage: 'There was a problem calling the API'
          })
        )
        .code(statusCodes.internalServerError)
    }
  }
}
