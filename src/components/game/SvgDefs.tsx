/** Shared SVG symbol sprite used by brand mark, boxes, and characters. */
export function SvgDefs() {
  return (
    <svg className="svg-defs" aria-hidden="true">
      <symbol id="carrot" viewBox="0 0 100 150">
        <path
          d="M48 37C37 15 43 2 51 0c6 13 7 22 4 36 8-18 19-24 27-19-3 13-12 22-25 26 15-6 28-3 30 5-10 8-22 8-34 1"
          fill="#5fd04e"
        />
        <path
          d="M20 43c15-12 46-9 59 5 8 9-7 49-44 95-3 4-9 2-9-3C19 91 8 53 20 43Z"
          fill="#ff7a1a"
        />
        <path
          d="M22 61c12 4 25 5 39 2M26 82c9 3 17 4 26 3M31 104c5 2 9 2 14 2"
          stroke="#d95608"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </symbol>
      <symbol id="lock" viewBox="0 0 24 24">
        <path
          d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="15" r="1.5" fill="currentColor" />
      </symbol>
      <symbol id="char-root" viewBox="0 0 120 150">
        <path d="M25 68c0-34 16-55 36-55s37 22 37 55v51H25Z" fill="#ff8a1e" />
        <path
          d="M20 68c9-16 26-27 43-27 18 0 33 10 41 27-12-3-21-9-27-18-8 13-28 20-57 18Z"
          fill="#ffd348"
        />
        <circle cx="47" cy="78" r="5" fill="#25122c" />
        <circle cx="77" cy="78" r="5" fill="#25122c" />
        <path
          d="M53 94c6 5 12 5 18 0"
          fill="none"
          stroke="#25122c"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M40 119h43l15 31H22Z" fill="#5e37b5" />
        <path
          d="M43 10c1-10 8-12 12-2 4-11 13-10 13 2 7-8 14-2 9 8"
          fill="none"
          stroke="#62d457"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </symbol>
      <symbol id="char-leek" viewBox="0 0 120 150">
        <path d="M33 61c0-28 13-43 29-43s29 16 29 43v61H33Z" fill="#91e375" />
        <path
          d="M38 20C25 5 35-5 49 13 46-5 62-7 62 13 70-4 85 3 73 19"
          fill="none"
          stroke="#4cad57"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path d="M29 62c15 2 25-3 34-15 8 10 18 15 32 15" fill="#53aa52" />
        <circle cx="49" cy="74" r="5" fill="#25122c" />
        <circle cx="76" cy="74" r="5" fill="#25122c" />
        <path
          d="M53 92c8-4 15-4 22 0"
          fill="none"
          stroke="#25122c"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M42 119h42l18 31H19Z" fill="#ff4fa0" />
      </symbol>
      <symbol id="char-beet" viewBox="0 0 120 150">
        <circle cx="61" cy="73" r="41" fill="#d65092" />
        <path
          d="M52 32c-16-24-4-31 9-8 5-25 20-23 14 3"
          fill="none"
          stroke="#62d457"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle cx="47" cy="70" r="5" fill="#26102b" />
        <circle cx="76" cy="70" r="5" fill="#26102b" />
        <path
          d="M51 87c7 7 14 7 21 0"
          fill="none"
          stroke="#26102b"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M39 110h45l18 40H20Z" fill="#3fb7e9" />
      </symbol>
    </svg>
  )
}

export function Icon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className}>
      <use href={`#${id}`} />
    </svg>
  )
}
