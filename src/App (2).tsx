import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUpload } from './components/ImageUpload';
import { ColorPicker } from './components/ColorPicker';
import { AppStatus, ImageQuality } from './types';
import { generateMockup } from './services/geminiService';
import { applyWatermark, sendLeadToChat, sendErrorToChat, uploadImageToDrive, resizeImage, recolorLogo } from './services/utils';

// Global type augmentation for AI Studio's API key selection tool
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

const SUCCESS_SOUND_URL = 'https://vanboxelsupply.com/wp-content/uploads/2025/12/vanboxel_whisper.mp3';

const playSuccessSound = () => {
  try {
    const audio = new Audio(SUCCESS_SOUND_URL);
    audio.volume = 0.6;
    audio.play().catch(e => console.warn("Audio play blocked by browser policy:", e));
  } catch (e) {
    console.warn("Could not play success sound", e);
  }
};

const triggerConfetti = () => {
  const confetti = (window as any).confetti;
  if (!confetti) return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#284b63', '#3c6e91', '#ffffff', '#fbbf24']
  };

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};

const SocialShareModal = ({ isOpen, onClose, imageUrl }: { isOpen: boolean; onClose: () => void; imageUrl: string }) => {
  const [copied, setCopied] = useState(false);
  const caption = "Custom underlayment mockup generated with Van Vision by @VanBoxelSupply. #Roofing #Underlayment #RoofingLife #ContractorLife #VanBoxel #JobsiteBranding";

  const handleCopy = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-vb-dark/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
         <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 text-yellow-300 opacity-20">
               <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
            <div className="relative z-10 text-vb-dark">
               <h3 className="text-2xl font-serif font-bold mb-1">Save $400 on Custom Underlayment</h3>
               <p className="font-medium opacity-90 text-sm">
                  Share your design to unlock this exclusive discount applied specifically to your next <strong>Custom Underlayment Order</strong>.
               </p>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 text-vb-dark/60 hover:text-vb-dark transition-colors bg-white/20 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
         </div>

         <div className="p-6 space-y-6 bg-white">
            <div className="flex gap-4">
               <div className="w-8 h-8 rounded-full bg-vb-blue text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
               <div className="flex-1">
                  <h4 className="font-bold text-vb-dark text-sm uppercase mb-1">Download Your Mockup</h4>
                  <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-100">
                     <img src={imageUrl} className="w-12 h-12 object-cover rounded" alt="Thumbnail" />
                     <a href={imageUrl} download="vanvision-mockup.png" className="text-sm font-bold text-vb-blue hover:text-vb-dark underline decoration-2 underline-offset-2">
                        Download Image
                     </a>
                  </div>
               </div>
            </div>

            <div className="flex gap-4">
               <div className="w-8 h-8 rounded-full bg-vb-blue text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
               <div className="flex-1">
                  <h4 className="font-bold text-vb-dark text-sm uppercase mb-1">Copy Caption</h4>
                  <div className="relative group">
                     <textarea readOnly className="w-full h-20 p-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-vb-blue" value={caption}></textarea>
                     <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 bg-white border border-gray-200 shadow-sm text-[10px] font-bold text-vb-dark rounded hover:bg-gray-50 flex items-center gap-1 transition-all">
                       {copied ? (
                         <><svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied</>
                       ) : (
                         <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> Copy</>
                       )}
                     </button>
                  </div>
               </div>
            </div>

            <div className="flex gap-4">
               <div className="w-8 h-8 rounded-full bg-vb-blue text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
               <div className="flex-1">
                  <h4 className="font-bold text-vb-dark text-sm uppercase mb-2">Post & Tag Us</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                     <a href="https://www.instagram.com/vanboxelbuildingsupply/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-2 rounded bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors border border-pink-100 group">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227-1.664-4.771-4.919-4.919-1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        <span className="text-xs font-bold">Instagram</span>
                     </a>
                     <a href="https://www.facebook.com/vanboxeldiscountbuildingsupplies/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        <span className="text-xs font-bold">Facebook</span>
                     </a>
                     <a href="https://twitter.com/Vanboxel_Supply" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-2 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors border border-gray-100">
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                       <span className="text-xs font-bold">X / Twitter</span>
                     </a>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                     Handles: @vanboxelbuildingsupply (IG), @vanboxeldiscountbuildingsupplies (FB), @Vanboxel_Supply (X)
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const QuoteModal = ({ 
  isOpen, 
  onClose, 
  email, 
  logoColor, 
  underlaymentColor,
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  email: string;
  logoColor: string;
  underlaymentColor: string;
  onSubmit: (data: any) => void;
}) => {
  const [projectTimeline, setProjectTimeline] = useState('1-2 weeks');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await onSubmit({
      email,
      companyName,
      phone,
      projectTimeline,
      logoColor,
      underlaymentColor,
      additionalNotes
    });
    
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-vb-dark/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-serif font-bold text-white mb-1">Get Your Custom Quote</h3>
              <p className="text-white/90 text-sm">We'll contact you within 24 hours</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-bold text-sm text-vb-dark mb-2">Your Design:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Logo Color:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: logoColor }}></div>
                  <span className="font-mono text-xs">{logoColor}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-600">Underlayment:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: underlaymentColor }}></div>
                  <span className="font-mono text-xs">{underlaymentColor}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-vb-dark mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-vb-dark focus:outline-none"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-vb-dark mb-2">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-vb-dark focus:outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-vb-dark mb-2">Email *</label>
            <input
              type="email"
              required
              value={email}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600"
            />
          </div>

          <div>
              <label className="block text-sm font-bold text-vb-dark mb-2">Project Timeline *</label>
              <select
                required
                value={projectTimeline}
                onChange={(e) => setProjectTimeline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-vb-dark focus:outline-none"
              >
                <option value="ASAP">ASAP (Rush Order)</option>
                <option value="1-2 weeks">1-2 weeks</option>
                <option value="2-4 weeks">2-4 weeks</option>
                <option value="1-2 months">1-2 months</option>
                <option value="Planning stage">Just Planning</option>
              </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-vb-dark mb-2">Additional Notes</label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-vb-dark focus:outline-none resize-none"
              placeholder="Any special requirements or questions?"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold uppercase text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-6 py-3 font-bold uppercase text-sm text-white transition-colors ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Get Quote →'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center pt-2">
            By submitting, you agree to be contacted by Van Boxel Supply about your custom underlayment order
          </p>
        </form>
      </div>
    </div>
  );
};

const ParallaxCard = ({ children, className, isEnabled = true }: { children?: React.ReactNode, className?: string, isEnabled?: boolean }) => {
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEnabled) return;
    
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const maxRotation = 2; 
    const rotateX = (y / (rect.height / 2)) * -maxRotation; 
    const rotateY = (x / (rect.width / 2)) * maxRotation;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`);
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");
  };

  return (
    <div 
      className={`transition-transform duration-100 ease-out will-change-transform ${className}`}
      style={{ transform, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};

const BlockRevealImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      <style>{`
        @keyframes revealBlock {
          0% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
      `}</style>
      <img 
        src={src} 
        alt={alt} 
        className="max-w-full max-h-full object-contain relative z-0 shadow-xl" 
      />
      <div className="absolute inset-0 w-full h-full z-10 grid grid-cols-10 grid-rows-10 pointer-events-none">
         {Array.from({ length: 100 }).map((_, i) => {
            const delay = (Math.sin(i * 123.45) + 1) / 2 * 0.8; 
            return (
              <div 
                key={i}
                className="bg-gray-50 w-full h-full"
                style={{
                  animation: `revealBlock 0.8s ease-in-out forwards`,
                  animationDelay: `${delay}s`
                }}
              />
            );
         })}
      </div>
    </div>
  );
};

const InteractiveLogo = () => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / 25;
      const y = (e.clientY - innerHeight / 2) / 25;
      setOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative z-10">
      <style>{`
        @keyframes bounce-high {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-80px); }
        }
      `}</style>
      <div style={{ animation: 'bounce-high 1.2s ease-in-out infinite' }}>
        <img 
          src="https://vanboxelsupply.com/wp-content/uploads/2025/12/vanboxel_watermark_transparent_white.png"
          alt="VanBoxel"
          className="w-72 filter invert drop-shadow-2xl"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x * 0.2}deg)`,
            transition: 'transform 0.1s ease-out'
          }}
        />
      </div>
    </div>
  );
};

