import { randomBytes, randomInt } from 'node:crypto'

// TEMPORARY. Delete this folder to remove the manual POM submission page.
// The scheme, year and quarter stay fixed. A new example changes the member
// id and name, and picks one or two tonnage entries, so the same JSON can be
// posted twice to see the duplicate error.

const schemeOrgId = '674a1b2c3d4e5f6789012345'

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

function tonnes() {
  return `${randomInt(1, 100)}.${String(randomInt(0, 1000)).padStart(3, '0')}`
}

function tonnageEntries() {
  const first = randomInt(classifications.length)
  const entries = [{ classification: classifications[first], tonnes: tonnes() }]

  if (randomInt(2) === 1) {
    const second =
      (first + 1 + randomInt(classifications.length - 1)) %
      classifications.length
    entries.push({ classification: classifications[second], tonnes: tonnes() })
  }

  return entries
}

export function buildExampleSubmission() {
  const memberName = `${memberNames[randomInt(memberNames.length)]} ${randomInt(1000, 9999)}`

  return JSON.stringify(
    {
      schemeOrgId,
      memberOrgId: randomBytes(12).toString('hex'),
      memberName,
      memberBprn: 'BPRN-EA-2026-000123',
      schemeMembershipRef: 'SCH-00417',
      compliancePeriodYear: 2026,
      compliancePeriodQuarter: 'Quarter 2',
      dataBasis: 'Actual',
      tonnageEntries: tonnageEntries()
    },
    null,
    2
  )
}
