"use client"

import { ReactNode } from "react"
import { motion } from "motion/react"

type MotionShape = Record<string, number | string>

interface ModalSurfaceProps {
  children: ReactNode
  panelClassName: string
  onBackdropClick?: () => void
  overlayClassName?: string
  viewportClassName?: string
  panelInitial?: MotionShape
  panelAnimate?: MotionShape
  panelExit?: MotionShape
  panelTransition?: {
    type?: "spring" | "tween" | "inertia" | "keyframes"
    duration?: number
    bounce?: number
  }
  role?: string
  ariaModal?: boolean
  ariaLabel?: string
}

const DEFAULT_PANEL_INITIAL: MotionShape = { opacity: 0, scale: 0.95, y: 10 }
const DEFAULT_PANEL_ANIMATE: MotionShape = { opacity: 1, scale: 1, y: 0 }
const DEFAULT_PANEL_EXIT: MotionShape = { opacity: 0, scale: 0.95, y: 10 }

export function ModalSurface({
  children,
  panelClassName,
  onBackdropClick,
  overlayClassName = "fixed inset-0 bg-black/40 backdrop-blur-sm z-50",
  viewportClassName = "fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4",
  panelInitial = DEFAULT_PANEL_INITIAL,
  panelAnimate = DEFAULT_PANEL_ANIMATE,
  panelExit = DEFAULT_PANEL_EXIT,
  panelTransition = { type: "spring", duration: 0.4, bounce: 0 },
  role,
  ariaModal,
  ariaLabel,
}: ModalSurfaceProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onBackdropClick}
        className={overlayClassName}
      />
      <div className={viewportClassName}>
        <motion.div
          initial={panelInitial}
          animate={panelAnimate}
          exit={panelExit}
          transition={panelTransition}
          className={panelClassName}
          role={role}
          aria-modal={ariaModal}
          aria-label={ariaLabel}
        >
          {children}
        </motion.div>
      </div>
    </>
  )
}
