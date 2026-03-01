import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onMenuClick, showMenuButton = false }) => {
    const { isAuthenticated, user } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left Side */}
                    <div className="flex items-center gap-4">
                        {showMenuButton && (
                            <button
                                onClick={onMenuClick}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <i className="fas fa-bars text-gray-600"></i>
                            </button>
                        )}

                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <i className="fas fa-parking text-white text-lg"></i>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-gray-900 font-bold text-lg">Smart Parking</h1>
                                <p className="text-gray-500 text-xs">Sistem Parkir Cerdas</p>
                            </div>
                        </Link>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3">
                        {!isAuthenticated ? (
                            <>
                                <Link
                                    to="/entry"
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <i className="fas fa-arrow-right-to-bracket"></i>
                                    <span>Masuk Parkir</span>
                                </Link>
                                <Link
                                    to="/exit"
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <i className="fas fa-arrow-right-from-bracket"></i>
                                    <span>Keluar Parkir</span>
                                </Link>
                                <Link to="/my-tickets" className="hidden nav-link sm:flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                                    <i className="fas fa-flask-vial mr-2"></i>
                                    <span>Tiket Saya</span>
                                </Link>
                                <Link
                                    to="/login"
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <i className="fas fa-user"></i>
                                    <span>Login</span>
                                </Link>
                            </>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white text-sm font-semibold">
                                            {user?.username?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="hidden sm:inline text-gray-700 font-medium">
                                        {user?.username}
                                    </span>
                                    <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
                                </button>

                                {showUserMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0"
                                            onClick={() => setShowUserMenu(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-fade-in">
                                            <Link
                                                to="/admin"
                                                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                                                onClick={() => setShowUserMenu(false)}
                                            >
                                                <i className="fas fa-chart-line w-5 text-gray-400"></i>
                                                Dashboard
                                            </Link>
                                            <hr className="my-2 border-gray-100" />
                                            <button
                                                onClick={() => {
                                                    setShowUserMenu(false);
                                                }}
                                                className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50"
                                            >
                                                <i className="fas fa-sign-out-alt w-5"></i>
                                                Keluar
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
