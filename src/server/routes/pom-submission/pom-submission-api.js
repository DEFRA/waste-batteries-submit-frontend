import { config } from '#/config/config.js'

function backendUrl(path) {
  return new URL(path, config.get('wasteBatteriesSubmitBackendUrl'))
}

function jsonHeaders(accessToken) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`
  }
}

async function readResponse(response) {
  return {
    statusCode: response.status,
    statusText: response.statusText,
    body: await response.text()
  }
}

function appendQueryValue(params, key, value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryValue(params, key, item)
    }
    return
  }

  if (value === undefined || value === null || typeof value === 'object') {
    return
  }

  params.append(key, String(value))
}

function listPath(filters) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    appendQueryValue(params, key, value)
  }

  const query = params.toString()
  return query === '' ? '/pom-submissions' : `/pom-submissions?${query}`
}

export async function createPomSubmission({ body, accessToken }) {
  const response = await fetch(backendUrl('/pom-submissions'), {
    method: 'POST',
    headers: {
      ...jsonHeaders(accessToken),
      'content-type': 'application/json'
    },
    body
  })

  return readResponse(response)
}

export async function getPomSubmission({ id, accessToken }) {
  const response = await fetch(
    backendUrl(`/pom-submissions/${encodeURIComponent(id)}`),
    {
      method: 'GET',
      headers: jsonHeaders(accessToken)
    }
  )

  return readResponse(response)
}

export async function listPomSubmissions({ filters, accessToken }) {
  const response = await fetch(backendUrl(listPath(filters)), {
    method: 'GET',
    headers: jsonHeaders(accessToken)
  })

  return readResponse(response)
}
