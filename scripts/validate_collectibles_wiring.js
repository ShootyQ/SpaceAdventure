const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const args = process.argv.slice(2);
const isStrict = args.includes("--strict");

const getReportPathArg = () => {
  const reportArgIndex = args.findIndex((arg) => arg === "--report");
  if (reportArgIndex === -1) return null;
  const value = args[reportArgIndex + 1];
  if (!value) return null;
  return value;
};

const reportOutputPath = getReportPathArg();

const toPosix = (value) => String(value || "").replace(/\\/g, "/");

const readJson = (relativePath) => {
  const absolutePath = path.join(rootDir, relativePath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw);
};

const fileExists = (absolutePath) => {
  try {
    return fs.existsSync(absolutePath);
  } catch {
    return false;
  }
};

const assetPathToAbsolute = (assetPath) => {
  const normalized = String(assetPath || "").trim();
  if (!normalized.startsWith("/")) return null;
  return path.join(rootDir, "public", normalized.slice(1));
};

const collectFilesRecursive = (startDir) => {
  const files = [];
  const stack = [startDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fileExists(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      if (entry.isFile()) files.push(full);
    });
  }
  return files;
};

const parseShipOptions = () => {
  const source = fs.readFileSync(path.join(rootDir, "lib", "ships.ts"), "utf8");
  const options = [];
  const regex = /\{\s*id:\s*"([^"]+)"[\s\S]*?assetPath:\s*"([^"]+)"[\s\S]*?\}/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    options.push({ id: match[1], assetPath: match[2] });
  }
  return options;
};

const parseAvatarOptions = () => {
  const source = fs.readFileSync(path.join(rootDir, "components", "UserAvatar.tsx"), "utf8");
  const options = [];
  const blockMatch = source.match(/export const AVATAR_OPTIONS = \[([\s\S]*?)\];/);
  const block = blockMatch ? blockMatch[1] : "";
  const regex = /\{\s*id:\s*['"]([^'"]+)['"][\s\S]*?src:\s*['"]([^'"]+)['"][\s\S]*?\}/g;
  let match;
  while ((match = regex.exec(block)) !== null) {
    options.push({ id: match[1], assetPath: match[2] });
  }
  return options;
};

const checkIdDuplicates = (ids) => {
  const seen = new Set();
  const duplicates = new Set();
  ids.forEach((id) => {
    const normalized = String(id || "").trim();
    if (!normalized) return;
    if (seen.has(normalized)) duplicates.add(normalized);
    seen.add(normalized);
  });
  return Array.from(duplicates);
};

const checkShopFilenameHygiene = () => {
  const collectiblesRoot = path.join(rootDir, "public", "images", "collectibles");
  const files = collectFilesRecursive(collectiblesRoot);
  const shopFiles = files.filter((filePath) => toPosix(filePath).includes("/shop/"));

  const findings = [];
  shopFiles.forEach((absolutePath) => {
    const fileName = path.basename(absolutePath);
    if (/\s/.test(fileName) || /[A-Z]/.test(fileName)) {
      findings.push(toPosix(path.relative(rootDir, absolutePath)));
    }
  });

  return findings;
};

const errors = [];
const warnings = [];

const xpUnlockConfig = readJson(path.join("data", "collectibles", "xp-unlocks.json"));
const catalog = readJson(path.join("data", "collectibles", "catalog.json"));

const allowedChannels = new Set(["starter", "chance", "xp", "shop"]);
const starterShips = Array.isArray(xpUnlockConfig?.starters?.ships) ? xpUnlockConfig.starters.ships : [];
const shipRules = Array.isArray(xpUnlockConfig?.ships) ? xpUnlockConfig.ships : [];
const avatarRules = Array.isArray(xpUnlockConfig?.avatars) ? xpUnlockConfig.avatars : [];

checkIdDuplicates(starterShips).forEach((id) => errors.push(`Duplicate starter ship id: ${id}`));
checkIdDuplicates(shipRules.map((rule) => rule?.id)).forEach((id) => errors.push(`Duplicate ship rule id: ${id}`));
checkIdDuplicates(avatarRules.map((rule) => rule?.id)).forEach((id) => errors.push(`Duplicate avatar rule id: ${id}`));

const starterSet = new Set(starterShips.map((id) => String(id || "").trim()).filter(Boolean));
shipRules.forEach((rule, index) => {
  const id = String(rule?.id || "").trim();
  const planetId = String(rule?.planetId || "").trim().toLowerCase();
  const unlockKey = String(rule?.unlockKey || "").trim();
  const channel = String(rule?.channel || "xp").trim().toLowerCase();

  if (!id) errors.push(`Ship rule #${index + 1} missing id.`);
  if (!planetId) errors.push(`Ship rule #${index + 1} (${id || "unknown"}) missing planetId.`);
  if (!unlockKey) errors.push(`Ship rule #${index + 1} (${id || "unknown"}) missing unlockKey.`);
  if (!allowedChannels.has(channel)) errors.push(`Ship rule #${index + 1} (${id || "unknown"}) has invalid channel '${channel}'.`);
  if (starterSet.has(id)) errors.push(`Ship id '${id}' is both starter and XP rule.`);
});

avatarRules.forEach((rule, index) => {
  const id = String(rule?.id || "").trim();
  const planetId = String(rule?.planetId || "").trim().toLowerCase();
  const unlockKey = String(rule?.unlockKey || "").trim();
  const channel = String(rule?.channel || "xp").trim().toLowerCase();

  if (!id) errors.push(`Avatar rule #${index + 1} missing id.`);
  if (!planetId) errors.push(`Avatar rule #${index + 1} (${id || "unknown"}) missing planetId.`);
  if (!unlockKey) errors.push(`Avatar rule #${index + 1} (${id || "unknown"}) missing unlockKey.`);
  if (!allowedChannels.has(channel)) errors.push(`Avatar rule #${index + 1} (${id || "unknown"}) has invalid channel '${channel}'.`);
});

