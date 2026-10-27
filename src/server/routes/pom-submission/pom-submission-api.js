import { promisify } from 'node:util'
import { gunzip as gunzipCallback } from 'node:zlib'

import { config } from '#/config/config.js'

const gunzip = promisify(gunzipCallback)

function backendUrl(path) {
  return new URL(path, config.get('wasteBatteriesSubmitBackendUrl'))
}

function jsonHeaders(accessToken) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`
  }
}

// Ask the API to gzip the list body. The single submission read stays plain JSON. Node fetch inflates a gzip body before this client reads it.
function gzipHeaders(accessToken) {
  return {
    ...jsonHeaders(accessToken),
    'accept-encoding': 'gzip'
  }
}

async function readResponse(response) {
  return {
    statusCode: response.status,
    statusText: response.statusText,
    body: await readBody(response)
  }
}

async function readBody(response) {
  const encoding = response.headers.get('content-encoding')
  if (!encoding?.toLowerCase().includes('gzip')) {
    return response.text()
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0) {
    return ''
  }

  // Fetch can inflate the body and still report gzip. A raw gzip body starts with 1f 8b.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return bytes.toString('utf8')
  }

  return (await gunzip(bytes)).toString('utf8')
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
    headers: gzipHeaders(accessToken)
  })

  return readResponse(response)
}
