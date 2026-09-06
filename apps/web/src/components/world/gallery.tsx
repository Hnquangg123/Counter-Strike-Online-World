'use client'

import type { MediaRef } from '@csow/schema'
import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { EntityImage } from '../ui/entity-image'

export function Gallery({
  items,
  title,
  className,
}: {
  items: MediaRef[]
  title: string
  className?: string
}) {
  const [active, setActive] = useState<MediaRef | null>(null)
  if (!items.length) return null

  return (
    <div className={className}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setActive(item)}
              className={cn(
                'hud-brackets group/g block w-full chamfer-sm bg-line-strong p-px text-left transition-all hover:bg-(--accent)',
                i === 0 && items.length > 3 && 'col-span-2 row-span-2',
              )}
              aria-label={item.caption ?? item.alt ?? title}
            >
              <EntityImage
                media={item}
                alt={item.alt ?? item.caption ?? ''}
                fit={item.kind === 'icon' || item.kind === 'hud' ? 'contain' : 'cover'}
                className={cn(
                  'chamfer-sm aspect-square',
                  (item.kind === 'icon' || item.kind === 'hud') && 'p-6',
                )}
                imgClassName="group-hover/g:scale-[1.04]"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog.Root open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-void/90 backdrop-blur" />
          <Dialog.Content
            className="fixed inset-4 z-50 flex flex-col items-center justify-center focus:outline-none md:inset-10"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">{active?.caption ?? title}</Dialog.Title>
            {active && (
              <figure className="flex max-h-full flex-col items-center gap-3">
                <img
                  src={active.url}
                  alt={active.alt ?? active.caption ?? ''}
                  className="max-h-[80vh] max-w-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
                />
                <figcaption className="flex items-center gap-3 text-xs text-ash">
                  {active.caption}
                  {active.credit && <span className="text-dust">· {active.credit}</span>}
                </figcaption>
              </figure>
            )}
            <Dialog.Close
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center chamfer-sm bg-carbon text-ash ring-1 ring-inset ring-line-strong hover:text-bone"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
