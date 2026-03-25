"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── PHASE & SCORING LOGIC ─────────────────────────────────────────
const PHASES = [
  { name: "Phase 1", alcMin: 0.2, label: "HIGH RISK", color: "#E94B35", bg: "#FEF0EE" },
  { name: "Phase 2", alcMin: 0.8, label: "MODERATE RISK", color: "#E07D1A", bg: "#FFF5EB" },
  { name: "Phase 3", alcMin: 1.0, label: "LOW RISK", color: "#D4A017", bg: "#FFFBE6" },
  { name: "Clear", alcMin: 1.3, label: "CLEARED", color: "#5B7B8F", bg: "#EDF2F5" },
];

function getPhase(alc) {
  if (alc >= 1.3) return PHASES[3];
  if (alc >= 1.0) return PHASES[2];
  if (alc >= 0.8) return PHASES[1];
  return PHASES[0];
}

const PROTOCOLS = {
  "Phase 1": [
    { icon: "\u{1F6AB}", text: "No indoor dining, flights, or large gatherings", type: "critical" },
    { icon: "\u{1F33F}", text: "Outdoor visits only (1\u20132 friends max, distanced)", type: "caution" },
    { icon: "\u{1F3E0}", text: "No indoor visitors at home", type: "critical" },
    { icon: "\u{1F637}", text: "Mask for all shared indoor spaces", type: "caution" },
    { icon: "\u{1F9EA}", text: "Same-day rapid test required for any social contact", type: "warning" },
    { icon: "\u23F3", text: "Wait 1 week post-ATG for any visits", type: "warning" },
  ],
  "Phase 2": [
    { icon: "\u{1F6AB}", text: "No flights or large indoor events (50+ people)", type: "critical" },
    { icon: "\u{1F465}", text: "Small indoor visits OK (up to 4 people, ventilated)", type: "caution" },
    { icon: "\u{1F37D}\uFE0F", text: "Outdoor dining OK; indoor dining with caution", type: "caution" },
    { icon: "\u{1F637}", text: "Mask in crowded indoor spaces", type: "warning" },
    { icon: "\u{1F9EA}", text: "Rapid test if exposed to illness", type: "warning" },
  ],
  "Phase 3": [
    { icon: "\u2708\uFE0F", text: "Flights OK with N95 mask", type: "caution" },
    { icon: "\u{1F465}", text: "Indoor gatherings OK (moderate size)", type: "info" },
    { icon: "\u{1F37D}\uFE0F", text: "Indoor dining OK", type: "info" },
    { icon: "\u{1F637}", text: "Mask during high community illness (optional otherwise)", type: "info" },
    { icon: "\u{1F9EA}", text: "Test if symptomatic or known exposure", type: "warning" },
  ],
  Clear: [
    { icon: "\u2705", text: "Resume normal social activities", type: "info" },
    { icon: "\u{1F48A}", text: "Continue all medications as prescribed", type: "warning" },
    { icon: "\u{1F4CB}", text: "Maintain follow-up schedule with transplant team", type: "info" },
    { icon: "\u{1F9EA}", text: "Test if symptomatic", type: "info" },
  ],
};

const PARTNER_PROTOCOLS = {
  "Phase 1": {
    summary: "Patient is in high risk phase. Increased precautions recommended for partner activities.",
    exposure: {
      GREEN: "Normal home life. Mask after being indoors with others. Same-day test before close contact if exposed.",
      YELLOW: "Mask at home for 24h after exposure. Avoid close contact until negative rapid test.",
      RED: "Isolate from patient for 48h minimum. Rapid test before resuming close contact.",
    },
    baseline: ["HEPA filters running in bedroom + main room", "Windows cracked for ventilation when feasible", "Wash hands upon arriving home", "No shared utensils, cups, or towels"],
  },
  "Phase 2": {
    summary: "Patient is in moderate risk phase. Standard precautions recommended for partner activities.",
    exposure: { GREEN: "Normal home life. Standard hygiene practices.", YELLOW: "Monitor for symptoms. Rapid test if any develop.", RED: "Mask at home for 24h. Rapid test before close contact." },
    baseline: ["HEPA filter in bedroom", "Wash hands upon arriving home", "No sharing utensils if either is symptomatic"],
  },
  "Phase 3": {
    summary: "Patient is in low risk phase. Minimal additional precautions needed.",
    exposure: { GREEN: "Normal home life.", YELLOW: "Standard hygiene. Monitor for symptoms.", RED: "Rapid test if symptomatic. Brief masking if positive." },
    baseline: ["Wash hands regularly", "Basic hygiene practices"],
  },
  Clear: {
    summary: "Patient has been cleared. Resume normal household routines.",
    exposure: { GREEN: "Normal life.", YELLOW: "Normal life. Monitor for symptoms.", RED: "Standard illness precautions." },
    baseline: ["Standard household hygiene"],
  },
};

const COMMUNITY_CITIES = [
  { name: "Los Angeles", url: "http://ph.lacounty.gov/acd/respwatch/" },
  { name: "San Francisco", url: "https://www.sf.gov/respiratory-virus-hospitalizations" },
  { name: "San Diego", url: "https://www.sandiegocounty.gov/content/sdc/hhsa/programs/phs/community_epidemiology/dc/respiratoryviruses/surveillance.html" },
  { name: "Seattle", url: "https://kingcounty.gov/en/dept/dph/health-safety/disease-illness/respiratory-virus-data" },
  { name: "Denver", url: "https://cdphe.colorado.gov/dcphr/wastewater" },
  { name: "Houston", url: "https://texas-respiratory-illness-dashboard-txdshsea.hub.arcgis.com" },
  { name: "Dallas", url: "https://texas-respiratory-illness-dashboard-txdshsea.hub.arcgis.com" },
  { name: "Austin", url: "https://texas-respiratory-illness-dashboard-txdshsea.hub.arcgis.com" },
  { name: "Miami", url: "https://www.floridahealth.gov/diseases-and-conditions/?category=respiratory" },
  { name: "New York City", url: "https://nyshc.health.ny.gov/web/nyapd/new-york-state-flu-tracker" },
  { name: "Boston", url: "https://www.boston.gov/government/cabinets/boston-public-health-commission/respiratory-diseases-dashboard" },
  { name: "Philadelphia", url: "https://hip.phila.gov/data-reports-statistics/respiratory-viruses/respiratory-virus-archive/weekly-reports_2022/" },
  { name: "Washington D.C.", url: "https://dchealth.dc.gov/page/influenza-surveillance-dashboard" },
  { name: "Minneapolis", url: "https://www.health.state.mn.us/diseases/flu/stats/index.html" },
  { name: "Chicago", url: "https://www.chicago.gov/city/en/depts/cdph/supp_info/infectious/respiratory-illness/respiratory-illness-data.html" },
  { name: "Atlanta", url: "https://dph.georgia.gov/epidemiology/acute-disease-epidemiology/viral-respiratory-diseases" },
  { name: "Detroit", url: "https://www.michigan.gov/mdhhs/keep-mi-healthy/communicable-diseases/respiratory-illness-surveillance" },
  { name: "Phoenix", url: "https://www.maricopa.gov/1872/Respiratory-Virus-Surveillance" },
  { name: "Other", url: "https://www.cdc.gov/respiratory-viruses/data/activity-levels.html" },
];

