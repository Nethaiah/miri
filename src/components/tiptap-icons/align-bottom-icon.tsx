import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const AlignBottomIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M21 21H3" />
      <rect x="6" y="3" width="12" height="14" rx="1" />
    </svg>
  )
})

AlignBottomIcon.displayName = "AlignBottomIcon"
