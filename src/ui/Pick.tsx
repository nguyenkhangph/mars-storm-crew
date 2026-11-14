import { useState } from 'react';
import type { Strings } from '../i18n';
import { LOOKS, hideMissing, lookUrl, type Look } from './assets';
import { sfx } from './sound';

/** Lets the player choose the Commander's face before the mission. */
export const NAME_MAX = 16;

export function PickCommander({ t, initial, initialName, onBack, onGo }: { t: Strings; initial: Look; initialName: string; onBack: () => void; onGo: (l: Look, name: string) => void }) {
  const [look, setLook] = useState<Look>(initial);
  const [name, setName] = useState(initialName);
  return (
    <div className="pick panel" role="dialog" aria-label={t.ui.pickTitle}>
      <h2>{t.ui.pickTitle}</h2>
      <p className="pick-lead">{t.ui.pickLead}</p>
      <div className="pick-body">
        <div className="pick-hero portrait">
          <img key={look} className="px pop" src={lookUrl(look, 'happy')} alt="" width={192} height={192} onError={hideMissing} />
          <div className="pick-role">{name.trim() || t.roles.commander}</div>
        </div>
        <div className="pick-grid" role="radiogroup" aria-label={t.ui.pickTitle}>
          {LOOKS.map((l, i) => (
            <button
              type="button"
              key={l}
              role="radio"
              aria-checked={l === look}
              aria-label={`${t.roles.commander} ${i + 1}`}
              className={`pick-face${l === look ? ' on' : ''}`}
              onClick={() => { setLook(l); sfx.beep(); }}
            >
              <img className="px" src={lookUrl(l, l === look ? 'happy' : 'neutral')} alt="" width={80} height={80} onError={hideMissing} />
            </button>
          ))}
        </div>
      </div>
      <label className="pick-name">
        <span>{t.ui.nameLabel}</span>
        <input
          type="text"
          value={name}
          maxLength={NAME_MAX}
          placeholder={t.ui.namePlaceholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onGo(look, name.trim()); }}
        />
        <small>{t.ui.nameNote}</small>
      </label>
      <div className="row">
        <button type="button" className="btn btn-teal big" onClick={onBack}>{t.ui.back}</button>
        <button type="button" className="btn btn-amber big" onClick={() => onGo(look, name.trim())} autoFocus>{t.ui.pickGo}</button>
      </div>
    </div>
  );
}
