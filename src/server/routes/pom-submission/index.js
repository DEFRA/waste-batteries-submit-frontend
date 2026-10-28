import Joi from 'joi'

import { statusCodes } from '#/server/common/constants/status-codes.js'

import {
  pomSubmissionGetController,
  pomSubmissionPage,
  pomSubmissionPostController
} from './controller.js'
import { exampleKinds } from './example-submission.js'

// TEMPORARY manual test page for POST /pom-submissions.
// To remove it, delete src/server/routes/pom-submission and the matching
// TEMPORARY lines in:
// - src/server/plugins/router.js
// - src/config/nunjucks/context/build-navigation.js
// - src/config/nunjucks/context/build-navigation.test.js
// - e2e/journeys/accessibility/accessibility.spec.js
// - src/client/stylesheets/partials/_index.scss
// - src/client/javascripts/application.js
// The submissions API base URL in src/config/config.js stays. It is how this
// service calls the Submissions API, and is not part of the temporary page.

const maxJsonLength = 100_000
const maxStatusCodeLength = 3

export const pomSubmission = {
  plugin: {
    name: 'pom-submission',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/pom-submission',
          ...pomSubmissionGetController
        },
        {
          method: 'POST',
          path: '/pom-submission',
          options: {
            validate: {
              payload: Joi.object({
                intent: Joi.string().valid('post', 'update-json').required(),
                exampleKind: Joi.string()
                  .valid(...exampleKinds.map((kind) => kind.value))
                  .empty('')
                  .default('full'),
                submissionJson: Joi.string().max(maxJsonLength).allow(''),
                responseStatusCode: Joi.string()
                  .max(maxStatusCodeLength)
                  .allow(''),
                responseStatusText: Joi.string().max(100).allow(''),
                responseBody: Joi.string().max(maxJsonLength).allow('')
              }).unknown(true),
              failAction(request, h) {
                return h
                  .view(
                    'pom-submission/index',
                    pomSubmissionPage(request, {
                      exampleKind: request.payload?.exampleKind,
                      submissionJson: request.payload?.submissionJson ?? '',
                      errorMessage: 'The request could not be read'
                    })
                  )
                  .code(statusCodes.badRequest)
                  .takeover()
              }
            }
          },
          ...pomSubmissionPostController
        }
      ])
    }
  }
}
