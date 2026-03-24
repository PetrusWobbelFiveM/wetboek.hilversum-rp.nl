const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const sidebar = document.getElementById('sidebar');
const artikelList = document.getElementById('artikelList');

function buildSidebarForTab(tabId) {
    if (!artikelList) return;
    artikelList.innerHTML = '';

    const tab = document.getElementById(tabId);
    if (!tab) return;

    const headers = tab.querySelectorAll('.article-content h5[id], .article-content h4[id]');
    headers.forEach(header => {
        const id = header.id;
        if (!id) return;

        const text = header.textContent.trim();
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = text;

        listItem.appendChild(link);
        artikelList.appendChild(listItem);
    });
}

function replaceSRwithHR() {
    const wetboek = document.getElementById('wetboek');
    if (!wetboek) return;

    wetboek.querySelectorAll('h5[id]').forEach(h5 => {
        h5.textContent = h5.textContent.replace(/\bSR\b/g, 'HR');
    });
}

function toggleSidebar(activeTab) {
    if (!sidebar) return;
    sidebar.style.display = activeTab === 'apv' || activeTab === 'wetboek' || activeTab === 'eiland' ? 'block' : 'none';
    if (activeTab === 'apv' || activeTab === 'wetboek' || activeTab === 'eiland') {
        buildSidebarForTab(activeTab);
    }
}

// Initialize text transformations, sidebar visibility, and content on load
replaceSRwithHR();
buildSidebarForTab('apv');
toggleSidebar('apv');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');

        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(targetId).classList.add('active');

        toggleSidebar(targetId);
    });
});

const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', event => {
    const query = event.target.value.toLowerCase().trim();
    const articleItems = Array.from(document.querySelectorAll('.article-list li'));

    if (!query) {
        articleItems.forEach(item => item.style.display = 'list-item');
        return;
    }

    // Filter sidebar
    articleItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'list-item' : 'none';
    });
});

// Wrap each article in APV & Wetboek in its own card container
function wrapArticleCards() {
    const containers = document.querySelectorAll('#apv .article-content, #wetboek .article-content');
    containers.forEach(container => {
        const headers = Array.from(container.querySelectorAll('h5[id]'));

        headers.forEach(header => {
            if (!header.parentElement) return; // may be already moved

            const card = document.createElement('div');
            card.className = 'article-card';

            let current = header;
            let next = null;

            while (current) {
                next = current.nextElementSibling;
                card.appendChild(current);

                if (!next || next.tagName === 'H5' || next.tagName === 'H4') {
                    break;
                }
                current = next;
            }

            container.insertBefore(card, next || null);
        });
    });
}

function normalizeHeaderCell(headerCell) {
    const text = headerCell.toLowerCase();
    if (text.includes('celstraf')) return 'Celstraf';
    if (text.includes('taakstraf')) return 'Taakstraf';
    if (text.includes('boete')) return 'Boete';
    if (text.includes('feit')) return 'Feit';
    if (text.includes('sanctie')) return 'Sanctie';
    return headerCell;
}

function inferPenaltyType(token) {
    const normalized = token.toLowerCase();
    if (normalized.includes('€') || normalized.includes('euro')) return 'boete';
    if (normalized.match(/\b(uur|minuut|minuten|min|u|h)\b/i)) return 'taakstraf';
    if (normalized.match(/\b(maand|maanden|jaar|jaren|dag|dagen|week|weken)\b/i)) return 'celstraf';
    if (normalized.match(/\b(51-100km\/h|101-150km\/h|151\/200km\/h|vanaf 200km\/h|2-5|6-40|41-50|51-100|101-150|151-250)\b/i)) return 'feit';
    if (normalized.match(/\b(inbeslagname|afgesleept|in beslag|geschrapt|verbeurd|ontslagen|ban|wipe|boete)\b/i)) return 'sanctie';
    return null;
}

function normalizeTimeValue(value) {
    const lower = value.toLowerCase();
    if (!lower.match(/\b(uur|u)\b/i)) return value;

    const hourMatch = lower.match(/(\d+(?:[\.,]\d+)?)\s*uur/);
    if (!hourMatch) return value;

    let hours = parseFloat(hourMatch[1].replace(',', '.'));
    if (Number.isNaN(hours)) return value;

    if (lower.match(/\b(minuut|minuten|min)\b/i)) {
        hours = Math.floor(hours);
    }

    return `${hours} uur`;
}

