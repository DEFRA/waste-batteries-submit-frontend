import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  SkipLink
} from 'govuk-frontend'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(SkipLink)

// TEMPORARY: delete with src/server/routes/pom-submission
const pomScrollTarget = document.querySelector('[data-scroll-to]')
const pomScrollTo = pomScrollTarget?.dataset.scrollTo
if (pomScrollTo) {
  document.getElementById(pomScrollTo)?.scrollIntoView()
}