interface HistoryItem {
  id: number;
  image: string;
  timestamp: string;
  color: string;
}

const App: React.FC = () => {
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoImagePreview, setLogoImagePreview] = useState<string | null>(null);
  const [color, setColor] = useState<string>('#0c0a09'); 
  const [logoColor, setLogoColor] = useState<string>('original');
  const [quality, setQuality] = useState<ImageQuality>('1K');
  const [email, setEmail] = useState<string>('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentMockups, setRecentMockups] = useState<HistoryItem[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initializing VanVision...");
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (status === AppStatus.GENERATING && !isRetrying) {
      const messages = [
        "Unboxing the VanBoxel magic...",
        "Getting the crayons ready...",
        "Andy is drawing your design...",
        "Calculating your massive savings...",
        "Outsmarting the big box stores...",
        "Sharpening the pencils...",
        "Loading premium underlayment...",
        "Sticking it where the sun shines...",
        "Rolling out the savings...",
        "Applying synthetic innovation...",
        "Ensuring maximum durability...",
        "Checking for slip resistance...",
        "Finalizing the VanBoxel advantage..."
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status, isRetrying]);

  useEffect(() => {
    const loadDefaultBaseImage = async () => {
      const targetUrl = 'https://vanboxelsupply.com/wp-content/uploads/2025/12/default-roof-compressed.jpeg';
      const timestamp = new Date().getTime(); 
      const proxies = [
        `https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}&output=jpg`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}&t=${timestamp}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
      ];

      for (const url of proxies) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const blob = await response.blob();
            if (blob.type.startsWith('image/')) {
              const file = new File([blob], "default-roof-model.jpg", { type: blob.type });
              setBaseImage(file);
              setError(null);
              return; 
            }
          }
        } catch (e) {
          console.warn(`Failed to load from proxy: ${url}`, e);
        }
      }
      setError("Could not load default model. Please contact support.");
    };
    loadDefaultBaseImage();
  }, []);

  useEffect(() => {
    if (baseImage) {
      const url = URL.createObjectURL(baseImage);
      setBaseImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [baseImage]);

  useEffect(() => {
    const processLogo = async () => {
      if (logoImage) {
        try {
          const processedB64 = await recolorLogo(logoImage, logoColor);
          setLogoImagePreview(`data:image/png;base64,${processedB64}`);
        } catch (e) {
          console.error("Error processing logo", e);
          const url = URL.createObjectURL(logoImage);
          setLogoImagePreview(url);
        }
      }
    };
    processLogo();
  }, [logoImage, logoColor]);

  const handleLogoUpload = (file: File) => {
    if (status === AppStatus.ERROR) {
        setStatus(AppStatus.IDLE);
        setError(null);
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setStatus(AppStatus.ERROR);
      setError("Invalid logo format. Use JPG, PNG, or WEBP.");
      return;
    }
    setLogoImage(file);
  };
  
  const handleBaseUpload = (file: File) => {
    if (status === AppStatus.ERROR) {
        setStatus(AppStatus.IDLE);
        setError(null);
    }
    setBaseImage(file);
  };

  /**
   * Safe conversion of Data URL to File object.
   * Redesigned to handle Blob URLs as fallbacks to prevent "null reading 1" regex errors.
   */
  const dataURLtoFile = (dataurl: string, filename: string, originalFallback: File): File => {
    if (!dataurl || !dataurl.startsWith('data:')) {
      return originalFallback;
    }
    
    try {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return originalFallback;
      
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, {type: mime});
    } catch (e) {
      console.error("Failed to parse data URL", e);
      return originalFallback;
    }
  }

  const handleGenerate = async () => {
    if (!baseImage || !logoImage || !email) return;

    // Always check for API key as we are now using the Pro model for all generations
    const hasKey = await window.aistudio?.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio?.openSelectKey();
    }

    const STORAGE_KEY = 'vanvision_usage_history';
    const ONE_HOUR = 60 * 60 * 1000;
    const MAX_USAGE = 10; 

    let usageCount = 0;
    let recentTimestamps: number[] = [];

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const timestamps: number[] = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      recentTimestamps = timestamps.filter(t => now - t < ONE_HOUR);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentTimestamps));
      usageCount = recentTimestamps.length;
    } catch (e) {
      console.error("Rate limit check failed", e);
    }

    if (usageCount >= MAX_USAGE) {
      setStatus(AppStatus.ERROR);
      setError("Limit reached (10/hr). Try again later.");
      return;
    }

    setStatus(AppStatus.GENERATING);
    setIsRetrying(false);
    setError(null);
    setResultImage(null);

    try {
      // Safely determine which logo file to use (processed vs original)
      let processedLogoFile = logoImage;
      if (logoImagePreview) {
         processedLogoFile = dataURLtoFile(logoImagePreview, "processed_logo.png", logoImage);
      }

      const result = await generateMockup(baseImage, processedLogoFile, color, quality, (attempt) => {
          setIsRetrying(true);
          setLoadingMessage(`Retrying (Attempt ${attempt}/3)...`);
      });
      
      const watermarkedResult = await applyWatermark(result);
      setLoadingMessage("Saving design...");
      setIsRetrying(false);
      
      sendLeadToChat(email);

      let logoB64 = '';
      try {
        logoB64 = await resizeImage(logoImage, 2048);
      } catch (e) {
        console.warn("Could not encode logo", e);
      }

      try {
        await uploadImageToDrive({
          mockupImage: watermarkedResult,
          logoImage: logoB64,
          email: email
        });
      } catch (uploadError: any) {
        console.error("Upload Error:", uploadError);
        sendErrorToChat(`Drive Upload Failed: ${uploadError.message || uploadError}`, email);
      }
      
      setResultImage(watermarkedResult);
      setStatus(AppStatus.SUCCESS);
      
      triggerConfetti();
      playSuccessSound();

      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        image: watermarkedResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        color: color
      };
      setRecentMockups(prev => [newHistoryItem, ...prev]);
      
      try {
        recentTimestamps.push(Date.now());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentTimestamps));
      } catch (e) {
        console.error("Failed to record usage", e);
      }

    } catch (err: any) {
      console.error(err);
      const rawError = String(err.message || err);
      let msg = 'Something went wrong. Please try again.';
      
      if (rawError === "PRO_MODEL_AUTH_ERROR" || rawError.includes('403') || rawError.includes('Requested entity was not found')) {
        msg = "Authorization Required: Please select a valid API key (paid project required for Pro model generation).";
        window.aistudio?.openSelectKey();
      } else {
        msg = rawError;
      }
      
      sendErrorToChat(msg, email);
      setError(msg);
      setStatus(AppStatus.ERROR);
      setIsRetrying(false);
    }
  };

  const handleQuoteSubmit = async (quoteData: any) => {
    try {
      const message = `
🎯 **NEW VANVISION QUOTE REQUEST** 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Contact Information:**
👤 Company: ${quoteData.companyName}
📧 Email: ${quoteData.email}
📱 Phone: ${quoteData.phone}

**Project Details:**
⏰ Timeline: ${quoteData.projectTimeline}

**Design Specifications:**
🎨 Logo Color: ${quoteData.logoColor}
🏗️ Underlayment Color: ${quoteData.underlaymentColor}

**Additional Notes:**
${quoteData.additionalNotes || 'None provided'}

**Submission Time:** ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 **ACTION:** Contact at ${quoteData.phone} or ${quoteData.email} within 24 hours
📩 **Send quote to:** sales@vanboxelsupply.com
🌐 **Source:** VanVision @ vanboxelsupply.com
      `.trim();
  
      const CHAT_WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAQAOQphUIg/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=ydfE1Z98t_J02pcBLtN-PEGp_L6q-Uk-u2AajLAVufA";
      
      await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text: message })
      });
  
      if (resultImage && logoImagePreview) {
        await uploadImageToDrive({
          mockupImage: resultImage,
          logoImage: logoImagePreview,
          email: quoteData.email
        });
      }
  
      alert(`✅ Quote request sent successfully!\n\nOur team at Van Boxel Supply will contact you at:\n• ${quoteData.phone}\n• ${quoteData.email}\n\nwithin 24 hours with a detailed quote.\n\nQuestions? Email sales@vanboxelsupply.com`);
      
    } catch (error) {
      console.error('Failed to submit quote:', error);
      alert('❌ There was an error submitting your quote.\n\nPlease contact us directly:\n📧 sales@vanboxelsupply.com\n🌐 vanboxelsupply.com');
      
      await sendErrorToChat(
        `VanVision quote submission failed for ${quoteData.email}: ${error}`,
        quoteData.email
      );
    }
  };

  const isFormValid = baseImage && logoImage && email && email.includes('@');

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white">
              <div className="bg-vb-dark text-white py-3 px-6 uppercase font-bold tracking-widest text-sm">
                Configuration
              </div>
              <div className="border border-t-0 border-gray-200 p-4 space-y-5">
                <ImageUpload 
                  label="1. Base Roof Photo"
                  sublabel="Using default construction model"
                  selectedFile={baseImage}
                  onImageSelected={handleBaseUpload}
                  previewUrl={baseImagePreview}
                  locked={true} 
                  heightClass="h-32"
                />
                
                <div>
                  <ImageUpload 
                    label="2. Logo File"
                    sublabel="Upload your transparent logo"
                    selectedFile={logoImage}
                    onImageSelected={handleLogoUpload}
                    previewUrl={logoImagePreview}
                    accept="image/png, image/jpeg, image/webp"
                    heightClass="h-40"
                  />
                  
                  {logoImage && (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                      <ColorPicker
                        label="Logo Color & Clean Up"
                        color={logoColor}
                        onChange={setLogoColor}
                        allowOriginal={true}
                      />
                    </div>
                  )}
                </div>

                <ColorPicker 
                  color={color}
                  onChange={setColor}
                  label="Underlayment Color"
                />

                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold uppercase tracking-wide text-vb-dark">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border-2 border-gray-300 p-3 focus:border-vb-dark focus:outline-none transition-colors text-sm"
                    placeholder="name@example.com"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-4">
                  <button
                    onClick={handleGenerate}
                    disabled={!isFormValid || status === AppStatus.GENERATING}
                    className={`
                      w-full py-4 px-6 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all
                      ${!isFormValid 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : status === AppStatus.GENERATING
                          ? 'bg-vb-dark text-white cursor-wait opacity-80'
                          : 'bg-vb-dark hover:bg-opacity-90 text-white'
                      }
                    `}
                  >
                    {status === AppStatus.GENERATING ? "Processing..." : "Generate Mockup"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
             <div className="bg-white flex flex-col h-full shadow-lg">
              <div className="bg-vb-dark text-white py-3 px-6 uppercase font-bold tracking-widest text-sm flex justify-between items-center">
                <span>Result</span>
                {resultImage && (
                  <button 
                    className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors"
                    onMouseDown={() => setIsComparing(true)}
                    onMouseUp={() => setIsComparing(false)}
                    onMouseLeave={() => setIsComparing(false)}
                  >
                    Compare to Base
                  </button>
                )}
              </div>
              <div className="border border-t-0 border-gray-200 p-1 flex-grow min-h-[400px] relative bg-gray-50 overflow-hidden">
              
                {status === AppStatus.IDLE && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <p className="text-xl font-serif italic">Upload files to begin</p>
                  </div>
                )}

                {status === AppStatus.GENERATING && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-20">
                    <InteractiveLogo />
                    <h3 className="text-xl font-bold text-vb-dark mt-8 animate-pulse">{loadingMessage}</h3>
                  </div>
                )}

                {status === AppStatus.ERROR && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-900 p-10 text-center z-50">
                    <h3 className="text-xl font-bold mb-2">Attention</h3>
                    <p className="max-w-md mb-6">{error}</p>
                    <button onClick={() => setStatus(AppStatus.IDLE)} className="px-6 py-2 bg-white border border-red-200 uppercase text-xs font-bold">Go Back</button>
                  </div>
                )}

                {resultImage && baseImagePreview && (
                  <img 
                    src={baseImagePreview} 
                    alt="Base" 
                    className="absolute inset-0 w-full h-full object-contain z-0"
                  />
                )}

                {resultImage && (
                  <>
                    <ParallaxCard 
                      isEnabled={!isComparing}
                      className={`relative w-full h-full z-10 transition-opacity duration-200 ${isComparing ? 'opacity-0' : 'opacity-100'}`}
                    >
                       <BlockRevealImage src={resultImage} alt="Mockup" />
                    </ParallaxCard>

                    <div className={`absolute inset-0 z-30 pointer-events-none transition-opacity duration-200 ${isComparing ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="absolute bottom-6 left-6 flex flex-col sm:flex-row gap-3">
                        <button 
                          onClick={() => setShowShareModal(true)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 font-bold uppercase text-sm tracking-wider shadow-lg pointer-events-auto transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share & Save $400
                        </button>

                        <button 
                          onClick={() => setShowQuoteModal(true)}
                          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 font-bold uppercase text-sm tracking-wider shadow-lg pointer-events-auto transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Get Quote
                        </button>
                      </div>

                      <a 
                        href={resultImage} 
                        download="vanvision-mockup.png"
                        className="absolute bottom-6 right-6 bg-vb-dark hover:bg-vb-blue text-white px-6 py-3 font-bold uppercase text-sm tracking-wider shadow-lg pointer-events-auto transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Design History Gallery */}
            {recentMockups.length > 0 && (
              <div className="bg-white shadow-lg mt-6">
                <div className="bg-vb-dark text-white py-3 px-6">
                  <h3 className="uppercase font-bold tracking-widest text-sm">
                    Design History ({recentMockups.length} {recentMockups.length === 1 ? 'design' : 'designs'} this session)
                  </h3>
                </div>
                <div className="p-4 border border-t-0 border-gray-200">
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {recentMockups.map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 cursor-pointer group"
                        onClick={() => setResultImage(item.image)}
                        title="Click to view this design"
                      >
                        <div className="w-32 h-32 border-2 border-gray-200 group-hover:border-vb-blue transition-all overflow-hidden bg-gray-50 relative">
                          <img 
                            src={item.image} 
                            alt={`Design from ${item.timestamp}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          {resultImage === item.image && (
                            <div className="absolute inset-0 border-4 border-green-500 pointer-events-none"></div>
                          )}
                        </div>
                        <div className="mt-2 text-center">
                          <div className="text-xs font-bold text-gray-600">{item.timestamp}</div>
                          <div className="text-xs text-gray-500 flex items-center justify-center gap-2 mt-1">
                            <span 
                              className="w-3 h-3 rounded-full border border-gray-300" 
                              style={{ backgroundColor: item.color }}
                            ></span>
                            <span className="capitalize">{item.color === '#ffffff' ? 'White' : item.color === '#0c0a09' ? 'Black' : 'Color'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <SocialShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)}
        imageUrl={resultImage || ''}
      />
      
      <QuoteModal 
        isOpen={showQuoteModal} 
        onClose={() => setShowQuoteModal(false)}
        email={email}
        logoColor={logoColor}
        underlaymentColor={color}
        onSubmit={handleQuoteSubmit}
      />
    </div>
  );
};

export default App;
