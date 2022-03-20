export default function DropZoneBadgeStatusTag({ tag }: { tag?: string }) {
  const tailwindClass = {
    upcoming: 'bg-[rgba(90,196,190,0.2)] border border-[#5ac4be]',
    open: 'bg-[rgba(90,196,190,0.2)] border border-[#5ac4be]',
    closed: 'bg-[rgba(194,0,251,0.2)] border border-[#c200fb]',
    '': ''
  }[tag ?? '']
  return (
    <div
      className={`drop-zone-badge-status-tag inline-block py-px px-4 mobile:px-1 rounded-full uppercase mobile:text-xs ${tailwindClass}`}
    >
      {tag}
    </div>
  )
}
