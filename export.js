import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(".", "src");
const OUTPUT_FILE = path.join(".", "All_Compacts.js");

function readMigrations(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return readMigrations(fullPath);
    if (entry.name.endsWith(".js") || entry.name.endsWith(".ts"))
      return [fullPath];
    return [];
  });
}

function cleanContent(content) {
  return (
    content
      // إزالة التعليقات
      .replace(/\/\/.*$/gm, "") // تعليقات //
      .replace(/#.*$/gm, "") // تعليقات #
      .replace(/\/\*[\s\S]*?\*\//gm, "") // تعليقات متعددة الأسطر /* */

      // إزالة import, require, use strict
      .replace(/^\s*(import|require|use strict).*$/gm, "")

      // إزالة الأسطر الفارغة
      .replace(/^\s*[\r\n]/gm, "")

      // ضغط الأقواس والفواصل
      .replace(/\s*{\s*/g, "{")
      .replace(/\s*}\s*/g, "}")
      .replace(/\s*;\s*/g, ";")
      .replace(/\s*\(\s*/g, "(")
      .replace(/\s*\)\s*/g, ")")
      .replace(/\s*,\s*/g, ",")

      // تقليل الفراغات الزائدة
      .replace(/[ ]{2,}/g, " ")

      // إزالة الفراغات من بداية كل سطر
      .replace(/^\s+/gm, "")
  );
}

function generate() {
  const files = readMigrations(MIGRATIONS_DIR).sort();

  let finalContent = "// === All Migrations (Compact) ===\n";

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const cleaned = cleanContent(raw);
    const relative = path.relative(
      path.dirname(new URL(import.meta.url).pathname),
      filePath
    );

    finalContent += `// ===== ${relative} =====\n`;
    finalContent += cleaned + "\n";
  }

  fs.writeFileSync(OUTPUT_FILE, finalContent);
  console.log("✅ Migrations exported to:", OUTPUT_FILE);
}

generate();
