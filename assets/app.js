// ====== Simple state ======
const state = {
  adminToken: localStorage.getItem("GHUB_ADMIN_TOKEN") || "",
  outputKeys: [],
  logs: {
    page: 1,
    pageSize: 25,
    totalPages: 1,
  },
};

// ====== Helpers ======
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  show(t);
  setTimeout(() => hide(t), 2200);
}

function setBusy(id, on) {
  const el = $(id);
  if (!el) return;
  on ? show(el) : hide(el);
}

async function apiFetch(url, { method = "GET", body = null } = {}) {
  if (!state.adminToken) throw new Error("ADMIN_TOKEN belum diisi.");
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": state.adminToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg = json && json.error ? json.error : text;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return json;
}

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function shortTime(ts) {
  const s = safeStr(ts);
  return s.length > 19 ? s.slice(0, 19) : s;
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  toast("Copied ✅");
}

function downloadFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ====== Navigation ======
const navButtons = document.querySelectorAll(".navBtn[data-page]");
const pageSections = document.querySelectorAll(".pageSection");

function activatePage(page) {
  navButtons.forEach((btn) => {
    const isActive = btn.dataset.page === page;
    btn.classList.toggle("active", isActive);
  });

  pageSections.forEach((section) => {
    section.classList.toggle("hidden", section.id !== `page-${page}`);
  });

  if (page === "dashboard") loadStats();
  if (page === "licenses") loadLicenses();
  if (page === "logs") loadLogs();
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => activatePage(btn.dataset.page));
});

// ====== Auth Gate ======
function renderAuth() {
  $("adminToken").value = state.adminToken;
  $("authMsg").textContent = state.adminToken
    ? "Token tersimpan. Panel siap digunakan."
    : "Token disimpan lokal di browser iPhone kamu.";
}
renderAuth();

$("btnUnlock").addEventListener("click", async () => {
  state.adminToken = $("adminToken").value.trim();
  if (!state.adminToken) return toast("Token kosong ❌");
  localStorage.setItem("GHUB_ADMIN_TOKEN", state.adminToken);
  renderAuth();
  toast("Unlocked ✅");
  loadStats();
});

$("btnLock").addEventListener("click", () => {
  state.adminToken = "";
  localStorage.removeItem("GHUB_ADMIN_TOKEN");
  renderAuth();
  toast("Locked 🔒");
  loadStats();
});

$("btnPing").addEventListener("click", async () => {
  const msg = $("sysMsg");
  if (msg) msg.textContent = "Testing API connection…";
  try {
    // ping by loading licenses (cheap)
    await apiFetch("/api/licenses");
    if (msg) msg.textContent = "API OK ✅";
    toast("API OK ✅");
  } catch (e) {
    if (msg) msg.textContent = `API FAIL ❌: ${e.message}`;
    toast(`API FAIL ❌: ${e.message}`);
  }
});

// ====== Generate ======
function renderOutput() {
  const box = $("genOutput");
  box.innerHTML = "";
  if (!state.outputKeys.length) {
    box.innerHTML = `<div class="text-sm text-gray-400">Belum ada output.</div>`;
    return;
  }

  state.outputKeys.forEach((k) => {
    const row = document.createElement("button");
    row.className =
      "w-full text-left px-3 py-2 rounded-xl bg-black/30 stroke hover:bg-white/5";
    row.innerHTML = `<div class="font-bold">${k}</div><div class="text-xs text-gray-400">tap untuk copy</div>`;
    row.addEventListener("click", () => copyText(k));
    box.appendChild(row);
  });
}

$("btnGenerate").addEventListener("click", async () => {
  try {
    setBusy("genBusy", true);
    const plan = $("genPlan").value;
    const notes = $("genNotes").value || "";
    const amount = parseInt($("genAmount").value || "1", 10);

    const json = await apiFetch("/api/generate", {
      method: "POST",
      body: { plan, notes, amount },
    });

    const keys = json && json.keys ? json.keys : [];
    state.outputKeys = [...keys, ...state.outputKeys]; // newest first
    renderOutput();
    toast(`Berhasil: ${keys.length} key ✅`);
  } catch (e) {
    toast(`Gagal ❌: ${e.message}`);
  } finally {
    setBusy("genBusy", false);
  }
});

