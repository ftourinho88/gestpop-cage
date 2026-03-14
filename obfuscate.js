/**
 * obfuscate.js
 * Processa index.html:
 *  1. Injeta aviso de copyright
 *  2. Ofusca cada bloco <script> (string-array + compact, sem renomear globals)
 *  3. Minifica CSS inline e remove espaços do HTML
 */

const fs   = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHtml } = require('html-minifier-terser');

const INPUT  = 'index.html';
const OUTPUT = 'index.html'; // sobrescreve

const COPYRIGHT = `<!-- © ${new Date().getFullYear()} Felipe Cesar Tourinho. Todos os direitos reservados.
     Programa de computador protegido pela Lei nº 9.609/1998 (Lei do Software) e pela Lei nº 9.610/1998 (Lei de Direitos Autorais).
     É proibida a reprodução, distribuição ou modificação sem autorização expressa do autor. -->`;

const OBFUSCATOR_OPTS = {
  compact:                    true,
  controlFlowFlattening:      false, // desativado — muito lento em arquivo grande
  deadCodeInjection:          false,
  stringArray:                true,
  stringArrayEncoding:        ['base64'],
  stringArrayThreshold:       0.75,
  rotateStringArray:          true,
  shuffleStringArray:         true,
  splitStrings:               false,
  renameGlobals:              false,  // IMPORTANTE: não quebra funções globais do HTML
  renameProperties:           false,
  identifierNamesGenerator:   'mangled',
  selfDefending:              false,
  debugProtection:            false,
  disableConsoleOutput:       false,
};

(async () => {
  let html = fs.readFileSync(INPUT, 'utf8');

  // 1. Injeta copyright logo após <!DOCTYPE html>
  html = html.replace(/^<!DOCTYPE html>/i, `<!DOCTYPE html>\n${COPYRIGHT}`);

  // 2. Ofusca cada bloco <script>...</script>
  let scriptCount = 0;
  html = html.replace(/<script(\s[^>]*)?>[\s\S]*?<\/script>/gi, (match, attrs) => {
    // Ignora tags com src= (scripts externos) e type diferente de JS
    if (/\bsrc\s*=/i.test(attrs || '')) return match;
    if (/type\s*=\s*["'][^"']*(?:template|json|text\/html)[^"']*["']/i.test(attrs || '')) return match;

    const inner = match.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    if (!inner.trim()) return match;

    try {
      const result = JavaScriptObfuscator.obfuscate(inner, OBFUSCATOR_OPTS);
      scriptCount++;
      return `<script${attrs||''}>${result.getObfuscatedCode()}</script>`;
    } catch (e) {
      console.warn(`  ⚠ bloco ${scriptCount + 1} não ofuscado (erro de parse): ${e.message.slice(0, 80)}`);
      return match; // mantém original se falhar
    }
  });

  console.log(`  ✔ ${scriptCount} blocos de script ofuscados`);

  // 3. Minifica HTML + CSS inline (remove comentários HTML, exceto o copyright)
  html = await minifyHtml(html, {
    collapseWhitespace:            true,
    removeComments:                false, // mantém o copyright
    removeRedundantAttributes:     true,
    removeScriptTypeAttributes:    true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS:                     true,
    minifyJS:                      false, // já ofuscado acima
    preserveLineBreaks:            false,
  });

  fs.writeFileSync(OUTPUT, html, 'utf8');
  console.log(`  ✔ Arquivo salvo: ${OUTPUT} (${(fs.statSync(OUTPUT).size / 1024).toFixed(0)} KB)`);
})();
