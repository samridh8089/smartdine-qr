import Link from 'next/link';
import { UtensilsCrossed, ShieldCheck, Mail, Phone, MapPin, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 shrink-0 font-sans">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="CleverOps Logo" className="h-9 w-auto object-contain" />
              <span className="font-black text-lg tracking-tight text-white">CleverOps</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Modern QR Code Ordering System, Kitchen KDS & Waiter Calling Portal for fast-paced restaurants & cafes.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Razorpay Verified Secure Gateway</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">Product & Solution</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#features" className="hover:text-emerald-400 transition-colors">Platform Features</Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-emerald-400 transition-colors">Pricing & Subscription</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">About Us</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-400 transition-colors">Restaurant Login</Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-emerald-400 transition-colors">Register Restaurant</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Policies */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/refund-policy" className="hover:text-emerald-400 transition-colors text-emerald-400 font-bold">
                  Cancellation & Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms & Conditions</Link>
              </li>
              <li>
                <Link href="/terms#disclaimer" className="hover:text-emerald-400 transition-colors">Disclaimer</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">Support & Help</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                <a href="mailto:dsoni1281@gmail.com" className="hover:text-white transition-colors">dsoni1281@gmail.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                <a href="tel:+918949266064" className="hover:text-white transition-colors">+91 89492 66064 (Deepak Kumar Soni)</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                <a href="tel:+917742054535" className="hover:text-white transition-colors">+91 77420 54535</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-400">214B 2nd Floor, Riddhi Siddhi Complex, Madhuban, Udaipur, Rajasthan - 313001</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} CleverOps (cleverops.in). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-slate-400 transition-colors">Refunds</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-slate-400 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