function normalizeBoeteValue(value) {
    if (!value || typeof value !== 'string') return value;

    const match = value.match(/^(\s*€\s*)?(\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d+)?)(.*)$/);
    if (!match) return value;

    const prefix = match[1] || '';
    let numberPart = match[2];
    const suffix = match[3] || '';

    // 1.000,50 of 1000.50 => 1000.50
    numberPart = numberPart.replace(/\./g, '').replace(',', '.');
    const numberValue = parseFloat(numberPart);
    if (Number.isNaN(numberValue)) return value;

    const rounded = Math.round(numberValue);
    return `${prefix}${rounded}${suffix}`;
}

function fillRowToHeader(rowCells, headers, isSpeedTable = false) {
    const mapped = new Array(headers.length).fill('');
    const assigned = new Array(rowCells.length).fill(false);
    const normHeaders = headers.map(h => h.toLowerCase());

    // Force row identifiers zoals Eerste/Tweede/Meerdere Veroordelingen in eerste kolom
    const rowLabelIndex = rowCells.findIndex(cell => /veroordeling/i.test(cell));
    if (rowLabelIndex >= 0) {
        if (!mapped[0]) {
            mapped[0] = rowCells[rowLabelIndex];
            assigned[rowLabelIndex] = true;
        }
    }

    // Forceer snelheidsrange naar eerste kolom in snelheids-tabellen
    if (isSpeedTable) {
        const speedIndex = rowCells.findIndex(cell => /\b(?:\d{1,3}(?:[-–]\d{1,3})?|vanaf\s*\d{1,3})\s*km\/?h\b/i.test(cell));
        if (speedIndex >= 0 && !mapped[0]) {
            mapped[0] = rowCells[speedIndex];
            assigned[speedIndex] = true;
        }
    }

    rowCells.forEach((cell, idx) => {
        if (assigned[idx]) return;

        const type = inferPenaltyType(cell);
        let candidateIndex = -1;

        if (type === 'celstraf') {
            candidateIndex = normHeaders.findIndex(h => h.includes('cel'));
        } else if (type === 'taakstraf') {
            candidateIndex = normHeaders.findIndex(h => h.includes('taak'));
        } else if (type === 'boete') {
            candidateIndex = normHeaders.findIndex(h => h.includes('boete'));
        }

        if (candidateIndex >= 0 && !mapped[candidateIndex]) {
            mapped[candidateIndex] = cell;
            assigned[idx] = true;
            return;
        }

        if (type && candidateIndex === -1) {
            const fallback = normHeaders.findIndex(h => h.includes(type));
            if (fallback >= 0 && !mapped[fallback]) {
                mapped[fallback] = cell;
                assigned[idx] = true;
                return;
            }
        }

        if (!type && !mapped[0]) {
            mapped[0] = cell;
            assigned[idx] = true;
        }
    });

    rowCells.forEach((cell, idx) => {
        if (assigned[idx]) return;
        const type = inferPenaltyType(cell);

        for (let i = 0; i < normHeaders.length; i++) {
            if (mapped[i]) continue;
            if (type === 'celstraf' && normHeaders[i].includes('cel')) {
                mapped[i] = cell;
                assigned[idx] = true;
                break;
            }
            if (type === 'taakstraf' && normHeaders[i].includes('taak')) {
                mapped[i] = cell;
                assigned[idx] = true;
                break;
            }
            if (type === 'boete' && normHeaders[i].includes('boete')) {
                mapped[i] = cell;
                assigned[idx] = true;
                break;
            }
            if (!type && normHeaders[i].includes('feit')) {
                mapped[i] = cell;
                assigned[idx] = true;
                break;
            }
        }
    });

    rowCells.forEach((cell, idx) => {
        if (assigned[idx]) return;
        const emptyIndex = mapped.findIndex(v => !v);
        if (emptyIndex >= 0) {
            mapped[emptyIndex] = cell;
            assigned[idx] = true;
        }
    });

    // Normaliseer taakstraf-waarden (2 uur 30 minuten -> 2 uur)
    normHeaders.forEach((header, index) => {
        if (header.includes('taak') && mapped[index]) {
            mapped[index] = normalizeTimeValue(mapped[index]);
        }
    });

    // Normaliseer boetes in alle kolommen, met name centen weg
    mapped.forEach((cell, index) => {
        if (!cell || typeof cell !== 'string') return;
        if (cell.includes('€')) {
            mapped[index] = normalizeBoeteValue(cell);
        }
    });

    return mapped;
}

