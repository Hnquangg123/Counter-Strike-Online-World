'use client'

import { motion, type Variants } from 'motion/react'
import type * as React from 'react'

const variants: Variants = {
  hidden: { opacity: 0, y: 28, skewY: 1.5 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay },
  }),
}

/** Buy-menu style entrance: slides up with a hint of skew, once, when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      custom={delay}
    >
      {children}
    </Comp>
  )
}

/** Staggers children reveals. */
export function RevealGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ staggerChildren: 0.08 }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}
