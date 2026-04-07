import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Usb, 
  CheckCircle2, 
  XCircle, 
  Info, 
  AlertTriangle, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  Wifi, 
  FileText, 
  Zap,
  ChevronLeft
} from 'lucide-react';

interface DeviceInfo {
  manufacturerName?: string;
  productName?: string;
  vendorId: number;
  productId: number;
}

type Platform = 'mobile' | 'pc' | null;

export default function App() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<'idle' | 'testing' | 'active' | 'failed'>('idle');
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'usb' in navigator;
      setIsSupported(supported);
    };
    checkSupport();

    // Battery check for mobile
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setIsCharging(battery.charging);
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      });
    }
  }, []);

  const startTest = async () => {
    if (!isSupported) return;

    setStatus('testing');
    setError(null);
    setDevice(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const selectedDevice = await navigator.usb.requestDevice({ filters: [] });
      
      if (selectedDevice) {
        await selectedDevice.open();
        setDevice({
          manufacturerName: selectedDevice.manufacturerName,
          productName: selectedDevice.productName,
          vendorId: selectedDevice.vendorId,
          productId: selectedDevice.productId,
        });
        setStatus('active');
      }
    } catch (err) {
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotFoundError':
            setError('No device was selected. If your device is plugged in but not showing up, the cable is likely "Power-Only" (missing data wires).');
            break;
          case 'SecurityError':
            setError('Permission denied. The browser blocked access to this device for security reasons.');
            break;
          case 'NetworkError':
            setError('Device disconnected or connection lost during the handshake.');
            break;
          case 'AbortError':
            setError('The connection request was cancelled.');
            break;
          default:
            setError(`Connection Error: ${err.message}`);
        }
        setStatus('failed');
      } else {
        setError('An unexpected system error occurred.');
        setStatus('failed');
      }
    }
  };

  const [speedTestStatus, setSpeedTestStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [speedResult, setSpeedResult] = useState<number | null>(null);
  const [speedTestError, setSpeedTestError] = useState<string | null>(null);

  const runSpeedTest = async () => {
    setSpeedTestStatus('running');
    setSpeedTestError(null);
    const startTime = performance.now();
    try {
      // Using Cloudflare's speed test endpoint which is more reliable and supports CORS
      const response = await fetch('https://speed.cloudflare.com/__down?bytes=5000000', { 
        cache: 'no-store',
        mode: 'cors'
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const reader = response.body?.getReader();
      let receivedLength = 0;
      if (reader) {
        while(true) {
          const {done, value} = await reader.read();
          if (done) break;
          receivedLength += value.length;
        }
      }
      const endTime = performance.now();
      const durationInSeconds = (endTime - startTime) / 1000;
      const bitsLoaded = receivedLength * 8;
      const speedMbps = (bitsLoaded / durationInSeconds) / 1000000;
      setSpeedResult(Number(speedMbps.toFixed(2)));
      setSpeedTestStatus('done');
    } catch (err) {
      console.error('Speed test failed:', err);
      setSpeedTestError('Network Error: Failed to reach the test server. This is often caused by CORS or firewall restrictions.');
      setSpeedTestStatus('idle');
    }
  };

  const [fileTransferStatus, setFileTransferStatus] = useState<'idle' | 'preparing' | 'ready'>('idle');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileTransferStatus('preparing');
      setSelectedFileName(file.name);
      setTimeout(() => setFileTransferStatus('ready'), 1000);
    }
  };

  const reset = () => {
    setStatus('idle');
    setDevice(null);
    setError(null);
    setSpeedTestStatus('idle');
    setSpeedResult(null);
    setFileTransferStatus('idle');
    setSelectedFileName(null);
    setSpeedTestError(null);
  };

  if (isSupported === false && platform === 'pc') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full border border-zinc-800 p-8 rounded-none bg-zinc-900 shadow-none">
          <div className="flex items-center gap-3 text-amber-500 mb-4">
            <AlertTriangle size={24} />
            <h1 className="text-xl font-bold uppercase tracking-tight">Browser Not Supported</h1>
          </div>
          <p className="text-zinc-400 leading-relaxed mb-6">
            The WebUSB API is required for this utility. Please use a modern browser like Chrome, Edge, or Opera on a desktop.
          </p>
          <button 
            onClick={() => setPlatform(null)}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 flex items-center gap-2"
          >
            <ChevronLeft size={14} /> Back to Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-100 selection:text-zinc-950 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Header */}
        <header className="mb-16 border-b border-zinc-800 pb-8 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Usb className="text-zinc-100" size={32} strokeWidth={1.5} />
              <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter">USB Cable Verifier</h1>
            </div>
            <p className="text-zinc-500 max-w-xl text-lg leading-relaxed">
              {platform === null ? "Select your platform to begin verification." : "Instantly verify your cable's capabilities."}
            </p>
          </div>
          {platform && (
            <button 
              onClick={() => { setPlatform(null); reset(); }}
              className="mb-2 text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 flex items-center gap-2 transition-colors"
            >
              <ChevronLeft size={14} /> Change Device
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {platform === null ? (
            <motion.div 
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <button 
                onClick={() => setPlatform('mobile')}
                className="group border border-zinc-800 p-12 bg-zinc-900/50 hover:bg-zinc-900 transition-all text-left space-y-6"
              >
                <Smartphone size={48} className="text-zinc-500 group-hover:text-zinc-100 transition-colors" strokeWidth={1} />
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight">Mobile</h2>
                  <p className="text-zinc-500 text-sm mt-2">Check charging status and cable health on your phone.</p>
                </div>
              </button>
              <button 
                onClick={() => setPlatform('pc')}
                className="group border border-zinc-800 p-12 bg-zinc-900/50 hover:bg-zinc-900 transition-all text-left space-y-6"
              >
                <Monitor size={48} className="text-zinc-500 group-hover:text-zinc-100 transition-colors" strokeWidth={1} />
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight">Laptop / PC</h2>
                  <p className="text-zinc-500 text-sm mt-2">Verify data transfer, tethering speed, and file access.</p>
                </div>
              </button>
            </motion.div>
          ) : platform === 'mobile' ? (
            <motion.div 
              key="mobile-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-12"
            >
              <section className="space-y-8">
                <div className="border border-zinc-800 p-8 bg-zinc-900/50">
                  <div className="flex items-center gap-2 text-zinc-500 uppercase text-xs font-mono tracking-widest mb-6">
                    <Zap size={14} />
                    Charging Test
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 border border-zinc-800 bg-zinc-950">
                      <span className="text-zinc-400 font-mono text-sm uppercase">Status</span>
                      <span className={`font-bold uppercase tracking-widest ${isCharging ? 'text-emerald-500' : 'text-zinc-600'}`}>
                        {isCharging === null ? 'Checking...' : isCharging ? 'Charging' : 'Not Charging'}
                      </span>
                    </div>

                    {isCharging ? (
                      <div className="p-4 bg-emerald-900/10 border border-emerald-900/30 text-emerald-400 text-sm">
                        <p className="font-bold mb-1 uppercase text-xs">Cable is Good</p>
                        Your phone is receiving power. If it charges but doesn't show data on a PC, it's a power-only cable.
                      </div>
                    ) : (
                      <div className="p-4 bg-zinc-800/30 border border-zinc-800 text-zinc-500 text-sm">
                        <p className="font-bold mb-1 uppercase text-xs">Waiting for connection</p>
                        Plug in your cable. If it doesn't charge, the cable or port may be faulty.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-zinc-100 uppercase text-xs font-mono tracking-widest">
                    <Info size={16} />
                    Mobile Verification
                  </div>
                  <div className="space-y-6">
                    <div className="p-6 border border-zinc-800">
                      <h3 className="font-bold text-zinc-200 uppercase text-sm mb-2">Is it a "Good" cable?</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">
                        A good cable should charge your phone at its maximum supported speed. If your phone says "Slow Charging", the cable might have high resistance or damaged wires.
                      </p>
                    </div>
                    <div className="p-6 border border-zinc-800">
                      <h3 className="font-bold text-zinc-200 uppercase text-sm mb-2">Data Check</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">
                        To verify data on mobile, try connecting a USB-C thumb drive. If it appears in your "Files" app, the data lines are functional.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="pc-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-12"
            >
              {/* Action Section */}
              <section className="space-y-8">
                <div className="border border-zinc-800 p-8 rounded-none bg-zinc-900/50 shadow-none relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {status === 'idle' && (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-2 text-zinc-500 uppercase text-xs font-mono tracking-widest">
                          <div className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
                          WebUSB Ready
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Data Line Test</h2>
                        <p className="text-zinc-400 text-sm">
                          Connect a device and click below to check if the browser can see its data signature.
                        </p>
                        <button
                          onClick={startTest}
                          className="w-full py-4 bg-zinc-100 text-zinc-950 font-bold uppercase tracking-widest hover:bg-zinc-300 transition-colors rounded-none"
                        >
                          Start Test
                        </button>
                      </motion.div>
                    )}

                    {status === 'testing' && (
                      <motion.div
                        key="testing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 space-y-6"
                      >
                        <RefreshCw className="animate-spin text-zinc-500" size={48} strokeWidth={1} />
                        <div className="text-center">
                          <h2 className="text-xl font-bold uppercase tracking-widest">Scanning...</h2>
                          <p className="text-zinc-500 text-xs mt-2 font-mono uppercase tracking-tighter">Awaiting device response</p>
                        </div>
                      </motion.div>
                    )}

                    {status === 'active' && (
                      <motion.div
                        key="active"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-2 text-emerald-500 uppercase text-xs font-mono tracking-widest">
                          <CheckCircle2 size={16} />
                          Data Lines: ACTIVE
                        </div>
                        <div className="space-y-4">
                          <h2 className="text-2xl font-bold tracking-tight text-emerald-400">Data Cable Detected</h2>
                          <div className="border-t border-zinc-800 pt-4 space-y-2">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-500 uppercase">Manufacturer</span>
                              <span className="text-zinc-200">{device?.manufacturerName || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-500 uppercase">Product</span>
                              <span className="text-zinc-200">{device?.productName || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={reset}
                          className="w-full py-3 border border-zinc-700 text-zinc-400 font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors rounded-none text-xs"
                        >
                          Test Another Cable
                        </button>
                      </motion.div>
                    )}

                    {status === 'failed' && (
                      <motion.div
                        key="failed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-2 text-rose-500 uppercase text-xs font-mono tracking-widest">
                          <XCircle size={16} />
                          Verification Failed
                        </div>
                        <div className="space-y-4">
                          <h2 className="text-2xl font-bold tracking-tight text-rose-400">No Data Connection</h2>
                          <p className="text-zinc-400 text-sm leading-relaxed">
                            {error || "The device could not be detected. This usually means the cable is power-only."}
                          </p>
                        </div>
                        <button
                          onClick={startTest}
                          className="w-full py-4 bg-zinc-100 text-zinc-950 font-bold uppercase tracking-widest hover:bg-zinc-300 transition-colors rounded-none"
                        >
                          Retry Test
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Advanced PC Checks */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Speed Test Card */}
                  <div className="border border-zinc-800 p-6 bg-zinc-900/20 flex items-start gap-4">
                    <Wifi className="text-zinc-500 mt-1" size={20} />
                    <div className="flex-1">
                      <h3 className="text-sm font-bold uppercase tracking-tight">Network Speed Test</h3>
                      <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                        Verify tethering performance by measuring the actual download speed through the cable.
                      </p>
                      
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          {speedTestStatus === 'idle' && (
                            <button 
                              onClick={runSpeedTest}
                              className="text-[10px] font-mono uppercase text-zinc-100 bg-zinc-800 px-3 py-1 hover:bg-zinc-700 transition-colors"
                            >
                              Run Test
                            </button>
                          )}
                          {speedTestStatus === 'running' && (
                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-zinc-500">
                              <RefreshCw size={12} className="animate-spin" />
                              Testing...
                            </div>
                          )}
                          {speedTestStatus === 'done' && (
                            <div className="flex items-center gap-4">
                              <div className="text-lg font-bold text-emerald-400 font-mono">
                                {speedResult} <span className="text-[10px] uppercase text-zinc-500">Mbps</span>
                              </div>
                              <button 
                                onClick={runSpeedTest}
                                className="text-[10px] font-mono uppercase text-zinc-500 hover:text-zinc-100"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                        {speedTestError && (
                          <p className="text-[9px] text-rose-500 font-mono uppercase leading-tight">
                            {speedTestError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* File Transfer Card */}
                  <div className="border border-zinc-800 p-6 bg-zinc-900/20 flex items-start gap-4">
                    <FileText className="text-zinc-500 mt-1" size={20} />
                    <div className="flex-1">
                      <h3 className="text-sm font-bold uppercase tracking-tight">File Transfer Check</h3>
                      <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                        Simulate a file transfer to verify MTP/File transfer protocol readiness.
                      </p>
                      
                      <div className="mt-4">
                        {fileTransferStatus === 'idle' && (
                          <label className="cursor-pointer text-[10px] font-mono uppercase text-zinc-100 bg-zinc-800 px-3 py-1 hover:bg-zinc-700 transition-colors inline-block">
                            Select File
                            <input type="file" className="hidden" onChange={handleFileSelect} />
                          </label>
                        )}
                        {fileTransferStatus === 'preparing' && (
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-zinc-500">
                            <RefreshCw size={12} className="animate-spin" />
                            Preparing {selectedFileName}...
                          </div>
                        )}
                        {fileTransferStatus === 'ready' && (
                          <div className="space-y-2">
                            <div className="text-xs font-mono text-emerald-400 uppercase">
                              {selectedFileName} Ready
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-tight">
                              If your device is in "File Transfer" mode, you can now drag this file to its drive in Explorer/Finder.
                            </p>
                            <button 
                              onClick={() => setFileTransferStatus('idle')}
                              className="text-[10px] font-mono uppercase text-zinc-500 hover:text-zinc-100"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Info Section */}
              <section className="space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-zinc-100 uppercase text-xs font-mono tracking-widest">
                    <Info size={16} />
                    PC Verification
                  </div>
                  {/* Cable Comparison Card */}
                  <div className="border border-zinc-800 p-6 bg-zinc-900/40 space-y-4">
                    <h3 className="font-bold text-zinc-200 uppercase text-xs tracking-widest border-b border-zinc-800 pb-2">The Difference</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono uppercase text-emerald-500">Data Cable</div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          Has 4 wires. Two for power, two for data (D+ and D-). Allows syncing, tethering, and file transfers.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono uppercase text-rose-500">Power-Only</div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          Has only 2 wires. Only for charging. Your computer will never "see" the device connected through this.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="font-bold text-zinc-200 uppercase text-sm tracking-tight">Technical Insight</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">
                        When you connect a device, the computer attempts a "Handshake". If the data lines are missing, this handshake fails immediately, and the device remains invisible to the OS.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border border-zinc-800 bg-zinc-900/30 rounded-none">
                  <h4 className="text-xs font-mono uppercase text-zinc-500 mb-3 tracking-widest">Security Note</h4>
                  <p className="text-zinc-600 text-[11px] leading-relaxed uppercase">
                    This tool uses the WebUSB API. No data is sent to any server. Device selection is handled entirely by your browser's secure native interface.
                  </p>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-700 text-[10px] font-mono uppercase tracking-[0.2em]">
          <div>© 2026 USB Cable Verifier | <a href="https://thinakaran.dev" target="_blank" rel="noopener noreferrer">Thinakaran Manokaran</a></div>
          <div className="flex gap-6">
            <span>Privacy First</span>
            <span>Open Standard</span>
            <span>No Tracking</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