function convertPenaltyParagraphsToTable() {
    const penaltyParas = document.querySelectorAll('.article-content p');
    penaltyParas.forEach(p => {
        const text = p.textContent.trim();
        if (!text.match(/Celstraf/i) || !text.match(/Taakstraf/i) || !text.match(/boete/i)) return;

        const lines = p.innerHTML.split(/<br\s*\/?\>/i).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) return;

        const tables = [];
        let currentTable = { caption: null, header: null, rows: [], isSpeedTable: false };

        lines.forEach(rawLine => {
            const cleanLine = rawLine.replace(/<[^>]*>/g, '').trim();
            const cells = cleanLine.split(/\t+|\s{2,}/).map(v => v.trim()).filter(Boolean);
            const isHeaderRow = cells.some(c => /Celstraf/i.test(c)) && cells.some(c => /Taakstraf/i.test(c)) && cells.some(c => /boete/i.test(c));

            if (/^Rekentabel\s+/i.test(cleanLine) || /^Strafbepalingen/i.test(cleanLine) || /^Feit\s+/i.test(cleanLine) || /^Rijden met WOK-status straffen/i.test(cleanLine) || /^Illegale voertuigen/i.test(cleanLine)) {
                currentTable.caption = cleanLine;
                return;
            }

            if (isHeaderRow) {
                if (currentTable.header && currentTable.rows.length > 0) {
                    tables.push(currentTable);
                    currentTable = { caption: currentTable.caption, header: null, rows: [], isSpeedTable: false };
                }

                const isSpeedTable = lines.some(line => /km\/h/i.test(line));
                currentTable.isSpeedTable = isSpeedTable;
                currentTable.header = [isSpeedTable ? 'Snelheid' : 'Veroordeling', 'Celstraf', 'Taakstraf', 'Boete'];
                return;
            }

            if (cells.length > 0) {
                if (!currentTable.header && cells.length > 1) {
                    currentTable.header = cells.map((_, idx) => `Kolom ${idx + 1}`);
                }
                currentTable.rows.push(cells);
            }
        });

        if (currentTable.header && currentTable.rows.length > 0) {
            tables.push(currentTable);
        }

        if (tables.length === 0) return;

        const fragment = document.createDocumentFragment();
        tables.forEach(tableData => {
            const hasVeroordeling = tableData.rows.some(row => /^((Eerste|Tweede|Meerdere)\s+Veroordeling)/i.test(row[0] || ''));
            const isOpiumRekentabel = /Rekentabel\s+(Harddrugs|Softdrugs)/i.test(tableData.caption || '');
            const isOpiumIngredients = /Rekentabel\s+(Harddrugs|Softdrugs):\s*ingrediënten/i.test(tableData.caption || '');

            if (isOpiumRekentabel && hasVeroordeling) {
                return; // skip deze tabellen in IV-1/IV-2
            }

            if (isOpiumIngredients && tableData.header && tableData.header.length > 0) {
                tableData.header[0] = 'Ingrediënten';
            }

            const table = document.createElement('table');
            table.className = 'table table-sm table-bordered mb-4';

            if (tableData.caption) {
                const caption = document.createElement('caption');
                caption.textContent = tableData.caption;
                caption.style.captionSide = 'top';
                caption.style.color = '#ffffff';
                caption.style.textAlign = 'left';
                caption.style.fontWeight = '600';
                table.appendChild(caption);
            }

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            tableData.header.forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            tableData.rows.forEach(rowCells => {
                const finalCells = fillRowToHeader(rowCells, tableData.header, tableData.isSpeedTable);
                const tr = document.createElement('tr');
                finalCells.forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            fragment.appendChild(table);
        });

        p.replaceWith(fragment);
    });
}


// Ensure wrapping occurs after initial HTML loaded
document.addEventListener('DOMContentLoaded', () => {
    wrapArticleCards();
    convertPenaltyParagraphsToTable();
});

// Smooth scrolling for in-page anchor links
const anchorLinks = document.querySelectorAll('a[href^="#"]');
anchorLinks.forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const hash = this.getAttribute('href');
        if (hash && hash.length > 1) {
            e.preventDefault();
            const target = document.querySelector(hash);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});
