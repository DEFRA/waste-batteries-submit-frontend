import { config } from '#/config/config.js'

function backendUrl(path) {
  return new URL(path, config.get('wasteBatteriesSubmitBackendUrl'))
}

export async function createPomSubmission({ body, accessToken }) {
  const response = await fetch(backendUrl('/pom-submissions'), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body
  })

  return {
    statusCode: response.status,
    statusText: response.statusText,
    body: await response.text()
  }
}
