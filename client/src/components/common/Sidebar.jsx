import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { user, logout } = useAuth();

    const menuItems = [
        {
            title: 'Dashboard',
            icon: 'fa-chart-line',
            path: '/admin',
            roles: ['admin', 'operator', 'security']
        },
        {
            title: 'Tiket Aktif',
            icon: 'fa-ticket',
            path: '/admin/tickets',
            roles: ['admin', 'operator', 'security']
        },
        {
            title: 'Riwayat Pembayaran',
            icon: 'fa-money-bill-wave',
            path: '/admin/payments',
            roles: ['admin', 'operator']
        },
        {
            title: 'Pengaturan',
            icon: 'fa-cog',
            path: '/admin/settings',
            roles: ['admin']
        }
    ];

    const quickLinks = [
        { title: 'Entry Kendaraan', icon: 'fa-arrow-right-to-bracket', path: '/entry' },
        { title: 'Exit & Bayar', icon: 'fa-arrow-right-from-bracket', path: '/exit' }
    ];

    const filteredMenu = menuItems.filter(
        item => item.roles.includes(user?.role)
    );

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`sidebar transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <i className="fas fa-parking text-white text-lg"></i>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg">Smart Parking</h1>
                            <p className="text-white/50 text-xs">Management System</p>
                        </div>
                    </Link>
                </div>

                {/* User Info */}
                <div className="p-4 mx-3 mt-4 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-semibold">
                                {user?.username?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{user?.username}</p>
                            <p className="text-white/50 text-sm capitalize">{user?.role}</p>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="px-3 mt-6">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
                        Aksi Cepat
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {quickLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <i className={`fas ${link.icon} text-blue-400`}></i>
                                <span className="text-white/70 text-xs text-center">{link.title}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Main Navigation */}
                <nav className="mt-6 flex-1">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-6 mb-2">
                        Menu
                    </p>
                    {filteredMenu.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                        >
                            <i className={`fas ${item.icon} w-5 text-center`}></i>
                            <span>{item.title}</span>
                        </Link>
                    ))}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <i className="fas fa-sign-out-alt w-5 text-center"></i>
                        <span>Keluar</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