const ORGAN_OPTIONS = ["Kidney", "Pancreas", "Lung", "Heart", "Liver"];

function calcInfectionScore(t, m, p) {
  let s = 0;
  if (t > 12) s += 3; else if (t > 10) s += 2; else if (t > 8) s += 1;
  if (m >= 2000) s += 3; else if (m >= 1500) s += 2; else if (m >= 1000) s += 1;
  if (p >= 20) s += 3; else if (p >= 10) s += 2; else if (p >= 5) s += 1;
  return Math.min(s, 10);
}
function calcRejectionScore(t, m, p) {
  let s = 0;
  if (t < 4) s += 3; else if (t < 6) s += 2; else if (t < 8) s += 1;
  if (m < 500) s += 3; else if (m < 750) s += 2; else if (m < 1000) s += 1;
  if (p < 2.5) s += 3; else if (p < 5) s += 2; else if (p < 7.5) s += 1;
  return Math.min(s, 10);
}
function getImmunoMessage(inf, rej) {
  const c = Math.round((inf + rej) / 2);
  if (c <= 3) return { text: "Immunosuppression levels appear balanced.", status: "good" };
  if (c <= 6) return { text: "Some values outside optimal range. Discuss with your team.", status: "caution" };
  return { text: "Multiple values concerning. Contact transplant team.", status: "alert" };
}
function getSymptomStatus(temp, sys, dia, uo, co, gi, fat) {
  let a = 0;
  if (temp > 100.4 || (temp > 0 && temp < 96.0)) a++;
  if ((sys > 160 || (sys > 0 && sys < 90)) || (dia > 100 || (dia > 0 && dia < 50))) a++;
  if (uo === "Low" || uo === "Very Low") a++;
  if (co === "Moderate" || co === "Severe") a++;
  if (gi === "Moderate" || gi === "Severe") a++;
  if (fat === "Moderate" || fat === "Severe") a++;
  if (a === 0) return { label: "Normal", color: "#5B7B8F", bg: "#EDF2F5" };
  if (a === 1) return { label: "Monitor", color: "#D4A017", bg: "#FFFBE6" };
  return { label: "Concerning", color: "#E94B35", bg: "#FEF0EE" };
}

function generateCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

// Font
if (typeof document !== "undefined") {
  const fl = document.createElement("link");
  fl.href = "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap";
  fl.rel = "stylesheet";
  if (!document.querySelector('link[href*="DM+Sans"]')) document.head.appendChild(fl);
}

