// Starter list of building-code items for proof packages (pure, no imports).
//
// Plain-language summaries (not the code's own wording) of International Residential Code sections that often
// matter on a reroof. Section numbers are from the 2018 and 2021 IRC. Counties adopt different editions and local
// amendments, so every item starts unticked: Mike ticks only what applies to the job and the county, and can edit
// the wording. Nothing here goes into a report unless it is ticked.

export type CodeItem = { id: string; ref: string; title: string; text: string }

export const CODE_LIBRARY: CodeItem[] = [
  {
    id: 'replacement-tearoff', ref: 'IRC R908.3', title: 'Roof replacement means a full tear-off',
    text: 'A roof replacement includes removing the existing roof coverings down to the roof deck.',
  },
  {
    id: 'no-third-layer', ref: 'IRC R908.3.1.1', title: 'No new layer over two existing layers',
    text: 'A new roof covering may not be installed over an existing roof that already has two or more layers, or over a roof that is water-soaked or deteriorated.',
  },
  {
    id: 'drip-edge', ref: 'IRC R905.2.8.5', title: 'Drip edge at eaves and rakes',
    text: 'Asphalt shingle roofs need a drip edge at the eaves and along the rake (gable) edges.',
  },
  {
    id: 'underlayment', ref: 'IRC R905.1.1', title: 'Underlayment',
    text: 'Underlayment of an approved type is required under asphalt shingles, installed as the code and the shingle maker require for the roof slope.',
  },
  {
    id: 'ice-barrier', ref: 'IRC R905.1.2', title: 'Ice barrier at the eaves (where required locally)',
    text: 'Where the local building department requires it because of ice damming, an ice barrier is installed from the eave edge to at least 24 inches inside the exterior wall line.',
  },
  {
    id: 'flashing', ref: 'IRC R903.2', title: 'Flashing at walls and penetrations',
    text: 'Flashing is required where the roof meets walls, chimneys and other penetrations, and at valleys, so water cannot get in at those joints.',
  },
  {
    id: 'ventilation', ref: 'IRC R806.2', title: 'Minimum attic ventilation',
    text: 'Enclosed attics need a minimum net free ventilating area of 1/150 of the attic floor area, or 1/300 when the ventilation is balanced between high and low vents.',
  },
  {
    id: 'manufacturer', ref: 'IRC R905.1', title: "Install to the shingle maker's instructions",
    text: "Roof coverings are installed to the code and to the manufacturer's installation instructions.",
  },
  {
    id: 'reinstall-salvage', ref: 'IRC R908.5', title: 'Reusing materials and flashings',
    text: 'Damaged, cracked or broken slate or tile may not be reinstalled, and existing flashings, edgings, vents and similar parts are replaced where rusted, damaged or deteriorated.',
  },
  {
    id: 'flashings-reroof', ref: 'IRC R908.6', title: 'Flashings on a reroof',
    text: 'On a reroof, flashings are rebuilt to the approved manufacturer\'s installation instructions.',
  },
]

/**
 * St. Louis County, MO: the county's Residential Re-Roofing Checklist for asphalt shingles (2015 IRC as amended by
 * St. Louis County ordinances; checklist dated June 29, 2020). Summaries in plain words with the checklist's own
 * section references. It applies in unincorporated St. Louis County and municipalities that contract with the county
 * for code enforcement; other municipalities may differ. Every item starts unticked.
 */
export const ST_LOUIS_COUNTY_JURISDICTION = 'St. Louis County, MO (2015 IRC as amended; county re-roofing checklist, June 29, 2020)'

export const ST_LOUIS_COUNTY_LIBRARY: CodeItem[] = [
  {
    id: 'slco-tearoff', ref: 'R908.3', title: 'Replacement means removal down to the sheathing',
    text: 'Existing layers of asphalt shingles are removed down to the sheathing before the new roof is installed. A recover is only allowed over a single existing layer that is not deteriorated or water-soaked (R908.3.1.1 items 1 and 3).',
  },
  {
    id: 'slco-deck', ref: 'R905.2.1', title: 'Solidly sheathed deck',
    text: 'Asphalt shingles are fastened to a solidly sheathed deck. Board sheathing with gaps over 1/2 inch needs wood structural panel sheathing over it.',
  },
  {
    id: 'slco-underlayment', ref: 'R905.1.1; Table R905.1.1(2)', title: 'Underlayment',
    text: 'At least Type I (No. 15) underlayment, one layer on slopes of 4:12 and steeper, applied shingle-fashion from the eave with 2-inch side laps and 4-inch end laps offset 6 feet; two layers on slopes from 2:12 to under 4:12.',
  },
  {
    id: 'slco-drip-edge', ref: 'R905.2.8.5', title: 'Drip edge at eaves and rakes',
    text: 'Drip edge at the eaves and rakes, extending at least 2 inches onto the sheathing and 1/4 inch below it, with underlayment over the drip edge at the eaves and under it at the rakes.',
  },
  {
    id: 'slco-flashing', ref: 'R903.2', title: 'Flashing at intersections and penetrations',
    text: 'Corrosion-resistant flashing at roof intersections, changes in slope or direction, walls, chimneys, roof openings and abutments. Existing flashing may stay only where it is in good condition and its installation matches the manufacturer\'s instructions (R903.2; R905.2.8.3; R905.2.8.4; R908.6).',
  },
  {
    id: 'slco-step-flashing', ref: 'R905.2.8.3', title: 'Step flashing at sidewalls',
    text: 'Sidewall flashing is step flashing.',
  },
  {
    id: 'slco-valleys', ref: 'R903.2; SLCO Rev. Ord. R905.2.8.2', title: 'Valley linings',
    text: 'Valley linings are installed to the manufacturer\'s instructions before the shingles, using one of the linings the county lists (metal, mineral-surfaced roll roofing, or for closed valleys smooth roll roofing or self-adhering membrane).',
  },
  {
    id: 'slco-ventilation-reroof', ref: 'R908.3; SLCO Rev. Ord. R908.7', title: 'Ventilation checked with every re-roof',
    text: 'With re-roofing, attic ventilation is verified or made compliant with IRC section 806, and exhaust ducts in the attic are made to discharge directly outside.',
  },
  {
    id: 'slco-ventilation', ref: 'R806.2', title: 'Minimum attic ventilation',
    text: 'At least 1 sq ft of net free ventilation per 150 sq ft of attic, or 1 per 300 with a Class I or II vapor retarder on the warm side of the ceiling and 40% to 50% of the ventilation within 3 feet of the ridge, the rest at the eaves.',
  },
  {
    id: 'slco-baffles', ref: 'R806.3', title: 'Clear air passage at the eaves',
    text: 'In vented insulated attics, a 1-inch clear air passage is kept between the insulation and the roof sheathing, with baffles at the soffit or eave vents.',
  },
  {
    id: 'slco-manufacturer', ref: 'R908.1; R904; R905', title: 'Manufacturer\'s installation instructions',
    text: 'Re-roofing follows the code sections and the manufacturer\'s installation instructions for materials and methods of application.',
  },
  {
    id: 'slco-ice-barrier', ref: 'R905.1.2; SLCO Rev. Ord. Table R301.2(1)', title: 'Ice barrier (county checklist: not required)',
    text: 'The county checklist lists ice barrier underlayment as not required in St. Louis County.',
  },
]

