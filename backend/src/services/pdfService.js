import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '..', '..', 'uploads')

const TYPE_TITLES = {
  // UNIVERSAL
  COMMERCIAL_INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  CERTIFICATE_OF_ORIGIN: 'Certificate of Origin',

  // SEA FREIGHT
  BILL_OF_LADING: 'Bill of Lading',
  TELEX_RELEASE: 'Telex Release',
  SEA_WAYBILL: 'Sea Waybill',

  // AIR FREIGHT
  AIR_WAYBILL: 'Air Waybill',

  // ROAD FREIGHT
  CMR_ROAD_CONSIGNMENT_NOTE: 'CMR Road Consignment Note',
  TRIP_SHEET: 'Trip Sheet',

  // CUSTOMS
  SHIPPING_BILL: 'Export Declaration / Shipping Bill',
  BILL_OF_ENTRY: 'Import Declaration / Bill of Entry',

  // CORE
  DISPATCH_MANIFEST: 'Pre-Journey Dispatch Manifest',
  VEHICLE_INSPECTION: 'Vehicle Inspection Report',
  POD: 'Proof of Delivery (POD)',
  GST_INVOICE: 'GST Final Invoice',
}

/**
 * Generate a professionally formatted PDF for a shipment paperwork document.
 * Returns { fileName, relativePath } where relativePath is suitable for filePath in Document.
 */
export async function generateShipmentPdf({ shipment, type, actor }) {
  const safeType = String(type || 'DOCUMENT').toUpperCase()
  const baseName = safeType.toLowerCase()
  const ts = Date.now()
  const ref = shipment.referenceId || String(shipment._id || '').slice(-8)
  const fileName = `gen_${baseName}_${ref}_${ts}.pdf`
  const absPath = path.join(uploadsDir, fileName)
  const relativePath = `/uploads/${fileName}`

  await fs.promises.mkdir(uploadsDir, { recursive: true })

  const title = TYPE_TITLES[safeType] || safeType.replace(/_/g, ' ')

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const stream = fs.createWriteStream(absPath)

    doc.pipe(stream)

    // Branded header band
    doc
      .rect(40, 40, doc.page.width - 80, 70)
      .fill('#0f172a')

    doc
      .fillColor('#e5e7eb')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('JSHS LOGISTICS', 60, 52, { characterSpacing: 2 })

    doc
      .fillColor('#ffffff')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(title, 60, 72, { width: doc.page.width - 120 })

    doc
      .fillColor('#9ca3af')
      .fontSize(9)
      .font('Helvetica')
      .text('Journey Paperwork Automation • Generated ' + new Date().toLocaleString(), 60, 98)

    // Shipment summary card
    let y = 140
    doc
      .fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Shipment Overview', 40, y)

    y += 12
    doc
      .moveTo(40, y + 5)
      .lineTo(doc.page.width - 40, y + 5)
      .lineWidth(0.5)
      .stroke('#e5e7eb')

    y += 20
    const col1X = 40
    const col2X = doc.page.width / 2

    doc.fontSize(10).font('Helvetica')

    const summary = [
      { label: 'Reference ID', value: shipment.referenceId || 'N/A' },
      { label: 'Status', value: shipment.status || 'N/A' },
      { label: 'Shipment Type', value: shipment.shipmentType || 'KIRANA' },
      { label: 'Customer', value: shipment.customerId?.name || shipment.customerName || 'N/A' },
    ]

    const summary2 = [
      { label: 'Origin', value: shipment.origin?.name || 'N/A' },
      { label: 'Destination', value: shipment.destination?.name || 'N/A' },
      { label: 'Distance (km)', value: shipment.distanceKm != null ? String(shipment.distanceKm) : 'N/A' },
      { label: 'Price (₹)', value: shipment.price != null ? String(shipment.price) : 'N/A' },
    ]

    summary.forEach((row, idx) => {
      const rowY = y + idx * 18
      doc
        .fillColor('#6b7280')
        .fontSize(8)
        .text(row.label.toUpperCase(), col1X, rowY)
      doc
        .fillColor('#111827')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(row.value, col1X, rowY + 9)
    })

    summary2.forEach((row, idx) => {
      const rowY = y + idx * 18
      doc
        .fillColor('#6b7280')
        .fontSize(8)
        .font('Helvetica')
        .text(row.label.toUpperCase(), col2X, rowY)
      doc
        .fillColor('#111827')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(row.value, col2X, rowY + 9)
    })

    // Context-specific section
    y += 4 * 18 + 24

    doc
      .fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(getSectionHeading(safeType), 40, y)

    y += 12
    doc
      .moveTo(40, y + 5)
      .lineTo(doc.page.width - 40, y + 5)
      .lineWidth(0.5)
      .stroke('#e5e7eb')

    y += 18

    const bullets = getSectionBullets(safeType, shipment)
    doc.fontSize(9).font('Helvetica').fillColor('#374151')

    bullets.forEach((line) => {
      doc.circle(46, y + 4, 1.5).fill('#6b7280').fillColor('#374151')
      doc.text(line, 54, y, { width: doc.page.width - 94 })
      y += 16
    })

    // Footer band
    const footerY = doc.page.height - 60
    doc
      .rect(40, footerY, doc.page.width - 80, 0.5)
      .fill('#e5e7eb')

    doc
      .fontSize(7)
      .fillColor('#9ca3af')
      .text('Generated by JSHS Logistics | Confidential & For Internal Use Only', 40, footerY + 8, {
        width: doc.page.width - 80,
        align: 'center',
      })

    doc.end()

    stream.on('finish', () => resolve({ fileName, relativePath }))
    stream.on('error', (err) => reject(err))
  })
}

