import { Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer footer-center bg-base-200 text-base-content p-4 mt-auto">
      <aside>
        <p className="flex items-center gap-2 text-sm">
          Made with <Heart className="w-4 h-4 fill-error text-error" /> for
          squash players
        </p>
        <p className="text-xs text-base-content/60">
          © {new Date().getFullYear()} Squash Score Keeper
        </p>
      </aside>
    </footer>
  )
}
