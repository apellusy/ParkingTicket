import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showError } from '../utils/alerts';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.password) {
            showError('Username dan password harus diisi');
            return;
        }

        setLoading(true);

        try {
            const result = await login(formData.username, formData.password);

            if (result.success) {
                navigate('/admin');
            } else {
                showError(result.message || 'Login gagal');
            }
        } catch (error) {
            showError('Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <i className="fas fa-parking text-white text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-gray-900 font-bold text-xl">Smart Parking</h1>
                            <p className="text-gray-500 text-sm">Management System</p>
                        </div>
                    </Link>

                    {/* Welcome Text */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Selamat Datang! 👋
                        </h2>
                        <p className="text-gray-600">
                            Masuk ke akun Anda untuk mengakses dashboard
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <i className="fas fa-user"></i>
                                </span>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="input-field pl-12"
                                    placeholder="Masukkan username"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <i className="fas fa-lock"></i>
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="input-field pl-12 pr-12"
                                    placeholder="Masukkan password"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sign-in-alt mr-2"></i>
                                    Masuk
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-blue-800 font-medium mb-2">
                            <i className="fas fa-info-circle mr-2"></i>
                            Demo Credentials:
                        </p>
                        <p className="text-sm text-blue-700">
                            Admin: <code className="bg-blue-100 px-2 py-0.5 rounded">admin</code> / <code className="bg-blue-100 px-2 py-0.5 rounded">admin123</code>
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                            Operator: <code className="bg-blue-100 px-2 py-0.5 rounded">operator</code> / <code className="bg-blue-100 px-2 py-0.5 rounded">operator123</code>
                        </p>
                    </div>

                    {/* Back Link */}
                    <div className="mt-8 text-center">
                        <Link to="/" className="text-gray-600 hover:text-gray-900">
                            <i className="fas fa-arrow-left mr-2"></i>
                            Kembali ke Beranda
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Decoration */}
            <div className="hidden lg:flex lg:w-1/2 animated-gradient items-center justify-center p-12">
                <div className="text-center text-white">
                    <div className="mb-8">
                        <i className="fas fa-car-side text-8xl opacity-20"></i>
                    </div>
                    <h2 className="text-3xl font-bold mb-4">
                        Kelola Parkir dengan Mudah
                    </h2>
                    <p className="text-white/80 max-w-md">
                        Dashboard lengkap untuk memantau tiket aktif, pembayaran,
                        dan laporan keuangan secara real-time
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-12 max-w-sm mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <i className="fas fa-ticket mb-2 text-2xl"></i>
                            <p className="text-sm">Tiket Digital</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <i className="fas fa-chart-line mb-2 text-2xl"></i>
                            <p className="text-sm">Analitik</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <i className="fas fa-users mb-2 text-2xl"></i>
                            <p className="text-sm">Multi-user</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <i className="fas fa-shield-alt mb-2 text-2xl"></i>
                            <p className="text-sm">Keamanan</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
