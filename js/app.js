/* =========================================================
   js/app.js
   Inisialisasi Aplikasi, Navigasi Tab, Mode Bulking/Cutting,
   & Registrasi Service Worker PWA
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  let toastTimeout = null;

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.add("hidden");
    }, 2800);
  }

  // --- Sinkronisasi UI Mode Bulking vs Cutting ---
  function applyGoalUI() {
    const settings = StorageManager.getSettings();
    const pillBtn = document.getElementById("goal-pill-btn");
    const pillText = document.getElementById("goal-pill-text");
    const banner = document.getElementById("goal-guidance-banner");
    const goalSelect = document.getElementById("program-goal-select");
    const unitSelect = document.getElementById("unit-select");
    const restInput = document.getElementById("default-rest-input");

    if (goalSelect) goalSelect.value = settings.goal;
    if (unitSelect) unitSelect.value = settings.unit;
    if (restInput) restInput.value = settings.defaultRest;

    document.querySelectorAll(".unit-label").forEach((el) => {
      el.textContent = settings.unit;
    });

    if (settings.goal === "bulking") {
      pillBtn?.classList.remove("goal-cutting");
      pillBtn?.classList.add("goal-bulking");
      if (pillText) pillText.textContent = "Mode: Tambah Massa Otot";
      if (banner) {
        banner.textContent =
          "Fokus Bulking: Dorong progressive overload (naikkan beban atau repetisi bertahap).";
      }
    } else {
      pillBtn?.classList.remove("goal-bulking");
      pillBtn?.classList.add("goal-cutting");
      if (pillText) pillText.textContent = "Mode: Diet / Cutting";
      if (banner) {
        banner.textContent =
          "Fokus Diet (Cutting): Pertahankan beban & kekuatan agar massa otot tetap terjaga saat defisit.";
      }
    }
  }

  // --- Navigasi Tab Bawah ---
  function switchTab(targetTabId) {
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("hidden", panel.id !== targetTabId);
      panel.classList.toggle("active", panel.id === targetTabId);
    });

    document.querySelectorAll(".nav-item").forEach((nav) => {
      nav.classList.toggle("active", nav.getAttribute("data-tab") === targetTabId);
    });

    if (targetTabId === "tab-history") {
      WorkoutController.refreshAllData(true);
    }
  }

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      if (target) switchTab(target);
    });
  });

  // Klik cepat badge mode di header untuk berganti Bulking <-> Cutting
  document.getElementById("goal-pill-btn")?.addEventListener("click", async () => {
    const current = StorageManager.getSettings();
    const nextGoal = current.goal === "bulking" ? "cutting" : "bulking";
    StorageManager.saveSettings({ goal: nextGoal });
    applyGoalUI();
    await WorkoutController.refreshAllData(true);
    showToast(
      nextGoal === "bulking"
        ? "Beralih ke Mode Tambah Massa Otot (Bulking)"
        : "Beralih ke Mode Diet / Cutting"
    );
  });

  // Simpan Pengaturan di Tab Program
  document.getElementById("save-settings-btn")?.addEventListener("click", async () => {
    const goal = document.getElementById("program-goal-select")?.value || "bulking";
    const unit = document.getElementById("unit-select")?.value || "kg";
    const defaultRest = Number(document.getElementById("default-rest-input")?.value) || 90;

    StorageManager.saveSettings({ goal, unit, defaultRest });
    RestTimer.setDefaultDuration(defaultRest);
    applyGoalUI();
    await WorkoutController.refreshAllData(true);
    showToast("Pengaturan program disimpan.");
  });

  // --- Ekspor Data JSON ---
  document.getElementById("export-json-btn")?.addEventListener("click", async () => {
    try {
      const data = await StorageManager.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ironlog-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("File backup JSON berhasil diunduh.");
    } catch {
      showToast("Gagal mengekspor data.");
    }
  });

  // --- Impor Data JSON ---
  document.getElementById("import-json-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const count = await StorageManager.importAllData(parsed);
      applyGoalUI();
      RestTimer.setDefaultDuration(StorageManager.getSettings().defaultRest);
      await WorkoutController.refreshAllData(false);
      showToast(`Berhasil memulihkan ${count} set latihan.`);
    } catch (err) {
      showToast(err.message || "File JSON tidak valid.");
    } finally {
      e.target.value = "";
    }
  });

  // --- Indikator Status Online / Offline ---
  function updateNetworkBadge() {
    const badge = document.getElementById("offline-badge");
    if (!badge) return;
    if (navigator.onLine) {
      badge.textContent = "Siap Offline";
      badge.className = "status-badge status-online";
    } else {
      badge.textContent = "Mode Offline";
      badge.className = "status-badge status-offline";
    }
  }

  window.addEventListener("online", updateNetworkBadge);
  window.addEventListener("offline", updateNetworkBadge);

  // --- Registrasi Service Worker untuk PWA & Offline ---
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Tetap berjalan normal meski SW gagal terdaftar
      });
    });
  }

  // --- Jalankan Inisialisasi ---
  const initialSettings = StorageManager.getSettings();
  applyGoalUI();
  updateNetworkBadge();
  RestTimer.init(initialSettings.defaultRest);
  WorkoutController.init(showToast);
  await WorkoutController.refreshAllData(false);
});