$("btnClearOut").addEventListener("click", () => {
  state.outputKeys = [];
  renderOutput();
  toast("Output cleared");
});

$("btnExportTxt").addEventListener("click", () => {
  if (!state.outputKeys.length) return toast("Output kosong");
  downloadFile("licenses.txt", state.outputKeys.join("\n"), "text/plain");
});

$("btnExportCsv").addEventListener("click", () => {
  if (!state.outputKeys.length) return toast("Output kosong");
  // sesuai EXE kamu: 1 key per baris
  downloadFile("licenses.csv", state.outputKeys.join("\n"), "text/csv");
});

// Quick actions
$("btnQuickReset").addEventListener("click", async () => {
  const license_key = $("quickKey").value.trim();
  if (!license_key) return toast("Isi license_key");
  try {
    await apiFetch("/api/reset", { method: "POST", body: { license_key } });
    toast("Reset OK ✅");
  } catch (e) {
    toast(`Reset gagal ❌: ${e.message}`);
  }
});

$("btnQuickBan").addEventListener("click", async () => {
  const license_key = $("quickKey").value.trim();
  if (!license_key) return toast("Isi license_key");
  try {
    await apiFetch("/api/ban", { method: "POST", body: { license_key } });
    toast("Ban OK ✅");
  } catch (e) {
    toast(`Ban gagal ❌: ${e.message}`);
  }
});

renderOutput();

// ====== Dashboard Stats ======
const STAT_IDS = ["statActive", "statUnused", "statBanned", "statTotal"];

function setStatText(value) {
  STAT_IDS.forEach((id) => {
    const el = $(id);
    if (el) el.textContent = value;
  });
}

async function loadStats() {
  if (!$("page-dashboard")) return;
  if (!state.adminToken) {
    setStatText("—");
    return;
  }

  setStatText("…");
  try {
    const stats = await apiFetch("/api/stats");
    $("statActive").textContent = stats.active ?? 0;
    $("statUnused").textContent = stats.unused ?? 0;
    $("statBanned").textContent = stats.banned ?? 0;
    $("statTotal").textContent = stats.total ?? 0;
  } catch (e) {
    setStatText("—");
    toast(`Stats gagal ❌: ${e.message}`);
  }
}

activatePage("dashboard");

// ====== Licenses ======
function licenseStatusBadge(status) {
  if (status === "active") return "bg-emerald-500/15 text-emerald-300";
  if (status === "banned") return "bg-red-500/15 text-red-300";
  return "bg-white/10 text-gray-200";
}

function renderLicenseCards(items) {
  const box = $("licenseCards");
  if (!box) return;
  box.innerHTML = "";

  if (!items.length) {
    box.innerHTML = `<div class="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">Belum ada data license.</div>`;
    return;
  }

  items.forEach((lic) => {
    const key = safeStr(lic.license_key);
    const plan = safeStr(lic.plan);
    const status = safeStr(lic.status);
    const notesRaw = safeStr(lic.notes);
    const notes = notesRaw ? notesRaw.slice(0, 80) : "—";
    const deviceRaw = safeStr(lic.device_id);
    const maskedDevice = deviceRaw
      ? `${deviceRaw.slice(0, 6)}••••${deviceRaw.slice(-4)}`
      : "-";
    const activated = shortTime(lic.activated_at) || "-";

    const el = document.createElement("div");
    el.className = "rounded-xl bg-white/5 border border-white/10 p-4 space-y-2";
    el.innerHTML = `
      <div class="flex justify-between gap-3">
        <span class="font-semibold text-violet-300 truncate">${key}</span>
        <span class="text-xs px-2 py-1 rounded-full ${licenseStatusBadge(status)}">${status}</span>
      </div>
      <div class="text-sm">Plan: <b>${plan}</b></div>
      <div class="text-xs text-gray-400 truncate">${notes}</div>
      <div class="text-xs text-gray-500 leading-relaxed">
        Device: ${maskedDevice}<br/>
        Activated: ${activated}
      </div>
      <div class="flex gap-2 pt-2">
        <button class="btn-amber flex-1" onclick="resetLicense(${JSON.stringify(key)})">Reset</button>
        <button class="btn-red flex-1" onclick="banLicense(${JSON.stringify(key)})">Ban</button>
        <button class="btn-glass flex-1" onclick="deleteLicense(${JSON.stringify(key)})">Delete</button>
      </div>
    `;
    box.appendChild(el);
  });
}