const shipUnlockKeyCollisions = checkIdDuplicates(shipRules.map((rule) => `${String(rule?.planetId || "").toLowerCase()}::${String(rule?.unlockKey || "")}`));
shipUnlockKeyCollisions.forEach((composite) => errors.push(`Duplicate ship unlock key mapping: ${composite}`));

const avatarUnlockKeyCollisions = checkIdDuplicates(avatarRules.map((rule) => `${String(rule?.planetId || "").toLowerCase()}::${String(rule?.unlockKey || "")}`));
avatarUnlockKeyCollisions.forEach((composite) => errors.push(`Duplicate avatar unlock key mapping: ${composite}`));

const shipOptions = parseShipOptions();
const avatarOptions = parseAvatarOptions();
const shipIdSet = new Set(shipOptions.map((option) => option.id));
const avatarIdSet = new Set(avatarOptions.map((option) => option.id));

starterShips.forEach((id) => {
  const normalized = String(id || "").trim();
  if (normalized && !shipIdSet.has(normalized)) {
    errors.push(`Starter ship '${normalized}' is not present in lib/ships.ts SHIP_OPTIONS.`);
  }
});

shipRules.forEach((rule) => {
  const id = String(rule?.id || "").trim();
  if (id && !shipIdSet.has(id)) {
    warnings.push(`Ship rule id '${id}' not found in SHIP_OPTIONS (may rely on alias migration).`);
  }
});

avatarRules.forEach((rule) => {
  const id = String(rule?.id || "").trim();
  if (id && !avatarIdSet.has(id)) {
    warnings.push(`Avatar rule id '${id}' not found in AVATAR_OPTIONS (may rely on alias migration).`);
  }
});

const validateAssetPath = (assetPath, context) => {
  const normalized = String(assetPath || "").trim();
  if (!normalized) {
    errors.push(`${context}: missing asset path.`);
    return;
  }
  if (!normalized.startsWith("/images/collectibles/")) {
    warnings.push(`${context}: asset path is outside /images/collectibles (${normalized}).`);
  }

  const absolute = assetPathToAbsolute(normalized);
  if (!absolute || !fileExists(absolute)) {
    errors.push(`${context}: missing file for asset path ${normalized}`);
    return;
  }

  const fileName = path.basename(absolute);
  if (/\s/.test(fileName)) {
    warnings.push(`${context}: filename contains whitespace (${fileName}).`);
  }
  if (/[A-Z]/.test(fileName)) {
    warnings.push(`${context}: filename contains uppercase letters (${fileName}).`);
  }
};

shipOptions.forEach((ship) => validateAssetPath(ship.assetPath, `SHIP_OPTIONS:${ship.id}`));
avatarOptions.forEach((avatar) => validateAssetPath(avatar.assetPath, `AVATAR_OPTIONS:${avatar.id}`));

const catalogItems = Array.isArray(catalog?.items) ? catalog.items : [];
checkIdDuplicates(catalogItems.map((item) => item?.id)).forEach((id) => errors.push(`Duplicate catalog id: ${id}`));

catalogItems.forEach((item, index) => {
  const id = String(item?.id || "").trim();
  const type = String(item?.type || "").trim().toLowerCase();
  const active = item?.active !== false;
  const asset = String(item?.asset || "").trim();

  if (!id) errors.push(`Catalog item #${index + 1} missing id.`);
  if (!["ship", "avatar", "pet", "object"].includes(type)) {
    warnings.push(`Catalog item '${id || index + 1}' has unknown type '${type}'.`);
  }
  if (active) {
    validateAssetPath(asset, `catalog:${id || index + 1}`);
  }
});

const shopFilenameIssues = checkShopFilenameHygiene();
shopFilenameIssues.forEach((relativePath) => {
  errors.push(`Shop asset filename hygiene violation (space/uppercase): ${relativePath}`);
});

const printSection = (label, values) => {
  if (values.length === 0) {
    console.log(`✅ ${label}: none`);
    return;
  }
  console.log(`${label}:`);
  values.forEach((value) => console.log(`  - ${value}`));
};

console.log("\nCollectibles Wiring Validation\n");
console.log(`Mode: ${isStrict ? "strict (warnings fail)" : "standard (warnings allowed)"}`);
printSection("❌ Errors", errors);
printSection("⚠️ Warnings", warnings);

console.log("\nSummary:");
console.log(`  Errors: ${errors.length}`);
console.log(`  Warnings: ${warnings.length}`);

if (reportOutputPath) {
  const reportPayload = {
    generatedAt: new Date().toISOString(),
    mode: isStrict ? "strict" : "standard",
    summary: {
      errors: errors.length,
      warnings: warnings.length,
    },
    errors,
    warnings,
  };

  const absoluteReportPath = path.isAbsolute(reportOutputPath)
    ? reportOutputPath
    : path.join(rootDir, reportOutputPath);

  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
  fs.writeFileSync(absoluteReportPath, JSON.stringify(reportPayload, null, 2), "utf8");
  console.log(`\nReport written: ${toPosix(path.relative(rootDir, absoluteReportPath))}`);
}

if (errors.length > 0 || (isStrict && warnings.length > 0)) {
  if (isStrict && warnings.length > 0 && errors.length === 0) {
    console.error("\nStrict mode failed: warnings are treated as errors.");
  }
  process.exitCode = 1;
}
