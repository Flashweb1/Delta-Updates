import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { isValidArticleId, sanitizePlainText } from '../utils/security'

interface BookmarkContextType {
  bookmarks: string[]
  toggleBookmark: (id: string) => void
  isBookmarked: (id: string) => boolean
  clearBookmarks: () => void
}

const STORAGE_KEY = 'delta-bookmarks'
const MAX_BOOKMARKS = 500

const BookmarkContext = createContext<BookmarkContextType>({
  bookmarks: [],
  toggleBookmark: () => {},
  isBookmarked: () => false,
  clearBookmarks: () => {},
})

function readBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((id) => sanitizePlainText(String(id), 128))
      .filter((id) => isValidArticleId(id))
      .slice(0, MAX_BOOKMARKS)
  } catch {
    return []
  }
}

function writeBookmarks(ids: string[]): void {
  try {
    const safe = ids.filter(isValidArticleId).slice(0, MAX_BOOKMARKS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {
  }
}

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<string[]>(() => readBookmarks())

  useEffect(() => {
    writeBookmarks(bookmarks)
  }, [bookmarks])

  const isBookmarked = useCallback(
    (id: string) => isValidArticleId(id) && bookmarks.includes(id),
    [bookmarks]
  )

  const toggleBookmark = useCallback((id: string) => {
    if (!isValidArticleId(id)) return
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id].slice(0, MAX_BOOKMARKS)
    )
  }, [])

  const clearBookmarks = useCallback(() => setBookmarks([]), [])

  return (
    <BookmarkContext.Provider value={{ bookmarks, toggleBookmark, isBookmarked, clearBookmarks }}>
      {children}
    </BookmarkContext.Provider>
  )
}

export const useBookmarks = () => useContext(BookmarkContext)

export const BookmarksProvider = BookmarkProvider