async function performLicenseAction(endpoint, license_key, label) {
  if (!license_key) {
    toast("License kosong");
    return;
  }
  try {
    await apiFetch(endpoint, { method: "POST", body: { license_key } });
    toast(`${label} OK ✅`);
    loadLicenses();
  } catch (e) {
    toast(`${label} gagal ❌: ${e.message}`);
  }
}

window.resetLicense = (license_key) => performLicenseAction("/api/reset", license_key, "Reset");
window.banLicense = (license_key) => performLicenseAction("/api/ban", license_key, "Ban");
async function deleteLicense(license_key) {
  if (!license_key) {
    toast("License kosong");
    return;
  }
  const ok = confirm(
    `Hapus license ${license_key}?\nTindakan ini TIDAK bisa dibatalkan.`
  );
  if (!ok) return;
  try {
    await apiFetch("/api/delete", {
      method: "POST",
      body: { license_key },
    });
    toast("Delete OK ✅");
    loadLicenses();
  } catch (e) {
    toast(`Delete gagal ❌: ${e.message}`);
  }
}
window.deleteLicense = deleteLicense;

renderLicenseCards([]);

async function loadLicenses() {
  const search = $("licSearch").value.trim();
  $("licMsg").textContent = "Loading…";
  try {
    const json = await apiFetch(
      `/api/licenses${search ? `?search=${encodeURIComponent(search)}` : ""}`
    );
    const data = json && json.data ? json.data : [];
    renderLicenses(data);
    $("licMsg").textContent = `Loaded: ${data.length}`;
  } catch (e) {
    $("licMsg").textContent = `Error: ${e.message}`;
  }
}

function statusPill(status) {
  if (status === "active")
    return `<span class="px-2 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-300 stroke">active</span>`;
  if (status === "banned")
    return `<span class="px-2 py-1 rounded-full text-xs bg-red-500/15 text-red-300 stroke">banned</span>`;
  return `<span class="px-2 py-1 rounded-full text-xs bg-white/10 text-gray-200 stroke">unused</span>`;
}

