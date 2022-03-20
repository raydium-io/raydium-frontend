export default function LoadingCircle({ className }: { className?: string }) {
  return (
    <div className={`lds-roller ${className ?? ''} mobile:scale-75`}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}
