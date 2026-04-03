const axios = require('axios');

// ═══════════════════════════════════════
// ★ স্মার্ট টেক্সট প্রসেসর
// কোড ও গণিত সুরক্ষিত রেখে শুধু
// decorative markdown সরায়
// ═══════════════════════════════════════

function cleanText(text) {
    if (!text) return '';

    // ধাপ ১: কোড ব্লক আলাদা করে রাখা
    const preserved = [];
    let processed = text;

    // ```code``` ব্লক
    processed = processed.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const i = preserved.length;
        preserved.push({
            type: 'block',
            lang: lang || 'Code',
            content: code.trim()
        });
        return `<<<PRESERVED_${i}>>>`;
    });

    // `inline code`
    processed = processed.replace(/`([^`]+)`/g, (_, code) => {
        const i = preserved.length;
        preserved.push({ type: 'inline', content: code });
        return `<<<PRESERVED_${i}>>>`;
    });

    // ধাপ ২: Decorative markdown সরানো
    processed = processed
        .replace(/^###\s+(.+)$/gm, '▸ $1')
        .replace(/^##\s+(.+)$/gm, '■ $1')
        .replace(/^#\s+(.+)$/gm, '◆ $1')
        .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '[$1]')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '[$1]')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '• ')
        .replace(/^[-*_]{3,}\s*$/gm, '────────────────')
        .replace(/^>\s+/gm, '│ ')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        // LaTeX math
        .replace(/\$\$([^$]+)\$\$/g, (_, m) => latexToUnicode(m))
        .replace(/\$([^$]+)\$/g, (_, m) => latexToUnicode(m))
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // ধাপ ৩: কোড ফিরিয়ে আনা
    preserved.forEach((item, i) => {
        let replacement;
        if (item.type === 'block') {
            replacement = `\n📝 [${item.lang}]\n━━━━━━━━━━━━━━━━\n${item.content}\n━━━━━━━━━━━━━━━━`;
        } else {
            replacement = `'${item.content}'`;
        }
        processed = processed.replace(`<<<PRESERVED_${i}>>>`, replacement);
    });

    return processed;
}

// LaTeX → Unicode
function latexToUnicode(latex) {
    let r = latex.trim();

    const symbols = {
        '\\pi': 'π', '\\theta': 'θ', '\\alpha': 'α', '\\beta': 'β',
        '\\gamma': 'γ', '\\delta': 'δ', '\\Delta': 'Δ', '\\sigma': 'σ',
        '\\Sigma': 'Σ', '\\mu': 'μ', '\\lambda': 'λ', '\\omega': 'ω',
        '\\infty': '∞', '\\sqrt': '√', '\\sum': 'Σ', '\\int': '∫',
        '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\pm': '±',
        '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
        '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒',
        '\\therefore': '∴', '\\angle': '∠', '\\degree': '°',
        '\\forall': '∀', '\\exists': '∃', '\\in': '∈',
        '\\emptyset': '∅', '\\cup': '∪', '\\cap': '∩',
        '\\partial': '∂', '\\nabla': '∇',
    };

    for (const [cmd, sym] of Object.entries(symbols)) {
        r = r.replace(new RegExp(cmd.replace(/\\/g, '\\\\'), 'g'), sym);
    }

    const sup = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ','+':'⁺','-':'⁻' };
    const sub = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ' };

    r = r.replace(/\^{([^}]+)}/g, (_, c) => c.split('').map(x => sup[x]||x).join(''));
    r = r.replace(/\^(\w)/g, (_, c) => sup[c] || `^${c}`);
    r = r.replace(/_{([^}]+)}/g, (_, c) => c.split('').map(x => sub[x]||x).join(''));
    r = r.replace(/_(\w)/g, (_, c) => sub[c] || `_${c}`);
    r = r.replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1/$2)');
    r = r.replace(/√{([^}]+)}/g, '√($1)');
    r = r.replace(/\\[a-zA-Z]+/g, '');
    r = r.replace(/[{}]/g, '');

    return r;
}

// ছবি → Base64
async function imageUrlToBase64(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024
        });
        const mime = response.headers['content-type'] || 'image/jpeg';
        const b64 = Buffer.from(response.data).toString('base64');
        console.log(`✅ Image: ${(response.data.byteLength/1024).toFixed(1)}KB`);
        return `data:${mime};base64,${b64}`;
    } catch (error) {
        console.error('❌ Image error:', error.message);
        return null;
    }
}

module.exports = { cleanText, imageUrlToBase64 };