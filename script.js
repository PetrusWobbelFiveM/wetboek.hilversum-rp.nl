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

function convertPenaltyParagraphsToTable() {
    const penaltyParas = document.querySelectorAll('#wetboek .article-content p');
    penaltyParas.forEach(p => {
        const text = p.textContent.trim();
        if (!text.startsWith('Celstraf')) return;

        const lines = p.innerHTML.split('<br>').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 2) return;

        const headers = lines[0].split(/\s{2,}|\t/).map(v => v.trim()).filter(Boolean);
        if (headers.length < 2) return;

        const table = document.createElement('table');
        table.className = 'table table-sm table-bordered mb-4';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        lines.slice(1).forEach(rowText => {
            const cols = rowText.split(/\s{2,}|\t/).map(v => v.trim()).filter(Boolean);
            if (cols.length === 0) return;

            const tr = document.createElement('tr');
            cols.forEach(c => {
                const td = document.createElement('td');
                td.textContent = c;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        if (tbody.children.length > 0) {
            table.appendChild(tbody);
            p.replaceWith(table);
        }
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