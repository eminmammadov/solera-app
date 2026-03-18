"use client"

import { useEffect, useState } from "react"
import { AnimatePresence } from "motion/react"
import { ShieldAlert, X } from "lucide-react"
import {
  BLOCKED_ACCESS_NOTICE_EVENT,
  BLOCKED_ACCESS_NOTICE_COOKIE_NAME,
  DEFAULT_BLOCKED_ACCESS_MESSAGE,
  sanitizeBlockedAccessMessage,
} from "@/lib/access/blocked-access-notice"
import { ModalSurface } from "@/components/modals/_shared/ModalSurface"

interface BlockedNoticeDetail {
  message?: string
}

const consumeBlockedNoticeCookie = (): string | null => {
  if (typeof document === "undefined") return null

  const encodedKey = encodeURIComponent(BLOCKED_ACCESS_NOTICE_COOKIE_NAME)
  const entries = document.cookie ? document.cookie.split("; ") : []
  const match = entries.find(entry => entry.startsWith(`${encodedKey}=`))
  if (!match) return null

  const [, rawValue = ""] = match.split("=")
  let decodedRawValue = rawValue
  try {
    decodedRawValue = decodeURIComponent(rawValue)
  } catch {
    decodedRawValue = rawValue
  }
  const decodedMessage = sanitizeBlockedAccessMessage(decodedRawValue)

  document.cookie = `${encodedKey}=; Max-Age=0; Path=/; SameSite=Lax`
  return decodedMessage
}

export function BlockedAccessModal() {
  const [noticeState, setNoticeState] = useState(() => {
    const cookieMessage = consumeBlockedNoticeCookie()
    return {
      isOpen: Boolean(cookieMessage),
      message: cookieMessage ?? DEFAULT_BLOCKED_ACCESS_MESSAGE,
    }
  })

  useEffect(() => {
    const handleBlockedNotice = (event: Event) => {
      const customEvent = event as CustomEvent<BlockedNoticeDetail>
      const nextMessage = sanitizeBlockedAccessMessage(customEvent.detail?.message)
      setNoticeState({
        isOpen: true,
        message: nextMessage,
      })
    }

    window.addEventListener(BLOCKED_ACCESS_NOTICE_EVENT, handleBlockedNotice as EventListener)
    return () => {
      window.removeEventListener(BLOCKED_ACCESS_NOTICE_EVENT, handleBlockedNotice as EventListener)
    }
  }, [])

  return (
    <AnimatePresence>
      {noticeState.isOpen && (
        <ModalSurface
          overlayClassName="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm"
          viewportClassName="fixed inset-0 z-[91] flex items-center justify-center pointer-events-none p-4"
          panelClassName="w-full max-w-[420px] overflow-hidden rounded-xl border border-red-500/30 bg-[#121212] shadow-2xl pointer-events-auto"
          panelInitial={{ opacity: 0, scale: 0.96, y: 8 }}
          panelAnimate={{ opacity: 1, scale: 1, y: 0 }}
          panelExit={{ opacity: 0, scale: 0.96, y: 8 }}
          panelTransition={{ type: "spring", duration: 0.35, bounce: 0 }}
          role="dialog"
          ariaModal={true}
          ariaLabel="Blocked access notice"
        >
              <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
                <div className="flex items-center gap-2 text-red-200">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="text-sm font-medium">Access Restricted</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNoticeState(prev => ({ ...prev, isOpen: false }))
                  }
                  className="text-neutral-500 transition-colors hover:text-neutral-200 cursor-pointer"
                  aria-label="Close notice"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 px-4 py-4">
                <p className="text-sm leading-relaxed text-neutral-200">{noticeState.message}</p>

                <button
                  type="button"
                  onClick={() =>
                    setNoticeState(prev => ({ ...prev, isOpen: false }))
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-[#171717] px-4 py-2 text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-500 hover:bg-[#212121] cursor-pointer"
                >
                  I Understand
                </button>
              </div>
        </ModalSurface>
      )}
    </AnimatePresence>
  )
}