const CSS = `
:root{--bg:#F8F7F4;--surface:#FFF;--surface-alt:#F2F0ED;--border:#E8E5E0;--border-hover:#D1CEC8;--text-primary:#1A1918;--text-secondary:#6B6762;--text-muted:#9C9890;--accent:#4A6274;--accent-light:#EDF1F4;--red:#E94B35;--red-bg:#FEF0EE;--orange:#E07D1A;--orange-bg:#FFF5EB;--yellow:#D4A017;--yellow-bg:#FFFBE6;--green:#5B7B8F;--green-bg:#EDF2F5;--font-body:'DM Sans',-apple-system,sans-serif;--font-display:'DM Serif Display',Georgia,serif;--shadow-sm:0 1px 2px rgba(0,0,0,.04);--shadow-md:0 2px 8px rgba(0,0,0,.06);--shadow-lg:0 4px 16px rgba(0,0,0,.08);--radius:12px;--radius-sm:8px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font-body);background:var(--bg);color:var(--text-primary);-webkit-font-smoothing:antialiased}
.app-container{max-width:1120px;margin:0 auto;padding:0 24px 80px}
.header{display:flex;align-items:center;justify-content:space-between;padding:20px 0;border-bottom:1px solid var(--border);margin-bottom:28px}
.header-left{display:flex;align-items:center;gap:12px}
.header-logo{width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px}
.header-title{font-family:var(--font-display);font-size:22px;letter-spacing:-.01em}
.header-right{display:flex;align-items:center;gap:12px}
.phase-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:.03em;text-transform:uppercase}
.user-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:500;background:var(--surface-alt);color:var(--text-secondary);border:1px solid var(--border)}
.tabs{display:flex;background:var(--surface-alt);border-radius:var(--radius);padding:4px;margin-bottom:28px}
.tab{flex:1;padding:10px 20px;border-radius:var(--radius-sm);font-size:14px;font-weight:500;border:none;cursor:pointer;transition:all .2s;background:0 0;color:var(--text-secondary);font-family:var(--font-body)}
.tab.active{background:var(--surface);color:var(--text-primary);box-shadow:var(--shadow-sm)}
.tab:hover:not(.active){color:var(--text-primary)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.grid-full{grid-column:1/-1}
.card{background:var(--surface);border-radius:var(--radius);border:1px solid var(--border);padding:24px;transition:box-shadow .2s}
.card:hover{box-shadow:var(--shadow-md)}
.card-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}
.card-title{font-family:var(--font-display);font-size:18px}
.card-subtitle{font-size:12px;color:var(--text-muted);margin-top:4px}
.status-pill{font-size:11px;font-weight:600;padding:4px 10px;border-radius:12px;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap}
.phase-display{display:flex;align-items:baseline;gap:16px;margin:12px 0 20px}
.phase-name{font-family:var(--font-display);font-size:36px;line-height:1}
.phase-detail{font-size:14px;color:var(--text-secondary)}
.phase-detail strong{color:var(--text-primary);font-weight:600}
.form-row{display:flex;gap:12px;align-items:flex-end;margin-bottom:12px}
.form-group{display:flex;flex-direction:column;gap:4px;flex:1}
.form-label{font-size:12px;font-weight:500;color:var(--text-secondary);letter-spacing:.01em}
.form-input{padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:15px;font-family:var(--font-body);color:var(--text-primary);background:var(--surface);transition:border-color .2s;width:100%}
.form-input:focus{outline:none;border-color:var(--accent)}
.form-input:disabled{background:var(--surface-alt);color:var(--text-secondary);cursor:not-allowed}
.btn{padding:8px 20px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;font-family:var(--font-body);border:none;cursor:pointer;transition:all .2s}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#3B5163}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-orange{background:#E07D1A;color:#fff}
.btn-orange:hover{background:#C96A0E}
.btn-ghost{background:0 0;color:var(--text-secondary);border:1px solid var(--border)}
.btn-ghost:hover{border-color:var(--border-hover);color:var(--text-primary)}
.protocol-list{display:flex;flex-direction:column;gap:8px}
.protocol-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);font-size:13px;line-height:1.4}
.protocol-item.critical{background:var(--red-bg)}
.protocol-item.caution{background:var(--orange-bg)}
.protocol-item.warning{background:var(--yellow-bg)}
.protocol-item.info{background:var(--green-bg)}
.protocol-icon{font-size:16px;flex-shrink:0}
.score-row{display:flex;gap:16px;margin-top:16px}
.score-item{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary)}
.score-value{font-weight:700;font-size:14px;padding:3px 8px;border-radius:6px;min-width:40px;text-align:center}
.score-low{background:var(--green-bg);color:var(--green)}
.score-mid{background:var(--yellow-bg);color:var(--yellow)}
.score-high{background:var(--red-bg);color:var(--red)}
.immuno-message{font-size:12px;padding:8px 12px;border-radius:var(--radius-sm);margin-top:12px;line-height:1.4}
.alc-chart{position:relative;height:180px;margin:12px 0;border-left:1px solid var(--border);border-bottom:1px solid var(--border);padding:8px 0 0 36px}
.alc-chart-area{position:relative;width:100%;height:100%}
.alc-threshold{position:absolute;left:0;right:0;border-top:1px dashed;font-size:10px}
.alc-point{position:absolute;width:8px;height:8px;border-radius:50%;background:var(--accent);transform:translate(-50%,-50%);z-index:2}
.alc-y-label{position:absolute;left:-32px;font-size:10px;color:var(--text-muted);transform:translateY(-50%)}
.alc-x-label{position:absolute;bottom:-20px;font-size:10px;color:var(--text-muted);transform:translateX(-50%)}
.exposure-option{padding:12px 16px;border-radius:var(--radius-sm);border:2px solid transparent;cursor:pointer;margin-bottom:8px;transition:all .15s}
.exposure-option:hover{transform:translateX(2px)}
.exposure-option.green{background:#EEF2F5;border-color:#C4D3DC}
.exposure-option.yellow{background:#FFFCE8;border-color:#F0E4A8}
.exposure-option.red{background:#FFF0EE;border-color:#F4C4BC}
.exposure-option.selected.green{border-color:var(--green);box-shadow:0 0 0 1px var(--green)}
.exposure-option.selected.yellow{border-color:var(--yellow);box-shadow:0 0 0 1px var(--yellow)}
.exposure-option.selected.red{border-color:var(--red);box-shadow:0 0 0 1px var(--red)}
.exposure-title{font-weight:600;font-size:13px;margin-bottom:2px}
.exposure-desc{font-size:12px;color:var(--text-secondary)}
.symptom-select{padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:var(--font-body);background:var(--surface);color:var(--text-primary);cursor:pointer;width:100%;appearance:auto}
.symptom-select:disabled{background:var(--surface-alt);cursor:not-allowed}
.symptom-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px}
.symptom-alert{display:flex;align-items:center;gap:6px;padding:10px 14px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;margin-top:16px}
.community-link{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);color:var(--text-primary);text-decoration:none;font-size:13px;font-weight:500;transition:all .2s}
.community-link:hover{border-color:var(--accent);color:var(--accent)}
.partner-exposure-status{padding:14px 16px;border-radius:var(--radius-sm);border-left:3px solid;margin:12px 0}
.partner-exposure-status.GREEN{background:var(--green-bg);border-color:var(--green)}
.partner-exposure-status.YELLOW{background:var(--yellow-bg);border-color:var(--yellow)}
.partner-exposure-status.RED{background:var(--red-bg);border-color:var(--red)}
.baseline-item{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px}
.baseline-check{width:18px;height:18px;border-radius:4px;background:var(--green-bg);color:var(--green);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
.assessment-log{margin-top:16px;border-top:1px solid var(--border);padding-top:12px}
.assessment-entry{display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid var(--surface-alt)}
.assessment-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:8px}
.divider{height:1px;background:var(--border);margin:16px 0}
.bp-row{display:flex;align-items:center;gap:6px}
.bp-slash{font-size:18px;color:var(--text-muted);padding-top:4px}
.onboarding{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg)}
.onboarding-card{background:var(--surface);border-radius:16px;padding:40px;max-width:480px;width:100%;box-shadow:var(--shadow-lg);border:1px solid var(--border)}
.onboarding-card h1{font-family:var(--font-display);font-size:28px;margin-bottom:6px}
.onboarding-card p{font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px}
.role-option{padding:16px 20px;border-radius:var(--radius);border:2px solid var(--border);cursor:pointer;margin-bottom:12px;transition:all .15s}
.role-option:hover{border-color:var(--accent)}
.role-option.selected{border-color:var(--accent);background:var(--accent-light)}
.role-option h3{font-size:15px;font-weight:600;margin-bottom:4px}
.role-option p{font-size:13px;margin-bottom:0}
.share-code{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;background:var(--surface-alt);border-radius:var(--radius);margin:16px 0 4px;font-size:28px;font-weight:700;letter-spacing:.15em;font-family:'DM Sans',monospace;color:var(--accent)}
.share-code-label{font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:12px}
.code-input{text-align:center;font-size:24px;font-weight:700;letter-spacing:.15em;padding:12px;text-transform:uppercase}
.error-msg{color:var(--red);font-size:13px;margin-top:8px;text-align:center}
.about-toggle{position:fixed;bottom:24px;right:24px;width:44px;height:44px;border-radius:50%;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-lg);z-index:100;transition:transform .2s}
.about-toggle:hover{transform:scale(1.08)}
.about-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px)}
.about-panel{background:var(--surface);border-radius:16px;max-width:640px;width:100%;max-height:85vh;overflow-y:auto;padding:36px;box-shadow:var(--shadow-lg)}
.about-panel h2{font-family:var(--font-display);font-size:26px;margin-bottom:8px}
.about-panel h3{font-family:var(--font-display);font-size:18px;margin:24px 0 8px}
.about-panel p{font-size:14px;line-height:1.65;color:var(--text-secondary);margin-bottom:12px}
.about-tag{display:inline-block;background:var(--surface-alt);padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500;color:var(--text-secondary);margin:0 4px 6px 0}
.about-close{float:right;background:none;border:none;cursor:pointer;font-size:20px;color:var(--text-muted);padding:4px}
.about-close:hover{color:var(--text-primary)}
.organ-chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.organ-chip{padding:8px 16px;border-radius:20px;border:2px solid var(--border);cursor:pointer;font-size:13px;font-weight:500;transition:all .15s;background:var(--surface);user-select:none}
.organ-chip:hover{border-color:var(--accent)}
.organ-chip.selected{border-color:var(--accent);background:var(--accent-light);color:var(--accent)}
.no-data-msg{display:flex;align-items:center;justify-content:center;padding:24px;color:var(--text-muted);font-size:13px;background:var(--surface-alt);border-radius:var(--radius-sm);text-align:center;line-height:1.5}
.landing{min-height:100vh;background:var(--bg)}
.landing-header{position:sticky;top:0;z-index:50;background:rgba(248,247,244,.95);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
.landing-header-inner{display:flex;align-items:center;justify-content:space-between;max-width:1120px;margin:0 auto;padding:16px 24px}
.landing-nav{display:flex;align-items:center;gap:24px}
.landing-nav a{font-size:14px;color:var(--text-secondary);cursor:pointer;text-decoration:none;font-weight:500;transition:color .2s}
.landing-nav a:hover{color:var(--text-primary)}
.landing-hero{text-align:center;padding:60px 24px 80px;max-width:760px;margin:0 auto}
.landing-hero-img{width:280px;height:200px;margin:0 auto 32px;border-radius:var(--radius);overflow:hidden}
.landing-hero-img img{width:100%;height:100%;object-fit:cover}
.landing-hero h1{font-family:var(--font-display);font-size:52px;line-height:1.12;margin-bottom:20px;letter-spacing:-.02em}
.landing-hero p{font-size:18px;color:var(--text-secondary);line-height:1.65;margin-bottom:36px;max-width:600px;margin-left:auto;margin-right:auto}
.landing-cta{padding:16px 40px;font-size:16px;border-radius:var(--radius);font-weight:600}
.landing-section{max-width:960px;margin:0 auto;padding:80px 24px}
.landing-section-alt{background:var(--surface)}
.landing-section h2{font-family:var(--font-display);font-size:34px;margin-bottom:12px;text-align:center}
.landing-section>p{font-size:15px;color:var(--text-secondary);line-height:1.7;max-width:700px;margin:0 auto 16px;text-align:center}
.landing-features{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:40px}
.landing-feature-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;transition:box-shadow .2s}
.landing-feature-card:hover{box-shadow:var(--shadow-md)}
.landing-feature-icon{font-size:28px;margin-bottom:12px}
.landing-feature-card h3{font-size:16px;font-weight:600;margin-bottom:8px}
.landing-feature-card p{font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:0}
.landing-footer{text-align:center;padding:40px 24px;border-top:1px solid var(--border);margin-top:40px}
.landing-footer p{font-size:13px;color:var(--text-muted)}
.form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
@media(max-width:768px){.grid{grid-template-columns:1fr}.app-container{padding:0 16px 80px}.header-title{font-size:18px}.phase-name{font-size:28px}.symptom-grid{grid-template-columns:1fr}.about-panel{padding:24px}.onboarding-card{padding:28px}.header{flex-wrap:wrap;gap:8px}.header-right{flex-wrap:wrap}.landing-hero h1{font-size:34px}.landing-hero{padding:40px 16px 48px}.landing-hero-img{width:200px;height:140px}.landing-features{grid-template-columns:1fr}.landing-nav a{display:none}.landing-hero p{font-size:16px}.form-row-2{grid-template-columns:1fr}}
`;

