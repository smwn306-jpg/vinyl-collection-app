export default function VinylArt({ color }: { color: string }) {
  return (
    <div
      className="relative w-full aspect-square rounded-t-sm overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}22, #15181C)` }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: '78%',
          aspectRatio: '1/1',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          background:
            'repeating-radial-gradient(circle at center, #0b0c0e 0px, #0b0c0e 2px, #17181b 3px, #17181b 4px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: '34%',
            aspectRatio: '1/1',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            background: color,
          }}
        >
          <div className="rounded-full bg-[#0b0c0e]" style={{ width: '18%', aspectRatio: '1/1' }} />
        </div>
      </div>
    </div>
  )
}
