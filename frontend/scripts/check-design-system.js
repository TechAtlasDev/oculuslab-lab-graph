import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Reglas de verificación
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F300}-\u{1F5FF}]/u;
const ARBITRARY_CLASS_REGEX = /\b[a-zA-Z0-9-]+-\[\s*[^\]]+\s*\]/g;
const SMALL_SIZE_REGEX = /\b(text-xs|text-sm|gap-xs|gap-sm|gap-0\.5|gap-1|p-0\.5|p-1|m-0\.5|m-1)\b/g;

// Reglas para colores hardcodeados
const HARDCODED_COLOR_CLASS_REGEX = /\b(bg|text|border|ring|fill|stroke|from|to|via)-\[\s*(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|[a-z]+)\s*\]/g;
const INLINE_HEX_COLOR_REGEX = /(?:color|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|fill|stroke):\s*['"`](#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/g;
const RAW_HEX_LITERAL_REGEX = /(?<![a-zA-Z0-9_])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

let totalErrors = 0;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(projectRoot, filePath);
  const isCssFile = filePath.endsWith('.css');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // 1. Verificar Emojis
    if (EMOJI_REGEX.test(line)) {
      console.error(`❌ [EMOJI PROHIBIDO] ${relativePath}:${lineNumber}`);
      console.error(`   Línea: ${line.trim()}`);
      console.error(`   👉 Se deben usar únicamente iconos de @phosphor-icons/react.\n`);
      totalErrors++;
    }

    // 2. Verificar colores hardcodeados en clases Tailwind (ej: bg-[#ff0000], text-[#1a1a1a])
    const colorClassMatches = line.match(HARDCODED_COLOR_CLASS_REGEX);
    if (colorClassMatches) {
      colorClassMatches.forEach((match) => {
        console.error(`❌ [COLOR HARDCODEADO EN CLASE] ${relativePath}:${lineNumber}`);
        console.error(`   Clase de color prohibida: "${match}"`);
        console.error(`   Línea: ${line.trim()}`);
        console.error(`   👉 Usar variables semánticas de shadcn/ui (bg-background, text-foreground, bg-primary, text-muted-foreground, border-border, etc.).\n`);
        totalErrors++;
      });
    }

    // 3. Verificar valores arbitrarios (hardcodeados) en general como text-[10px], gap-[10px], etc.
    const arbitraryMatches = line.match(ARBITRARY_CLASS_REGEX);
    if (arbitraryMatches) {
      arbitraryMatches.forEach((match) => {
        // Evitar duplicar reporte si ya fue capturado como color
        if (!HARDCODED_COLOR_CLASS_REGEX.test(match)) {
          console.error(`❌ [VALOR HARDCODEADO] ${relativePath}:${lineNumber}`);
          console.error(`   Clase prohibida: "${match}"`);
          console.error(`   Línea: ${line.trim()}`);
          console.error(`   👉 No usar valores entre corchetes [...]. Usar tokens de Tailwind/shadcn.\n`);
          totalErrors++;
        }
      });
    }

    // 4. Verificar tamaños pequeños prohibidos (text-xs, text-sm, gap-xs, etc.)
    const smallMatches = line.match(SMALL_SIZE_REGEX);
    if (smallMatches) {
      smallMatches.forEach((match) => {
        console.error(`❌ [TAMAÑO PEQUEÑO PROHIBIDO] ${relativePath}:${lineNumber}`);
        console.error(`   Clase prohibida: "${match}"`);
        console.error(`   Línea: ${line.trim()}`);
        console.error(`   👉 Usar tamaños partiendo de text-base, gap-4, p-4, etc.\n`);
        totalErrors++;
      });
    }

    // 5. Verificar colores hardcodeados en estilos inline o JSX (solo en archivos .tsx/.ts/.jsx/.js, no en index.css)
    if (!isCssFile) {
      const inlineColorMatches = line.match(INLINE_HEX_COLOR_REGEX);
      if (inlineColorMatches) {
        inlineColorMatches.forEach((match) => {
          console.error(`❌ [COLOR HARDCODEADO EN INLINE STYLE] ${relativePath}:${lineNumber}`);
          console.error(`   Estilo prohibido: "${match}"`);
          console.error(`   Línea: ${line.trim()}`);
          console.error(`   👉 No usar colores hex/rgb inline. Usar tokens semánticos de shadcn/ui en className.\n`);
          totalErrors++;
        });
      }

      // Detectar literales Hex sueltos en componentes (evitando importaciones u otros usos validos)
      if (line.includes('style=') && RAW_HEX_LITERAL_REGEX.test(line)) {
        console.error(`❌ [HEX HARDCODEADO EN ESTILO] ${relativePath}:${lineNumber}`);
        console.error(`   Línea: ${line.trim()}`);
        console.error(`   👉 Usar clases semánticas de shadcn/ui (bg-primary, text-foreground, etc.).\n`);
        totalErrors++;
      }
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fullPath.includes(path.join('src', 'components', 'ui'))) {
      continue; // Excluir componentes base oficiales de shadcn/ui
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(tsx?|jsx?|html|css)$/.test(file)) {
      scanFile(fullPath);
    }
  }
}

console.log('🔍 Auditando cumplimiento del Sistema de Diseño (shadcn/ui)...');
walkDir(srcDir);

if (totalErrors > 0) {
  console.error(`\n💥 Se encontraron ${totalErrors} error(es) en el Sistema de Diseño.`);
  process.exit(1);
} else {
  console.log('✨ ¡Auditoría completada sin errores! El código cumple con las reglas del Design System.\n');
}
