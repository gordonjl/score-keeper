export default function Footer() {
  return (
    <footer className="footer footer-center bg-base-200 text-base-content p-6 mt-auto">
      <aside className="flex flex-col items-center gap-3">
        <img
          src="/PCS_Logo.png.avif"
          alt="Philadelphia Cricket Squash"
          className="h-12 object-contain opacity-70"
        />
        <p className="text-xs text-base-content/60">
          © {new Date().getFullYear()} Portland Community Squash
        </p>
      </aside>
    </footer>
  )
}
