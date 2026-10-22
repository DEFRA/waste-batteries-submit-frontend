import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    expect(
      buildNavigation(mockRequest({ path: '/non-existent-path' }))
    ).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      }
    ])
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([
      {
        current: true,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      }
    ])
  })

  test('Should show example navigation to signed-in users', () => {
    expect(
      buildNavigation(
        mockRequest({
          path: '/example',
          auth: { isAuthenticated: true }
        })
      )
    ).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      },
      {
        current: true,
        text: 'Example',
        href: '/example'
      },
      {
        current: false,
        text: 'POM submission create single',
        href: '/pom-submission'
      }
    ])
  })

  test('Should highlight the POM submission page for signed-in users', () => {
    expect(
      buildNavigation(
        mockRequest({
          path: '/pom-submission',
          auth: { isAuthenticated: true }
        })
      )
    ).toEqual([
      {
        current: false,
        text: 'Home',
        href: '/'
      },
      {
        current: false,
        text: 'About',
        href: '/about'
      },
      {
        current: false,
        text: 'Example',
        href: '/example'
      },
      {
        current: true,
        text: 'POM submission create single',
        href: '/pom-submission'
      }
    ])
  })
})