function renderLicenses(items) {
  renderLicenseCards(items);
  const tbody = $("licenseTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!items.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" class="px-4 py-4 text-center text-gray-400">Belum ada data license.</td>`;
    tbody.appendChild(tr);
    return;
  }

  items.forEach((lic) => {
    const key = safeStr(lic.license_key);
    const plan = safeStr(lic.plan);
    const status = safeStr(lic.status);
    const notes = safeStr(lic.notes).slice(0, 80);
    const device = safeStr(lic.device_id).slice(0, 26);
    const activated = shortTime(lic.activated_at);

    const tr = document.createElement("tr");
    tr.className = "border-b border-white/5 hover:bg-white/5";

    tr.innerHTML = `
      <td class="px-4 py-3">
        <button data-role="copy" class="font-semibold text-violet-300 hover:underline">${key}</button>
      </td>
      <td class="px-4 py-3">${plan}</td>
      <td class="px-4 py-3">${statusPill(status)}</td>
      <td class="px-4 py-3 text-gray-300">${notes || "-"}</td>
      <td class="px-4 py-3 text-gray-300">${device || "-"}</td>
      <td class="px-4 py-3 text-gray-300">${activated || "-"}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2 flex-wrap">
          <button data-act="reset" class="btn-amber text-xs px-3 py-1.5">Reset</button>
          <button data-act="ban" class="btn-red text-xs px-3 py-1.5">Ban</button>
          <button data-act="delete" class="btn-glass text-xs px-3 py-1.5">Delete</button>
        </div>
      </td>
    `;

    const copyBtn = tr.querySelector('[data-role="copy"]');
    if (copyBtn) {
      copyBtn.addEventListener("click", () => copyText(key));
    }

    tr.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const act = btn.getAttribute("data-act");
        if (act === "reset") {
          await performLicenseAction("/api/reset", key, "Reset");
          return;
        }
        if (act === "ban") {
          await performLicenseAction("/api/ban", key, "Ban");
          return;
        }
        if (act === "delete") {
          await deleteLicense(key);
        }
      });
    });

    tbody.appendChild(tr);
  });
}

$("btnReload").addEventListener("click", loadLicenses);

// optional: debounce search
let licTimer = null;
$("licSearch").addEventListener("input", () => {
  clearTimeout(licTimer);
  licTimer = setTimeout(loadLicenses, 350);
});

// ====== Logs ======
async function loadLogs() {
  $("logsMsg").textContent = "Loading…";

  const search = $("logsSearch").value.trim();
  const action = $("logsAction").value;
  const reason = $("logsReason").value;
  const result = $("logsResult").value;

  const qs = new URLSearchParams({
    search,
    action,
    reason,
    result,
    page: String(state.logs.page),
    pageSize: String(state.logs.pageSize),
  });

  try {
    const json = await apiFetch(`/api/logs?${qs.toString()}`);
    const data = json.data || [];
    state.logs.totalPages = json.totalPages || 1;

    $("logsPageInfo").textContent = `Page ${json.page} / ${
      state.logs.totalPages
    } • total=${json.totalCount ?? "?"}`;
    renderLogs(data);
    $("logsMsg").textContent = `Loaded: ${data.length}`;
  } catch (e) {
    $("logsMsg").textContent = `Error: ${e.message}`;
  }
}

function logAccent(action, reason) {
  if (reason === "banned") return "border-red-800 bg-red-500/5";
  if (action === "activate_success")
    return "border-emerald-800 bg-emerald-500/5";
  if (action === "activate_failed") return "border-red-700 bg-red-500/5";
  return "border-white/10 bg-black/10";
}

function renderLogs(items) {
  const tbody = $("logsTable");
  tbody.innerHTML = "";

  items.forEach((log) => {
    const id = safeStr(log.id);
    const license = safeStr(log.license_key);
    const device = safeStr(log.device_id);
    const action = safeStr(log.action);
    const reason = safeStr(log.reason);
    const time = shortTime(log.time);

    const tr = document.createElement("tr");
    tr.className = `border-b border-white/5 hover:bg-white/5`;

    tr.innerHTML = `
      <td class="py-2 pr-3">${id}</td>
      <td class="py-2 pr-3">
        <button class="font-semibold text-violet-300 hover:underline">${license}</button>
      </td>
      <td class="py-2 pr-3 text-gray-300">${device}</td>
      <td class="py-2 pr-3">
        <span class="px-2 py-1 rounded-full text-xs stroke ${
          action === "activate_success"
            ? "bg-emerald-500/15 text-emerald-300"
            : action === "activate_failed"
            ? "bg-red-500/15 text-red-300"
            : "bg-white/10 text-gray-200"
        }">${action}</span>
      </td>
      <td class="py-2 pr-3">
        <span class="px-2 py-1 rounded-full text-xs stroke ${
          reason === "banned"
            ? "bg-red-500/15 text-red-300"
            : "bg-white/10 text-gray-200"
        }">${reason}</span>
      </td>
      <td class="py-2 pr-3 text-gray-300">${time}</td>
      <td class="py-2 pr-3">
        <button class="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold">Ban</button>
      </td>
    `;

    // copy license
    tr.querySelector("td button").addEventListener("click", () =>
      copyText(license)
    );

    // ban
    tr.querySelector("td:last-child button").addEventListener(
      "click",
      async () => {
        try {
          await apiFetch("/api/ban", {
            method: "POST",
            body: { license_key: license },
          });
          toast("Ban OK ✅");
          loadLogs();
        } catch (e) {
          toast(`Ban gagal ❌: ${e.message}`);
        }
      }
    );

    tbody.appendChild(tr);
  });
}

$("btnLogsSearch").addEventListener("click", () => {
  state.logs.page = 1;
  loadLogs();
});

$("btnLogsPrev").addEventListener("click", () => {
  if (state.logs.page <= 1) return;
  state.logs.page -= 1;
  loadLogs();
});

$("btnLogsNext").addEventListener("click", () => {
  if (state.logs.page >= state.logs.totalPages) return;
  state.logs.page += 1;
  loadLogs();
});

// loads triggered via navigation in activatePage()
