// converter.js — number/unit detection + conversion math.
// Depends on units.js (window.UnitLens.CATEGORIES). Exposes scanning and
// conversion helpers on the same namespace.
(function () {
  "use strict";

  const UnitLens = (window.UnitLens = window.UnitLens || {});
  const CATEGORIES = UnitLens.CATEGORIES;

  // ---- Conversion math -----------------------------------------------------

  function toBase(value, category, unit) {
    if (category === "temperature") {
      if (unit === "C") return value;
      if (unit === "F") return ((value - 32) * 5) / 9;
      if (unit === "K") return value - 273.15;
    }
    return value * CATEGORIES[category].units[unit].factor;
  }

  function fromBase(baseValue, category, unit) {
    if (category === "temperature") {
      if (unit === "C") return baseValue;
      if (unit === "F") return (baseValue * 9) / 5 + 32;
      if (unit === "K") return baseValue + 273.15;
    }
    return baseValue / CATEGORIES[category].units[unit].factor;
  }

  function convert(value, category, fromUnit, toUnit) {
    return fromBase(toBase(value, category, fromUnit), category, toUnit);
  }
  UnitLens.convert = convert;

  // Human-friendly number formatting: scale precision by magnitude, strip
  // trailing zeros, add thousands separators.
  function formatNumber(n) {
    if (!isFinite(n)) return String(n);
    const abs = Math.abs(n);
    let s;
    if (abs >= 1000) s = n.toFixed(0);
    else if (abs >= 100) s = n.toFixed(1);
    else if (abs >= 1) s = n.toFixed(2);
    else if (abs === 0) s = "0";
    else s = n.toPrecision(3);
    const num = parseFloat(s);
    return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  UnitLens.formatNumber = formatNumber;

  function displayUnit(category, unit) {
    return CATEGORIES[category].units[unit].display;
  }
  UnitLens.displayUnit = displayUnit;

  // ---- Detection -----------------------------------------------------------

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // A number: optional sign, optional thousands separators, optional decimals.
  const NUM = "[-+]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?";

  // Single-letter unit (e.g. "g", "m") spellings are dangerously ambiguous when
  // glued straight onto a number ("5G" cellular, "4K" video, "5m" views), so we
  // require a separating space for those. Symbols ('/") and multi-char units
  // ("kg", "mi") may attach directly.
  function requiresSpace(alias) {
    return alias.length === 1 && /[a-z]/i.test(alias);
  }

  // Build matchers for the non-temperature categories that are enabled.
  // Returns { attach, spaced, lookup } where the two regexes differ only in
  // whether a space between number and unit is optional or required, and lookup
  // maps a normalized alias to { category, unit }.
  function buildMatcher(settings) {
    const lookup = {};
    const attachAliases = [];
    const spacedAliases = [];

    Object.keys(CATEGORIES).forEach((category) => {
      if (category === "temperature") return; // handled separately
      if (!settings.categories[category]) return;
      const cat = CATEGORIES[category];
      Object.keys(cat.aliases).forEach((alias) => {
        const canonical = cat.aliases[alias];
        const key = alias.toLowerCase();
        if (!(key in lookup)) {
          lookup[key] = { category, unit: canonical };
          (requiresSpace(alias) ? spacedAliases : attachAliases).push(alias);
        }
      });
    });

    if (attachAliases.length === 0 && spacedAliases.length === 0) return null;

    // Longest aliases first so "fluid ounces" / "km/h" beat "l" / "km".
    const byLen = (a, b) => b.length - a.length;
    // (?<![A-Za-z0-9]) — don't start in the middle of a word/number.
    // (?![A-Za-z])     — don't let "mi" swallow the start of "mid".
    function build(aliases, gap) {
      if (!aliases.length) return null;
      const alt = aliases.sort(byLen).map(escapeRegex).join("|");
      return new RegExp(
        "(?<![A-Za-z0-9])(" + NUM + ")" + gap + "(" + alt + ")(?![A-Za-z])",
        "gi"
      );
    }

    return {
      lookup,
      attach: build(attachAliases, "\\s*"),
      spaced: build(spacedAliases, "\\s+"),
    };
  }

  // Temperature needs a degree symbol or a spelled-out word to avoid matching
  // stray letters like "5K" (which usually means 5000, not 5 kelvin).
  const TEMP_SYMBOL = /(?<![A-Za-z0-9])([-+]?\d+(?:\.\d+)?)\s*°\s*(C|F|K)(?![A-Za-z])/gi;
  const TEMP_WORD = /(?<![A-Za-z0-9])([-+]?\d+(?:\.\d+)?)\s*°?\s*(celsius|centigrade|fahrenheit|kelvin)(?![A-Za-z])/gi;
  const TEMP_WORD_UNIT = { celsius: "C", centigrade: "C", fahrenheit: "F", kelvin: "K" };

  function parseNumber(raw) {
    return parseFloat(raw.replace(/,/g, ""));
  }

  // Scan a plain string and return a sorted, non-overlapping list of matches:
  // { start, end, original, category, fromUnit, value }.
  function findMatches(text, settings) {
    const matches = [];

    const matcher = buildMatcher(settings);
    if (matcher) {
      [matcher.attach, matcher.spaced].forEach((regex) => {
        if (!regex) return;
        let m;
        regex.lastIndex = 0;
        while ((m = regex.exec(text)) !== null) {
          const info = matcher.lookup[m[2].toLowerCase()];
          if (!info) continue;
          matches.push({
            start: m.index,
            end: m.index + m[0].length,
            original: m[0],
            category: info.category,
            fromUnit: info.unit,
            value: parseNumber(m[1]),
          });
        }
      });
    }

    if (settings.categories.temperature) {
      let m;
      TEMP_SYMBOL.lastIndex = 0;
      while ((m = TEMP_SYMBOL.exec(text)) !== null) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          original: m[0],
          category: "temperature",
          fromUnit: m[2].toUpperCase(),
          value: parseFloat(m[1]),
        });
      }
      TEMP_WORD.lastIndex = 0;
      while ((m = TEMP_WORD.exec(text)) !== null) {
        matches.push({
          start: m.index,
          end: m.index + m[0].length,
          original: m[0],
          category: "temperature",
          fromUnit: TEMP_WORD_UNIT[m[2].toLowerCase()],
          value: parseFloat(m[1]),
        });
      }
    }

    // Sort by start, then drop overlaps (keep the earliest / longest).
    matches.sort((a, b) => a.start - b.start || b.end - a.end);
    const result = [];
    let lastEnd = -1;
    for (const mt of matches) {
      if (mt.start < lastEnd) continue;
      if (isNaN(mt.value)) continue;
      result.push(mt);
      lastEnd = mt.end;
    }
    return result;
  }

  // Given a string + settings, produce the converted matches with target unit
  // and formatted output. Skips matches whose unit already equals the target.
  function scan(text, settings) {
    return findMatches(text, settings)
      .map((mt) => {
        const target = settings.targets[mt.category];
        if (!target || target === mt.fromUnit) return null;
        const converted = convert(mt.value, mt.category, mt.fromUnit, target);
        if (!isFinite(converted)) return null;
        return {
          start: mt.start,
          end: mt.end,
          original: mt.original,
          converted: formatNumber(converted) + " " + displayUnit(mt.category, target),
        };
      })
      .filter(Boolean);
  }
  UnitLens.scan = scan;
})();
