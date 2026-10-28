import { vi } from 'vitest'

vi.mock('govuk-frontend', () => ({
  createAll: vi.fn(),
  Button: {},
  Checkboxes: {},
  ErrorSummary: {},
  Radios: {},
  SkipLink: {}
}))

async function loadApplication(documentStub) {
  vi.resetModules()
  vi.stubGlobal('document', documentStub)
  await import('./application.js')
}

describe('#application', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should scroll to the marked target', async () => {
    const scrollIntoView = vi.fn()
    const documentStub = {
      querySelector: vi.fn(() => ({ dataset: { scrollTo: 'send-request' } })),
      getElementById: vi.fn(() => ({ scrollIntoView }))
    }

    await loadApplication(documentStub)

    expect(documentStub.querySelector).toHaveBeenCalledWith('[data-scroll-to]')
    expect(documentStub.getElementById).toHaveBeenCalledWith('send-request')
    expect(scrollIntoView).toHaveBeenCalled()
  })

  test('Should leave the page unmoved when nothing is marked', async () => {
    const documentStub = {
      querySelector: vi.fn(() => null),
      getElementById: vi.fn()
    }

    await loadApplication(documentStub)

    expect(documentStub.getElementById).not.toHaveBeenCalled()
  })

  test('Should leave the page unmoved when the marked target is missing', async () => {
    const documentStub = {
      querySelector: vi.fn(() => ({ dataset: { scrollTo: 'missing' } })),
      getElementById: vi.fn(() => null)
    }

    await loadApplication(documentStub)

    expect(documentStub.getElementById).toHaveBeenCalledWith('missing')
  })
})
