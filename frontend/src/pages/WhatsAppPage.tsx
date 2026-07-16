import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, RefreshCcw, Info } from 'lucide-react';

// ── WhatsApp SVG Icon ─────────────────────────────────────────────────────────

function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.565 4.14 1.548 5.874L0 24l6.337-1.524A11.936 11.936 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.386l-.36-.214-3.762.906.948-3.659-.235-.376A9.818 9.818 0 012.182 12c0-5.419 4.399-9.818 9.818-9.818 5.419 0 9.818 4.399 9.818 9.818 0 5.419-4.399 9.818-9.818 9.818z" />
    </svg>
  );
}

// ── QR Code placeholder ───────────────────────────────────────────────────────

function QRCodePlaceholder() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="rounded"
    >
      {/* Top-left finder */}
      <rect x="4" y="4" width="28" height="28" rx="3" fill="#1a5c45" />
      <rect x="9" y="9" width="18" height="18" rx="1" fill="white" />
      <rect x="13" y="13" width="10" height="10" rx="1" fill="#1a5c45" />

      {/* Top-right finder */}
      <rect x="68" y="4" width="28" height="28" rx="3" fill="#1a5c45" />
      <rect x="73" y="9" width="18" height="18" rx="1" fill="white" />
      <rect x="77" y="13" width="10" height="10" rx="1" fill="#1a5c45" />

      {/* Bottom-left finder */}
      <rect x="4" y="68" width="28" height="28" rx="3" fill="#1a5c45" />
      <rect x="9" y="73" width="18" height="18" rx="1" fill="white" />
      <rect x="13" y="77" width="10" height="10" rx="1" fill="#1a5c45" />

      {/* Data modules */}
      <rect x="40" y="4" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="50" y="4" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="40" y="14" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="56" y="14" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="44" y="24" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="50" y="24" width="6" height="6" rx="1" fill="#1a5c45" />

      <rect x="4" y="40" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="14" y="40" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="4" y="50" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="20" y="50" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="4" y="60" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="14" y="60" width="6" height="6" rx="1" fill="#1a5c45" />

      <rect x="40" y="40" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="50" y="40" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="60" y="40" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="40" y="50" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="56" y="50" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="44" y="60" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="60" y="60" width="6" height="6" rx="1" fill="#1a5c45" />

      <rect x="40" y="70" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="50" y="70" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="60" y="70" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="44" y="80" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="56" y="80" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="40" y="90" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="54" y="90" width="6" height="6" rx="1" fill="#1a5c45" />

      <rect x="70" y="40" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="80" y="40" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="90" y="40" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="70" y="50" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="86" y="50" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="74" y="60" width="6" height="6" rx="1" fill="#1a5c45" />
      <rect x="90" y="60" width="6" height="6" rx="1" fill="#1a5c45" />
    </svg>
  );
}

// ── Steps list ────────────────────────────────────────────────────────────────

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center shrink-0">
        {number}
      </span>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-full">
      {/* Card wrapper */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex">

          {/* ── Left panel ──────────────────────────────────────────────────── */}
          <div className="flex-1 p-10">
            {/* WhatsApp icon badge */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mb-6 shadow-md">
              <WhatsAppIcon size={26} />
            </div>

            {/* Tag */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">
              WhatsApp Coaching
            </p>

            {/* Headline */}
            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-3">
              Meet your coach where<br />you already are.
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-sm">
              Enter the WhatsApp number you use in the Twilio Sandbox, then{' '}
              <span className="text-emerald-600 underline cursor-pointer hover:text-emerald-700 transition-colors">
                join the sandbox
              </span>{' '}
              on your phone.
            </p>

            {/* Phone input */}
            <div className="mb-6">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                WhatsApp Number (E.164)
              </label>
              <input
                type="tel"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-8">
              <StepItem number={1} text="Scan the QR code with WhatsApp" />
              <StepItem number={2} text="Send the pre-filled join message" />
              <StepItem number={3} text="Connect the same number above" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                disabled
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-lg cursor-not-allowed opacity-90 transition-all"
              >
                Connect this number
                <CheckCircle2 size={15} />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                Maybe later
              </button>
            </div>
          </div>

          {/* ── Right panel ─────────────────────────────────────────────────── */}
          <div className="w-[240px] shrink-0 bg-emerald-50/60 border-l border-gray-100 flex flex-col items-center justify-center p-8 gap-4">
            {/* QR code */}
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
              <QRCodePlaceholder />
            </div>

            {/* Label */}
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 mb-1">Scan to join PrepPilot</p>
              <p className="text-[11px] text-gray-500 leading-relaxed text-center">
                Use your phone camera or WhatsApp's QR scanner
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-start gap-2 mt-4 px-1">
          <Info size={13} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            This prototype mirrors the Twilio WhatsApp Sandbox join flow. Add your Twilio credentials in the API layer to send live messages.
          </p>
        </div>
      </div>
    </div>
  );
}
