export default function DropZoneBadgeAccessTag({ tag }: { tag?: string }) {
  return (
    <div
      className={`drop-zone-badge-access-tag p-px rounded-full inline-block`}
      style={{
        backgroundImage: 'linear-gradient(245.22deg, #c200fb 7.97%, #3772ff 49.17%, #3773fe 49.17%, #5ac4be 92.1%)'
      }}
    >
      <div className="py-px px-4 rounded-full uppercase bg-[#1c274f] bg-opacity-90 mobile:text-sm">{tag}</div>
    </div>
  )
}
