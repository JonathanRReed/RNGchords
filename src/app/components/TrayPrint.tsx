interface TrayPrintProps {
  keyCenter: string
  tempo: number
  count: number
}

/** Decorative lettering that belongs to each table: stitched into the cloth, printed on the blueprint, shown on the pad display. */
export function TrayPrint({ keyCenter, tempo, count }: TrayPrintProps) {
  return (
    <p className="tray__print" aria-hidden="true">
      <span data-for="felt">A wrong note played twice is a style.</span>
      <span data-for="velvet">Fortune favors the suspended fourth.</span>
      <span data-for="glass">Fig. 1. {count} {count === 1 ? 'die' : 'dice'}, shown at actual size.</span>
      <span data-for="pads">
        KIT 01 | KEY {keyCenter.toUpperCase()} | {tempo} BPM | {count} PADS
      </span>
    </p>
  )
}
