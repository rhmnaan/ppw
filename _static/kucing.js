/*
 * kucing.js
 * Kucing kecil yang sesekali berjalan melintasi bagian bawah SEMUA halaman Jupyter Book.
 * - Berjalan, berhenti sebentar (ekor tetap bergoyang), lalu pergi lagi.
 * - Klik kucingnya: melompat dan mengeluarkan suara.
 * - Pindah halaman: kucing ikut "pindah" (muncul lagi di posisi yang sama dengan animasi acak:
 *   jatuh, pop, salto, mengintip) atau berlari masuk dari sisi layar saat klik Next/Prev.
 * - Kursor bergerak di bagian bawah layar: kucing berlari mengejar, duduk menunggu, lalu melompat.
 * - Tombol kecil di pojok kanan bawah untuk menyalakan/mematikan (pilihan diingat browser).
 * - Mengikuti pengaturan "kurangi animasi" di sistem operasi (kucing tidak muncul).
 * - Mandiri: CSS dan gambar SVG sudah ada di dalam file ini.
 */
(function () {
  'use strict';
  if (window.__kucingAktif) return;
  window.__kucingAktif = true;

  var KUNCI = 'kucing-mati';
  var LEBAR = 96;                          // lebar kucing (px)
  var KECEPATAN = 70;                      // kecepatan jalan (px per detik)
  var JEDA_MIN = 9000, JEDA_MAX = 18000;   // jeda antar kemunculan (ms)
  var MUNCUL_PERTAMA = [1200, 2600];       // kemunculan pertama setelah halaman dibuka (ms)
  var SUARA = ['meong!', 'miaw~', 'prrr...', 'nyam?'];
  var KECEPATAN_KEJAR = 210;               // kecepatan saat mengejar kursor (px per detik)
  var ZONA_KEJAR = 0.5;                    // kursor harus ada di bagian bawah layar ini (0.5 = separuh bawah, 1 = seluruh layar)
  var KURSOR_AKTIF_MS = 2500;              // kursor dianggap masih bergerak selama ini (ms) setelah gerakan terakhir
  var JEDA_LOMPAT = 1300;                  // jeda minimal antar lompatan saat mengejar (ms)
  var KUNCI_PINDAH = 'kucing-pindah';      // penanda pindah halaman (sessionStorage)
  var BATAS_PINDAH_MS = 8000;              // penanda hanya berlaku sesaat setelah klik tautan
  var GAYA_MASUK = ['jatuh', 'pop', 'salto', 'intip'];   // daftar animasi masuk; hapus yang tidak diinginkan
  var TEKS_MASUK = ['halo lagi!', 'halaman baru~', 'hup!', 'sampai!'];

  var kurangiGerak = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (kurangiGerak) return;

  var CSS = [
    '#kc-layer{position:fixed;left:0;bottom:10px;width:100%;height:0;z-index:9990;pointer-events:none}',
    '#kc-cat{position:absolute;left:0;bottom:0;width:' + LEBAR + 'px;height:58px;display:none;will-change:transform}',
    '#kc-cat .kc-flip{width:100%;height:100%;pointer-events:none}',
    '#kc-cat svg{display:block;width:100%;height:100%;overflow:visible;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}',
    '#kc-cat svg *{pointer-events:auto;cursor:pointer}',
    '#kc-cat .kc-leg{transform-box:fill-box;transform-origin:50% 8%;animation:kc-leg-a .55s ease-in-out infinite}',
    '#kc-cat .kc-leg.kc-b{animation-name:kc-leg-b}',
    '#kc-cat .kc-body{animation:kc-bob .275s ease-in-out infinite alternate}',
    '#kc-cat .kc-tail{transform-box:fill-box;transform-origin:100% 100%;animation:kc-tail 1.3s ease-in-out infinite alternate}',
    '#kc-cat .kc-eye{transform-box:fill-box;transform-origin:50% 50%;animation:kc-blink 4.6s infinite}',
    '#kc-cat.kc-lari .kc-leg{animation-duration:.28s}',
    '#kc-cat.kc-lari .kc-body{animation-duration:.14s}',
    '#kc-cat.kc-lari .kc-tail{animation-duration:.45s}',
    '#kc-cat.kc-idle .kc-leg,#kc-cat.kc-idle .kc-body{animation:none}',
    '#kc-cat.kc-idle .kc-tail{animation-duration:.7s}',
    '#kc-cat.kc-jump svg{animation:kc-jump .5s ease-out}',
    '#kc-cat.kc-jatuh svg{animation:kc-jatuh .95s cubic-bezier(.25,.6,.4,1)}',
    '#kc-cat.kc-pop svg{animation:kc-pop .55s ease-out;transform-origin:50% 100%}',
    '#kc-cat.kc-salto svg{animation:kc-salto .8s ease-in-out;transform-origin:50% 60%}',
    '#kc-cat.kc-intip svg{animation:kc-intip .8s ease-out}',
    '#kc-cat .kc-bubble{position:absolute;left:50%;bottom:64px;transform:translate(-50%,4px);padding:3px 11px;border-radius:10px;',
    'background:#fff;color:#1f2328;border:1px solid rgba(0,0,0,.22);font:600 12px/1.4 system-ui,sans-serif;white-space:nowrap;',
    'opacity:0;transition:opacity .2s,transform .2s;pointer-events:none}',
    '#kc-cat .kc-bubble::after{content:"";position:absolute;left:50%;bottom:-5px;width:8px;height:8px;background:#fff;',
    'border-right:1px solid rgba(0,0,0,.22);border-bottom:1px solid rgba(0,0,0,.22);transform:translateX(-50%) rotate(45deg)}',
    '#kc-cat .kc-bubble.kc-on{opacity:1;transform:translate(-50%,0)}',
    '#kc-toggle{position:fixed;right:14px;bottom:14px;z-index:9995;width:34px;height:34px;padding:0;border-radius:50%;',
    'border:1px solid rgba(128,128,128,.5);background:rgba(128,128,128,.2);color:inherit;font-size:16px;line-height:1;',
    'cursor:pointer;opacity:.65;transition:opacity .2s}',
    '#kc-toggle:hover,#kc-toggle:focus-visible{opacity:1}',
    '#kc-toggle:focus-visible{outline:2px solid #3b82f6;outline-offset:2px}',
    '#kc-toggle[aria-pressed="false"]{opacity:.35}',
    '@keyframes kc-leg-a{0%,100%{transform:rotate(-26deg)}50%{transform:rotate(26deg)}}',
    '@keyframes kc-leg-b{0%,100%{transform:rotate(26deg)}50%{transform:rotate(-26deg)}}',
    '@keyframes kc-bob{from{transform:translateY(0)}to{transform:translateY(-1.6px)}}',
    '@keyframes kc-tail{from{transform:rotate(-10deg)}to{transform:rotate(12deg)}}',
    '@keyframes kc-blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}',
    '@keyframes kc-jump{0%,100%{transform:translateY(0)}40%{transform:translateY(var(--kc-tinggi,-26px))}}',
    '@keyframes kc-jatuh{0%{transform:translateY(-75vh);opacity:0}15%{opacity:1}55%{transform:translateY(0)}70%{transform:translateY(-22px)}85%{transform:translateY(0)}92%{transform:translateY(-6px)}100%{transform:translateY(0)}}',
    '@keyframes kc-pop{0%{transform:scale(.05);opacity:0}65%{transform:scale(1.18);opacity:1}100%{transform:scale(1)}}',
    '@keyframes kc-salto{0%{transform:translateY(0) rotate(0)}45%{transform:translateY(-52px) rotate(200deg)}100%{transform:translateY(0) rotate(360deg)}}',
    '@keyframes kc-intip{0%{transform:translateY(120px)}60%{transform:translateY(-10px)}100%{transform:translateY(0)}}',
    '@media print{#kc-layer,#kc-toggle{display:none}}'
  ].join('');

  // Kucing menghadap ke kanan; arah kiri dibuat dengan scaleX(-1).
  var SVG = [
    '<svg viewBox="0 0 120 72" xmlns="http://www.w3.org/2000/svg">',
    '<g class="kc-leg kc-b"><rect x="42" y="44" width="9" height="24" rx="4.5" fill="#c9771f"/><rect x="42" y="63" width="9" height="5" rx="2.5" fill="#fff3df"/></g>',
    '<g class="kc-leg kc-a"><rect x="76" y="44" width="9" height="24" rx="4.5" fill="#c9771f"/><rect x="76" y="63" width="9" height="5" rx="2.5" fill="#fff3df"/></g>',
    '<g class="kc-body">',
    '<g class="kc-tail"><path d="M27 40 C10 40 7 22 17 13" fill="none" stroke="#f0a04b" stroke-width="7" stroke-linecap="round"/>',
    '<path d="M13 18 l5 2 M11 26 l6 1" stroke="#c9771f" stroke-width="3" stroke-linecap="round"/></g>',
    '<ellipse cx="60" cy="40" rx="36" ry="17" fill="#f0a04b"/>',
    '<path d="M44 25 l3 9 M56 23 l3 10 M68 24 l2 9" stroke="#d9822b" stroke-width="4" stroke-linecap="round" fill="none"/>',
    '<path d="M84 21 L86 6 L96 16 Z" fill="#f0a04b"/><path d="M87 18 L88 11 L92 16 Z" fill="#f7c6a3"/>',
    '<path d="M108 21 L106 6 L96 16 Z" fill="#f0a04b"/><path d="M105 18 L104 11 L100 16 Z" fill="#f7c6a3"/>',
    '<circle cx="96" cy="31" r="15" fill="#f0a04b"/>',
    '<ellipse class="kc-eye" cx="102" cy="29" rx="2.3" ry="3.2" fill="#1f2937"/>',
    '<ellipse cx="90" cy="29" rx="2.3" ry="3.2" fill="#1f2937"/>',
    '<path d="M107 34 h4 l-2 2.6 z" fill="#e58a8a"/>',
    '<path d="M104 36 L116 34 M104 38.5 L116 41" stroke="#7a4a1c" stroke-width="1" stroke-linecap="round" fill="none"/>',
    '</g>',
    '<g class="kc-leg kc-a"><rect x="30" y="44" width="9" height="24" rx="4.5" fill="#e8953a"/><rect x="30" y="63" width="9" height="5" rx="2.5" fill="#fff3df"/></g>',
    '<g class="kc-leg kc-b"><rect x="68" y="44" width="9" height="24" rx="4.5" fill="#e8953a"/><rect x="68" y="63" width="9" height="5" rx="2.5" fill="#fff3df"/></g>',
    '</svg>'
  ].join('');

  var layer, cat, flip, bubble, tombol;
  var aktif = true, arah = 1, x = -LEBAR, titikBerhenti = null;
  var keadaan = 'sembunyi', selesaiIdle = 0, terakhir = 0;
  var raf = null, timerMuncul = null, timerBubble = null, timerLompat = null, timerMasuk = null;
  var kursorX = 0, kursorY = 0, kursorWaktu = -1e9, lompatWaktu = 0;

  function acak(a, b) { return a + Math.random() * (b - a); }
  function lebarLayar() { return window.innerWidth || document.documentElement.clientWidth; }

  function tinggiLayar() { return window.innerHeight || document.documentElement.clientHeight; }

  // Kursor "menarik" jika baru saja bergerak dan berada di bagian bawah layar
  function kursorMenarik(now) {
    return now - kursorWaktu < KURSOR_AKTIF_MS && kursorY > tinggiLayar() * (1 - ZONA_KEJAR);
  }

  function lompat(tinggi, teks) {
    cat.style.setProperty('--kc-tinggi', '-' + tinggi + 'px');
    cat.classList.remove('kc-jump');
    void cat.offsetWidth;                   // mulai ulang animasi lompat
    cat.classList.add('kc-jump');
    if (teks) sebutkan(teks, 1500);
    clearTimeout(timerLompat);
    timerLompat = setTimeout(function () { cat.classList.remove('kc-jump'); }, 550);
  }

  function sebutkan(teks, ms) {
    bubble.textContent = teks;
    bubble.classList.add('kc-on');
    clearTimeout(timerBubble);
    timerBubble = setTimeout(function () { bubble.classList.remove('kc-on'); }, ms || 1600);
  }

  function berhenti() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    clearTimeout(timerMuncul);
    timerMuncul = null;
  }

  function jadwalkan(ms) {
    keadaan = 'sembunyi';
    cat.style.display = 'none';
    clearTimeout(timerMuncul);
    timerMuncul = setTimeout(muncul, ms);
  }

  function muncul(paksaArah) {
    if (!aktif) return;
    arah = (paksaArah === 1 || paksaArah === -1) ? paksaArah : (Math.random() < 0.5 ? 1 : -1);
    var vw = lebarLayar();
    x = arah === 1 ? -LEBAR - 10 : vw + 10;
    titikBerhenti = Math.random() < 0.7 ? x + arah * (LEBAR + vw * acak(0.25, 0.7)) : null;
    flip.style.transform = 'scaleX(' + arah + ')';
    cat.classList.remove('kc-idle', 'kc-lari');
    cat.style.transform = 'translate3d(' + x + 'px,0,0)';
    cat.style.display = 'block';
    keadaan = 'jalan';
    terakhir = performance.now();
    raf = requestAnimationFrame(bingkai);
  }

  function bingkai(now) {
    var dt = Math.min((now - terakhir) / 1000, 0.1);
    terakhir = now;
    var vw = lebarLayar();
    var tertarik = kursorMenarik(now);

    // Kursor muncul di dekat kucing -> mulai mengejar
    if (tertarik && keadaan !== 'kejar') {
      keadaan = 'kejar';
      titikBerhenti = null;
      cat.classList.remove('kc-idle');
      if (Math.random() < 0.5) sebutkan('meong?', 1200);
    }

    if (keadaan === 'kejar') {
      if (!tertarik) {
        // Kursor diam/pergi: kucing santai sebentar, lalu lanjut jalan
        keadaan = 'diam';
        selesaiIdle = now + acak(1500, 3000);
        cat.classList.remove('kc-lari');
        cat.classList.add('kc-idle');
      } else {
        var tujuan = Math.max(0, Math.min(vw - LEBAR, kursorX - LEBAR / 2));
        var selisih = tujuan - x;
        if (Math.abs(selisih) > 14) {
          arah = selisih > 0 ? 1 : -1;
          flip.style.transform = 'scaleX(' + arah + ')';
          x += arah * Math.min(KECEPATAN_KEJAR * dt, Math.abs(selisih));
          cat.classList.remove('kc-idle');
          cat.classList.add('kc-lari');
        } else {
          // Sudah di bawah kursor: duduk (ekor bergoyang), sesekali melompat
          cat.classList.remove('kc-lari');
          cat.classList.add('kc-idle');
          if (now - lompatWaktu > JEDA_LOMPAT) {
            var atas = (tinggiLayar() - 68) - kursorY;   // seberapa tinggi kursor di atas kepala kucing
            lompat(Math.max(26, Math.min(90, atas)),
                   Math.random() < 0.4 ? SUARA[Math.floor(Math.random() * SUARA.length)] : null);
            lompatWaktu = now;
          }
        }
      }
    } else if (keadaan === 'jalan') {
      x += arah * KECEPATAN * dt;
      var keluar = (arah === 1 && x > vw + 10) || (arah === -1 && x < -LEBAR - 10);
      var sampai = titikBerhenti !== null &&
        ((arah === 1 && x >= titikBerhenti) || (arah === -1 && x <= titikBerhenti));
      if (keluar) {
        raf = null;
        jadwalkan(acak(JEDA_MIN, JEDA_MAX));
        return;
      }
      if (sampai) {
        keadaan = 'diam';
        titikBerhenti = null;
        selesaiIdle = now + acak(2500, 4800);
        cat.classList.add('kc-idle');
        if (Math.random() < 0.4) sebutkan(SUARA[Math.floor(Math.random() * SUARA.length)], 1800);
      }
    } else if (keadaan === 'diam' && now >= selesaiIdle) {
      keadaan = 'jalan';
      cat.classList.remove('kc-idle');
    }

    cat.style.transform = 'translate3d(' + x + 'px,0,0)';
    raf = requestAnimationFrame(bingkai);
  }

  // Putar animasi masuk (kelas CSS kc-jatuh / kc-pop / kc-salto / kc-intip)
  function mainkan(gaya) {
    var kelas = 'kc-' + gaya;
    cat.classList.remove('kc-jatuh', 'kc-pop', 'kc-salto', 'kc-intip');
    void cat.offsetWidth;                     // mulai ulang animasi
    cat.classList.add(kelas);
    clearTimeout(timerMasuk);
    timerMasuk = setTimeout(function () { cat.classList.remove(kelas); }, 1100);
  }

  // Ambil penanda pindah halaman yang disimpan halaman sebelumnya (sekali pakai)
  function ambilPindah() {
    try {
      var s = sessionStorage.getItem(KUNCI_PINDAH);
      sessionStorage.removeItem(KUNCI_PINDAH);
      if (!s) return null;
      var d = JSON.parse(s);
      return (Date.now() - d.t < BATAS_PINDAH_MS) ? d : null;
    } catch (e) { return null; }
  }

  // Dipanggil di halaman baru setelah klik tautan
  function masukHalaman(p) {
    var vw = lebarLayar();
    if (p.jenis === 'next' || p.jenis === 'prev') {
      // Lanjut/kembali: berlari masuk dari sisi layar sesuai arah membaca
      muncul(p.jenis === 'next' ? 1 : -1);
      sebutkan(p.jenis === 'next' ? 'lanjut~' : 'balik~', 1500);
      return;
    }
    // Tautan lain: kucing "tiba" di posisi yang sama, dengan animasi acak
    var gaya = GAYA_MASUK[Math.floor(Math.random() * GAYA_MASUK.length)];
    var dari = p.tampil ? p.x : acak(0.1, 0.7) * (vw - LEBAR);
    x = Math.max(0, Math.min(vw - LEBAR, dari));
    arah = p.arah === -1 ? -1 : 1;
    titikBerhenti = null;
    flip.style.transform = 'scaleX(' + arah + ')';
    cat.classList.remove('kc-lari');
    cat.classList.add('kc-idle');
    cat.style.transform = 'translate3d(' + x + 'px,0,0)';
    cat.style.display = 'block';
    keadaan = 'diam';
    terakhir = performance.now();
    selesaiIdle = terakhir + 1200 + acak(1500, 2800);
    mainkan(gaya);
    sebutkan(TEKS_MASUK[Math.floor(Math.random() * TEKS_MASUK.length)], 1600);
    raf = requestAnimationFrame(bingkai);
  }

  function atur(nilai) {
    aktif = nilai;
    tombol.setAttribute('aria-pressed', String(nilai));
    tombol.title = nilai ? 'Sembunyikan kucing' : 'Tampilkan kucing';
    try { localStorage.setItem(KUNCI, nilai ? '0' : '1'); } catch (e) { /* abaikan */ }
    if (nilai) { jadwalkan(800); }
    else { berhenti(); cat.style.display = 'none'; bubble.classList.remove('kc-on'); }
  }

  function mulai() {
    var gaya = document.createElement('style');
    gaya.id = 'kc-style';
    gaya.textContent = CSS;
    document.head.appendChild(gaya);

    layer = document.createElement('div');
    layer.id = 'kc-layer';
    layer.innerHTML = '<div id="kc-cat"><div class="kc-bubble"></div><div class="kc-flip">' + SVG + '</div></div>';
    document.body.appendChild(layer);
    cat = layer.firstChild;
    bubble = cat.querySelector('.kc-bubble');
    flip = cat.querySelector('.kc-flip');

    tombol = document.createElement('button');
    tombol.id = 'kc-toggle';
    tombol.type = 'button';
    tombol.textContent = '\uD83D\uDC31';
    tombol.addEventListener('click', function () { atur(!aktif); });
    document.body.appendChild(tombol);

    cat.addEventListener('click', function () {
      lompat(26, SUARA[Math.floor(Math.random() * SUARA.length)]);
    });

    // Lacak kursor (abaikan layar sentuh)
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      kursorX = e.clientX;
      kursorY = e.clientY;
      kursorWaktu = performance.now();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { kursorWaktu = -1e9; });

    // Pindah halaman: simpan status + reaksi singkat; halaman baru memutar animasi masuk
    document.addEventListener('click', function (e) {
      if (!aktif || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      if (a.origin !== location.origin || a.pathname === location.pathname) return;   // hanya tautan internal ke halaman lain
      var jenis = a.matches('.right-next, [rel~="next"]') ? 'next'
                : a.matches('.left-prev, [rel~="prev"]') ? 'prev' : 'lain';
      try {
        sessionStorage.setItem(KUNCI_PINDAH, JSON.stringify({
          t: Date.now(), x: x, arah: arah, tampil: keadaan !== 'sembunyi', jenis: jenis
        }));
      } catch (err) { /* abaikan */ }
      if (keadaan !== 'sembunyi') {
        lompat(34, jenis === 'next' ? 'yuk lanjut!' : jenis === 'prev' ? 'balik dulu~' : 'pindah!');
      }
    }, true);

    var mati = false;
    try { mati = localStorage.getItem(KUNCI) === '1'; } catch (e) { /* abaikan */ }
    aktif = !mati;
    tombol.setAttribute('aria-pressed', String(aktif));
    tombol.title = aktif ? 'Sembunyikan kucing' : 'Tampilkan kucing';
    var pindah = ambilPindah();
    if (aktif && pindah) masukHalaman(pindah);
    else if (aktif) jadwalkan(acak(MUNCUL_PERTAMA[0], MUNCUL_PERTAMA[1]));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();