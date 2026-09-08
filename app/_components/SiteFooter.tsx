/** Shared marketing footer — used across the landing, about, and features pages. */
export default function SiteFooter() {
  return (
    <footer className="relative z-20 w-full overflow-hidden border-t border-[#ECEBF3] bg-[#FAFAFE] text-[#33323F] font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-32 w-[800px] max-w-[100vw] h-[300px] bg-[#5F58F4]/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-14 lg:px-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <div className="mb-4 flex items-center gap-2.5">
              <img src="/assets/paypoint-icon.png" alt="Paypoint" className="h-8 w-8 rounded-full" />
              <span className="text-base font-semibold tracking-tight text-[#14132B]">Paypoint</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-[#6C6B7B]">
              The easiest way to get paid online in Nigeria.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {/* PRODUCT */}
            <div className="flex flex-col gap-4">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#9A99A8]">Product</h4>
              <ul className="flex flex-col gap-3">
                <li><a href="/features" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Features</a></li>
                <li><a href="/#how-it-works" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">How it works</a></li>
              </ul>
            </div>
            {/* COMPANY */}
            <div className="flex flex-col gap-4">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#9A99A8]">Company</h4>
              <ul className="flex flex-col gap-3">
                <li><a href="/about" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">About</a></li>
                <li><a href="#" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Blog</a></li>
                <li><a href="#" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Careers</a></li>
                <li><a href="#" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Contact</a></li>
              </ul>
            </div>
            {/* LEGAL */}
            <div className="flex flex-col gap-4">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#9A99A8]">Legal</h4>
              <ul className="flex flex-col gap-3">
                <li><a href="/terms" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Terms</a></li>
                <li><a href="/privacy" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Privacy</a></li>
                <li><a href="/privacy#cookies" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Cookies</a></li>
              </ul>
            </div>
            {/* CONNECT */}
            <div className="flex flex-col gap-4">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#9A99A8]">Connect</h4>
              <ul className="flex flex-col gap-3">
                <li><a href="https://x.com/usepaypoint" target="_blank" rel="noopener noreferrer" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">X</a></li>
                <li><a href="https://www.instagram.com/paypointng/" target="_blank" rel="noopener noreferrer" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Instagram</a></li>
                <li><a href="https://www.linkedin.com/company/paypointng/" target="_blank" rel="noopener noreferrer" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">LinkedIn</a></li>
                <li><a href="https://www.facebook.com/share/19BWUnrKQN/" target="_blank" rel="noopener noreferrer" className="text-sm text-[#33323F] transition-colors hover:text-[#14132B]">Facebook</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-[#ECEBF3] pt-6">
          <p className="text-xs font-medium text-[#9A99A8]">© 2026 Paypoint. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