// ─── STORAGE HELPERS ───────────────────────────────────────────────
async function sGet(k) { try { if (typeof window === "undefined") return null; const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } }
async function sSet(k, v) { try { if (typeof window === "undefined") return; localStorage.setItem(k, JSON.stringify(v)); } catch(e) { console.error("storage err", e); } }
async function shGet(k) { try { if (typeof window === "undefined") return null; const v = localStorage.getItem("shared:" + k); return v ? JSON.parse(v) : null; } catch { return null; } }
async function shSet(k, v) { try { if (typeof window === "undefined") return; localStorage.setItem("shared:" + k, JSON.stringify(v)); } catch(e) { console.error("shared err", e); } }

const DEFAULT_PATIENT = {
  alc: 0, weeksPostATG: 0,
  alcHistory: [],
  tacroTrough: 0, tacroDose: 0, mmfDose: 0, predDose: 0,
  temp: 0, systolic: 0, diastolic: 0,
  urineOutput: "", cough: "", gi: "", fatigue: "",
  communityCity: "",
  lastUpdated: new Date().toISOString(),
};

// ─── ALC CHART ─────────────────────────────────────────────────────
function ALCChart({ history }) {
  if (!history?.length) return (
    <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13, background: "var(--surface-alt)", borderRadius: "var(--radius-sm)" }}>
      ALC data will appear here after logging values
    </div>
  );
  const max = 1.6;
  const thresholds = [{ v: 0.2, l: "P1", c: "var(--red)" },{ v: 0.8, l: "P2", c: "var(--orange)" },{ v: 1.0, l: "P3", c: "var(--yellow)" },{ v: 1.3, l: "Clear", c: "var(--green)" }];
  const h = 160;
  return (
    <div className="alc-chart" style={{ height: h + 30 }}>
      {[0,0.4,0.8,1.2,1.6].map(v=><span key={v} className="alc-y-label" style={{bottom:(v/max)*h+8}}>{v.toFixed(1)}</span>)}
      <div className="alc-chart-area">
        {thresholds.map(t=><div key={t.l} className="alc-threshold" style={{bottom:`${(t.v/max)*100}%`,borderColor:t.c,color:t.c}}><span style={{position:"absolute",right:0,top:-14,fontSize:10,opacity:.7}}>{t.l} &ge;{t.v}</span></div>)}
        {history.map((pt,i)=>{
          const x=history.length===1?50:(i/(history.length-1))*90+5;
          const y=(pt.alc/max)*100;
          return <div key={i}><div className="alc-point" style={{left:`${x}%`,bottom:`${y}%`}} title={`${pt.date}: ${pt.alc} K/\u00B5L`}/><span className="alc-x-label" style={{left:`${x}%`}}>{pt.date.replace("Week ","W")}</span></div>;
        })}
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}}>
          {history.length>1&&history.map((pt,i)=>{
            if(!i)return null;
            const x1=((i-1)/(history.length-1))*90+5, y1=100-(history[i-1].alc/max)*100;
            const x2=(i/(history.length-1))*90+5, y2=100-(pt.alc/max)*100;
            return <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>;
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── ABOUT ─────────────────────────────────────────────────────────
function AboutPanel({onClose}) {
  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-panel" onClick={e=>e.stopPropagation()}>
        <button className="about-close" onClick={onClose}>&times;</button>
        <h2>About TransplantCare</h2>
        <p style={{color:"var(--accent)",fontWeight:500,fontSize:13,marginBottom:16}}>A product concept by a kidney transplant recipient</p>
        <h3>The Problem</h3>
        <p>Organ transplantation is a medical miracle, but it does not come without trade-offs. Organ transplant recipients require life-long immunosuppression to prevent their bodies from rejecting their new organs. After an organ transplant, patients receive intense inpatient immunosuppression therapy (such as ATG induction) before slowly titrating to lower maintenance doses of oral medications. These treatments and additional immunosuppression medication doses leave their immune systems severely compromised. Recovery follows a trajectory correlated to T cell recovery as most frequently measured in Absolute Lymphocyte Count (ALC) recovery on a Differential, Automated blood panel. During this period, both patients and their household partners must follow evolving behavioral protocols &mdash; but this guidance is typically delivered as printed handouts at discharge, with no dynamic tool to track where you are or what the current rules should be.</p>
        <h3>Why I Built This</h3>
        <p>I received a kidney transplant and experienced this problem firsthand. My partner and I found ourselves constantly asking: &ldquo;Can we have people over yet? What should she do differently after a work event? Do we need to mask at the grocery store?&rdquo; Then a little over a year later I went into rejection and was admitted to the hospital where I had to effectively restart my post-transplant immunosuppression protocol from scratch. During my hospital admission I built this app, both for myself but also for my girlfriend, family and friends to provide more clarity and transparency around recovery.</p>
        <h3>Key Product Decisions</h3>
        <p><strong>Two-view architecture:</strong> The patient and partner have fundamentally different needs and protocols. Rather than overloading one dashboard, I separated the views so each audience sees only what&rsquo;s relevant to them.</p>
        <p><strong>Linked accounts:</strong> Patient creates a profile and gets a share code. Their partner enters that code to link &mdash; mirroring a real multi-user health app without requiring a full auth system. Data persists across sessions.</p>
        <p><strong>Phase-driven protocols:</strong> Everything keys off the ALC-based recovery phase. As ALC rises, protocols automatically adjust &mdash; mirroring how transplant teams think about recovery milestones.</p>
        <p><strong>Infection vs. rejection balance:</strong> The immunosuppression monitor visualizes the core tension in transplant care &mdash; too much immunosuppression risks infection, too little risks rejection.</p>
        <p><strong>Partner exposure tracking:</strong> Partners&rsquo; social activities directly impact patient safety. The daily exposure assessment gives partners a simple, actionable framework.</p>
        <h3>Scope &amp; Constraints</h3>
        <p>This is intentionally scoped as a portfolio demonstration, not a production health tool. A production version would require HIPAA-compliant infrastructure, provider authentication, EHR integration for lab values, and clinical validation of scoring thresholds.</p>
        <h3>What a Production Version Would Add</h3>
        <p style={{marginBottom:4}}>
          <span className="about-tag">HIPAA-compliant hosting</span><span className="about-tag">Real-time partner sync (cross-device)</span><span className="about-tag">Lab integration</span><span className="about-tag">Push notifications</span><span className="about-tag">Provider dashboard</span><span className="about-tag">Medication reminders</span><span className="about-tag">Multi-language support</span><span className="about-tag">Clinical validation study</span><span className="about-tag">Offline support</span>
        </p>
        <h3>Tech</h3>
        <p>React single-page application with persistent browser storage. Patient data is shared via a link code so partners can access a read-only view. No backend or PHI transmission.</p>
      </div>
    </div>
  );
}

// ─── LANDING PAGE ──────────────────────────────────────────────────
function LandingPage({ onTryNow }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="header-left">
            <div className="header-logo">&hearts;</div><span className="header-title">TransplantCare</span>
          </div>
          <nav className="landing-nav">
            <a onClick={() => scrollTo("problem")}>The Problem</a>
            <a onClick={() => scrollTo("features")}>Features</a>
            <button className="btn btn-orange" onClick={onTryNow}>Try Now</button>
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-img">
          <img src="/hero.jpg" alt="Two hands passing a heart — symbolizing organ donation and transplant care" />
        </div>
        <h1>Post-Transplant Recovery, Guided</h1>
        <p>A dynamic immunosuppression monitor that connects lab values to daily behavioral protocols &mdash; for patients and the partners who support them.</p>
        <button className="btn btn-orange landing-cta" onClick={onTryNow}>Try Now</button>
      </section>

      <div className="landing-section-alt">
        <section id="problem" className="landing-section">
          <h2>The Problem</h2>
          <p>Organ transplant recipients require life-long immunosuppression to prevent rejection. After transplant, patients receive intense inpatient therapy that leaves their immune systems severely compromised. Recovery follows a trajectory correlated to T cell recovery, most frequently measured by Absolute Lymphocyte Count (ALC).</p>
          <p>During this critical period, both patients and their household partners must follow evolving behavioral protocols &mdash; but this guidance is typically delivered as printed handouts at discharge, with no dynamic tool to track where you are or what the current rules should be.</p>
        </section>
      </div>

      <section id="features" className="landing-section">
        <h2>Key Features</h2>
        <p>Built from firsthand experience as a kidney transplant recipient navigating recovery with my partner.</p>
        <div className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\u{1F4CA}"}</div>
            <h3>Phase-Driven Protocols</h3>
            <p>Everything keys off ALC-based recovery phases. As your levels rise, protocols automatically adjust &mdash; mirroring how transplant teams think about recovery milestones.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\u{1F465}"}</div>
            <h3>Two-View Architecture</h3>
            <p>Patients and partners have fundamentally different needs. Separate views ensure each audience sees only what&rsquo;s relevant to them.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\u2696\uFE0F"}</div>
            <h3>Infection vs. Rejection Balance</h3>
            <p>Visualizes the core tension in transplant care &mdash; too much immunosuppression risks infection, too little risks rejection.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\u{1F517}"}</div>
            <h3>Linked Accounts</h3>
            <p>Patient creates a profile and gets a share code. Partners link with that code to access protocols and log their own daily exposure assessments.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\u{1F3E5}"}</div>
            <h3>Symptom Monitoring</h3>
            <p>Track vitals, medication levels, and symptoms. Get real-time alerts when multiple parameters fall outside optimal ranges.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">{"\u{1F30D}"}</div>
            <h3>Community Risk Data</h3>
            <p>Quick access to respiratory illness surveillance data for your metro area, so you can adjust behavior to local conditions.</p>
          </div>
        </div>
      </section>

      <div className="landing-footer">
        <p>A portfolio project by a kidney transplant recipient. Not a production health tool.</p>
      </div>
    </div>
  );
}

// ─── ONBOARDING ────────────────────────────────────────────────────
function Onboarding({onComplete, onBack}) {
  const [step, setStep] = useState("role");
  const [role, setRole] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [organs, setOrgans] = useState([]);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleOrgan(o) {
    setOrgans(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  }

  function validateFields() {
    if (!firstName.trim() || !lastName.trim()) { setErr("First and last name are required."); return false; }
    if (!dob) { setErr("Date of birth is required."); return false; }
    if (!email.trim() || !email.includes("@")) { setErr("A valid email is required."); return false; }
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return false; }
    if (password !== confirmPw) { setErr("Passwords do not match."); return false; }
    return true;
  }

  async function createPatient() {
    setErr("");
    if (!validateFields()) return;
    if (organs.length === 0) { setErr("Please select at least one transplanted organ."); return; }
    setBusy(true);
    const c = generateCode();
    const d = { ...DEFAULT_PATIENT, firstName: firstName.trim(), lastName: lastName.trim(), name: `${firstName.trim()} ${lastName.trim()}`, dob, email: email.trim(), organs, code: c, role: "patient", createdAt: new Date().toISOString() };
    await sSet("tc-profile", d);
    await shSet(`tc-patient:${c}`, d);
    setShareCode(c);
    setStep("done");
    setBusy(false);
  }

  async function linkPartner() {
    if (code.length < 4) return;
    setErr("");
    if (!validateFields()) return;
    setBusy(true);
    const clean = code.trim().toUpperCase();
    const pd = await shGet(`tc-patient:${clean}`);
    if (!pd) { setErr("No patient found with that code. Check and try again."); setBusy(false); return; }
    const pp = { role: "partner", firstName: firstName.trim(), lastName: lastName.trim(), name: `${firstName.trim()} ${lastName.trim()}`, dob, email: email.trim(), linkedCode: clean, linkedPatientName: pd.name, createdAt: new Date().toISOString() };
    await sSet("tc-profile", pp);
    setBusy(false);
    onComplete(pp);
  }

  const formFields = (
    <>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">First Name</label>
          <input className="form-input" placeholder="First name" value={firstName} onChange={e=>{setFirstName(e.target.value);setErr("");}}/>
        </div>
        <div className="form-group">
          <label className="form-label">Last Name</label>
          <input className="form-input" placeholder="Last name" value={lastName} onChange={e=>{setLastName(e.target.value);setErr("");}}/>
        </div>
      </div>
      <div className="form-group" style={{marginBottom:12}}>
        <label className="form-label">Date of Birth</label>
        <input className="form-input" type="date" value={dob} onChange={e=>{setDob(e.target.value);setErr("");}}/>
      </div>
      <div className="form-group" style={{marginBottom:12}}>
        <label className="form-label">Email</label>
        <input className="form-input" type="email" placeholder="email@example.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}}/>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="Min 6 characters" value={password} onChange={e=>{setPassword(e.target.value);setErr("");}}/>
        </div>
        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input className="form-input" type="password" placeholder="Confirm" value={confirmPw} onChange={e=>{setConfirmPw(e.target.value);setErr("");}}/>
        </div>
      </div>
    </>
  );

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <div className="header-logo">&hearts;</div><span className="header-title">TransplantCare</span>
        </div>
        {step==="role"&&<>
          <h1>Welcome</h1>
          <p>This app helps organ transplant patients and their partners track immunosuppression recovery and follow phase-appropriate behavioral protocols.</p>
          <div className={`role-option ${role==="patient"?"selected":""}`} onClick={()=>setRole("patient")}>
            <h3>{"\u{1F3E5}"} I&rsquo;m the Patient</h3><p>Track your ALC recovery, medications, symptoms, and see current protocols.</p>
          </div>
          <div className={`role-option ${role==="partner"?"selected":""}`} onClick={()=>setRole("partner")}>
            <h3>{"\u{1F49A}"} I&rsquo;m the Partner / Caregiver</h3><p>Link to a patient&rsquo;s profile to see protocols, log your daily exposure, and stay coordinated.</p>
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginTop:8,padding:12}} disabled={!role} onClick={()=>setStep(role==="patient"?"setup":"link")}>Continue</button>
          {onBack && <button className="btn btn-ghost" style={{width:"100%",marginTop:8,padding:10}} onClick={onBack}>Back to Home</button>}
        </>}
        {step==="setup"&&<>
          <h1>Set Up Your Profile</h1>
          <p>Create your patient profile. You&rsquo;ll get a code to share with your partner so they can link to your dashboard.</p>
          {formFields}
          <div className="form-group" style={{marginTop:12,marginBottom:16}}>
            <label className="form-label">Transplanted Organ(s)</label>
            <div className="organ-chips">
              {ORGAN_OPTIONS.map(o=><span key={o} className={`organ-chip ${organs.includes(o)?"selected":""}`} onClick={()=>{toggleOrgan(o);setErr("");}}>{o}</span>)}
            </div>
          </div>
          {err&&<div className="error-msg">{err}</div>}
          <button className="btn btn-primary" style={{width:"100%",padding:12,marginTop:4}} disabled={busy} onClick={createPatient}>{busy?"Creating...":"Create Profile"}</button>
          <button className="btn btn-ghost" style={{width:"100%",marginTop:8,padding:10}} onClick={()=>{setStep("role");setErr("");}}>Back</button>
        </>}
        {step==="done"&&<>
          <h1>You&rsquo;re Set Up</h1>
          <p>Share this code with your partner so they can link to your dashboard:</p>
          <div className="share-code">{shareCode}</div>
          <div className="share-code-label">Partner share code</div>
          <p style={{fontSize:12,color:"var(--text-muted)",textAlign:"center"}}>Your partner will need this code when they set up their account. Write it down. Do not lose it.</p>
          <button className="btn btn-primary" style={{width:"100%",padding:12,marginTop:12}} onClick={async()=>{const p=await sGet("tc-profile");onComplete(p);}}>Go to Dashboard</button>
        </>}
        {step==="link"&&<>
          <h1>Link to Patient</h1>
          <p>Enter your details and the share code from your patient&rsquo;s setup to link accounts.</p>
          {formFields}
          <div className="form-group" style={{marginTop:12,marginBottom:16}}>
            <label className="form-label">Patient Share Code</label>
            <input className="form-input code-input" placeholder="ABC123" maxLength={6} value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setErr("");}} onKeyDown={e=>e.key==="Enter"&&linkPartner()}/>
          </div>
          {err&&<div className="error-msg">{err}</div>}
          <button className="btn btn-primary" style={{width:"100%",padding:12,marginTop:4}} disabled={code.length<4||busy} onClick={linkPartner}>{busy?"Linking...":"Link Account"}</button>
          <button className="btn btn-ghost" style={{width:"100%",marginTop:8,padding:10}} onClick={()=>{setStep("role");setErr("");}}>Back</button>
        </>}
      </div>
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────
export default function TransplantCare() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appView, setAppView] = useState("landing");
  const [view, setView] = useState("patient");
  const [showAbout, setShowAbout] = useState(false);
  const [pd, setPd] = useState(DEFAULT_PATIENT);
  const [expLevel, setExpLevel] = useState("GREEN");
  const [selExp, setSelExp] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await sGet("tc-profile");
      if (saved) {
        setProfile(saved);
        setAppView("dashboard");
        if (saved.role === "patient") {
          const { firstName, lastName, name, code, role, createdAt, dob, email, organs, ...data } = saved;
          setPd(prev => ({ ...prev, ...data }));
        } else {
          setView("partner");
          const linked = await shGet(`tc-patient:${saved.linkedCode}`);
          if (linked) { const { firstName, lastName, name, code, role, createdAt, dob, email, organs, ...data } = linked; setPd(prev => ({ ...prev, ...data })); }
          const pa = await sGet("tc-partner-assessments");
          if (pa) { setAssessments(pa.assessments || []); setExpLevel(pa.level || "GREEN"); }
        }
      }
      setLoading(false);
    })();
  }, []);

  const savePD = useCallback(async (data) => {
    if (!profile || profile.role !== "patient") return;
    const toSave = { ...profile, ...data };
    await sSet("tc-profile", toSave);
    await shSet(`tc-patient:${profile.code}`, toSave);
  }, [profile]);

  useEffect(() => {
    if (!profile || profile.role !== "patient") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => savePD(pd), 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [pd, profile, savePD]);

  useEffect(() => {
    if (!profile || profile.role !== "partner") return;
    const iv = setInterval(async () => {
      const linked = await shGet(`tc-patient:${profile.linkedCode}`);
      if (linked) { const { firstName, lastName, name, code, role, createdAt, dob, email, organs, ...data } = linked; setPd(prev => ({ ...prev, ...data })); }
    }, 10000);
    return () => clearInterval(iv);
  }, [profile]);

  function up(u) { setPd(prev => ({ ...prev, ...u, lastUpdated: new Date().toISOString() })); }

  function handleUpdateALC() {
    const entry = { date: `Week ${pd.weeksPostATG}`, alc: pd.alc };
    const idx = pd.alcHistory.findIndex(h => h.date === entry.date);
    const hist = [...pd.alcHistory];
    if (idx >= 0) hist[idx] = entry; else hist.push(entry);
    up({ alcHistory: hist });
  }

  async function handleSubmitExp() {
    if (!selExp) return;
    const entry = { date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), level: selExp, timestamp: Date.now() };
    const na = [entry, ...assessments].slice(0, 14);
    setExpLevel(selExp); setAssessments(na); setSelExp(null);
    await sSet("tc-partner-assessments", { assessments: na, level: selExp });
  }

  async function logout() {
    await sSet("tc-profile", null);
    setProfile(null); setPd(DEFAULT_PATIENT); setAssessments([]); setExpLevel("GREEN"); setView("patient"); setAppView("landing");
  }

  const phase = getPhase(pd.alc);
  const hasMedData = pd.tacroTrough > 0 || pd.tacroDose > 0 || pd.mmfDose > 0 || pd.predDose > 0;
  const hasVitalData = pd.temp > 0 || pd.systolic > 0 || pd.diastolic > 0 || pd.urineOutput || pd.cough || pd.gi || pd.fatigue;
  const iS = hasMedData ? calcInfectionScore(pd.tacroTrough, pd.mmfDose, pd.predDose) : 0;
  const rS = hasMedData ? calcRejectionScore(pd.tacroTrough, pd.mmfDose, pd.predDose) : 0;
  const cS = Math.round((iS + rS) / 2);
  const iM = getImmunoMessage(iS, rS);
  const sS = hasVitalData ? getSymptomStatus(pd.temp, pd.systolic, pd.diastolic, pd.urineOutput, pd.cough, pd.gi, pd.fatigue) : { label: "No Data", color: "#5B7B8F", bg: "#EDF2F5" };
  const prots = PROTOCOLS[phase.name] || PROTOCOLS["Phase 1"];
  const pProt = PARTNER_PROTOCOLS[phase.name] || PARTNER_PROTOCOLS["Phase 1"];
  const sC = s => s <= 3 ? "score-low" : s <= 6 ? "score-mid" : "score-high";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const isPat = profile?.role === "patient";
  const lu = pd.lastUpdated ? new Date(pd.lastUpdated).toLocaleString() : "\u2014";
  const selectedCity = COMMUNITY_CITIES.find(c => c.name === pd.communityCity);

  if (loading) return <><style>{CSS}</style><div className="onboarding"><div style={{color:"var(--text-muted)",fontSize:14}}>Loading...</div></div></>;

  if (!profile && appView === "landing") return <><style>{CSS}</style><LandingPage onTryNow={()=>setAppView("onboarding")}/></>;

  if (!profile) return <><style>{CSS}</style><Onboarding onComplete={p=>{setProfile(p);setAppView("dashboard");if(p.role==="partner")setView("partner");}} onBack={()=>setAppView("landing")}/><button className="about-toggle" onClick={()=>setShowAbout(true)} title="About this project">?</button>{showAbout&&<AboutPanel onClose={()=>setShowAbout(false)}/>}</>;

  return (
    <><style>{CSS}</style>
      <div className="app-container">
        <header className="header">
          <div className="header-left">
            <div className="header-logo">&hearts;</div><span className="header-title">TransplantCare</span>
          </div>
          <div className="header-right">
            <div className="phase-badge" style={{background:phase.bg,color:phase.color}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:phase.color,display:"inline-block"}}/>{phase.name} &middot; {phase.label}
            </div>
            <div className="user-pill">
              {isPat?"\u{1F3E5}":"\u{1F49A}"} {profile.name||(isPat?"Patient":"Partner")}
              {isPat&&profile.code&&<span style={{fontSize:10,color:"var(--text-muted)",marginLeft:4}}>Code: {profile.code}</span>}
            </div>
            <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={logout}>Sign Out</button>
          </div>
        </header>

        <div className="tabs">
          <button className={`tab ${view==="patient"?"active":""}`} onClick={()=>setView("patient")}>Patient View</button>
          <button className={`tab ${view==="partner"?"active":""}`} onClick={()=>setView("partner")}>Partner View</button>
        </div>

        {view==="patient"&&<div className="grid">
          <div className="card">
            <div className="card-header"><div><div className="card-title">Current Risk Phase</div><div className="card-subtitle">Last updated: {lu}</div></div><span className="status-pill" style={{background:phase.bg,color:phase.color}}>{phase.label}</span></div>
            <div className="phase-display"><span className="phase-name" style={{color:phase.color}}>{phase.name}</span><div className="phase-detail"><strong>ALC: {pd.alc.toFixed(2)} K/&micro;L</strong><br/>Week {pd.weeksPostATG} post-ATG</div></div>
            {isPat&&<div className="form-row">
              <div className="form-group"><label className="form-label">Latest ALC (K/&micro;L)</label><input className="form-input" type="number" step="0.01" min="0" value={pd.alc||""} onChange={e=>up({alc:parseFloat(e.target.value)||0})}/></div>
              <div className="form-group" style={{maxWidth:100}}><label className="form-label">Weeks post-ATG</label><input className="form-input" type="number" min="0" value={pd.weeksPostATG||""} onChange={e=>up({weeksPostATG:parseInt(e.target.value)||0})}/></div>
              <button className="btn btn-primary" onClick={handleUpdateALC} style={{alignSelf:"flex-end"}}>Update</button>
            </div>}
          </div>

          <div className="card">
            <div className="card-header"><div><div className="card-title">ALC Recovery Progress</div><div className="card-subtitle">{pd.alcHistory.length} data points logged</div></div></div>
            <ALCChart history={pd.alcHistory}/>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:8}}>
              {PHASES.map(p=><span key={p.name} style={{fontSize:11,color:p.color,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:p.color,display:"inline-block"}}/>{p.name}: &ge;{p.alcMin}</span>)}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Current Protocol</div><span className="status-pill" style={{background:phase.bg,color:phase.color}}>{phase.name}</span></div>
            <div className="protocol-list">{prots.map((p,i)=><div key={i} className={`protocol-item ${p.type}`}><span className="protocol-icon">{p.icon}</span><span>{p.text}</span></div>)}</div>
          </div>

          <div className="card">
            <div className="card-header"><div><div className="card-title">Community Risk</div></div><span className="status-pill" style={{background:"var(--surface-alt)",color:"var(--text-secondary)"}}>{pd.communityCity||"Select City"}</span></div>
            <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.5,margin:"8px 0 16px"}}>View current respiratory illness surveillance data for your metropolitan area.</p>
            <div className="form-group" style={{marginBottom:16}}>
              <label className="form-label">Your Metro Area</label>
              <select className="symptom-select" value={pd.communityCity} disabled={!isPat} onChange={e=>up({communityCity:e.target.value})}>
                <option value="">Select a city...</option>
                {COMMUNITY_CITIES.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {selectedCity&&<a href={selectedCity.url} target="_blank" rel="noopener noreferrer" className="community-link">View Data <span style={{fontSize:14}}>{"\u2197"}</span></a>}
          </div>

          <div className="card">
            <div className="card-header"><div><div className="card-title">Immunosuppression Monitor</div><div className="card-subtitle">Last updated: {lu}</div></div>
              {hasMedData ? <span className="status-pill" style={{background:cS<=3?"var(--green-bg)":cS<=6?"var(--yellow-bg)":"var(--red-bg)",color:cS<=3?"var(--green)":cS<=6?"var(--yellow)":"var(--red)"}}>Score: {cS}/10</span> : <span className="status-pill" style={{background:"var(--surface-alt)",color:"var(--text-muted)"}}>No Data</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["Tacro Trough (ng/mL)","tacroTrough",0.1],["Tacro Dose (mg/day)","tacroDose",0.5],["MMF Dose (mg/day)","mmfDose",250],["Pred Dose (mg/day)","predDose",2.5]].map(([l,k,s])=>
                <div key={k} className="form-group"><label className="form-label">{l}</label><input className="form-input" type="number" step={s} value={pd[k]||""} disabled={!isPat} onChange={e=>up({[k]:parseFloat(e.target.value)||0})}/></div>
              )}
            </div>
            {hasMedData ? <>
              <div className="score-row">
                <div className="score-item">Infection Risk: <span className={`score-value ${sC(iS)}`}>{iS}/10</span></div>
                <div className="score-item">Rejection Risk: <span className={`score-value ${sC(rS)}`}>{rS}/10</span></div>
              </div>
              <div className="immuno-message" style={{background:iM.status==="good"?"var(--green-bg)":iM.status==="caution"?"var(--yellow-bg)":"var(--red-bg)",color:iM.status==="good"?"var(--green)":iM.status==="caution"?"var(--yellow)":"var(--red)"}}>{iM.text}</div>
            </> : <div className="no-data-msg" style={{marginTop:16}}>Enter your medication levels above to see infection and rejection risk scores.</div>}
          </div>

          <div className="card">
            <div className="card-header"><div><div className="card-title">Symptom Monitor</div><div className="card-subtitle">Last updated: {lu}</div></div><span className="status-pill" style={{background:sS.bg,color:sS.color}}>{sS.label}</span></div>
            <div className="form-group" style={{marginBottom:12}}><label className="form-label">Temperature (&deg;F)</label><input className="form-input" type="number" step="0.1" value={pd.temp||""} disabled={!isPat} onChange={e=>up({temp:parseFloat(e.target.value)||0})}/></div>
            <div className="form-group" style={{marginBottom:12}}><label className="form-label">Blood Pressure</label>
              <div className="bp-row"><input className="form-input" type="number" style={{maxWidth:100}} value={pd.systolic||""} disabled={!isPat} onChange={e=>up({systolic:parseInt(e.target.value)||0})}/><span className="bp-slash">/</span><input className="form-input" type="number" style={{maxWidth:100}} value={pd.diastolic||""} disabled={!isPat} onChange={e=>up({diastolic:parseInt(e.target.value)||0})}/></div>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label className="form-label">Urine Output</label><select className="symptom-select" value={pd.urineOutput} disabled={!isPat} onChange={e=>up({urineOutput:e.target.value})}><option value="">&mdash;</option><option>Normal</option><option>Low</option><option>Very Low</option></select></div>
            <div className="symptom-grid">
              {[["Cough","cough"],["GI Issues","gi"],["Fatigue","fatigue"]].map(([l,k])=>
                <div key={k} className="form-group"><label className="form-label">{l}</label><select className="symptom-select" value={pd[k]} disabled={!isPat} onChange={e=>up({[k]:e.target.value})}><option value="">&mdash;</option><option>None</option><option>Mild</option><option>Moderate</option><option>Severe</option></select></div>
              )}
            </div>
            {hasVitalData && sS.label==="Concerning"&&<div className="symptom-alert" style={{background:"var(--red-bg)",color:"var(--red)"}}>{"\u26A0\uFE0F"} 2+ abnormal parameters &mdash; Seek Evaluation</div>}
            {hasVitalData && sS.label==="Monitor"&&<div className="symptom-alert" style={{background:"var(--yellow-bg)",color:"var(--yellow)"}}>{"\u26A1"} Monitor closely &mdash; contact team if worsening</div>}
          </div>
        </div>}

        {view==="partner"&&<div className="grid">
          <div className="card">
            <div className="card-header"><div><div className="card-title">Partner Protocols</div><div className="card-subtitle">{profile.role==="partner"?`Linked to ${profile.linkedPatientName||"patient"}`:`Current phase: ${phase.name}`}</div></div><span className="status-pill" style={{background:phase.bg,color:phase.color}}>{phase.label}</span></div>
            <div style={{padding:"12px 14px",background:phase.bg,borderRadius:"var(--radius-sm)",fontSize:13,color:phase.color,marginBottom:16,lineHeight:1.5}}>{pProt.summary}</div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Current Exposure Level</div>
            <div className={`partner-exposure-status ${expLevel}`}><div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{expLevel}</div><div style={{fontSize:13,color:"var(--text-secondary)"}}>{pProt.exposure[expLevel]}</div></div>
            <div className="divider"/>
            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Daily Baseline Requirements</div>
            {pProt.baseline.map((it,i)=><div key={i} className="baseline-item"><span className="baseline-check">{"\u2713"}</span><span>{it}</span></div>)}
          </div>

          <div className="card">
            <div className="card-header"><div><div className="card-title">Daily Exposure Assessment</div><div className="card-subtitle">{today}</div></div></div>
            <p style={{fontSize:13,color:"var(--text-secondary)",marginBottom:12}}>Select today&rsquo;s highest exposure activity:</p>
            {[["GREEN","green","\u{1F7E2} LOW \u2014 Green","Home / solo errands, brief masked indoor stops"],["YELLOW","yellow","\u{1F7E1} MODERATE \u2014 Yellow","Office work, indoor dining, small gatherings"],["RED","red","\u{1F534} HIGH \u2014 Red","Crowded events, flights, parties, concerts"]].map(([k,c,t,d])=>
              <div key={k} className={`exposure-option ${c} ${selExp===k?"selected":""}`} onClick={()=>setSelExp(k)}><div className="exposure-title">{t}</div><div className="exposure-desc">{d}</div></div>
            )}
            <button className="btn btn-primary" style={{width:"100%",marginTop:8,padding:"10px 20px"}} disabled={!selExp} onClick={handleSubmitExp}>Submit Assessment</button>
            {assessments.length>0&&<div className="assessment-log"><div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Recent Assessments</div>
              {assessments.map((a,i)=><div key={i} className="assessment-entry"><span><span className="assessment-dot" style={{background:a.level==="GREEN"?"var(--green)":a.level==="YELLOW"?"var(--yellow)":"var(--red)"}}/>{a.level}</span><span style={{color:"var(--text-muted)",fontSize:12}}>{a.date}</span></div>)}
            </div>}
          </div>

          <div className="card grid-full">
            <div className="card-header"><div className="card-title">Patient Current Status</div><span className="status-pill" style={{background:phase.bg,color:phase.color}}>{phase.name} &middot; {phase.label}</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:16}}>
              <div><div className="form-label">ALC Level</div><div style={{fontSize:20,fontWeight:600,marginTop:4}}>{pd.alc.toFixed(2)} <span style={{fontSize:13,color:"var(--text-muted)"}}>K/&micro;L</span></div></div>
              <div><div className="form-label">Weeks Post-ATG</div><div style={{fontSize:20,fontWeight:600,marginTop:4}}>{pd.weeksPostATG}</div></div>
              <div><div className="form-label">Symptom Status</div><span className="status-pill" style={{background:sS.bg,color:sS.color,marginTop:4,display:"inline-block"}}>{sS.label}</span></div>
              <div><div className="form-label">Immuno Balance</div>{hasMedData ? <span className="status-pill" style={{background:cS<=3?"var(--green-bg)":cS<=6?"var(--yellow-bg)":"var(--red-bg)",color:cS<=3?"var(--green)":cS<=6?"var(--yellow)":"var(--red)",marginTop:4,display:"inline-block"}}>{cS}/10</span> : <span className="status-pill" style={{background:"var(--surface-alt)",color:"var(--text-muted)",marginTop:4,display:"inline-block"}}>No Data</span>}</div>
            </div>
            <div className="divider"/>
            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Current Patient Protocol</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {prots.map((p,i)=><div key={i} className={`protocol-item ${p.type}`}><span className="protocol-icon">{p.icon}</span><span style={{fontSize:12}}>{p.text}</span></div>)}
            </div>
          </div>
        </div>}
      </div>

      <button className="about-toggle" onClick={()=>setShowAbout(true)} title="About this project">?</button>
      {showAbout&&<AboutPanel onClose={()=>setShowAbout(false)}/>}
    </>
  );
}
