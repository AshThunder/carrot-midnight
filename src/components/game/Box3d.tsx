type Box3dProps = {
  open: boolean
  locked?: boolean
  hasCarrot?: boolean
  empty?: boolean
  onClick?: () => void
  asButton?: boolean
  id?: string
}

export function Box3d({
  open,
  locked,
  hasCarrot,
  empty,
  onClick,
  asButton,
  id,
}: Box3dProps) {
  const className = [
    'box-3d',
    open ? 'open' : '',
    locked ? 'locked' : '',
    hasCarrot ? 'has-carrot' : '',
    empty ? 'empty' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      <div className="lid" />
      <div className="front">
        {locked && !open ? (
          <svg>
            <use href="#lock" />
          </svg>
        ) : (
          <b>?</b>
        )}
      </div>
    </>
  )

  if (asButton) {
    return (
      <button className={className} id={id} type="button" onClick={onClick}>
        {inner}
      </button>
    )
  }

  return (
    <div className={className} id={id} onClick={onClick} role={onClick ? 'button' : undefined}>
      {inner}
    </div>
  )
}