function getSectionHeading(type) {
  switch (type) {
    case 'DISPATCH_MANIFEST':
    case 'VEHICLE_INSPECTION':
    case 'BOOKING_CONFIRMATION':
      return 'Pre-Journey Dispatch & Safety Checklist'
    case 'E_WAY_BILL':
    case 'CONSIGNMENT_NOTE':
      return 'Transit Compliance & Statutory Details'
    case 'POD':
      return 'Delivery Confirmation & Receiver Acknowledgement'
    case 'GST_INVOICE':
      return 'Billing Summary & Tax Details'
    default:
      return 'Document Details'
  }
}

function getSectionBullets(type, shipment) {
  const common = [
    `Generated for shipment ${shipment.referenceId || ''} created on ${shipment.createdAt ? new Date(shipment.createdAt).toLocaleString() : 'N/A'}.`,
    `Route: ${shipment.origin?.name || 'N/A'} → ${shipment.destination?.name || 'N/A'}.`,
  ]

  switch (type) {
    case 'COMMERCIAL_INVOICE':
      return [
        ...common,
        'Official bill issued by the seller showing goods value, buyer, seller, and payment details.',
        'Used for commercial valuation and customs clearance processes.',
      ]
    case 'PACKING_LIST':
      return [
        ...common,
        'Detailed list of goods, packaging type, weight, and quantity for handling and verification.',
        'Essential for warehouse loading and receipt verification.',
      ]
    case 'CERTIFICATE_OF_ORIGIN':
      return [
        ...common,
        'Certifies the country where the goods were manufactured.',
        'Used for trade agreement compliance and tariff determination.',
      ]
    case 'BILL_OF_LADING':
      return [
        ...common,
        'Legal document proving shipment ownership and contract between shipper and carrier.',
        'Negotiable instrument required for cargo release at sea ports.',
      ]
    case 'TELEX_RELEASE':
      return [
        ...common,
        'Electronic release of goods without physical Bill of Lading.',
        'Facilitates faster cargo handover at destination ports.',
      ]
    case 'SEA_WAYBILL':
      return [
        ...common,
        'Transport document confirming cargo receipt, not negotiable.',
        'Used for established commercial relationships to simplify procedures.',
      ]
    case 'AIR_WAYBILL':
      return [
        ...common,
        'Contract of carriage and receipt of goods for air transport.',
        'Non-negotiable document used for swift air logistics.',
      ]
    case 'CMR_ROAD_CONSIGNMENT_NOTE':
      return [
        ...common,
        'Legal transport document confirming goods carriage by road.',
        'Standardized convention for international road freight across borders.',
      ]
    case 'TRIP_SHEET':
      return [
        ...common,
        'Operational record of vehicle movements, halts, and driver identity.',
        'Used for internal audit and journey performance analysis.',
      ]
    case 'SHIPPING_BILL':
      return [
        ...common,
        'Government declaration filed for exporting goods from a country.',
        'Mandatory statutory compliance document for outbound international cargo.',
      ]
    case 'BILL_OF_ENTRY':
      return [
        ...common,
        'Government declaration for importing goods into a country.',
        'Used for duty assessment and regulatory clearance of inbound cargo.',
      ]
    case 'DISPATCH_MANIFEST':
      return [
        ...common,
        'Includes high-level load summary, origin / destination details, and planned transit distance.',
        'Driver must carry this manifest during the entire line-haul leg as per internal SOP.',
      ]
    case 'VEHICLE_INSPECTION':
      return [
        ...common,
        'Pre-trip checklist covering tyres, brakes, lights, fluids, and insurance validity.',
        'Any red flags must be resolved before the vehicle is cleared for dispatch.',
      ]
    case 'POD':
      return [
        ...common,
        'Confirms successful handover to consignee along with time stamp and remarks.',
        'Forms the basis for post-delivery billing and any damage claims evaluation.',
      ]
    case 'GST_INVOICE':
      return [
        ...common,
        'Summarises freight charges, applicable GST, and net payable amount.',
        'Can be used for input tax credit subject to regulatory guidelines.',
      ]
    default:
      return common
  }
}
