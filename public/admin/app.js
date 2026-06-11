// ── Admin Dashboard v2 — Form-based editors ──
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/admin/login'; return; }

  // ── DOM refs ──
  const $ = id => document.getElementById(id);
  const editorArea = $('editorArea');
  const saveStatus = $('saveStatus');

  // ── State ──
  let contentData = {};

  // ── Init ──
  init();
  function init() {
    loadUserProfile();
    fetchContent();
    fetchMessages();
    setupNavTabs();
    setupSectionTabs();
    setupLogout();
    setupPasswordForm();
  }

  // ── Nav tabs ──
  function setupNavTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        $(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
  }

  // ── Section tabs ──
  function setupSectionTabs() {
    document.querySelectorAll('.section-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loadSectionEditor(tab.dataset.section);
      });
    });
  }

  // ── Logout ──
  function setupLogout() {
    $('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/admin/login';
    });
  }

  // ── Password form ──
  function setupPasswordForm() {
    $('passwordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      $('passwordError').style.display = 'none';
      $('passwordSuccess').style.display = 'none';
      try {
        const res = await fetch('/api/auth/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            currentPassword: $('currentPassword').value,
            newPassword: $('newPassword').value
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal');
        $('passwordSuccess').textContent = 'Password berhasil diubah!';
        $('passwordSuccess').style.display = 'block';
        $('passwordForm').reset();
      } catch (err) {
        $('passwordError').textContent = err.message;
        $('passwordError').style.display = 'block';
      }
    });
  }

  // ── Fetch ──
  async function fetchContent() {
    try {
      const res = await fetch('/api/content', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal memuat konten');
      contentData = await res.json();
      const first = document.querySelector('.section-tab');
      if (first) first.click();
    } catch (err) {
      editorArea.innerHTML = `<div class="toast error">${err.message}</div>`;
    }
  }

  async function fetchMessages() {
    try {
      const res = await fetch('/api/messages', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal');
      const messages = await res.json();
      $('messageCount').textContent = messages.length;
      renderMessages(messages);
    } catch (err) {
      $('messagesList').innerHTML = `<p class="text-muted">${err.message}</p>`;
    }
  }

  function renderMessages(messages) {
    if (!messages.length) { $('messagesList').innerHTML = '<p class="text-muted">Belum ada pesan masuk.</p>'; return; }
    $('messagesList').innerHTML = messages.map(m => `
      <div class="message-item">
        <div class="message-header">
          <div class="message-meta">
            <span class="message-from">${esc(m.name)}</span>
            <span class="message-time">${new Date(m.createdAt).toLocaleString('id-ID')}</span>
          </div>
          ${m.service ? `<span class="badge">${esc(m.service)}</span>` : ''}
        </div>
        <div class="message-content">${esc(m.message)}</div>
      </div>
    `).join('');
  }

  function loadUserProfile() {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      $('profileUsername').textContent = u.username;
      $('profileName').textContent = u.name;
      $('profileRole').textContent = u.role;
    } catch (e) {}
  }

  // ════════════════════════════════════════════
  //  SECTION EDITOR DISPATCH
  // ════════════════════════════════════════════

  function loadSectionEditor(section) {
    editorArea.innerHTML = '<p class="text-muted">Memuat...</p>';
    saveStatus.className = 'save-status';
    saveStatus.textContent = '';

    const data = contentData[section];
    if (!data) { editorArea.innerHTML = `<p class="text-danger">Section "${section}" tidak ditemukan.</p>`; return; }

    const renderers = {
      hero: renderHeroEditor,
      mengapa: renderMengapaEditor,
      layanan: renderLayananEditor,
      keunggulan: renderKeunggulanEditor,
      portfolio: renderPortfolioEditor,
      kontak: renderKontakEditor,
      footer: renderFooterEditor
    };

    if (renderers[section]) renderers[section](data);
    else editorArea.innerHTML = '<p class="text-danger">Editor belum tersedia.</p>';
  }

  // ── Save helper ──
  async function saveSection(section, data) {
    saveStatus.textContent = 'Menyimpan...';
    saveStatus.className = 'save-status saving';
    try {
      const res = await fetch(`/api/content/${section}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Gagal menyimpan');
      contentData[section] = data;
      saveStatus.textContent = '✓ Berhasil disimpan!';
      saveStatus.className = 'save-status success';
      setTimeout(() => { saveStatus.textContent = ''; saveStatus.className = 'save-status'; }, 2000);
    } catch (err) {
      saveStatus.textContent = `✗ ${err.message}`;
      saveStatus.className = 'save-status error';
    }
  }

  // ════════════════════════════════════════════
  //  1. HERO EDITOR
  // ════════════════════════════════════════════

  function renderHeroEditor(d) {
    editorArea.innerHTML = `
      <div class="editor-section">
        <div class="editor-section-title">Hero Section</div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Badge</label>
            <input id="hero-badge" class="form-control" value="${toPlain(d.badge)}" placeholder="Konsultasi Awal Gratis">
          </div>
          <div class="form-group">
            <label class="form-label">Eyebrow</label>
            <input id="hero-eyebrow" class="form-control" value="${toPlain(d.eyebrow)}" placeholder="Solusi Legalitas Usaha Terpercaya">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Judul Utama</label>
          <p class="form-hint">Gunakan &lt;em&gt;...&lt;/em&gt; untuk teks miring emas, &lt;strong&gt;...&lt;/strong&gt; untuk teks tebal, &lt;br&gt; untuk baris baru.</p>
          <textarea id="hero-title" class="form-control" rows="2">${toPlain(d.title)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Deskripsi</label>
          <textarea id="hero-desc" class="form-control" rows="3">${toPlain(d.desc)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Tags</label>
          <p class="form-hint">Pisahkan dengan koma. Contoh: Cepat, Aman, Profesional</p>
          <input id="hero-tags" class="form-control" value="${(d.tags||[]).join(', ')}" placeholder="Cepat, Aman, Profesional, Terpercaya">
        </div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Tombol CTA</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tombol Utama (CTA Primary)</label>
              <input id="hero-cta1" class="form-control" value="${toPlain(d.cta_primary)}" placeholder="Mulai Konsultasi">
            </div>
            <div class="form-group">
              <label class="form-label">Tombol Kedua (CTA Secondary)</label>
              <input id="hero-cta2" class="form-control" value="${toPlain(d.cta_secondary)}" placeholder="Lihat Layanan">
            </div>
          </div>
        </div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Statistik (Hero Card)</div>
          <div id="hero-stats-container"></div>
          <button class="btn-outline btn-sm" onclick="addHeroStat()">+ Tambah Statistik</button>
        </div>

        <div class="editor-actions">
          <button class="btn-primary" onclick="saveHero()">Simpan Perubahan Hero</button>
        </div>
      </div>
    `;

    // Render stats
    window.heroStats = (d.stats || []).slice();
    renderHeroStats();
  }

  function renderHeroStats() {
    const c = $('hero-stats-container');
    if (!c) return;
    c.innerHTML = (window.heroStats || []).map((s, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${i + 1}</span>
          <button class="btn-icon btn-danger-sm" onclick="removeHeroStat(${i})">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Label</label>
            <input class="form-control form-control-sm hero-stat-label" value="${toPlain(s.label)}" placeholder="Klien Dilayani" data-idx="${i}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Nilai Tampilan</label>
            <input class="form-control form-control-sm hero-stat-value" value="${toPlain(s.value)}" placeholder="500+" data-idx="${i}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Target Angka</label>
            <input class="form-control form-control-sm hero-stat-target" type="number" value="${s.target || 0}" data-idx="${i}">
          </div>
        </div>
      </div>
    `).join('');
  }

  window.addHeroStat = () => {
    if (!window.heroStats) window.heroStats = [];
    window.heroStats.push({ label: '', value: '', target: 0, suffix: '+' });
    renderHeroStats();
  };
  window.removeHeroStat = (idx) => {
    window.heroStats.splice(idx, 1);
    renderHeroStats();
  };

  window.saveHero = () => {
    const statsEls = document.querySelectorAll('.hero-stat-label');
    const stats = Array.from(statsEls).map((el, i) => ({
      label: el.value,
      value: document.querySelectorAll('.hero-stat-value')[i].value,
      target: parseInt(document.querySelectorAll('.hero-stat-target')[i].value) || 0,
      suffix: document.querySelectorAll('.hero-stat-value')[i].value.includes('%') ? '%' : '+'
    }));
    saveSection('hero', {
      badge: $('hero-badge').value,
      eyebrow: $('hero-eyebrow').value,
      title: $('hero-title').value,
      desc: $('hero-desc').value,
      tags: $('hero-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      stats,
      cta_primary: $('hero-cta1').value,
      cta_secondary: $('hero-cta2').value
    });
  };

  // ════════════════════════════════════════════
  //  2. MENGAPA EDITOR
  // ════════════════════════════════════════════

  function renderMengapaEditor(d) {
    editorArea.innerHTML = `
      <div class="editor-section">
        <div class="editor-section-title">Mengapa Kami</div>

        <div class="form-group">
          <label class="form-label">Section Title</label>
          <input id="mg-title" class="form-control" value="${toPlain(d.title)}">
        </div>
        <div class="form-group">
          <label class="form-label">Deskripsi</label>
          <textarea id="mg-desc" class="form-control" rows="3">${toPlain(d.desc)}</textarea>
        </div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Fitur / Keunggulan</div>
          <div id="mg-features-container"></div>
          <button class="btn-outline btn-sm" onclick="addMgFeature()">+ Tambah Fitur</button>
        </div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Quote / Testimonial Ringkas</div>
          <div class="form-group">
            <label class="form-label">Teks Quote</label>
            <textarea id="mg-quote-text" class="form-control" rows="2">${toPlain(d.quote.text)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Penulis Quote</label>
            <input id="mg-quote-author" class="form-control" value="${toPlain(d.quote.author)}">
          </div>
        </div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Statistik</div>
          <div id="mg-stats-container"></div>
          <button class="btn-outline btn-sm" onclick="addMgStat()">+ Tambah Statistik</button>
        </div>

        <div class="editor-actions">
          <button class="btn-primary" onclick="saveMengapa()">Simpan Perubahan</button>
        </div>
      </div>
    `;

    window.mgFeatures = (d.features || []).slice();
    window.mgStats = (d.stats || []).slice();
    renderMgFeatures();
    renderMgStats();
  }

  function renderMgFeatures() {
    const c = $('mg-features-container');
    if (!c) return;
    c.innerHTML = (window.mgFeatures || []).map((f, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${i + 1}</span>
          <button class="btn-icon btn-danger-sm" onclick="removeMgFeature(${i})">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:0 0 80px;">
            <label class="form-label" style="font-size:10px;">Nomor</label>
            <input class="form-control form-control-sm mg-feat-num" value="${toPlain(f.number)}" data-idx="${i}">
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label" style="font-size:10px;">Judul</label>
            <input class="form-control form-control-sm mg-feat-title" value="${toPlain(f.title)}" data-idx="${i}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:10px;">Deskripsi</label>
          <textarea class="form-control form-control-sm mg-feat-desc" rows="2" data-idx="${i}">${toPlain(f.desc)}</textarea>
        </div>
      </div>
    `).join('');
  }

  function renderMgStats() {
    const c = $('mg-stats-container');
    if (!c) return;
    c.innerHTML = (window.mgStats || []).map((s, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${i + 1}</span>
          <button class="btn-icon btn-danger-sm" onclick="removeMgStat(${i})">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Label</label>
            <input class="form-control form-control-sm mg-stat-label" value="${toPlain(s.label)}" data-idx="${i}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Nilai</label>
            <input class="form-control form-control-sm mg-stat-value" value="${toPlain(s.value)}" data-idx="${i}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Target</label>
            <input class="form-control form-control-sm mg-stat-target" type="number" value="${s.target}" data-idx="${i}">
          </div>
        </div>
      </div>
    `).join('');
  }

  window.addMgFeature = () => { window.mgFeatures.push({ number: 'V', title: '', desc: '' }); renderMgFeatures(); };
  window.removeMgFeature = (i) => { window.mgFeatures.splice(i, 1); renderMgFeatures(); };
  window.addMgStat = () => { window.mgStats.push({ label: '', value: '', target: 0 }); renderMgStats(); };
  window.removeMgStat = (i) => { window.mgStats.splice(i, 1); renderMgStats(); };

  window.saveMengapa = () => {
    const features = Array.from(document.querySelectorAll('.mg-feat-num')).map((el, i) => ({
      number: el.value,
      title: document.querySelectorAll('.mg-feat-title')[i].value,
      desc: document.querySelectorAll('.mg-feat-desc')[i].value
    }));
    const stats = Array.from(document.querySelectorAll('.mg-stat-label')).map((el, i) => ({
      label: el.value,
      value: document.querySelectorAll('.mg-stat-value')[i].value,
      target: parseInt(document.querySelectorAll('.mg-stat-target')[i].value) || 0
    }));
    saveSection('mengapa', {
      eyebrow: 'Mengapa Memilih Kami',
      title: $('mg-title').value,
      desc: $('mg-desc').value,
      features,
      quote: { text: $('mg-quote-text').value, author: $('mg-quote-author').value },
      stats
    });
  };

  // ════════════════════════════════════════════
  //  3. LAYANAN EDITOR
  // ════════════════════════════════════════════

  function renderLayananEditor(d) {
    editorArea.innerHTML = `
      <div class="editor-section">
        <div class="editor-section-title">Layanan</div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Daftar Layanan</div>
          <div id="ly-items-container"></div>
          <button class="btn-outline btn-sm" onclick="addLyItem()">+ Tambah Layanan</button>
        </div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Spesial Banner</div>
          <div class="form-group">
            <label class="form-label">Tag</label>
            <input id="ly-sp-tag" class="form-control" value="${toPlain(d.spesial.tag)}">
          </div>
          <div class="form-group">
            <label class="form-label">Judul</label>
            <textarea id="ly-sp-title" class="form-control" rows="2">${toPlain(d.spesial.title)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Deskripsi</label>
            <textarea id="ly-sp-desc" class="form-control" rows="3">${toPlain(d.spesial.desc)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Tombol CTA</label>
            <input id="ly-sp-cta" class="form-control" value="${toPlain(d.spesial.cta)}">
          </div>
        </div>

        <div class="editor-actions">
          <button class="btn-primary" onclick="saveLayanan()">Simpan Perubahan</button>
        </div>
      </div>
    `;

    window.lyItems = (d.items || []).slice();
    renderLyItems();
  }

  function renderLyItems() {
    const c = $('ly-items-container');
    if (!c) return;
    c.innerHTML = (window.lyItems || []).map((item, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${item.number || (i + 1)}</span>
          <button class="btn-icon btn-danger-sm" onclick="removeLyItem(${i})">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:0 0 80px;">
            <label class="form-label" style="font-size:10px;">Nomor</label>
            <input class="form-control form-control-sm ly-item-num" value="${toPlain(item.number)}" data-idx="${i}">
          </div>
          <div class="form-group" style="flex:3;">
            <label class="form-label" style="font-size:10px;">Nama Layanan</label>
            <input class="form-control form-control-sm ly-item-title" value="${toPlain(item.title)}" data-idx="${i}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:10px;">Deskripsi</label>
          <textarea class="form-control form-control-sm ly-item-desc" rows="2" data-idx="${i}">${toPlain(item.desc)}</textarea>
        </div>
      </div>
    `).join('');
  }

  window.addLyItem = () => {
    const next = String(window.lyItems.length + 1).padStart(2, '0');
    window.lyItems.push({ number: next, title: '', desc: '' });
    renderLyItems();
  };
  window.removeLyItem = (i) => { window.lyItems.splice(i, 1); renderLyItems(); };

  window.saveLayanan = () => {
    const items = Array.from(document.querySelectorAll('.ly-item-num')).map((el, i) => ({
      number: el.value,
      title: document.querySelectorAll('.ly-item-title')[i].value,
      desc: document.querySelectorAll('.ly-item-desc')[i].value
    }));
    saveSection('layanan', {
      eyebrow: 'Layanan Kami',
      title: 'Solusi <em>Lengkap</em> Legalitas Bisnis',
      items,
      spesial: {
        tag: $('ly-sp-tag').value,
        title: $('ly-sp-title').value,
        desc: $('ly-sp-desc').value,
        cta: $('ly-sp-cta').value
      }
    });
  };

  // ════════════════════════════════════════════
  //  4. KEUNGGULAN EDITOR
  // ════════════════════════════════════════════

  function renderKeunggulanEditor(d) {
    editorArea.innerHTML = `
      <div class="editor-section">
        <div class="editor-section-title">Keunggulan</div>
        <div id="kg-items-container"></div>
        <button class="btn-outline btn-sm" onclick="addKgItem()">+ Tambah Keunggulan</button>
        <div class="editor-actions" style="margin-top:20px;">
          <button class="btn-primary" onclick="saveKeunggulan()">Simpan Perubahan</button>
        </div>
      </div>
    `;

    window.kgItems = (d.items || []).slice();
    renderKgItems();
  }

  function renderKgItems() {
    const c = $('kg-items-container');
    if (!c) return;
    c.innerHTML = (window.kgItems || []).map((item, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${i + 1}</span>
          <button class="btn-icon btn-danger-sm" onclick="removeKgItem(${i})">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:10px;">Judul</label>
          <input class="form-control form-control-sm kg-item-title" value="${toPlain(item.title)}" data-idx="${i}">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:10px;">Deskripsi</label>
          <textarea class="form-control form-control-sm kg-item-desc" rows="2" data-idx="${i}">${toPlain(item.desc)}</textarea>
        </div>
      </div>
    `).join('');
  }

  window.addKgItem = () => { window.kgItems.push({ title: '', desc: '' }); renderKgItems(); };
  window.removeKgItem = (i) => { window.kgItems.splice(i, 1); renderKgItems(); };

  window.saveKeunggulan = () => {
    const items = Array.from(document.querySelectorAll('.kg-item-title')).map((el, i) => ({
      title: el.value,
      desc: document.querySelectorAll('.kg-item-desc')[i].value
    }));
    saveSection('keunggulan', {
      eyebrow: 'Keunggulan Layanan',
      title: 'Kenapa <em>El Partners</em>?',
      items
    });
  };

  // ════════════════════════════════════════════
  //  5. PORTFOLIO EDITOR
  // ════════════════════════════════════════════

  function renderPortfolioEditor(d) {
    editorArea.innerHTML = `
      <div class="editor-section">
        <div class="editor-section-title">Portfolio &amp; Klien</div>

        <div class="form-group">
          <label class="form-label">Judul Section</label>
          <input id="pf-title" class="form-control" value="${toPlain(d.title)}">
        </div>
        <div class="form-group">
          <label class="form-label">Deskripsi</label>
          <textarea id="pf-desc" class="form-control" rows="2">${toPlain(d.desc)}</textarea>
        </div>

        <!-- Counters -->
        <div class="editor-subsection">
          <div class="editor-subsection-title">Counter Strip</div>
          <div id="pf-counters-container"></div>
          <button class="btn-outline btn-sm" onclick="addPfCounter()">+ Tambah Counter</button>
        </div>

        <!-- Cases -->
        <div class="editor-subsection">
          <div class="editor-subsection-title">Studi Kasus</div>
          <div id="pf-cases-container"></div>
          <button class="btn-outline btn-sm" onclick="addPfCase()">+ Tambah Case</button>
        </div>

        <!-- Client Logos -->
        <div class="editor-subsection">
          <div class="editor-subsection-title">Logo Klien — Ticker 1</div>
          <div id="ticker1Editor"></div>
          <button class="btn-outline btn-sm" onclick="addTicker1Item()">+ Tambah Client</button>
        </div>
        <div class="editor-subsection">
          <div class="editor-subsection-title">Logo Klien — Ticker 2</div>
          <div id="ticker2Editor"></div>
          <button class="btn-outline btn-sm" onclick="addTicker2Item()">+ Tambah Client</button>
        </div>

        <!-- Testimonials -->
        <div class="editor-subsection">
          <div class="editor-subsection-title">Testimonial</div>
          <div id="pf-testimonials-container"></div>
          <button class="btn-outline btn-sm" onclick="addPfTestimonial()">+ Tambah Testimonial</button>
        </div>

        <div class="editor-actions">
          <button class="btn-primary" onclick="savePortfolio()">Simpan Semua Perubahan</button>
        </div>
      </div>
    `;

    // Init data
    window.pfCounters = (d.counters || []).slice();
    window.pfCases = (d.cases || []).slice();
    window.pfTestimonials = (d.testimonials || []).slice();
    window.pfTicker1 = (d.clients_ticker_1 || []).slice();
    window.pfTicker2 = (d.clients_ticker_2 || []).slice();

    renderPfCounters();
    renderPfCases();
    renderTicker('ticker1Editor', 'pfTicker1');
    renderTicker('ticker2Editor', 'pfTicker2');
    renderPfTestimonials();
  }

  // ── Counters ──
  function renderPfCounters() {
    const c = $('pf-counters-container');
    if (!c) return;
    c.innerHTML = (window.pfCounters || []).map((s, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${i + 1}</span>
          <button class="btn-icon btn-danger-sm" onclick="removePfCounter(${i})">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2;">
            <label class="form-label" style="font-size:10px;">Label</label>
            <input class="form-control form-control-sm pf-counter-label" value="${toPlain(s.label)}" data-idx="${i}">
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label" style="font-size:10px;">Target Angka</label>
            <input class="form-control form-control-sm pf-counter-target" type="number" value="${s.target}" data-idx="${i}">
          </div>
          <div class="form-group" style="flex:0 0 80px;">
            <label class="form-label" style="font-size:10px;">Suffix</label>
            <input class="form-control form-control-sm pf-counter-suffix" value="${toPlain(s.suffix)}" data-idx="${i}">
          </div>
        </div>
      </div>
    `).join('');
  }
  window.addPfCounter = () => { window.pfCounters.push({ label: '', target: 0, suffix: '+' }); renderPfCounters(); };
  window.removePfCounter = (i) => { window.pfCounters.splice(i, 1); renderPfCounters(); };

  // ── Cases ──
  function renderPfCases() {
    const c = $('pf-cases-container');
    if (!c) return;
    c.innerHTML = (window.pfCases || []).map((cs, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${i + 1}</span>
          <button class="btn-icon btn-danger-sm" onclick="removePfCase(${i})">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Tag</label>
            <input class="form-control form-control-sm pf-case-tag" value="${toPlain(cs.tag)}" data-idx="${i}">
          </div>
          <div class="form-group" style="flex:2;">
            <label class="form-label" style="font-size:10px;">Nama Perusahaan</label>
            <input class="form-control form-control-sm pf-case-company" value="${toPlain(cs.company)}" data-idx="${i}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Industri</label>
            <input class="form-control form-control-sm pf-case-industry" value="${toPlain(cs.industry)}" data-idx="${i}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:10px;">Layanan (pisahkan dengan koma)</label>
          <input class="form-control form-control-sm pf-case-services" value="${(cs.services||[]).join(', ')}" data-idx="${i}">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:10px;">Deskripsi</label>
          <textarea class="form-control form-control-sm pf-case-desc" rows="2" data-idx="${i}">${toPlain(cs.desc)}</textarea>
        </div>
      </div>
    `).join('');
  }
  window.addPfCase = () => {
    window.pfCases.push({ tag: '', company: '', industry: '', services: [], desc: '' });
    renderPfCases();
  };
  window.removePfCase = (i) => { window.pfCases.splice(i, 1); renderPfCases(); };

  // ── Ticker (client logos) ──
  function renderTicker(containerId, varName) {
    const c = $(containerId);
    if (!c) return;
    const arr = window[varName] || [];
    c.innerHTML = arr.map((cl, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${i + 1}</span>
          <button class="btn-icon btn-danger-sm" onclick="removeTickerItem('${varName}', ${i})">✕</button>
        </div>
        <div class="form-row" style="align-items:end;">
          <div class="form-group" style="flex:2;">
            <label class="form-label" style="font-size:10px;">Nama Client</label>
            <input class="form-control form-control-sm ticker-name" value="${toPlain(cl.name)}" data-var="${varName}" data-idx="${i}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Jenis Usaha</label>
            <input class="form-control form-control-sm ticker-type" value="${toPlain(cl.type||'')}" data-var="${varName}" data-idx="${i}">
          </div>
          <div style="flex:0 0 100px;text-align:center;">
            ${cl.logo ? `<img src="${cl.logo}" alt="logo" style="max-width:80px;max-height:36px;display:block;margin:0 auto;border-radius:4px;">` : `<span style="font-size:10px;color:var(--text-muted);">Belum ada</span>`}
          </div>
          <div style="flex-shrink:0;display:flex;gap:4px;">
            <input type="file" accept="image/*" style="display:none;" class="ticker-file" data-var="${varName}" data-idx="${i}">
            <button class="btn-sm-outline" onclick="document.querySelector('.ticker-file[data-var=\\'${varName}\\'][data-idx=\\'${i}\\']').click()">
              ${cl.logo ? 'Ganti' : 'Upload'}
            </button>
            ${cl.logo ? `<button class="btn-sm-danger" onclick="removeTickerLogo('${varName}', ${i})">Hapus</button>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    // Attach file inputs
    c.querySelectorAll('.ticker-file').forEach(inp => {
      inp.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/upload', {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          const arr = window[inp.dataset.var];
          if (arr && arr[parseInt(inp.dataset.idx)]) arr[parseInt(inp.dataset.idx)].logo = data.url;
          renderTicker(inp.dataset.var === 'pfTicker1' ? 'ticker1Editor' : 'ticker2Editor', inp.dataset.var);
          // Auto-save to server so data persists immediately
          window.savePortfolio();
          showToast('Logo berhasil diupload dan disimpan!', 'success');
        } catch (err) {
          showToast(`Upload gagal: ${err.message}`, 'error');
        }
      });
    });
  }

  window.addTicker1Item = () => {
    window.pfTicker1.push({ name: '', type: '', logo: '' });
    renderTicker('ticker1Editor', 'pfTicker1');
  };
  window.addTicker2Item = () => {
    window.pfTicker2.push({ name: '', type: '', logo: '' });
    renderTicker('ticker2Editor', 'pfTicker2');
  };
  window.removeTickerItem = (varName, idx) => {
    window[varName].splice(idx, 1);
    const cId = varName === 'pfTicker1' ? 'ticker1Editor' : 'ticker2Editor';
    renderTicker(cId, varName);
  };
  window.removeTickerLogo = (varName, idx) => {
    if (window[varName][idx]) window[varName][idx].logo = '';
    const cId = varName === 'pfTicker1' ? 'ticker1Editor' : 'ticker2Editor';
    renderTicker(cId, varName);
    window.savePortfolio(); // Auto-save
  };

  // ── Testimonials ──
  function renderPfTestimonials() {
    const c = $('pf-testimonials-container');
    if (!c) return;
    c.innerHTML = (window.pfTestimonials || []).map((t, i) => `
      <div class="repeater-card">
        <div class="repeater-card-header">
          <span class="repeater-card-num">#${i + 1}</span>
          <button class="btn-icon btn-danger-sm" onclick="removePfTestimonial(${i})">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:0 0 80px;">
            <label class="form-label" style="font-size:10px;">Bintang (1-5)</label>
            <input class="form-control form-control-sm pf-testi-stars" type="number" min="1" max="5" value="${t.stars || 5}" data-idx="${i}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:10px;">Inisial Avatar</label>
            <input class="form-control form-control-sm pf-testi-initials" value="${toPlain(t.initials)}" maxlength="2" data-idx="${i}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2;">
            <label class="form-label" style="font-size:10px;">Nama</label>
            <input class="form-control form-control-sm pf-testi-name" value="${toPlain(t.name)}" data-idx="${i}">
          </div>
          <div class="form-group" style="flex:2;">
            <label class="form-label" style="font-size:10px;">Role / Jabatan</label>
            <input class="form-control form-control-sm pf-testi-role" value="${toPlain(t.role)}" data-idx="${i}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:10px;">Teks Testimonial</label>
          <textarea class="form-control form-control-sm pf-testi-text" rows="2" data-idx="${i}">${toPlain(t.text)}</textarea>
        </div>
      </div>
    `).join('');
  }
  window.addPfTestimonial = () => {
    window.pfTestimonials.push({ stars: 5, text: '', initials: '', name: '', role: '' });
    renderPfTestimonials();
  };
  window.removePfTestimonial = (i) => { window.pfTestimonials.splice(i, 1); renderPfTestimonials(); };

  function collectTickerData(varName) {
    const cId = varName === 'pfTicker1' ? 'ticker1Editor' : 'ticker2Editor';
    const container = $(cId);
    if (!container) return window[varName];
    return Array.from(container.querySelectorAll('.ticker-name')).map((el, i) => {
      const types = container.querySelectorAll('.ticker-type');
      return {
        name: el.value,
        type: types[i] ? types[i].value : '',
        logo: (window[varName][i] && window[varName][i].logo) || ''
      };
    });
  }

  window.savePortfolio = () => {
    const counters = Array.from(document.querySelectorAll('.pf-counter-label')).map((el, i) => ({
      label: el.value,
      target: parseInt(document.querySelectorAll('.pf-counter-target')[i]?.value) || 0,
      suffix: document.querySelectorAll('.pf-counter-suffix')[i]?.value || '+'
    }));
    const cases = Array.from(document.querySelectorAll('.pf-case-tag')).map((el, i) => ({
      tag: el.value,
      company: document.querySelectorAll('.pf-case-company')[i]?.value || '',
      industry: document.querySelectorAll('.pf-case-industry')[i]?.value || '',
      services: (document.querySelectorAll('.pf-case-services')[i]?.value || '').split(',').map(s => s.trim()).filter(Boolean),
      desc: document.querySelectorAll('.pf-case-desc')[i]?.value || ''
    }));
    const testimonials = Array.from(document.querySelectorAll('.pf-testi-stars')).map((el, i) => ({
      stars: parseInt(el.value) || 5,
      initials: document.querySelectorAll('.pf-testi-initials')[i]?.value || '',
      name: document.querySelectorAll('.pf-testi-name')[i]?.value || '',
      role: document.querySelectorAll('.pf-testi-role')[i]?.value || '',
      text: document.querySelectorAll('.pf-testi-text')[i]?.value || ''
    }));

    saveSection('portfolio', {
      eyebrow: 'Portfolio &amp; Klien',
      title: $('pf-title').value,
      desc: $('pf-desc').value,
      counters,
      cases,
      clients_ticker_1: collectTickerData('pfTicker1'),
      clients_ticker_2: collectTickerData('pfTicker2'),
      testimonials
    });
  };

  // ════════════════════════════════════════════
  //  6. KONTAK EDITOR
  // ════════════════════════════════════════════

  function renderKontakEditor(d) {
    editorArea.innerHTML = `
      <div class="editor-section">
        <div class="editor-section-title">Kontak</div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Judul Section</label>
            <input id="kt-title" class="form-control" value="${toPlain(d.title)}">
          </div>
          <div class="form-group">
            <label class="form-label">Deskripsi</label>
            <input id="kt-desc" class="form-control" value="${toPlain(d.desc)}">
          </div>
        </div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Informasi Kontak</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">No. WhatsApp / Telepon</label>
              <input id="kt-phone" class="form-control" value="${toPlain(d.phone)}">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input id="kt-email" class="form-control" value="${toPlain(d.email)}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Website</label>
              <input id="kt-web" class="form-control" value="${toPlain(d.website)}">
            </div>
            <div class="form-group">
              <label class="form-label">Alamat</label>
              <input id="kt-addr" class="form-control" value="${toPlain(d.address)}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Form Title</label>
            <input id="kt-form-title" class="form-control" value="${toPlain(d.form_title || 'Kirim Pesan')}">
          </div>
        </div>

        <div class="editor-subsection">
          <div class="editor-subsection-title">Opsi Layanan (Dropdown Form)</div>
          <div id="kt-services-container"></div>
          <button class="btn-outline btn-sm" onclick="addKtService()">+ Tambah Opsi</button>
        </div>

        <div class="editor-actions">
          <button class="btn-primary" onclick="saveKontak()">Simpan Perubahan</button>
        </div>
      </div>
    `;

    window.ktServices = (d.services_options || []).slice();
    renderKtServices();
  }

  function renderKtServices() {
    const c = $('kt-services-container');
    if (!c) return;
    c.innerHTML = (window.ktServices || []).map((s, i) => `
      <div class="repeater-card" style="display:flex;align-items:center;gap:12px;padding:10px 14px;">
        <span style="font-size:11px;color:var(--text-muted);width:24px;">#${i + 1}</span>
        <input class="form-control form-control-sm kt-svc-value" value="${toPlain(s.value)}" data-idx="${i}" placeholder="value" style="flex:1;">
        <input class="form-control form-control-sm kt-svc-label" value="${toPlain(s.label)}" data-idx="${i}" placeholder="Label" style="flex:2;">
        <button class="btn-icon btn-danger-sm" onclick="removeKtService(${i})">✕</button>
      </div>
    `).join('');
  }

  window.addKtService = () => { window.ktServices.push({ value: '', label: '' }); renderKtServices(); };
  window.removeKtService = (i) => { window.ktServices.splice(i, 1); renderKtServices(); };

  window.saveKontak = () => {
    const services_options = Array.from(document.querySelectorAll('.kt-svc-value')).map((el, i) => ({
      value: el.value,
      label: document.querySelectorAll('.kt-svc-label')[i]?.value || ''
    }));
    saveSection('kontak', {
      eyebrow: 'Hubungi Kami',
      title: $('kt-title').value,
      desc: $('kt-desc').value,
      phone: $('kt-phone').value,
      email: $('kt-email').value,
      website: $('kt-web').value,
      address: $('kt-addr').value,
      form_title: $('kt-form-title').value,
      services_options
    });
  };

  // ════════════════════════════════════════════
  //  7. FOOTER EDITOR
  // ════════════════════════════════════════════

  function renderFooterEditor(d) {
    editorArea.innerHTML = `
      <div class="editor-section">
        <div class="editor-section-title">Footer</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nama Brand</label>
            <input id="ft-brand" class="form-control" value="${toPlain(d.brand)}">
          </div>
          <div class="form-group">
            <label class="form-label">Sub Brand</label>
            <input id="ft-sub" class="form-control" value="${toPlain(d.sub)}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Deskripsi Brand</label>
          <textarea id="ft-desc" class="form-control" rows="3">${toPlain(d.desc)}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tagline</label>
            <input id="ft-tagline" class="form-control" value="${toPlain(d.tagline)}">
          </div>
          <div class="form-group">
            <label class="form-label">Copyright</label>
            <input id="ft-copy" class="form-control" value="${toPlain(d.copyright)}">
          </div>
        </div>
        <div class="editor-actions">
          <button class="btn-primary" onclick="saveFooter()">Simpan Perubahan</button>
        </div>
      </div>
    `;
  }

  window.saveFooter = () => {
    saveSection('footer', {
      brand: $('ft-brand').value,
      sub: $('ft-sub').value,
      desc: $('ft-desc').value,
      tagline: $('ft-tagline').value,
      copyright: $('ft-copy').value
    });
  };

  // ════════════════════════════════════════════
  //  UTILITY
  // ════════════════════════════════════════════

  function showToast(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

  // ── Clean text for admin display (strip HTML, decode entities) ──
  function toPlain(text) {
    if (typeof text !== 'string') return text || '';
    // Decode HTML entities: &amp; → &, &lt; → <, &gt; → >, &quot; → "
    let t = text.replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/&nbsp;/g, ' ');
    // Replace <br> with space, strip all other HTML tags
    t = t.replace(/<br\s*\/?>/gi, ' ');
    t = t.replace(/<[^>]*>/g, '');
    // Collapse multiple spaces
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  function esc(text) {
    if (typeof text !== 'string') return text || '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
