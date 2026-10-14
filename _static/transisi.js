/*
 * transisi.js
 * Animasi transisi saat pindah halaman di Jupyter Book.
 * - Klik tautan internal: layar "menutup" dengan animasi, lalu halaman baru "membuka".
 * - Pilihan efek: 'tirai' (tirai membuka), 'lingkaran' (dari titik klik), 'garis' (strip bergelombang),
 *   'naik' (tirai gulung), 'pudar' (fade), atau 'acak' (ganti-ganti tiap pindah halaman).
 * - Mengikuti pengaturan "kurangi animasi" di sistem operasi (transisi tidak dipakai).
 * - Mandiri: CSS sudah ada di dalam file ini. Tidak memerlukan library.
 */
(function () {
  'use strict';
  if (window.__transisiAktif) return;
  window.__transisiAktif = true;

  // ================= PENGATURAN =================
  var EFEK = 'tirai';            // 'tirai' | 'lingkaran' | 'garis' | 'naik' | 'pudar' | 'acak'
  var DURASI_TUTUP = 450;        // lama layar menutup di halaman lama (ms)
  var DURASI_BUKA = 650;         // lama layar membuka di halaman baru (ms)
  var WARNA = '#312e81';         // warna utama penutup
  var WARNA_GELAP = '#1e1b4b';   // warna gelap (tepi/gradasi)
  var WARNA_AKSEN = '#a5b4fc';   // garis aksen (efek 'naik')
  var JUMLAH_GARIS = 8;          // jumlah strip (efek 'garis')
  var JEDA_GARIS = 35;           // jeda antar strip (ms)
  // ===============================================

  var DAFTAR = ['tirai', 'lingkaran', 'garis', 'naik', 'pudar'];
  var KUNCI = 'transisi-pindah';
  var BATAS_MS = 8000;           // penanda pindah halaman hanya berlaku sesaat

  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var EASE = 'cubic-bezier(.76,0,.24,1)';
  var CSS = [
    '#tr-layer{position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;overflow:hidden;pointer-events:auto}',

    // --- tirai: dua panel bergeser ke samping
    '.tr-efek-tirai .tr-p{position:absolute;top:0;bottom:0;width:50.6%;',
    'background:repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 3px,transparent 3px 46px),',
    'linear-gradient(90deg,' + WARNA_GELAP + ',' + WARNA + ' 55%,' + WARNA_GELAP + ');',
    'transition:transform var(--tr-d,500ms) ' + EASE + '}',
    '.tr-efek-tirai .tr-kiri{left:0;box-shadow:10px 0 30px rgba(0,0,0,.5)}',
    '.tr-efek-tirai .tr-kanan{right:0;box-shadow:-10px 0 30px rgba(0,0,0,.5)}',
    '.tr-efek-tirai.tr-fase-tutup .tr-kiri,.tr-efek-tirai.tr-fase-buka.tr-go .tr-kiri{transform:translateX(-135%)}',
    '.tr-efek-tirai.tr-fase-tutup .tr-kanan,.tr-efek-tirai.tr-fase-buka.tr-go .tr-kanan{transform:translateX(135%)}',
    '.tr-efek-tirai.tr-fase-tutup.tr-go .tr-p,.tr-efek-tirai.tr-fase-buka .tr-p{transform:none}',

    // --- naik: satu panel naik/turun seperti tirai gulung
    '.tr-efek-naik .tr-n{position:absolute;top:0;left:0;width:100%;height:100%;box-sizing:border-box;',
    'background:linear-gradient(180deg,' + WARNA + ',' + WARNA_GELAP + ');border-bottom:4px solid ' + WARNA_AKSEN + ';',
    'transition:transform var(--tr-d,500ms) ' + EASE + '}',
    '.tr-efek-naik.tr-fase-tutup .tr-n{transform:translateY(-105%)}',
    '.tr-efek-naik.tr-fase-buka .tr-n{transform:none}',
    '.tr-efek-naik.tr-fase-tutup.tr-go .tr-n{transform:none}',
    '.tr-efek-naik.tr-fase-buka.tr-go .tr-n{transform:translateY(105%)}',

    // --- garis: strip vertikal muncul/hilang bergelombang
    '.tr-efek-garis{display:flex}',
    '.tr-efek-garis .tr-g{flex:1 1 0;height:100%;background:linear-gradient(180deg,' + WARNA + ',' + WARNA_GELAP + ');',
    'box-shadow:1px 0 0 ' + WARNA_GELAP + ';transition:transform var(--tr-d,500ms) ' + EASE + ';',
    'transition-delay:calc(var(--i,0)*' + JEDA_GARIS + 'ms)}',
    '.tr-efek-garis.tr-fase-tutup .tr-g{transform:scaleY(0);transform-origin:top}',
    '.tr-efek-garis.tr-fase-buka .tr-g{transform:scaleY(1);transform-origin:bottom}',
    '.tr-efek-garis.tr-fase-tutup.tr-go .tr-g{transform:scaleY(1)}',
    '.tr-efek-garis.tr-fase-buka.tr-go .tr-g{transform:scaleY(0)}',

    // --- lingkaran: menutup = lingkaran membesar dari titik klik; membuka = "lubang" membesar dari titik yang sama
    '.tr-efek-lingkaran .tr-disc{position:absolute;left:var(--x,50%);top:var(--y,50%);width:0;height:0;border-radius:50%;',
    'transform:translate(-50%,-50%);transition:width var(--tr-d,500ms) cubic-bezier(.5,0,.2,1),height var(--tr-d,500ms) cubic-bezier(.5,0,.2,1)}',
    '.tr-efek-lingkaran.tr-fase-tutup .tr-disc{background:' + WARNA + '}',
    '.tr-efek-lingkaran.tr-fase-buka .tr-disc{background:transparent;box-shadow:0 0 0 320vmax ' + WARNA + '}',
    '.tr-efek-lingkaran.tr-go .tr-disc{width:320vmax;height:320vmax}',

    // --- pudar
    '.tr-efek-pudar .tr-f{position:absolute;top:0;left:0;width:100%;height:100%;background:' + WARNA + ';',
    'transition:opacity var(--tr-d,500ms) ease}',
    '.tr-efek-pudar.tr-fase-tutup .tr-f{opacity:0}',
    '.tr-efek-pudar.tr-fase-buka .tr-f{opacity:1}',
    '.tr-efek-pudar.tr-fase-tutup.tr-go .tr-f{opacity:1}',
    '.tr-efek-pudar.tr-fase-buka.tr-go .tr-f{opacity:0}',

    '@media print{#tr-layer{display:none}}'
  ].join('');

  var sedangPindah = false, layerKeluar = null, timerPulih = null;

  function pasangGaya() {
    if (document.getElementById('tr-gaya')) return;
    var g = document.createElement('style');
    g.id = 'tr-gaya';
    g.textContent = CSS;
    (document.head || document.documentElement).appendChild(g);
  }

  function hapus(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  function pilihEfek() {
    if (EFEK === 'acak') return DAFTAR[Math.floor(Math.random() * DAFTAR.length)];
    return DAFTAR.indexOf(EFEK) > -1 ? EFEK : 'tirai';
  }

  // Waktu tambahan akibat jeda antar strip
  function tambahan(efek) { return efek === 'garis' ? (JUMLAH_GARIS - 1) * JEDA_GARIS : 0; }

  function bangun(efek, cx, cy) {
    var L = document.createElement('div');
    L.id = 'tr-layer';
    var isi = '', i;
    if (efek === 'tirai') {
      isi = '<div class="tr-p tr-kiri"></div><div class="tr-p tr-kanan"></div>';
    } else if (efek === 'lingkaran') {
      isi = '<div class="tr-disc"></div>';
      if (!isFinite(cx)) cx = (window.innerWidth || 800) / 2;
      if (!isFinite(cy)) cy = (window.innerHeight || 600) / 2;
      L.style.setProperty('--x', cx + 'px');
      L.style.setProperty('--y', cy + 'px');
    } else if (efek === 'garis') {
      for (i = 0; i < JUMLAH_GARIS; i++) isi += '<div class="tr-g" style="--i:' + i + '"></div>';
    } else if (efek === 'naik') {
      isi = '<div class="tr-n"></div>';
    } else {
      isi = '<div class="tr-f"></div>';
    }
    L.innerHTML = isi;
    return L;
  }

  // fase 'tutup': dari terbuka -> menutup penuh. fase 'buka': dari menutup penuh -> terbuka.
  function putar(L, efek, fase, durasi) {
    L.style.setProperty('--tr-d', durasi + 'ms');
    L.className = 'tr-efek-' + efek + ' tr-fase-' + fase;
    void L.offsetWidth;                        // pastikan keadaan awal tercatat sebelum animasi
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { L.classList.add('tr-go'); });
    });
  }

  // ---------- Halaman lama: animasi menutup, lalu pindah ----------
  function pindah(url, cx, cy) {
    sedangPindah = true;
    var efek = pilihEfek();
    try {
      sessionStorage.setItem(KUNCI, JSON.stringify({ t: Date.now(), efek: efek, x: cx, y: cy }));
    } catch (e) { /* abaikan */ }

    pasangGaya();
    layerKeluar = bangun(efek, cx, cy);
    document.documentElement.appendChild(layerKeluar);
    putar(layerKeluar, efek, 'tutup', DURASI_TUTUP);

    setTimeout(function () { location.href = url; }, DURASI_TUTUP + tambahan(efek) + 40);

    // Pengaman: jika navigasi gagal/dibatalkan, layar dibuka kembali
    timerPulih = setTimeout(function () {
      hapus(layerKeluar);
      layerKeluar = null;
      sedangPindah = false;
      try { sessionStorage.removeItem(KUNCI); } catch (e) { /* abaikan */ }
    }, 5000);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    if (!/^(https?|file):$/.test(a.protocol) || a.origin !== location.origin) return;       // hanya tautan internal
    if (a.pathname === location.pathname && a.search === location.search) return;           // #bagian di halaman yang sama
    e.preventDefault();
    if (sedangPindah) return;
    var cx = e.clientX, cy = e.clientY;
    if (!cx && !cy) {                                                                        // aktivasi lewat keyboard
      var r = a.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
    }
    pindah(a.href, cx, cy);
  });

  // Tombol Back/Forward dengan cache halaman (bfcache): buang sisa penutup
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    clearTimeout(timerPulih);
    hapus(layerKeluar);
    hapus(document.getElementById('tr-layer'));
    hapus(document.getElementById('tr-awal'));
    layerKeluar = null;
    sedangPindah = false;
  });

  // ---------- Halaman baru: mulai tertutup, lalu membuka ----------
  function ambil() {
    try {
      var s = sessionStorage.getItem(KUNCI);
      sessionStorage.removeItem(KUNCI);
      if (!s) return null;
      var d = JSON.parse(s);
      return (Date.now() - d.t < BATAS_MS) ? d : null;
    } catch (e) { return null; }
  }

  function masuk(p) {
    var efek = DAFTAR.indexOf(p.efek) > -1 ? p.efek : 'tirai';
    window.__transisiMs = DURASI_BUKA + tambahan(efek);     // dipakai kucing.js agar masuknya menunggu layar terbuka
    pasangGaya();

    // Sembunyikan halaman sampai penutup terpasang, supaya tidak ada kedipan
    var awal = document.createElement('style');
    awal.id = 'tr-awal';
    awal.textContent = 'html{background:' + WARNA + ' !important}body{visibility:hidden !important}';
    (document.head || document.documentElement).appendChild(awal);

    function mulai() {
      var L = bangun(efek, p.x, p.y);
      document.documentElement.appendChild(L);
      putar(L, efek, 'buka', DURASI_BUKA);
      hapus(awal);                                          // halaman terlihat di balik penutup, lalu penutup membuka
      setTimeout(function () { hapus(L); }, DURASI_BUKA + tambahan(efek) + 300);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
    else mulai();

    setTimeout(function () { hapus(awal); }, 4000);          // pengaman: halaman tidak boleh tersembunyi terus
  }

  var p = ambil();
  if (p) masuk(p);
})();
