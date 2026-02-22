import { useState } from 'react';
import { Calculator, Moon, Sun, Menu, X, RefreshCw } from 'lucide-react';
import styles from './Shell.module.css';

interface ShellProps {
    children: React.ReactNode;
    navItems: { id: string; title: string; icon: React.ReactNode }[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

export function Shell({ children, navItems, activeTab, onTabChange }: ShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check initial preference
        if (typeof window !== 'undefined') {
            return document.documentElement.getAttribute('data-theme') === 'dark';
        }
        return false;
    });

    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    };

    const handleResetApp = () => {
        localStorage.clear();
        window.location.reload();
    };

    return (
        <div className={styles.shell}>
            {/* Mobile Header */}
            <header className={styles.mobileHeader}>
                <button
                    className={styles.iconButton}
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open menu"
                >
                    <Menu size={24} />
                </button>
                <h1 className={styles.mobileTitle}>FinCalc</h1>
                <button
                    className={styles.iconButton}
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
                </button>
            </header>

            {/* Backdrop for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className={styles.sidebarBackdrop}
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.brand}>
                        <Calculator className={styles.brandIcon} size={28} />
                        <h2>FinCalc</h2>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                onTabChange(item.id);
                                setIsSidebarOpen(false);
                            }}
                            className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ''}`}
                        >
                            {item.icon}
                            <span>{item.title}</span>
                        </button>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <button className={styles.themeToggle} onClick={toggleTheme}>
                        {isDarkMode ? (
                            <>
                                <Sun size={20} />
                                <span>Light Mode</span>
                            </>
                        ) : (
                            <>
                                <Moon size={20} />
                                <span>Dark Mode</span>
                            </>
                        )}
                    </button>

                    <button className={styles.resetButton} onClick={handleResetApp}>
                        <RefreshCw size={20} />
                        <span>Reset App</span>
                    </button>

                    <div className={styles.authorBlock}>
                        <span className={styles.authorText}>
                            Made with ❤️ by{' '}
                            <a href="https://linkedin.com/in/sumanthjillepally" target="_blank" rel="noopener noreferrer" className={styles.authorName}>
                                Sumanth
                            </a> using Antigravity
                        </span>
                        <div className={styles.authorLinks}>
                            <a href="https://buymeacoffee.com/sumanth_js" target="_blank" rel="noopener noreferrer" aria-label="Buy Me A Coffee" style={{ marginTop: '0.5rem' }}>
                                <img
                                    src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                                    alt="Buy Me A Coffee"
                                    style={{ height: '36px', width: 'auto' }}
                                />
                            </a>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={styles.mainContent}>
                <div className={styles.contentWrapper}>
                    {children}
                </div>
            </main>
        </div>
    );
}
