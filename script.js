// Initialize loading state
let loading = true;
const username = 'ujjwal-ibm';

// Initialize Charts.js defaults
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--main-color');

// Update loading state
function setLoading(state) {
    loading = state;
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = state ? 'flex' : 'none';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme switcher
    const modeSwitch = document.querySelector('.mode-switch');
    if (modeSwitch) {
        modeSwitch.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            updateChartsTheme();
        });
    }

    // Initialize view switchers
    const listView = document.querySelector('.list-view');
    const gridView = document.querySelector('.grid-view');
    const projectBoxes = document.querySelector('.project-boxes');

    if (listView && gridView && projectBoxes) {
        listView.addEventListener('click', () => {
            gridView.classList.remove('active');
            listView.classList.add('active');
            projectBoxes.classList.remove('jsGridView');
            projectBoxes.classList.add('jsListView');
        });

        gridView.addEventListener('click', () => {
            gridView.classList.add('active');
            listView.classList.remove('active');
            projectBoxes.classList.remove('jsListView');
            projectBoxes.classList.add('jsGridView');
        });
    }

    // Set current date
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        currentDateElement.textContent = new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Initialize GitHub data
    improveScrollPerformance();
    initializeMessageClose();
    initializeTabNavigation();
    fetchGitHubData();
});

// Fetch GitHub Data
async function fetchGitHubData() {
    setLoading(true);
    try {
        // Fetch user data
        const userData = await fetch(`https://api.github.com/users/${username}`).then(res => res.json());
        
        if (userData.message) {
            throw new Error(userData.message);
        }

        // Update profile information
        updateUserProfile(userData);

        // Fetch repositories
        const repos = await fetch(`${userData.repos_url}?per_page=100`).then(res => res.json());
        
        // Fetch contribution data (last year)
        const contributionData = await fetchContributionData();

        // Update UI components
        updateRepositoryStats(repos);
        createLanguageChart(repos);
        createCommitChart(contributionData);
        createRepoGrowthChart(repos);
        createContributionCalendar(contributionData);
        updateActivityFeed(repos);

    } catch (error) {
        console.error('Error fetching GitHub data:', error);
        showError(`Error loading GitHub data: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

function updateUserProfile(userData) {
    const avatarElement = document.getElementById('avatar');
    const usernameElement = document.getElementById('username');
    const repoCountElement = document.getElementById('repo-count');
    const followersCountElement = document.getElementById('followers-count');
    const followingCountElement = document.getElementById('following-count');

    if (avatarElement) avatarElement.src = userData.avatar_url;
    if (usernameElement) usernameElement.textContent = userData.name || userData.login;
    if (repoCountElement) repoCountElement.textContent = userData.public_repos;
    if (followersCountElement) followersCountElement.textContent = userData.followers;
    if (followingCountElement) followingCountElement.textContent = userData.following;
}

async function fetchContributionData() {
    // Simulated contribution data for the last year
    const now = new Date();
    const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
    
    return {
        contributions: Array.from({ length: 365 }, (_, i) => {
            const date = new Date(oneYearAgo);
            date.setDate(date.getDate() + i);
            return {
                date: date.toISOString().split('T')[0],
                count: Math.floor(Math.random() * 10)
            };
        })
    };
}

function updateRepositoryStats(repos) {
    // Update total commits (estimated)
    const totalCommitsElement = document.getElementById('total-commits');
    if (totalCommitsElement) {
        const estimatedCommits = repos.reduce((total, repo) => total + (repo.size / 10), 0);
        totalCommitsElement.textContent = Math.floor(estimatedCommits);
    }
}

function createLanguageChart(repos) {
    const ctx = document.getElementById('language-chart');
    if (!ctx) return;

    // Clear any existing chart
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }

    // Get all languages and their byte counts
    const languageStats = {};
    const languagePromises = repos.map(repo => {
        if (!repo.languages_url) return Promise.resolve();
        return fetch(repo.languages_url)
            .then(res => res.json())
            .then(languages => {
                Object.entries(languages).forEach(([lang, bytes]) => {
                    languageStats[lang] = (languageStats[lang] || 0) + bytes;
                });
            })
            .catch(err => console.error('Error fetching language stats:', err));
    });

    Promise.all(languagePromises).then(() => {
        // Sort languages by byte count
        const sortedLanguages = Object.entries(languageStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10); // Only show top 10 languages

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedLanguages.map(([lang]) => lang),
                datasets: [{
                    data: sortedLanguages.map(([, bytes]) => bytes),
                    backgroundColor: generateColors(sortedLanguages.length),
                    borderColor: getComputedStyle(document.documentElement)
                        .getPropertyValue('--projects-section'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                family: "'DM Sans', sans-serif",
                                size: 12
                            },
                            boxWidth: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const bytes = context.raw;
                                const percentage = ((bytes / sortedLanguages.reduce((acc, [, b]) => acc + b, 0)) * 100).toFixed(1);
                                return `${context.label}: ${formatBytes(bytes)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    });
}

function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function improveScrollPerformance() {
    let ticking = false;
    const projectBoxes = document.querySelector('.project-boxes');
    const messagesSection = document.querySelector('.messages-section');

    if (projectBoxes) {
        projectBoxes.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // Add any scroll-based updates here
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    if (messagesSection) {
        messagesSection.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // Add any scroll-based updates here
                    ticking = false;
                });
                ticking = true;
            }
        });
    }
}

