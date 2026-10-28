export function buildNavigation(request) {
  const navigation = [
    {
      text: 'Home',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'About',
      href: '/about',
      current: request?.path === '/about'
    }
  ]

  if (request?.auth?.isAuthenticated) {
    navigation.push(
      {
        text: 'Example',
        href: '/example',
        current: request?.path === '/example'
      },
      // TEMPORARY: delete with src/server/routes/pom-submission
      {
        text: 'POM submission test page',
        href: '/pom-submission',
        current: request?.path === '/pom-submission'
      }
    )
  }

  return navigation
}
