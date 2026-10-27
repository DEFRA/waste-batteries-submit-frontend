import { randomBytes, randomInt } from 'node:crypto'

// TEMPORARY. Delete this folder to remove the manual POM submission page.
// The scheme stays fixed. Each example randomises the member id, name and tonnes
// where that still fits the selected case.
// The API stores batteryCategory as Portable. A request posts chemistry only.

const schemeOrgId = '674a1b2c3d4e5f6789012345'
const exampleSubmissionId = '674a1b2c3d4e5f6789012346'
const tonnesDecimalPlaces = 3
const memberOrgIdBytes = 12
const memberNameSuffixMin = 1000
const memberNameSuffixMax = 9999
const exampleYears = [2025, 2026]
const exampleQuarters = ['Quarter 1', 'Quarter 2']
const examplePageNumber = 1
const examplePageSize = 10
const dottedLine = '....................'

export const defaultExampleKind = 'full'

const separator = { separator: true, text: dottedLine }

export const exampleKinds = [
  { value: 'full', text: 'Full submission' },
  { value: 'minimum', text: 'Minimum submission' },
  { value: 'trim', text: 'Trim' },
  { value: 'invalid-missing', text: 'Invalid - missing req fields' },
  { value: 'invalid-null', text: 'Invalid - NULL req fields' },
  { value: 'invalid-blank', text: 'Invalid - blank req fields' },
  { value: 'invalid-format', text: 'Invalid - wrong field format' },
  { value: 'invalid-duplicate', text: 'Invalid - duplicate classification' },
  { value: 'invalid-bprn-year', text: 'Invalid - BPRN year mismatch' },
  { value: 'invalid-unknown', text: 'Invalid - unknown property' },
  separator,
  { value: 'get-by-id', text: 'Get by id' },
  separator,
  {
    value: 'get-by-scheme',
    text: 'Get by scheme id with years and quarters'
  },
  {
    value: 'get-by-member',
    text: 'Get by member id with years and paginated'
  }
]

const memberNames = [
  'Northwind Batteries Ltd',
  'Harbour Cells Ltd',
  'Greenfield Storage Ltd',
  'Pennine Power Ltd',
  'Severn Batteries Ltd'
]

const chemistries = ['Alkaline', 'Lead acid', 'Lithium']

function pretty(value) {
  return JSON.stringify(value, null, 2)
}

function padded(value) {
  return `  ${value}  `
}

function tonnes() {
  return `${randomInt(1, 100)}.${String(randomInt(0, 1000)).padStart(tonnesDecimalPlaces, '0')}`
}

function negativeTonnes() {
  return `-${tonnes()}`
}

function member() {
  const memberName = `${memberNames[randomInt(memberNames.length)]} ${randomInt(memberNameSuffixMin, memberNameSuffixMax)}`

  return {
    schemeOrgId,
    memberOrgId: randomBytes(memberOrgIdBytes).toString('hex'),
    memberName,
    memberBprn: 'BPRN-EA-2026-000123',
    schemeMembershipRef: 'SCH-00417',
    compliancePeriodYear: 2026,
    compliancePeriodQuarter: 'Quarter 2',
    dataBasis: 'Actual'
  }
}

function classificationAt(index) {
  return {
    chemistry: chemistries[index % chemistries.length]
  }
}

function entry(index, tonnesValue = tonnes()) {
  return {
    classification: classificationAt(index),
    tonnes: tonnesValue
  }
}

function twoIndexes() {
  const first = randomInt(chemistries.length)
  return [first, (first + 1) % chemistries.length]
}

function fullSubmission() {
  const [first, second] = twoIndexes()

  return {
    ...member(),
    tonnageEntries: [entry(first), entry(second)]
  }
}

function minimumSubmission() {
  return {
    ...member(),
    tonnageEntries: [entry(randomInt(chemistries.length))]
  }
}

function trimmedSubmission() {
  const submission = fullSubmission()

  return {
    schemeOrgId: padded(submission.schemeOrgId),
    memberOrgId: padded(submission.memberOrgId),
    memberName: padded(submission.memberName),
    memberBprn: padded(submission.memberBprn),
    schemeMembershipRef: padded(submission.schemeMembershipRef),
    compliancePeriodYear: submission.compliancePeriodYear,
    compliancePeriodQuarter: padded(submission.compliancePeriodQuarter),
    dataBasis: padded(submission.dataBasis),
    tonnageEntries: submission.tonnageEntries.map((item) => ({
      classification: {
        chemistry: padded(item.classification.chemistry)
      },
      tonnes: padded(item.tonnes)
    }))
  }
}

function missingRequired() {
  return {}
}

function nullRequired() {
  return {
    schemeOrgId: null,
    memberOrgId: null,
    memberName: null,
    memberBprn: null,
    schemeMembershipRef: null,
    compliancePeriodYear: null,
    compliancePeriodQuarter: null,
    dataBasis: null,
    tonnageEntries: [{ classification: null, tonnes: null }]
  }
}

function blankRequired() {
  return {
    schemeOrgId: '',
    memberOrgId: '',
    memberName: '',
    memberBprn: '',
    schemeMembershipRef: '',
    compliancePeriodYear: '',
    compliancePeriodQuarter: '',
    dataBasis: '',
    tonnageEntries: [
      {
        classification: { chemistry: '' },
        tonnes: ''
      }
    ]
  }
}

function wrongFormat() {
  return {
    ...member(),
    schemeOrgId: 'not-an-object-id',
    memberOrgId: 'not-an-object-id',
    memberBprn: 'not-a-bprn',
    compliancePeriodYear: 999,
    tonnageEntries: [entry(0, negativeTonnes())]
  }
}

function duplicateClassification() {
  const classification = classificationAt(randomInt(chemistries.length))

  return {
    ...member(),
    tonnageEntries: [
      { classification, tonnes: tonnes() },
      { classification: { ...classification }, tonnes: tonnes() }
    ]
  }
}

function bprnYearMismatch() {
  return {
    ...minimumSubmission(),
    memberBprn: 'BPRN-EA-2025-000123'
  }
}

function unknownProperty() {
  return {
    ...minimumSubmission(),
    regulatorNote: 'ignore me'
  }
}

function getById() {
  return {
    id: exampleSubmissionId
  }
}

function getByScheme() {
  return {
    schemeOrgId,
    compliancePeriodYears: exampleYears,
    compliancePeriodQuarters: exampleQuarters
  }
}

function getByMember() {
  return {
    memberOrgId: randomBytes(memberOrgIdBytes).toString('hex'),
    compliancePeriodYears: exampleYears,
    pageNumber: examplePageNumber,
    pageSize: examplePageSize
  }
}

const builders = {
  full: fullSubmission,
  minimum: minimumSubmission,
  trim: trimmedSubmission,
  'invalid-missing': missingRequired,
  'invalid-null': nullRequired,
  'invalid-blank': blankRequired,
  'invalid-format': wrongFormat,
  'invalid-duplicate': duplicateClassification,
  'invalid-bprn-year': bprnYearMismatch,
  'invalid-unknown': unknownProperty,
  'get-by-id': getById,
  'get-by-scheme': getByScheme,
  'get-by-member': getByMember
}

export function buildExampleSubmission(kind = defaultExampleKind) {
  const build = builders[kind] ?? builders[defaultExampleKind]
  return pretty(build())
}