function initializeMessageClose() {
    const messagesSection = document.querySelector('.messages-section');
    const messagesClose = document.querySelector('.messages-close');
    const messagesBtn = document.querySelector('.messages-btn');

    if (messagesClose && messagesSection) {
        messagesClose.addEventListener('click', () => {
            messagesSection.classList.remove('show');
        });
    }

    if (messagesBtn && messagesSection) {
        messagesBtn.addEventListener('click', () => {
            messagesSection.classList.add('show');
        });
    }
}

function createCommitChart(contributionData) {
    const ctx = document.getElementById('commit-chart');
    if (!ctx) return;

    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }

    const commitsByMonth = contributionData.contributions.reduce((acc, day) => {
        const month = day.date.substring(0, 7);
        acc[month] = (acc[month] || 0) + day.count;
        return acc;
    }, {});

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(commitsByMonth),
            datasets: [{
                label: 'Commits',
                data: Object.values(commitsByMonth),
                borderColor: '#4facfe',
                backgroundColor: 'rgba(79, 172, 254, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function createRepoGrowthChart(repos) {
    const ctx = document.getElementById('repo-growth-chart');
    if (!ctx) return;

    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }

    const reposByMonth = repos.reduce((acc, repo) => {
        const month = repo.created_at.substring(0, 7);
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {});

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(reposByMonth),
            datasets: [{
                label: 'New Repositories',
                data: Object.values(reposByMonth),
                backgroundColor: '#00f2fe',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function createContributionCalendar(contributionData) {
    const calendar = document.getElementById('contribution-calendar');
    if (!calendar) return;

    calendar.innerHTML = '';

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'contribution-tooltip';
    document.body.appendChild(tooltip);

    contributionData.contributions.forEach(day => {
        const level = getContributionLevel(day.count);
        const dayElement = document.createElement('div');
        dayElement.className = 'contribution-day';
        dayElement.setAttribute('data-level', level);
        dayElement.setAttribute('data-date', day.date);

        // Enhanced hover functionality
        dayElement.addEventListener('mouseover', (e) => {
            const rect = e.target.getBoundingClientRect();
            tooltip.textContent = `${day.count} contributions on ${moment(day.date).format('MMMM D, YYYY')}`;
            tooltip.style.display = 'block';
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
            tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
        });

        dayElement.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });

        calendar.appendChild(dayElement);
    });
}

function initializeTabNavigation() {
    const sidebarLinks = document.querySelectorAll('.app-sidebar-link');
    const sections = {
        'overview': document.querySelector('.projects-section'),
        'repositories': document.querySelector('.project-boxes'),
        'activity': document.querySelector('.messages-section')
    };

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = e.currentTarget.getAttribute('href').substring(1);

            // Update active state
            sidebarLinks.forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');

            // Show/hide sections
            Object.entries(sections).forEach(([key, section]) => {
                if (section) {
                    if (key === targetSection) {
                        section.style.display = 'block';
                    } else {
                        section.style.display = 'none';
                    }
                }
            });
        });
    });
}

function updateActivityFeed(repos) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    feed.innerHTML = '';
    const sortedRepos = [...repos].sort((a, b) => 
        new Date(b.pushed_at) - new Date(a.pushed_at)
    );

    sortedRepos.slice(0, 10).forEach(repo => {
        const messageBox = document.createElement('div');
        messageBox.className = 'message-box';
        messageBox.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <div class="name">${repo.name}</div>
                    <div class="time">${moment(repo.pushed_at).fromNow()}</div>
                </div>
                <p class="message-line">
                    ${repo.description || 'No description available'}
                </p>
                <p class="message-line">
                    ${repo.language ? `
                        <span class="repo-language">
                            <span class="language-color" style="background-color: ${getLanguageColor(repo.language)}"></span>
                            ${repo.language}
                        </span>
                    ` : ''}
                    <span class="repo-stars">★ ${repo.stargazers_count}</span>
                    <span class="repo-forks">⑂ ${repo.forks_count}</span>
                </p>
            </div>
        `;
        feed.appendChild(messageBox);
    });
}

function getContributionLevel(count) {
    if (count === 0) return '0';
    if (count <= 3) return '1';
    return '2';
}

function generateColors(count) {
    const colors = [
        '#4facfe', '#00f2fe', '#45ada8', '#547980',
        '#59c173', '#5d26c1', '#6f86d6', '#48c6ef',
        '#4158d0', '#c850c0', '#ffcc70'
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

function getLanguageColor(language) {
    const colors = {
        JavaScript: '#f1e05a',
        Python: '#3572A5',
        Java: '#b07219',
        TypeScript: '#2b7489',
        HTML: '#e34c26',
        CSS: '#563d7c',
        PHP: '#4F5D95',
        Ruby: '#701516',
        'C++': '#f34b7d',
        C: '#555555'
    };
    return colors[language] || '#8b8b8b';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function updateChartsTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--main-color');
    Chart.defaults.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // Reload all charts
    fetchGitHubData();
}