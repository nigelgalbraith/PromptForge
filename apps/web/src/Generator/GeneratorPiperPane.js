import { notifyTicker } from '../utils/ticker.js';
import { button, el } from '../utils/dom.js';

const DEFAULT_PIPER_BASE = '/piper';
const DEFAULT_VOICE_ID = 'en_US-amy-low';




function cleanText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/  +\n/g, '\n')
    .replace(/^\s*text:\s*/i, '');
}





function makeSpeaker() {
  let currentAudio = null;

/** Stops stop. */


  function stop() {
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch {
        // ignore
      }
    }
    currentAudio = null;
  }



  function speak(text, base, voiceId) {
    if (!text || !text.trim()) return Promise.resolve(null);
    const resolvedBase = base || DEFAULT_PIPER_BASE;
    const resolvedVoiceId = voiceId || DEFAULT_VOICE_ID;
    const clean = cleanText(text);
    return fetch(`${resolvedBase}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: clean,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Piper TTS failed (HTTP ${res.status})`);
        return res.arrayBuffer();
      })
      .then((buf) => {
        const blob = new Blob([buf], { type: 'audio/wav' });
        stop();
        currentAudio = new Audio(URL.createObjectURL(blob));
        currentAudio.play();
        return currentAudio;
      });
  }
  return { speak, stop };
}





export function buildGeneratorPiperPane(options = {}) {
  const {
    piperBase = DEFAULT_PIPER_BASE,
    voiceId = DEFAULT_VOICE_ID,
    targetElement = null,
    tickerController = null,
    title = 'Voice (Piper)',
    tickerMsgSpeaking = 'Reading preview aloud.',
    tickerMsgStopped = 'Stopped voice playback.',
    tickerMsgError = 'Piper TTS error.',
    tickerMsgBusy = 'Already speaking…',
    tickerMsgEmpty = 'Nothing to speak.',
  } = options;
  const node = el('div', { className: 'pane-generator-piper' });
  const section = el('section', { className: 'pane pane--generator-piper' });
  const h2 = el('h2', { className: 'pane-title', text: title });
  const details = el('div', { className: 'voice-details' });
  const lab = el('label', { text: 'Voice in use' });
  const voiceDiv = el('div', { className: 'voice-label', text: voiceId });
  details.appendChild(lab);
  details.appendChild(voiceDiv);
  const actions = el('div', { className: 'actions' });
  const btnSay = button({ className: 'primary', text: 'Speak Preview' });
  const btnStop = button({ text: 'Stop' });
  btnStop.disabled = true;
  actions.appendChild(btnSay);
  actions.appendChild(btnStop);
  const flashDiv = el('div', { className: 'flash' });
  section.appendChild(h2);
  section.appendChild(details);
  section.appendChild(actions);
  section.appendChild(flashDiv);
  node.appendChild(section);
  const speaker = makeSpeaker();
  let isSpeaking = false;
  let dotTimer = null;
  let currentAudio = null;



  function setFlash(msg) {
    flashDiv.textContent = msg || '';
  }

/** Starts start dots. */


  function startDots(baseMsg) {
    if (dotTimer) clearInterval(dotTimer);
    let dots = 0;
    dotTimer = setInterval(() => {
      dots = (dots + 1) % 4;
      setFlash(`${baseMsg}${'.'.repeat(dots)}`);
    }, 350);
  }

/** Stops stop dots. */


  function stopDots(msg) {
    if (dotTimer) {
      clearInterval(dotTimer);
      dotTimer = null;
    }
    if (msg) setFlash(msg);
  }



  function resetUI(doneMsg, tickerMsg) {
    isSpeaking = false;
    btnSay.disabled = false;
    btnStop.disabled = true;
    currentAudio = null;
    stopDots(doneMsg);
    if (tickerMsg) notifyTicker(tickerController, tickerMsg, 2500);
  }



  function onAudioDone() {
    if (currentAudio) {
      try {
        currentAudio.removeEventListener('ended', onAudioDone);
        currentAudio.removeEventListener('error', onAudioDone);
      } catch {
        // ignore
      }
    }
    resetUI('Done.', tickerMsgStopped);
  }



  function onSpeakClick() {
    if (isSpeaking) {
      setFlash('Already speaking…');
      notifyTicker(tickerController, tickerMsgBusy, 2000);
      return;
    }
    const text = targetElement ? targetElement.textContent || '' : '';
    if (!text.trim()) {
      setFlash(tickerMsgEmpty);
      notifyTicker(tickerController, tickerMsgEmpty, 2500);
      return;
    }
    isSpeaking = true;
    btnSay.disabled = true;
    btnStop.disabled = false;
    const speakMsg = String(tickerMsgSpeaking).replace('{voice}', voiceId);
    notifyTicker(tickerController, speakMsg, 4000);
    startDots(`Speaking with ${voiceId}`);
    speaker
      .speak(text, piperBase, voiceId)
      .then((audio) => {
        currentAudio = audio;
        if (audio && typeof audio.addEventListener === 'function') {
          audio.addEventListener('ended', onAudioDone);
          audio.addEventListener('error', onAudioDone);
        } else {
          resetUI('Done.', tickerMsgStopped);
        }
      })
      .catch(() => {
        resetUI('Piper error — cannot speak.', null);
        notifyTicker(tickerController, tickerMsgError, 3500);
      });
  }



  function onStopClick() {
    speaker.stop();
    if (currentAudio) {
      try {
        currentAudio.removeEventListener('ended', onAudioDone);
        currentAudio.removeEventListener('error', onAudioDone);
      } catch {
        // ignore
      }
    }
    resetUI('Stopped.', tickerMsgStopped);
  }
  btnSay.addEventListener('click', onSpeakClick);
  btnStop.addEventListener('click', onStopClick);
  return {
    node,
    destroy() {
      try {
        speaker.stop();
      } catch {
        // ignore
      }
      if (dotTimer) clearInterval(dotTimer);
      btnSay.removeEventListener('click', onSpeakClick);
      btnStop.removeEventListener('click', onStopClick);
    },
  };
}
