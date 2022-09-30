import Icon from '@/components/Icon'
export default function InputLocked() {
  return (
    <div className="absolute text-sm flex flex-col border-1.5 border-[#abc4ff40] text-center justify-center items-center p-2 w-full h-full bg-[#141041] bg-opacity-80 z-10 rounded-xl">
      <Icon className="mb-1" heroIconName="lock-closed" size="sm" />
      Current price is outside your selected range. Single-asset deposit only.
    </div>
  )
}
