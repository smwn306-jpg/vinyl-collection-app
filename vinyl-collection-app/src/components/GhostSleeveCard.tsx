import { WantListItem } from '../types'

export default function GhostSleeveCard({
  item,
  onAcquire,
  onRemove,
}: {
  item: WantListItem
  onAcquire: (item: WantListItem) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="group relative">
      <div
        className="absolute top-2 bottom-2 right-2 aspect-square rounded-full border border-dashed border-paper-light/30 transition-transform duration-300 ease-out group-hover:translate-x-6"
        style={{ opacity: 0.35 }}
      />

      <div className="relative rounded-sm border border-dashed border-paper-light/30 bg-transparent p-4 pr-10 aspect-square flex flex-col justify-between transition-transform duration-300 ease-out group-hover:-translate-x-1">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-paper-light/40 mb-1">
            {item.catalogNo}
          </p>
          <h3 className="font-display text-xl leading-tight uppercase text-paper-light/80">
            {item.title}
          </h3>
          <p className="font-body text-sm text-paper-light/50 mt-1">{item.artist}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px] text-paper-light/40">
            <span>{item.genre}</span>
            <span>{item.year}</span>
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-paper-light/20 pt-2">
            <span className="font-mono text-[11px] text-paper-light/40">
              {item.listingCount} listings
            </span>
            <span className="font-mono text-sm text-rust font-semibold">
              {item.currency}
              {item.lowestPrice}
            </span>
          </div>
          <button className="w-full text-center font-mono text-[11px] tracking-wider uppercase text-mustard border border-mustard/40 rounded-sm py-1.5 hover:bg-mustard hover:text-ink transition-colors">
            צפה במרקטפלייס
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAcquire(item)}
              className="text-center font-mono text-[10px] tracking-wider uppercase rounded-sm py-1.5 bg-mustard/20 text-mustard hover:bg-mustard/30 transition-colors"
            >
              יש לי כבר
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className="text-center font-mono text-[10px] tracking-wider uppercase rounded-sm py-1.5 border border-paper-light/20 text-paper-light/50 hover:text-paper-light hover:border-paper-light/40 transition-colors"
            >
              הסרה
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
