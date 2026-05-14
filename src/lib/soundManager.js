/* ════════════════════════════════════════════════════
   SoundManager — efeitos sonoros (chuva, trovão, click, alerta)
   ════════════════════════════════════════════════════ */

class SoundManager {
  constructor() {
    this.ctx = null
    this.rainSrc = null
    this.rainGain = null
    this.thunderTimer = null
    this._pendingRain = null
    this.enabled = true
  }

  _boot() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)()
        if (this._pendingRain) {
          this._startRainNow(this._pendingRain)
          this._pendingRain = null
        }
      } catch (e) { /* noop */ }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  playClick() {
    this._boot()
    if (!this.enabled || !this.ctx) return
    try {
      const o = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      o.connect(g); g.connect(this.ctx.destination)
      o.type = 'sine'
      o.frequency.value = 880
      const t = this.ctx.currentTime
      g.gain.setValueAtTime(0.07, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
      o.start(t); o.stop(t + 0.07)
    } catch (e) { /* noop */ }
  }

  playAlert(score) {
    if (!this.enabled || !this.ctx) return
    try {
      const freqs = score >= 85 ? [880, 660, 440, 330]
        : score >= 75 ? [660, 550, 440]
        : [550, 440]
      freqs.forEach((f, i) => {
        const o = this.ctx.createOscillator()
        const g = this.ctx.createGain()
        o.connect(g); g.connect(this.ctx.destination)
        o.frequency.value = f
        o.type = 'sine'
        const t = this.ctx.currentTime + i * 0.22
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.16, t + 0.05)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
        o.start(t); o.stop(t + 0.2)
      })
    } catch (e) { /* noop */ }
  }

  playThunder() {
    if (!this.enabled || !this.ctx) return
    try {
      const sr = this.ctx.sampleRate
      const dur = 2.5 + Math.random() * 1.8
      const buf = this.ctx.createBuffer(1, Math.floor(sr * dur), sr)
      const d = buf.getChannelData(0)
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.96900 * b2 + w * 0.1538520
        b3 = 0.86650 * b3 + w * 0.3104856
        b4 = 0.55000 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.0168980
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
        d[i] = pink * Math.pow(Math.max(0, 1 - i / d.length), 0.55)
      }
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      const filt = this.ctx.createBiquadFilter()
      filt.type = 'lowpass'
      filt.frequency.value = 160 + Math.random() * 100
      filt.Q.value = 0.8
      const gain = this.ctx.createGain()
      const t = this.ctx.currentTime
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.55 + Math.random() * 0.25, t + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
      src.connect(filt); filt.connect(gain); gain.connect(this.ctx.destination)
      src.start(t)
    } catch (e) { /* noop */ }
  }

  _startRainNow(intensity) {
    this.stopRain()
    if (!this.ctx || !this.enabled) return
    try {
      const sr = this.ctx.sampleRate
      const buf = this.ctx.createBuffer(1, sr * 2, sr)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const f1 = this.ctx.createBiquadFilter()
      f1.type = 'bandpass'
      f1.Q.value = 0.4
      f1.frequency.value = intensity === 'heavy' ? 1800 : intensity === 'normal' ? 1200 : 700
      const gain = this.ctx.createGain()
      const vol = intensity === 'heavy' ? 0.09 : intensity === 'normal' ? 0.055 : 0.025
      gain.gain.setValueAtTime(0, this.ctx.currentTime)
      gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 1.5)
      src.connect(f1); f1.connect(gain); gain.connect(this.ctx.destination)
      src.start()
      this.rainSrc = src
      this.rainGain = gain
    } catch (e) { /* noop */ }
  }

  startRain(intensity) {
    if (intensity === 'none' || !this.enabled) {
      this.stopRain()
      this._pendingRain = null
      return
    }
    if (!this.ctx) { this._pendingRain = intensity; return }
    this._startRainNow(intensity)
  }

  stopRain() {
    this._pendingRain = null
    try {
      if (this.rainGain) {
        this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, this.ctx.currentTime)
        this.rainGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8)
      }
      const src = this.rainSrc
      const gain = this.rainGain
      setTimeout(() => {
        try {
          src && src.stop(); src && src.disconnect()
          gain && gain.disconnect()
        } catch (e) { /* noop */ }
      }, 900)
      this.rainSrc = null
      this.rainGain = null
    } catch (e) { /* noop */ }
  }

  startThunderSchedule() {
    this.stopThunderSchedule()
    const schedule = () => {
      this.thunderTimer = setTimeout(() => {
        this.playThunder()
        schedule()
      }, 5000 + Math.random() * 14000)
    }
    schedule()
  }

  stopThunderSchedule() {
    if (this.thunderTimer) {
      clearTimeout(this.thunderTimer)
      this.thunderTimer = null
    }
  }

  setEnabled(v) {
    this.enabled = v
    if (!v) { this.stopRain(); this.stopThunderSchedule() }
  }
}

/* Singleton — importe `soundMgr` em qualquer lugar */
export const soundMgr = new SoundManager()

/* Mapping condition → audio profile + visual rain intensity */
export const CONDITION_THEME = {
  'Tempestade com Chuva Forte': { darkBg: 'linear-gradient(160deg,#0e1015 0%,#161a22 50%,#0e1218 100%)', lightBg: 'linear-gradient(160deg,#b0bac8 0%,#9aa4b2 50%,#a8b2c0 100%)', rain: 'heavy',  cloud: 0.95, hasThunder: true },
  'Chuva com Trovoadas':        { darkBg: 'linear-gradient(160deg,#0f121c 0%,#161c2c 50%,#0f121e 100%)', lightBg: 'linear-gradient(160deg,#b4bcc8 0%,#a0aab8 50%,#b0bac8 100%)', rain: 'normal', cloud: 0.90, hasThunder: true },
  'Chuva Moderada':             { darkBg: 'linear-gradient(160deg,#101520 0%,#181e2e 50%,#101824 100%)', lightBg: 'linear-gradient(160deg,#c0c8d4 0%,#aab4c4 50%,#b8c4d2 100%)', rain: 'normal', cloud: 0.85, hasThunder: false },
  'Nublado com Chuviscos':      { darkBg: 'linear-gradient(160deg,#121416 0%,#1a1d24 50%,#12161e 100%)', lightBg: 'linear-gradient(160deg,#caced8 0%,#b8bec8 50%,#c4c8d4 100%)', rain: 'light',  cloud: 0.75, hasThunder: false },
  'Parcialmente Nublado':       { darkBg: 'linear-gradient(150deg,#101828 0%,#1a2840 50%,#101e34 100%)', lightBg: 'linear-gradient(150deg,#d8e4f4 0%,#c4d4ea 50%,#ccdaee 100%)', rain: 'none',   cloud: 0.40, hasThunder: false },
  'Ensolarado':                 { darkBg: 'linear-gradient(150deg,#101c36 0%,#162c4e 50%,#101e3c 100%)', lightBg: 'linear-gradient(150deg,#ddeeff 0%,#c8e0ff 50%,#d4e8ff 100%)', rain: 'none',   cloud: 0.10, hasThunder: false },
}

/* Map WMO weather code (Open-Meteo) → condition label */
export function wmoToCondition(code = 0) {
  if (code === 0) return 'Ensolarado'
  if (code <= 2)  return 'Parcialmente Nublado'
  if (code <= 48) return 'Nublado com Chuviscos'
  if (code <= 67) return 'Chuva Moderada'
  if (code <= 82) return 'Chuva Moderada'
  if (code === 95) return 'Chuva com Trovoadas'
  return 'Tempestade com Chuva Forte'
}
