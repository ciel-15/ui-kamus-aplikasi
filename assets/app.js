"use strict";

const DATA_URL = "data/kosakata.json";
const CATEGORY_URL = "data/kategori.json";
const KEYS = {
  theme: "kamusKutai_theme_v1",
  favorites: "kamusKutai_favorites_v1",
  history: "kamusKutai_history_v1",
  searches: "kamusKutai_searches_v1",
  name: "kamusKutai_displayName_v1",
  contributions: "kamusKutai_contributions_v1",
};

let words = [];
let categories = [];
let currentPage = "";
let currentFilter = {
  query: "",
  category: "all",
  letter: "",
  favoritesOnly: false,
};
let categorySortAscending = true;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    toast("Penyimpanan browser tidak tersedia.");
    return false;
  }
}
function getFavorites() {
  const raw = readStorage(KEYS.favorites, []);
  if (!Array.isArray(raw)) return [];
  // Accept the simple string-array format used by older prototypes too.
  return raw
    .map((item) =>
      typeof item === "string" ? { id: item.toLowerCase(), at: 0 } : item,
    )
    .filter((item) => item && typeof item.id === "string");
}
function favoriteIds() {
  return new Set(getFavorites().map((item) => item.id));
}
function isFavorite(id) {
  return favoriteIds().has(id);
}
function toggleFavorite(id) {
  const list = getFavorites();
  const existing = list.findIndex((item) => item.id === id);
  if (existing >= 0) {
    list.splice(existing, 1);
    writeStorage(KEYS.favorites, list);
    toast("Kata dihapus dari favorit.");
    return false;
  }
  list.unshift({ id, at: Date.now() });
  writeStorage(KEYS.favorites, list);
  toast("Kata disimpan ke favorit.");
  return true;
}
function getHistory() {
  return readStorage(KEYS.history, []);
}
function addToHistory(id) {
  const history = getHistory().filter((item) => item.id !== id);
  history.unshift({ id, at: Date.now() });
  writeStorage(KEYS.history, history.slice(0, 50));
}
function recordSearch(query) {
  const clean = query.trim();
  if (!clean) return;
  const searches = readStorage(KEYS.searches, []).filter(
    (item) => item.query.toLowerCase() !== clean.toLowerCase(),
  );
  searches.unshift({ query: clean, at: Date.now() });
  writeStorage(KEYS.searches, searches.slice(0, 8));
}
function getWord(idOrName) {
  const target = String(idOrName || "").toLocaleLowerCase("id-ID");
  return words.find(
    (word) =>
      word.id === target || word.kata.toLocaleLowerCase("id-ID") === target,
  );
}
function getCategory(id) {
  return categories.find((category) => category.id === id);
}
function categoryName(id) {
  return getCategory(id)?.nama || "Kosakata";
}
function routeTo(page, params = {}) {
  const url = new URL(page, window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, value);
  });
  window.location.href = url.toString();
}
function toast(message) {
  let el = $("#global-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "global-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.add("hidden"), 2200);
}
function icon(name, extra = "") {
  return `<span class="material-symbols-outlined ${extra}" aria-hidden="true">${escapeHTML(name)}</span>`;
}
function setTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(KEYS.theme, dark ? "dark" : "light");
  } catch {}
  $$("[data-theme-toggle]").forEach((button) => {
    button.setAttribute(
      "aria-label",
      dark ? "Beralih ke tema terang" : "Beralih ke tema gelap",
    );
    button.innerHTML = icon(dark ? "light_mode" : "dark_mode");
  });
}
function initTheme() {
  let stored = "light";
  try {
    stored = localStorage.getItem(KEYS.theme) || "light";
  } catch {}
  setTheme(stored === "dark");
}
function headerHTML() {
  const displayName = escapeHTML(readStorage(KEYS.name, "Penutur Kutai"));
  return `<header class="site-header"><div class="shell header-inner">
    <a class="brand" href="index.html" aria-label="Kamus Kutai, Beranda"><span class="brand-mark">${icon("auto_stories")}</span><span><span class="brand-title">Kamus Kutai</span><span class="brand-sub">Kata Punya Cerita</span></span></a>
    <div class="header-actions"><button class="icon-btn" type="button" data-theme-toggle aria-label="Ganti tema">${icon("dark_mode")}</button><a class="icon-btn" href="profil.html" aria-label="Profil ${displayName}">${icon("person")}</a></div>
  </div></header>`;
}
const navItems = [
  { id: "home", label: "Beranda", href: "index.html", icon: "home" },
  { id: "dictionary", label: "Kamus", href: "kamus.html", icon: "menu_book" },
  {
    id: "categories",
    label: "Kategori",
    href: "kategori.html",
    icon: "grid_view",
  },
  { id: "favorites", label: "Favorit", href: "favorit.html", icon: "bookmark" },
  { id: "about", label: "Tentang", href: "tentang.html", icon: "auto_stories" },
];
function navHTML() {
  return `<nav class="site-nav" aria-label="Navigasi utama">${navItems.map((item) => `<a class="nav-item ${currentPage === item.id ? "active" : ""}" href="${item.href}" ${currentPage === item.id ? 'aria-current="page"' : ""}>${icon(item.icon)}<span>${item.label}</span></a>`).join("")}</nav>`;
}
function shell(content) {
  const root = $("#app");
  root.innerHTML = `${headerHTML()}<main class="shell page">${content}<footer class="footer"><span>© ${new Date().getFullYear()} Kamus Kutai · Arsip digital komunitas</span><span><a class="link" href="profil.html">Profil</a> · <a class="link" href="riwayat.html">Riwayat</a></span></footer></main>${navHTML()}`;
  initTheme();
}
function favoriteButton(word, compact = false) {
  const selected = isFavorite(word.id);
  return `<button type="button" class="btn ${selected ? "btn-soft" : "btn-quiet"}" data-favorite-action="${word.id}" aria-pressed="${selected}" aria-label="${selected ? "Hapus dari" : "Simpan ke"} favorit: ${escapeHTML(word.kata)}">${icon(selected ? "bookmark_added" : "bookmark")}${compact ? "" : `<span>${selected ? "Tersimpan" : "Favorit"}</span>`}</button>`;
}
function wordCard(word, options = {}) {
  const compact = Boolean(options.compact);
  return `<article class="card word-card" data-word-card="${word.id}">
    <div class="word-top"><div><a href="detail.html?kata=${encodeURIComponent(word.id)}"><h3 class="word-name">${escapeHTML(word.kata)}</h3></a><div class="phonetic">/${escapeHTML(word.pelafalan || word.kata)}/ · ${escapeHTML(word.kelasKata || "lema")}</div></div>${favoriteButton(word, true)}</div>
    <div class="pill-row"><span class="pill accent">${escapeHTML(categoryName(word.kategori))}</span><span class="pill">${escapeHTML(word.dialek || "Kutai")}</span></div>
    <p class="meaning"><strong>Makna:</strong> ${escapeHTML(word.arti)}</p>
    ${compact ? "" : `<div class="example"><em>“${escapeHTML(word.contoh || "Belum ada contoh kalimat.")}”</em>${escapeHTML(word.terjemahan || "")}</div>`}
    <div class="card-actions"><a class="btn btn-primary" href="detail.html?kata=${encodeURIComponent(word.id)}">Lihat makna ${icon("arrow_forward")}</a><span class="grow"></span><button class="btn btn-quiet" type="button" data-speak="${word.id}" aria-label="Dengarkan ${escapeHTML(word.kata)}">${icon("volume_up")}</button></div>
  </article>`;
}
function emptyState(
  title,
  message,
  link = "kamus.html",
  label = "Jelajahi Kamus",
) {
  return `<div class="empty">${icon("auto_stories")}<h3>${escapeHTML(title)}</h3><p>${escapeHTML(message)}</p><a class="btn btn-primary" href="${link}">${escapeHTML(label)}</a></div>`;
}
function renderHome() {
  const chosen = ["etam", "kula", "awang", "hanyut"]
    .map(getWord)
    .filter(Boolean);
  const count = words.length;
  const cats = categories
    .filter((cat) => words.some((word) => word.kategori === cat.id))
    .slice(0, 6);
  const recent = readStorage(KEYS.searches, []).slice(0, 5);
  shell(`<section class="hero"><div class="hero-copy"><span class="eyebrow">Arsip Lisan Kutai</span><h1>Kenali Bahasa,<br>Kenali Budaya.</h1><p class="lead">Temukan makna kata, ungkapan, dan cerita dari bahasa Kutai di tepian Sungai Mahakam.</p>
    <form class="searchbar" id="home-search">${icon("search")}<input id="home-query" type="search" placeholder="Cari kata bahasa Kutai…" aria-label="Cari kata bahasa Kutai"><button class="btn btn-primary" type="submit">Cari</button></form>
    <div class="pill-row" style="margin-top:14px"><span class="pill">${count} lema contoh</span><span class="pill">${categories.length} rumpun tema</span><span class="pill">Data tersimpan lokal</span></div></div></section>
    <section class="section"><div class="section-head"><div><span class="eyebrow">Pilihan editor</span><h2 class="section-title">Kata Punya Cerita</h2></div><a class="link" href="kamus.html">Lihat semua →</a></div><div class="grid">${chosen.map((word) => wordCard(word, { compact: true })).join("")}</div></section>
    <section class="section"><div class="section-head"><div><span class="eyebrow">Struktur bahasa</span><h2 class="section-title">Jelajahi Kategori</h2></div><a class="link" href="kategori.html">Semua kategori →</a></div><div class="grid">${cats.map((cat) => categoryCard(cat)).join("")}</div></section>
    <section class="section grid two"><div class="card"><span class="eyebrow">Riwayat pencarian</span><h2 class="section-title">Terakhir dicari</h2>${recent.length ? `<div class="pill-row" style="margin-top:15px">${recent.map((item) => `<a class="filter-chip" href="kamus.html?q=${encodeURIComponent(item.query)}">${escapeHTML(item.query)}</a>`).join("")}</div>` : `<p class="lead">Pencarian yang kamu lakukan akan muncul di sini.</p>`}</div><div class="card"><span class="eyebrow">Warisan tutur</span><h2 class="section-title">Bahasa Menyimpan Cerita</h2><p class="meaning">Setiap kata dapat merekam kebiasaan, lingkungan, dan ingatan masyarakat. Bantu memperkaya arsip dengan mengusulkan kosakata yang kamu kenal.</p><a class="btn btn-soft" href="tentang.html#sumbang" style="margin-top:14px">Sumbang kosakata ${icon("arrow_forward")}</a></div></section>`);
  $("#home-search")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = $("#home-query").value.trim();
    recordSearch(query);
    routeTo("kamus.html", { q: query });
  });
}
function categoryCard(cat) {
  const count = words.filter((word) => word.kategori === cat.id).length;
  return `<a class="card category-card" href="kamus.html?kategori=${encodeURIComponent(cat.id)}"><div><div class="category-icon">${icon(cat.ikon || "auto_stories")}</div><span class="category-count">${count} lema</span><h3>${escapeHTML(cat.nama)}</h3><p class="meaning">${escapeHTML(cat.deskripsi)}</p></div><span class="link">Buka kategori ${icon("arrow_forward")}</span></a>`;
}
function renderDictionary() {
  const params = new URLSearchParams(window.location.search);
  currentFilter.query = params.get("q") || "";
  currentFilter.category = params.get("kategori") || "all";
  shell(`<span class="eyebrow">Leksikon pilihan</span><h1>Kamus Kutai</h1><p class="lead">Cari lema, arti, dialek, atau contoh kalimat. Semua kosakata dimuat dari file data terpisah.</p>
    <div class="toolbar"><input type="search" id="dictionary-search" placeholder="Cari lema, makna, contoh…" value="${escapeHTML(currentFilter.query)}" aria-label="Cari kosakata"><select id="dictionary-category" aria-label="Filter kategori"><option value="all">Semua kategori</option>${categories.map((cat) => `<option value="${cat.id}" ${currentFilter.category === cat.id ? "selected" : ""}>${escapeHTML(cat.nama)}</option>`).join("")}</select><select id="dictionary-sort" aria-label="Urutan kosakata"><option value="az">A–Z</option><option value="za">Z–A</option></select></div>
    <div class="filter-row" id="letter-filters"><button class="filter-chip active" data-letter="">Semua huruf</button>${[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter) => `<button class="filter-chip" data-letter="${letter}">${letter}</button>`).join("")}</div>
    <div class="section-head"><span class="category-count" id="dictionary-count"></span><button class="btn btn-quiet" id="reset-filters" type="button">Reset filter</button></div><div class="grid" id="dictionary-results"></div>`);
  const search = $("#dictionary-search");
  const category = $("#dictionary-category");
  const sort = $("#dictionary-sort");
  const results = $("#dictionary-results");
  const countLabel = $("#dictionary-count");
  function applyFilters() {
    currentFilter.query = search.value.trim().toLocaleLowerCase("id-ID");
    currentFilter.category = category.value;
    const letter = currentFilter.letter;
    let filtered = words.filter((word) => {
      const haystack = [
        word.kata,
        word.arti,
        word.contoh,
        word.terjemahan,
        word.dialek,
        word.kelasKata,
        categoryName(word.kategori),
      ]
        .join(" ")
        .toLocaleLowerCase("id-ID");
      return (
        (!currentFilter.query || haystack.includes(currentFilter.query)) &&
        (currentFilter.category === "all" ||
          word.kategori === currentFilter.category) &&
        (!letter || word.kata.toLocaleUpperCase("id-ID").startsWith(letter))
      );
    });
    filtered.sort((a, b) =>
      sort.value === "za"
        ? b.kata.localeCompare(a.kata, "id")
        : a.kata.localeCompare(b.kata, "id"),
    );
    countLabel.textContent = `Menampilkan ${filtered.length} dari ${words.length} kosakata`;
    results.innerHTML = filtered.length
      ? filtered.map((word) => wordCard(word)).join("")
      : emptyState(
          "Kata tidak ditemukan",
          "Coba kata lain atau reset filter pencarian.",
          "kamus.html",
          "Tampilkan semua kata",
        );
    $$("#letter-filters .filter-chip").forEach((button) =>
      button.classList.toggle(
        "active",
        button.dataset.letter === currentFilter.letter,
      ),
    );
  }
  search.addEventListener("input", applyFilters);
  search.addEventListener("change", () => recordSearch(search.value));
  category.addEventListener("change", applyFilters);
  sort.addEventListener("change", applyFilters);
  $$("#letter-filters button").forEach((button) =>
    button.addEventListener("click", () => {
      currentFilter.letter = button.dataset.letter;
      applyFilters();
    }),
  );
  $("#reset-filters").addEventListener("click", () => {
    search.value = "";
    category.value = "all";
    sort.value = "az";
    currentFilter.letter = "";
    currentFilter.query = "";
    currentFilter.category = "all";
    applyFilters();
  });
  applyFilters();
}
function renderFavorites() {
  const list = getFavorites();
  const ordered = list
    .map((item) => ({ word: getWord(item.id), at: Number(item.at) || 0 }))
    .filter((item) => item.word);
  shell(`<span class="eyebrow">Arsip pribadi</span><h1>Kata Favorit</h1><p class="lead">Kosakata yang kamu simpan untuk dipelajari kembali. Favorit berlaku untuk semua halaman di browser ini.</p>
    <section class="section"><div class="section-head"><h2 class="section-title">Koleksi tersimpan</h2><span class="category-count" id="favorite-count">${ordered.length} kata tersimpan</span></div><div class="toolbar"><input id="favorite-search" type="search" placeholder="Cari di favorit…" aria-label="Cari di favorit"><select id="favorite-order"><option value="recent">Terbaru disimpan</option><option value="az">Urut A–Z</option></select><button class="btn btn-quiet" id="clear-favorites" type="button">Kosongkan</button></div><div class="grid" id="favorite-results"></div></section>`);
  const input = $("#favorite-search");
  const order = $("#favorite-order");
  function refresh() {
    let filtered = getFavorites()
      .map((item) => ({ word: getWord(item.id), at: Number(item.at) || 0 }))
      .filter((item) => item.word);
    if (input.value.trim())
      filtered = filtered.filter((item) =>
        `${item.word.kata} ${item.word.arti} ${item.word.dialek}`
          .toLocaleLowerCase("id-ID")
          .includes(input.value.trim().toLocaleLowerCase("id-ID")),
      );
    filtered.sort((a, b) =>
      order.value === "az"
        ? a.word.kata.localeCompare(b.word.kata, "id")
        : b.at - a.at,
    );
    $("#favorite-count").textContent = `${filtered.length} kata tersimpan`;
    $("#favorite-results").innerHTML = filtered.length
      ? filtered.map((item) => wordCard(item.word)).join("")
      : emptyState(
          "Belum ada kata favorit",
          "Tekan ikon penanda pada kartu kata di halaman Kamus untuk menyimpannya.",
          "kamus.html",
          "Jelajahi Kamus",
        );
  }
  input.addEventListener("input", refresh);
  order.addEventListener("change", refresh);
  $("#clear-favorites").addEventListener("click", () => {
    if (!getFavorites().length) return toast("Favorit sudah kosong.");
    if (confirm("Hapus semua kata dari favorit?")) {
      writeStorage(KEYS.favorites, []);
      refresh();
      toast("Semua favorit sudah dihapus.");
    }
  });
  refresh();
}
function renderCategories() {
  shell(
    `<span class="eyebrow">Khazanah bahasa</span><h1>Jelajahi Kategori</h1><p class="lead">Jelajahi kosakata berdasarkan rumpun kehidupan sehari-hari dan warisan tradisi.</p><div class="toolbar"><input id="category-search" type="search" placeholder="Cari rumpun tema kata…" aria-label="Cari kategori"><button id="category-sort" class="btn btn-soft" type="button">${icon("sort_by_alpha")} Urut A–Z</button></div><div class="section-head"><h2 class="section-title">Rumpun tematik</h2><span class="category-count">${categories.length} kategori</span></div><div class="grid" id="category-results"></div><div class="notice" style="margin-top:18px">Jumlah kata per kategori dihitung langsung dari <code>data/kosakata.json</code>. Jika data bertambah, jumlah akan diperbarui otomatis.</div>`,
  );
  const input = $("#category-search");
  function refresh() {
    const q = input.value.trim().toLocaleLowerCase("id-ID");
    const items = categories.filter((cat) =>
      `${cat.nama} ${cat.deskripsi}`.toLocaleLowerCase("id-ID").includes(q),
    );
    items.sort((a, b) =>
      categorySortAscending
        ? a.nama.localeCompare(b.nama, "id")
        : b.nama.localeCompare(a.nama, "id"),
    );
    $("#category-results").innerHTML = items.length
      ? items.map(categoryCard).join("")
      : emptyState(
          "Kategori tidak ditemukan",
          "Coba istilah pencarian yang lebih umum.",
          "kategori.html",
          "Reset",
        );
  }
  input.addEventListener("input", refresh);
  $("#category-sort").addEventListener("click", () => {
    categorySortAscending = !categorySortAscending;
    $("#category-sort").innerHTML =
      `${icon("sort_by_alpha")} Urut ${categorySortAscending ? "A–Z" : "Z–A"}`;
    refresh();
  });
  refresh();
}
function renderDetail() {
  const params = new URLSearchParams(window.location.search);
  const word = getWord(params.get("kata") || "etam");
  if (!word) {
    shell(
      `<span class="eyebrow">Detail lema</span><h1>Kata tidak ditemukan</h1>${emptyState("Lema tidak tersedia", "Kata yang diminta tidak ada di database kosakata.", "kamus.html", "Kembali ke Kamus")}`,
    );
    return;
  }
  addToHistory(word.id);
  const related = words
    .filter((item) => item.id !== word.id && item.kategori === word.kategori)
    .slice(0, 3);
  shell(`<div class="section-head"><a class="link" href="kamus.html">← Kembali ke Kamus</a><span class="category-count">Detail lema</span></div>
    <section class="detail-head"><div class="pill-row"><span class="pill accent">${escapeHTML(categoryName(word.kategori))}</span><span class="pill">${escapeHTML(word.dialek)}</span></div><div class="word-top" style="margin-top:15px"><div><h1>${escapeHTML(word.kata)}</h1><div class="phonetic">/${escapeHTML(word.pelafalan || word.kata)}/ · ${escapeHTML(word.kelasKata)}</div></div><button class="icon-btn" type="button" data-speak="${word.id}" aria-label="Dengarkan ${escapeHTML(word.kata)}">${icon("volume_up")}</button></div><div class="divider"></div><span class="eyebrow">Definisi leksikal</span><p class="detail-meaning">${escapeHTML(word.arti)}</p><div class="card-actions">${favoriteButton(word)}<button class="btn btn-quiet" id="share-word" type="button">${icon("share")} Bagikan kata</button></div></section>
    <section class="section grid two"><div class="card"><span class="eyebrow">Contoh pemakaian</span><h2>Dalam tuturan</h2><p class="detail-meaning"><em>“${escapeHTML(word.contoh || "Belum tersedia")}”</em></p><div class="example">${escapeHTML(word.terjemahan || "Terjemahan belum tersedia.")}</div></div><div class="card"><span class="eyebrow">Catatan arsip</span><h2>Dialek dan konteks</h2><p class="meaning">Dialek: <strong>${escapeHTML(word.dialek)}</strong></p><p class="meaning">Kelas kata: <strong>${escapeHTML(word.kelasKata)}</strong></p><p class="meaning">Data awal berasal dari prototipe yang diberikan dan masih perlu diverifikasi bersama penutur lokal sebelum menjadi rujukan akademik.</p></div></section>
    <section class="section"><div class="section-head"><h2 class="section-title">Kosakata terkait</h2><a class="link" href="kamus.html?kategori=${word.kategori}">Lihat kategori →</a></div><div class="grid">${related.length ? related.map((item) => wordCard(item, { compact: true })).join("") : '<p class="lead">Belum ada kosakata terkait dalam kategori ini.</p>'}</div></section>`);
  $("#share-word")?.addEventListener("click", async () => {
    const shareData = {
      title: `Kamus Kutai — ${word.kata}`,
      text: `${word.kata}: ${word.arti}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`,
        );
        toast("Informasi kata disalin.");
      } else toast("Bagikan melalui alamat halaman ini.");
    } catch (error) {
      if (error?.name !== "AbortError")
        toast("Tidak dapat membagikan kata pada browser ini.");
    }
  });
}
function renderAbout() {
  shell(`<span class="eyebrow">Arsip leksikon Kalimantan Timur</span><h1>Tentang Kamus Kutai</h1><p class="lead">“Kata Punya Cerita” — ruang awal untuk mengenali, merawat, dan mendokumentasikan kosakata serta tuturan bahasa Kutai.</p>
    <section class="section grid two"><article class="card"><span class="category-icon">${icon("auto_stories")}</span><h2>Dokumentasi terbuka</h2><p class="meaning">Kamus Kutai adalah prototipe dokumentasi digital untuk memperkenalkan kosakata, makna, variasi dialek, dan contoh pemakaian dalam satu tempat yang mudah dijelajahi.</p></article><article class="card"><span class="category-icon">${icon("diversity_3")}</span><h2>Mengapa tuturan perlu dijaga?</h2><p class="meaning">Bahasa membawa pengetahuan lokal dan ingatan antargenerasi. Pencatatan digital dapat membantu, tetapi tidak menggantikan penutur dan komunitas pemilik bahasa.</p></article></section>
    <section class="section"><span class="eyebrow">Cara menggunakan</span><h2 class="section-title">Jelajahi dengan mudah</h2><div class="grid"><article class="card"><div class="category-icon">${icon("search")}</div><h3>Cari & telusuri</h3><p class="meaning">Gunakan kolom pencarian untuk mencari kata, arti, contoh, atau dialek.</p></article><article class="card"><div class="category-icon">${icon("volume_up")}</div><h3>Dengarkan pelafalan</h3><p class="meaning">Tombol suara menggunakan fitur teks-ke-ucapan browser. Pengucapan otomatis bisa berbeda dari pelafalan Kutai yang autentik.</p></article><article class="card"><div class="category-icon">${icon("bookmark")}</div><h3>Koleksi favorit</h3><p class="meaning">Simpan kata untuk dikunjungi kembali. Favorit dan riwayat disimpan di browser perangkat ini.</p></article></div></section>
    <section class="section card" id="sumbang"><span class="eyebrow">Sumber & kontribusi</span><h2>Sumbang kosakata</h2><p class="lead">Masukkan kata dan makna yang kamu ketahui. Usulan akan tersimpan secara lokal di browser ini; belum dikirim ke server atau dipublikasikan otomatis.</p><form id="contribution-form" class="form-grid" style="margin-top:18px"><div class="form-field"><label for="contrib-word">Kosakata</label><input id="contrib-word" name="word" required maxlength="80" placeholder="Contoh: kata daerah"></div><div class="form-field"><label for="contrib-dialect">Dialek / wilayah</label><input id="contrib-dialect" name="dialect" maxlength="100" placeholder="Contoh: Kutai Hulu"></div><div class="form-field full"><label for="contrib-meaning">Arti dalam bahasa Indonesia</label><textarea id="contrib-meaning" name="meaning" required maxlength="800" placeholder="Tuliskan makna menurut pemahamanmu"></textarea></div><div class="form-field full"><label for="contrib-example">Contoh kalimat (opsional)</label><textarea id="contrib-example" name="example" maxlength="800" placeholder="Contoh penggunaan kata"></textarea></div><div class="form-field full"><button class="btn btn-primary" type="submit">Simpan usulan ${icon("send")}</button></div></form><div id="contribution-result" class="notice hidden" style="margin-top:12px" role="status"></div><div class="section-head" style="margin-top:22px"><h3>Usulan di browser ini</h3><button id="clear-contributions" class="btn btn-quiet" type="button">Hapus semua</button></div><div id="contribution-list"></div></section>`);
  const form = $("#contribution-form");
  const refreshContributions = () => {
    const items = readStorage(KEYS.contributions, []);
    $("#contribution-list").innerHTML = items.length
      ? `<div class="grid two">${items.map((item, index) => `<article class="card"><div class="word-top"><h3>${escapeHTML(item.word)}</h3><span class="pill">Usulan ${index + 1}</span></div><p class="meaning">${escapeHTML(item.meaning)}</p><p class="phonetic">${escapeHTML(item.dialect || "Dialek belum diisi")}</p>${item.example ? `<div class="example">${escapeHTML(item.example)}</div>` : ""}</article>`).join("")}</div>`
      : '<p class="category-count">Belum ada usulan lokal.</p>';
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = {
      word: $("#contrib-word").value.trim(),
      dialect: $("#contrib-dialect").value.trim(),
      meaning: $("#contrib-meaning").value.trim(),
      example: $("#contrib-example").value.trim(),
      createdAt: new Date().toISOString(),
    };
    if (!item.word || !item.meaning) return;
    const list = readStorage(KEYS.contributions, []);
    list.unshift(item);
    writeStorage(KEYS.contributions, list);
    form.reset();
    const result = $("#contribution-result");
    result.textContent =
      "Usulan disimpan di browser ini. Untuk dibagikan, salin informasinya atau hubungkan proyek dengan backend.";
    result.classList.remove("hidden");
    refreshContributions();
    toast("Usulan tersimpan lokal.");
  });
  $("#clear-contributions").addEventListener("click", () => {
    if (confirm("Hapus semua usulan yang tersimpan di browser ini?")) {
      writeStorage(KEYS.contributions, []);
      refreshContributions();
      toast("Usulan lokal dihapus.");
    }
  });
  refreshContributions();
}
function renderProfile() {
  const name = readStorage(KEYS.name, "Penutur Kutai");
  const favs = getFavorites().length;
  const history = getHistory().length;
  const contributions = readStorage(KEYS.contributions, []).length;
  shell(`<span class="eyebrow">Ruang pribadi</span><h1>Profil</h1><p class="lead">Preferensi lokal untuk pengalaman belajar Kamus Kutai.</p><section class="section card"><div class="profile-top"><div class="avatar" id="profile-avatar">${escapeHTML((name.trim()[0] || "P").toUpperCase())}</div><div><h2 id="profile-name-heading">${escapeHTML(name)}</h2><p class="phonetic">Profil lokal · data tidak dikirim ke server</p></div></div><div class="divider"></div><form id="profile-form" class="form-grid"><div class="form-field full"><label for="display-name">Nama tampilan</label><input id="display-name" value="${escapeHTML(name)}" maxlength="80" required></div><div class="form-field full"><button class="btn btn-primary" type="submit">Simpan profil ${icon("save")}</button></div></form></section>
    <section class="section"><div class="section-head"><h2 class="section-title">Jejak penjelajahan</h2><a class="link" href="riwayat.html">Lihat riwayat →</a></div><div class="stat-grid"><div class="stat"><strong>${favs}</strong><span>Kata favorit</span></div><div class="stat"><strong>${history}</strong><span>Detail dibuka</span></div><div class="stat"><strong>${contributions}</strong><span>Usulan lokal</span></div></div></section>
    <section class="section card"><span class="eyebrow">Preferensi & akses</span><h2>Pengaturan sederhana</h2><div class="card-actions"><button class="btn btn-soft" id="profile-theme" type="button">${icon("contrast")} Ganti tema</button><a href="favorit.html" class="btn btn-quiet">${icon("bookmark")} Kata favorit</a><a href="tentang.html#sumbang" class="btn btn-quiet">${icon("edit_note")} Sumbang kata</a></div><p class="notice" style="margin-top:14px">Kata, arti, kategori, dan contoh berasal dari file <code>data/kosakata.json</code>. Favorit, tema, riwayat, profil, dan usulan tersimpan pada penyimpanan lokal browser.</p></section>`);
  $("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const newName = $("#display-name").value.trim() || "Penutur Kutai";
    writeStorage(KEYS.name, newName);
    $("#profile-name-heading").textContent = newName;
    $("#profile-avatar").textContent = newName[0].toLocaleUpperCase("id-ID");
    toast("Profil berhasil disimpan.");
  });
  $("#profile-theme").addEventListener("click", () =>
    setTheme(!document.documentElement.classList.contains("dark")),
  );
}
function renderHistory() {
  const entries = getHistory()
    .map((item) => ({ ...item, word: getWord(item.id) }))
    .filter((item) => item.word);
  shell(
    `<span class="eyebrow">Jejak penjelajahan</span><h1>Riwayat Kata</h1><p class="lead">Daftar kata yang detailnya pernah kamu buka pada browser ini.</p><div class="section-head section"><h2 class="section-title">Terakhir dibuka</h2><button class="btn btn-quiet" id="clear-history" type="button">Hapus riwayat</button></div><div class="grid" id="history-results">${entries.length ? entries.map((item) => wordCard(item.word, { compact: true })).join("") : emptyState("Riwayat masih kosong", "Buka detail kata dari halaman Kamus untuk mencatatnya di sini.")}</div>`,
  );
  $("#clear-history").addEventListener("click", () => {
    if (confirm("Hapus riwayat penjelajahan?")) {
      writeStorage(KEYS.history, []);
      $("#history-results").innerHTML = emptyState(
        "Riwayat masih kosong",
        "Buka detail kata dari halaman Kamus untuk mencatatnya di sini.",
      );
      toast("Riwayat dihapus.");
    }
  });
}
function speakWord(id) {
  const word = getWord(id);
  if (!word) return;
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window))
    return toast("Browser ini belum mendukung fitur suara.");
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.kata);
  utterance.lang = "id-ID";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}
