import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function matchesStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayMode = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;
  const iosStandalone =
    typeof navigator !== 'undefined' &&
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return displayMode || iosStandalone;
}

export function usePwaStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(matchesStandalone);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onDisplayMode = () => setStandalone(matchesStandalone());
    const onUpdate = () => setUpdateAvailable(true);
    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : null;
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('snow-monitor:update-available', onUpdate);
    media?.addEventListener?.('change', onDisplayMode);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('snow-monitor:update-available', onUpdate);
      media?.removeEventListener?.('change', onDisplayMode);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
    return choice.outcome === 'accepted';
  };

  const reload = () => window.location.reload();
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { online, standalone, canInstall: Boolean(installPrompt), ios, install, updateAvailable, reload };
}
