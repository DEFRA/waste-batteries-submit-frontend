import Joi from 'joi'

import {
  pomSubmissionGetController,
  pomSubmissionPostController
} from './controller.js'

// TEMPORARY manual test page for POST /pom-submissions.
// To remove it, delete src/server/routes/pom-submission and the matching
// TEMPORARY lines in:
// - src/server/plugins/router.js
// - src/config/nunjucks/context/build-navigation.js
// - src/config/nunjucks/context/build-navigation.test.js
// - e2e/journeys/accessibility/accessibility.spec.js

const maxJsonLength = 100_000

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
                intent: Joi.string().valid('post', 'new-example').required(),
                submissionJson: Joi.string().max(maxJsonLength).allow(''),
                responseStatusCode: Joi.string().max(3).allow(''),
                responseStatusText: Joi.string().max(100).allow(''),
                responseBody: Joi.string().max(maxJsonLength).allow('')
              }).unknown(true),
              failAction(request, h) {
                return h
                  .view('pom-submission/index', {
                    pageTitle: 'Error: POM submission create single',
                    heading: 'POM submission create single',
                    breadcrumbs: [
                      { text: 'Home', href: '/' },
                      { text: 'POM submission create single' }
                    ],
                    crumb: request.plugins.crumb,
                    submissionJson: request.payload?.submissionJson ?? '',
                    response: null,
                    errorMessage: 'The request could not be read'
                  })
                  .code(400)
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