function renderPage() {
  switch (currentPage) {
    case "home":
      renderHome();
      break;
    case "dictionary":
      renderDictionary();
      break;
    case "favorites":
      renderFavorites();
      break;
    case "categories":
      renderCategories();
      break;
    case "detail":
      renderDetail();
      break;
    case "about":
      renderAbout();
      break;
    case "profile":
      renderProfile();
      break;
    case "history":
      renderHistory();
      break;
    default:
      renderHome();
  }
}
function pageFromPath() {
  const path = window.location.pathname.split("/").pop().toLowerCase();
  return (
    {
      "index.html": "home",
      "": "home",
      "kamus.html": "dictionary",
      "favorit.html": "favorites",
      "kategori.html": "categories",
      "detail.html": "detail",
      "tentang.html": "about",
      "profil.html": "profile",
      "riwayat.html": "history",
    }[path] ||
    document.body.dataset.page ||
    "home"
  );
}
async function boot() {
  currentPage = pageFromPath();
  try {
    const [wordResponse, categoryResponse] = await Promise.all([
      fetch(DATA_URL),
      fetch(CATEGORY_URL),
    ]);
    if (!wordResponse.ok || !categoryResponse.ok)
      throw new Error("File data tidak dapat dimuat");
    words = await wordResponse.json();
    categories = await categoryResponse.json();
    if (!Array.isArray(words) || !Array.isArray(categories))
      throw new Error("Format database tidak valid");
    renderPage();
  } catch (error) {
    console.error(error);
    $("#app").innerHTML =
      `${headerHTML()}<main class="shell page"><div class="empty">${icon("database")}<h3>Database belum dapat dibaca</h3><p>Jalankan proyek menggunakan Live Server atau server lokal. Membuka HTML langsung dengan <code>file://</code> dapat memblokir pembacaan file JSON.</p><p>Pastikan folder <code>data/</code> dan file <code>kosakata.json</code> serta <code>kategori.json</code> tetap berada di struktur proyek.</p></div></main>`;
    initTheme();
  }
}
document.addEventListener("click", (event) => {
  const themeButton = event.target.closest("[data-theme-toggle]");
  if (themeButton) {
    setTheme(!document.documentElement.classList.contains("dark"));
    return;
  }
  const favoriteButtonEl = event.target.closest("[data-favorite-action]");
  if (favoriteButtonEl) {
    event.preventDefault();
    toggleFavorite(favoriteButtonEl.dataset.favoriteAction);
    if (currentPage === "favorites") renderFavorites();
    else {
      $$(
        `[data-favorite-action="${CSS.escape(favoriteButtonEl.dataset.favoriteAction)}"]`,
      ).forEach((button) => {
        const selected = isFavorite(button.dataset.favoriteAction);
        button.setAttribute("aria-pressed", String(selected));
        button.classList.toggle("btn-soft", selected);
        button.classList.toggle("btn-quiet", !selected);
        button.innerHTML = `${icon(selected ? "bookmark_added" : "bookmark")}${button.querySelector("span:not(.material-symbols-outlined)") ? `<span>${selected ? "Tersimpan" : "Favorit"}</span>` : ""}`;
      });
    }
    return;
  }
  const speakButton = event.target.closest("[data-speak]");
  if (speakButton) {
    event.preventDefault();
    speakWord(speakButton.dataset.speak);
  }
});
document.addEventListener("DOMContentLoaded", boot);
