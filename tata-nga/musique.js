/* Mélodie originale « Ngón tay vàng » (les doigts d'or) — style vietnamien.
   Gamme pentatonique Bắc (do-ré-fa-sol-la), đàn bầu (monocorde aux glissandos),
   đàn tranh (cithare pincée) et mõ (petit bloc de bois). 100 % généré par le navigateur. */
(function () {
  var ctx = null, master = null, rev = null, timer = null, playing = false;
  var nextTime = 0, step = 0;
  var BPM = 80, BEAT = 60 / BPM;

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Notes : D4=62 E4=64 G4=67 A4=69 B4=71 D5=74 E5=76 G5=79
  // [note, durée en temps, glissando depuis (demi-tons, optionnel)]
  var MELODY = [
    [69,1],[71,.5],[74,.5],[71,1.5,-2],[69,.5],  [67,1],[64,.5],[67,.5],[69,2,-2],
    [74,1],[76,.5],[74,.5],[71,1],[69,1],        [67,1.5],[64,.5],[62,2,2],
    [62,.5],[64,.5],[67,1],[69,1,-2],[71,1],     [74,1.5],[76,.5],[79,2,-3],
    [76,1],[74,.5],[71,.5],[69,1],[67,.5],[64,.5],[67,1.5],[64,.5],[62,2,2],
    [null,1],[74,.5],[71,.5],[69,1],[71,1],      [67,.5],[69,.5],[64,1],[62,2,-2]
  ];
  var ARP = [50, 57, 62, 64, 62, 57, 55, 57]; // accompagnement đàn tranh (croches)

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.55;
    // petite réverbération (bruit qui décroît)
    rev = ctx.createConvolver();
    var len = ctx.sampleRate * 2.2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    rev.buffer = buf;
    var wet = ctx.createGain(); wet.gain.value = 0.35;
    master.connect(ctx.destination); master.connect(rev); rev.connect(wet); wet.connect(ctx.destination);
  }

  // đàn bầu : sinus doux, glissando d'attaque + vibrato qui s'élargit
  function bau(m, t, dur, bend) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    var f = hz(m);
    if (bend) { o.frequency.setValueAtTime(hz(m + bend), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.18); }
    else o.frequency.setValueAtTime(f, t);
    o2.frequency.value = f * 2;
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.8);
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.04);
    g.gain.setValueAtTime(0.32, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    g2.gain.value = 0.05;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
    [o, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.3); });
  }

  // đàn tranh : corde pincée (Karplus-Strong simplifié via bruit filtré + triangle)
  function tranh(m, t, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = hz(m);
    f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 1.2);
  }

  // mõ : bloc de bois
  function mo(t, hi) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(hi ? 1250 : 820, t); o.frequency.exponentialRampToValueAtTime(hi ? 900 : 600, t + 0.05);
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1);
  }

  // on programme la mélodie note par note, et l'accompagnement par croches en parallèle
  var melIdx = 0, melTime = 0, accTime = 0, accStep = 0;
  function schedule() {
    var horizon = ctx.currentTime + 0.6;
    while (melTime < horizon) {
      var n = MELODY[melIdx], dur = n[1] * BEAT;
      if (n[0] !== null) bau(n[0], melTime, dur, n[2]);
      melTime += dur; melIdx = (melIdx + 1) % MELODY.length;
    }
    while (accTime < horizon) {
      tranh(ARP[accStep % ARP.length], accTime, accStep % 4 === 0 ? 0.13 : 0.08);
      if (accStep % 4 === 0) mo(accTime, false);
      if (accStep % 8 === 6) mo(accTime, true);
      accTime += BEAT / 2; accStep++;
    }
  }

  function start() {
    if (!ctx) setup();
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.55, ctx.currentTime);
    melTime = accTime = ctx.currentTime + 0.1; melIdx = 0; accStep = 0;
    timer = setInterval(schedule, 150); schedule(); playing = true;
  }
  function stop() {
    clearInterval(timer); playing = false;
    if (ctx) { master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
      setTimeout(function () { if (!playing) { ctx.close(); ctx = null; } }, 600); }
  }
  window.TataMusique = {
    toggle: function () { playing ? stop() : start(); return playing; },
    get playing() { return playing; }
  };
})();
