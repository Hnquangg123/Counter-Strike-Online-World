'use client'

import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { LocaleSwitcher } from './locale-switcher'
import { Wordmark } from './wordmark'

type Item = { key: string; href: string; label: string }

export function MobileNav({
  items,
  label,
  closeLabel,
  children,
}: {
  items: readonly Item[]
  label: string
  closeLabel: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center chamfer-sm text-bone ring-1 ring-inset ring-line-strong lg:hidden"
          aria-label={label}
        >
          {children}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-[min(88vw,380px)] flex-col border-l border-line bg-carbon p-6 focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title asChild>
              <span>
                <Wordmark />
              </span>
            </Dialog.Title>
            <Dialog.Close
              className="flex h-10 w-10 items-center justify-center chamfer-sm text-ash ring-1 ring-inset ring-line-strong hover:text-bone"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <nav className="mt-10 flex flex-col gap-1" aria-label="Mobile">
            {items.map((item, i) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-line py-4 font-display text-lg font-semibold uppercase tracking-[0.18em] text-bone hover:text-flare"
              >
                <span>{item.label}</span>
                <span className="hud-numerals text-xs text-dust">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </Link>
            ))}
            <a
              href="/api/v1/docs"
              className="mt-2 flex items-center justify-between py-4 font-display text-lg font-semibold uppercase tracking-[0.18em] text-ember"
            >
              API
              <span className="hud-numerals text-xs text-dust">v1</span>
            </a>
          </nav>
          <div className="mt-auto">
            <LocaleSwitcher />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
