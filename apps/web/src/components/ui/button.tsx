import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'group/btn relative inline-flex items-center justify-center gap-2 select-none whitespace-nowrap',
    'font-display font-semibold uppercase tracking-[0.14em] transition-all duration-300 ease-(--ease-cso)',
    'chamfer-sm disabled:pointer-events-none disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-ember text-void hover:bg-flare hover:shadow-glow-ember active:translate-y-px',
        outline:
          'bg-transparent text-bone ring-1 ring-inset ring-line-strong hover:ring-ember hover:text-flare hover:bg-ember/5',
        ghost: 'bg-transparent text-ash hover:text-bone hover:bg-bone/5',
        accent: 'bg-(--accent) text-void hover:brightness-110 hover:glow-accent',
        danger: 'bg-blood text-bone hover:bg-hot',
      },
      size: {
        sm: 'h-8 px-3 text-[0.68rem]',
        md: 'h-11 px-5 text-xs',
        lg: 'h-13 px-7 text-sm',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
