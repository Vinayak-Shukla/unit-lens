// popup.js — renders the settings UI and persists changes to chrome.storage.
(function () {
  "use strict";

  const UnitLens = window.UnitLens;
  const CATEGORIES = UnitLens.CATEGORIES;
  const STORAGE_KEY = "unitLensSettings";

  const masterToggle = document.getElementById("master-toggle");
  const list = document.getElementById("category-list");
  const status = document.getElementById("status");

  let settings = UnitLens.defaultSettings();

  chrome.storage.sync.get(STORAGE_KEY, (data) => {
    settings = merge(data[STORAGE_KEY]);
    render();
  });

  function merge(stored) {
    const def = UnitLens.defaultSettings();
    if (!stored) return def;
    return {
      enabled: stored.enabled !== false,
      categories: Object.assign({}, def.categories, stored.categories),
      targets: Object.assign({}, def.targets, stored.targets),
    };
  }

  function save() {
    chrome.storage.sync.set({ [STORAGE_KEY]: settings }, () => {
      flashStatus("Saved — refresh the page to see changes.");
    });
  }

  let statusTimer = null;
  function flashStatus(msg) {
    status.textContent = msg;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.textContent = "Changes apply on the next page load or refresh.";
    }, 2500);
  }

  function render() {
    masterToggle.checked = settings.enabled;
    list.innerHTML = "";

    Object.keys(CATEGORIES).forEach((catKey) => {
      const cat = CATEGORIES[catKey];
      const row = document.createElement("li");
      row.className = "category-row" + (settings.categories[catKey] ? "" : " disabled");

      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.className = "row-toggle";
      toggle.checked = !!settings.categories[catKey];
      toggle.title = "Convert " + cat.label.toLowerCase();
      toggle.addEventListener("change", () => {
        settings.categories[catKey] = toggle.checked;
        row.classList.toggle("disabled", !toggle.checked);
        select.disabled = !toggle.checked;
        save();
      });

      const label = document.createElement("span");
      label.className = "row-label";
      label.textContent = cat.label;

      const select = document.createElement("select");
      select.disabled = !settings.categories[catKey];
      cat.targets.forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u;
        opt.textContent = cat.units[u].display;
        if (u === settings.targets[catKey]) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", () => {
        settings.targets[catKey] = select.value;
        save();
      });

      row.appendChild(toggle);
      row.appendChild(label);
      row.appendChild(select);
      list.appendChild(row);
    });
  }

  masterToggle.addEventListener("change", () => {
    settings.enabled = masterToggle.checked;
    save();
  });
})();
