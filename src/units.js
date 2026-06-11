// units.js — unit definitions, aliases, and conversion tables.
// Loaded first; exposes everything on the shared `window.UnitLens` namespace
// so converter.js / content.js / popup.js can reach it.
(function () {
  "use strict";

  const UnitLens = (window.UnitLens = window.UnitLens || {});

  // Each category converts every unit to a common base unit via a linear
  // factor (value_in_base = value * factor). Temperature is the exception and
  // uses explicit to/from base functions because it is affine, not linear.
  //
  // `aliases` maps every spelling we want to detect (lowercased) to the
  // canonical unit key. `display` is what we render after converting.
  const CATEGORIES = {
    length: {
      label: "Length / Distance",
      base: "m",
      units: {
        mm: { factor: 0.001, display: "mm" },
        cm: { factor: 0.01, display: "cm" },
        m: { factor: 1, display: "m" },
        km: { factor: 1000, display: "km" },
        in: { factor: 0.0254, display: "in" },
        ft: { factor: 0.3048, display: "ft" },
        yd: { factor: 0.9144, display: "yd" },
        mi: { factor: 1609.344, display: "mi" },
      },
      aliases: {
        mm: "mm", millimeter: "mm", millimeters: "mm", millimetre: "mm", millimetres: "mm",
        cm: "cm", centimeter: "cm", centimeters: "cm", centimetre: "cm", centimetres: "cm",
        m: "m", meter: "m", meters: "m", metre: "m", metres: "m",
        km: "km", kilometer: "km", kilometers: "km", kilometre: "km", kilometres: "km",
        in: "in", inch: "in", inches: "in", '"': "in",
        ft: "ft", foot: "ft", feet: "ft", "'": "ft",
        yd: "yd", yard: "yd", yards: "yd",
        mi: "mi", mile: "mi", miles: "mi",
      },
      targets: ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"],
      defaultTarget: "m",
    },

    mass: {
      label: "Mass / Weight",
      base: "g",
      units: {
        mg: { factor: 0.001, display: "mg" },
        g: { factor: 1, display: "g" },
        kg: { factor: 1000, display: "kg" },
        t: { factor: 1000000, display: "t" },
        oz: { factor: 28.349523125, display: "oz" },
        lb: { factor: 453.59237, display: "lb" },
        st: { factor: 6350.29318, display: "st" },
      },
      aliases: {
        mg: "mg", milligram: "mg", milligrams: "mg",
        g: "g", gram: "g", grams: "g", gramme: "g", grammes: "g",
        kg: "kg", kilogram: "kg", kilograms: "kg", kilo: "kg", kilos: "kg",
        t: "t", tonne: "t", tonnes: "t", "metric ton": "t", "metric tons": "t",
        oz: "oz", ounce: "oz", ounces: "oz",
        lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
        st: "st", stone: "st", stones: "st",
      },
      targets: ["mg", "g", "kg", "t", "oz", "lb", "st"],
      defaultTarget: "kg",
    },

    temperature: {
      label: "Temperature",
      base: "C",
      // Affine conversions handled in converter.js via these helpers.
      units: {
        C: { display: "°C" },
        F: { display: "°F" },
        K: { display: "K" },
      },
      aliases: {
        c: "C", "°c": "C", celsius: "C", centigrade: "C",
        f: "F", "°f": "F", fahrenheit: "F",
        k: "K", kelvin: "K",
      },
      targets: ["C", "F", "K"],
      defaultTarget: "C",
    },

    volume: {
      label: "Volume",
      base: "l",
      units: {
        ml: { factor: 0.001, display: "ml" },
        l: { factor: 1, display: "l" },
        "fl oz": { factor: 0.0295735295625, display: "fl oz" },
        cup: { factor: 0.2365882365, display: "cup" },
        pt: { factor: 0.473176473, display: "pt" },
        qt: { factor: 0.946352946, display: "qt" },
        gal: { factor: 3.785411784, display: "gal" },
      },
      aliases: {
        ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
        l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
        "fl oz": "fl oz", "fluid ounce": "fl oz", "fluid ounces": "fl oz", floz: "fl oz",
        cup: "cup", cups: "cup",
        pt: "pt", pint: "pt", pints: "pt",
        qt: "qt", quart: "qt", quarts: "qt",
        gal: "gal", gallon: "gal", gallons: "gal",
      },
      targets: ["ml", "l", "fl oz", "cup", "pt", "qt", "gal"],
      defaultTarget: "l",
    },

    speed: {
      label: "Speed",
      base: "m/s",
      units: {
        "m/s": { factor: 1, display: "m/s" },
        "km/h": { factor: 0.277777778, display: "km/h" },
        mph: { factor: 0.44704, display: "mph" },
        knot: { factor: 0.514444444, display: "kn" },
      },
      aliases: {
        "m/s": "m/s", mps: "m/s",
        "km/h": "km/h", kmh: "km/h", kph: "km/h", "kph": "km/h",
        mph: "mph",
        knot: "knot", knots: "knot", kn: "knot", kt: "knot",
      },
      targets: ["m/s", "km/h", "mph", "knot"],
      defaultTarget: "km/h",
    },

    area: {
      label: "Area",
      base: "m2",
      units: {
        cm2: { factor: 0.0001, display: "cm²" },
        m2: { factor: 1, display: "m²" },
        km2: { factor: 1000000, display: "km²" },
        ha: { factor: 10000, display: "ha" },
        "sq ft": { factor: 0.09290304, display: "sq ft" },
        acre: { factor: 4046.8564224, display: "acre" },
        "sq mi": { factor: 2589988.110336, display: "sq mi" },
      },
      aliases: {
        "cm2": "cm2", "sq cm": "cm2", "square centimeter": "cm2", "square centimeters": "cm2",
        "m2": "m2", "sq m": "m2", "square meter": "m2", "square meters": "m2", "square metre": "m2", "square metres": "m2",
        "km2": "km2", "sq km": "km2", "square kilometer": "km2", "square kilometers": "km2",
        ha: "ha", hectare: "ha", hectares: "ha",
        "sq ft": "sq ft", sqft: "sq ft", "square foot": "sq ft", "square feet": "sq ft",
        acre: "acre", acres: "acre",
        "sq mi": "sq mi", "square mile": "sq mi", "square miles": "sq mi",
      },
      targets: ["cm2", "m2", "km2", "ha", "sq ft", "acre", "sq mi"],
      defaultTarget: "m2",
    },
  };

  UnitLens.CATEGORIES = CATEGORIES;

  // Default preferences: every category enabled, mapped to its default target.
  UnitLens.defaultSettings = function () {
    const targets = {};
    Object.keys(CATEGORIES).forEach((cat) => {
      targets[cat] = CATEGORIES[cat].defaultTarget;
    });
    return {
      enabled: true, // master on/off
      categories: Object.keys(CATEGORIES).reduce((acc, cat) => {
        acc[cat] = true;
        return acc;
      }, {}),
      targets,
    };
  };
})();
