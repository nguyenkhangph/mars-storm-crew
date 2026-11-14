import { useState } from 'react';
import type { Choices, Luck } from '../engine/types';
import { debrief } from '../engine/debrief';
import type { Lang, Strings } from '../i18n';
import { formatDate } from '../i18n';
import { makeCertificate, saveBlob } from './certificate';
import type { Look } from './assets';

/** Builds the certificate in the browser (nothing is uploaded) and downloads it. */
export function CertButton({ t, lang, name, look, choices, luck, code, won, ending, className = 'btn btn-teal big' }: {
  t: Strings; lang: Lang; name: string; look: Look; choices: Choices; luck: Luck; code: number; won: boolean; ending: string; className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const go = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const now = new Date();
      const blob = await makeCertificate({
        t, name, look, won, ending, code, d: debrief(choices, luck),
        dateText: formatDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())), lang),
      });
      saveBlob(blob, `mars-storm-crew-${code}.png`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" className={className} onClick={go} disabled={busy}>
        🏅 {busy ? t.cert.making : t.cert.button}
      </button>
      {failed && <p className="cert-fail" role="alert">{t.cert.fail}</p>}
    </>
  );
}
