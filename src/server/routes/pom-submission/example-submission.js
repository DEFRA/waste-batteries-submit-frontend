import { randomBytes, randomInt } from 'node:crypto'

// TEMPORARY. Delete this folder to remove the manual POM submission page.
// The scheme stays fixed. Each example randomises the member id, name and tonnes
// where that still fits the selected case.

const schemeOrgId = '674a1b2c3d4e5f6789012345'
const tonnesDecimalPlaces = 3
const memberOrgIdBytes = 12
const memberNameSuffixMin = 1000
const memberNameSuffixMax = 9999

export const defaultExampleKind = 'full'

export const exampleKinds = [
  { value: 'full', text: 'Full submission' },
  { value: 'min-exclude', text: 'Min submission - exclude optional fields' },
  { value: 'min-null', text: 'Min submission - NULL optional fields' },
  { value: 'min-blank', text: 'Min submission - blank optional fields' },
  {
    value: 'min-whitespace',
    text: 'Min submission - white space optional fields'
  },
  { value: 'trim', text: 'Trim' },
  { value: 'invalid-missing', text: 'Invalid - missing req fields' },
  { value: 'invalid-null', text: 'Invalid - NULL req fields' },
  { value: 'invalid-blank', text: 'Invalid - blank req fields' },
  { value: 'invalid-format', text: 'Invalid - wrong field format' },
  { value: 'invalid-duplicate', text: 'Invalid - duplicate classification' },
  { value: 'invalid-bprn-year', text: 'Invalid - BPRN year mismatch' },
  { value: 'invalid-unknown', text: 'Invalid - unknown property' }
]

const memberNames = [
  'Northwind Batteries Ltd',
  'Harbour Cells Ltd',
  'Greenfield Storage Ltd',
  'Pennine Power Ltd',
  'Severn Batteries Ltd'
]

const classifications = [
  {
    batteryCategory: 'Portable',
    chemistry: 'Alkaline',
    subCategory: 'General use',
    cellType: 'Primary',
    equipmentState: 'In equipment'
  },
  {
    batteryCategory: 'Industrial',
    chemistry: 'Lead acid',
    subCategory: 'Motive',
    cellType: 'Secondary',
    equipmentState: 'Sold separately'
  },
  {
    batteryCategory: 'Automotive',
    chemistry: 'Lead acid',
    subCategory: 'SLI',
    cellType: 'Secondary',
    equipmentState: 'In equipment'
  }
]

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

function classificationAt(index, optional) {
  const source = classifications[index % classifications.length]
  const required = {
    batteryCategory: source.batteryCategory,
    chemistry: source.chemistry
  }

  if (optional === 'exclude') {
    return required
  }

  if (optional === 'null') {
    return {
      ...required,
      subCategory: null,
      cellType: null,
      equipmentState: null
    }
  }

  if (optional === 'blank') {
    return { ...required, subCategory: '', cellType: '', equipmentState: '' }
  }

  if (optional === 'whitespace') {
    return {
      ...required,
      subCategory: '   ',
      cellType: '   ',
      equipmentState: '   '
    }
  }

  return {
    ...required,
    subCategory: source.subCategory,
    cellType: source.cellType,
    equipmentState: source.equipmentState
  }
}

function entry(index, optional, tonnesValue = tonnes()) {
  return {
    classification: classificationAt(index, optional),
    tonnes: tonnesValue
  }
}

function twoIndexes() {
  const first = randomInt(classifications.length)
  return [first, (first + 1) % classifications.length]
}

function fullSubmission() {
  const [first, second] = twoIndexes()

  return {
    ...member(),
    tonnageEntries: [entry(first, 'values'), entry(second, 'values')]
  }
}

function minimumSubmission(optional) {
  return {
    ...member(),
    tonnageEntries: [entry(randomInt(classifications.length), optional)]
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
        batteryCategory: padded(item.classification.batteryCategory),
        chemistry: padded(item.classification.chemistry),
        subCategory: padded(item.classification.subCategory),
        cellType: padded(item.classification.cellType),
        equipmentState: padded(item.classification.equipmentState)
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
        classification: { batteryCategory: '', chemistry: '' },
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
    tonnageEntries: [entry(0, 'exclude', negativeTonnes())]
  }
}

function duplicateClassification() {
  const classification = classificationAt(
    randomInt(classifications.length),
    'values'
  )

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
    ...minimumSubmission('exclude'),
    memberBprn: 'BPRN-EA-2025-000123'
  }
}

function unknownProperty() {
  return {
    ...minimumSubmission('exclude'),
    regulatorNote: 'ignore me'
  }
}

const builders = {
  full: fullSubmission,
  'min-exclude': () => minimumSubmission('exclude'),
  'min-null': () => minimumSubmission('null'),
  'min-blank': () => minimumSubmission('blank'),
  'min-whitespace': () => minimumSubmission('whitespace'),
  trim: trimmedSubmission,
  'invalid-missing': missingRequired,
  'invalid-null': nullRequired,
  'invalid-blank': blankRequired,
  'invalid-format': wrongFormat,
  'invalid-duplicate': duplicateClassification,
  'invalid-bprn-year': bprnYearMismatch,
  'invalid-unknown': unknownProperty
}

export function buildExampleSubmission(kind = defaultExampleKind) {
  const build = builders[kind] ?? builders[defaultExampleKind]
  return pretty(build())
}
