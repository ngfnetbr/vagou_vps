const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');
const outputFile = path.join(__dirname, 'docs_completa.html');

const files = [
    'README.md',
    'arquitetura.md',
    'requisitos.md',
    'modulos.md',
    'dados.md',
    'instalacao_deploy.md',
    'manual_usuario.md',
    'manual_admin.md',
    'api_seguranca.md',
    'troubleshooting.md',
    'glossario.md'
];

let htmlContent = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentação Técnica - Sistema SAM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        pre { background: #f4f4f4; padding: 1rem; border-radius: 5px; overflow-x: auto; }
        code { font-family: monospace; background: #eee; padding: 0.2rem 0.4rem; border-radius: 3px; }
        h1 { font-size: 2.5rem; font-weight: bold; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
        h2 { font-size: 2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 1rem; color: #1e40af; }
        h3 { font-size: 1.5rem; font-weight: bold; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #1e3a8a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .mermaid { margin: 1rem 0; background: #fafafa; padding: 1rem; border: 1px dashed #ccc; border-radius: 8px; }
        @media print {
            .no-print { display: none; }
            body { font-size: 12pt; }
            h1, h2, h3 { page-break-after: avoid; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body class="bg-gray-50">
    <div class="max-w-4xl mx-auto bg-white p-8 my-8 shadow-lg rounded-lg">
        <header class="mb-12 text-center">
            <h1 class="text-4xl text-blue-800">Sistema SAM</h1>
            <p class="text-xl text-gray-600">Documentação Técnica Completa</p>
            <p class="mt-4 text-sm text-gray-500">Versão 1.0.0 | Data: ${new Date().toLocaleDateString('pt-BR')}</p>
        </header>

        <nav class="no-print bg-gray-100 p-6 rounded-lg mb-12">
            <h2 class="text-xl mb-4 mt-0">Sumário</h2>
            <ul class="space-y-2">
`;

// Simple markdown to HTML converter (very basic)
function simpleMarkdownToHtml(md) {
    return md
        .replace(/^# (.*$)/gim, '<h1 id="$1">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 id="$1">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 id="$1">$1</h3>')
        .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" class="max-w-full h-auto">')
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
        .replace(/```mermaid([\s\S]*?)```/gim, '<div class="mermaid"><p class="text-xs font-bold text-gray-400 mb-2">DIAGRAMA MERMAID</p><pre>$1</pre></div>')
        .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        .replace(/\n\n/gim, '<br>')
        .replace(/\|(.*)\|/gim, (match) => {
            if (match.includes('---')) return '';
            const cells = match.split('|').filter(c => c.trim() !== '');
            return `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
        });
}

// Add Table of Contents links
files.forEach(file => {
    const title = file.replace('.md', '').replace('_', ' ').toUpperCase();
    htmlContent += `<li><a href="#section-${file}" class="text-blue-600 hover:underline">${title}</a></li>`;
});

htmlContent += `
            </ul>
        </nav>
        <main>
`;

// Add content from each file
files.forEach(file => {
    const filePath = path.join(docsDir, file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        htmlContent += `<section id="section-${file}" class="page-break mb-16">`;
        htmlContent += simpleMarkdownToHtml(content);
        htmlContent += `</section>`;
    }
});

htmlContent += `
        </main>
        <footer class="mt-12 pt-8 border-t text-center text-gray-500 text-sm">
            <p>© 2026 Sistema SAM - Documentação Técnica gerada automaticamente.</p>
        </footer>
    </div>
</body>
</html>
`;

fs.writeFileSync(outputFile, htmlContent);
console.log('Documentação HTML gerada com sucesso: docs_completa.html');
