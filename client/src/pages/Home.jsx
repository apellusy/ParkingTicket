import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

const Home = () => {
    const features = [
        {
            icon: 'fa-qrcode',
            title: 'Tiket QR Code',
            description: 'Tiket digital dengan QR code untuk proses masuk dan keluar yang cepat',
            gradient: 'from-blue-500 to-cyan-500'
        },
        {
            icon: 'fa-camera',
            title: 'Pengenalan Plat',
            description: 'Sistem LPR otomatis untuk identifikasi kendaraan',
            gradient: 'from-purple-500 to-pink-500'
        },
        {
            icon: 'fa-calculator',
            title: 'Perhitungan Otomatis',
            description: 'Kalkulasi biaya parkir berdasarkan durasi dan jenis kendaraan',
            gradient: 'from-orange-500 to-red-500'
        },
        {
            icon: 'fa-chart-bar',
            title: 'Laporan Real-time',
            description: 'Dashboard dan analitik untuk monitoring operasional',
            gradient: 'from-green-500 to-teal-500'
        }
    ];

    const vehicleTypes = [
        { type: 'Sepeda Motor', icon: 'fa-motorcycle', rate: 'Rp. 2.000/jam', class: 'vehicle-motorcycle' },
        { type: 'Mobil', icon: 'fa-car', rate: 'Rp. 5.000/jam', class: 'vehicle-car' },
        { type: 'SUV', icon: 'fa-car-side', rate: 'Rp. 7.000/jam', class: 'vehicle-suv' },
        { type: 'Truk', icon: 'fa-truck', rate: 'Rp. 10.000/jam', class: 'vehicle-truck' }
    ];

    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 animated-gradient opacity-90"></div>
                <div className="absolute inset-0 bg-black/20"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
                    <div className="text-center">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                            Smart Parking
                            <span className="block text-white/90">Management System</span>
                        </h1>
                        <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
                            Solusi parkir modern dengan tiket QR code, pengenalan plat otomatis,
                            dan manajemen pembayaran terintegrasi
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/entry"
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                            >
                                <i className="fas fa-arrow-right-to-bracket"></i>
                                Masuk Parkir
                            </Link>
                            <Link
                                to="/exit"
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/10 text-white border-2 border-white/30 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all backdrop-blur-sm"
                            >
                                <i className="fas fa-arrow-right-from-bracket"></i>
                                Keluar & Bayar
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Decorative Wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f5f7fa" />
                    </svg>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Fitur Unggulan
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Teknologi terdepan untuk pengelolaan parkir yang efisien dan modern
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="glass-card rounded-2xl p-6 hover-lift"
                            >
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                                    <i className={`fas ${feature.icon} text-white text-xl`}></i>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Tarif Parkir
                        </h2>
                        <p className="text-gray-600">
                            Tarif kompetitif dengan grace period 15 menit gratis
                        </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {vehicleTypes.map((vehicle, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-2xl p-6 text-center hover-lift shadow-sm"
                            >
                                <div className={`vehicle-icon ${vehicle.class} mx-auto mb-4`}>
                                    <i className={`fas ${vehicle.icon}`}></i>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    {vehicle.type}
                                </h3>
                                <p className="text-2xl font-bold text-blue-600">
                                    {vehicle.rate}
                                </p>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-gray-500 mt-8">
                        * Grace period 15 menit pertama gratis. Tarif maksimum harian berlaku.
                    </p>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="glass-card rounded-3xl p-8 lg:p-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Siap Menggunakan Layanan Kami?
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Parkir dengan mudah dan nyaman menggunakan sistem parkir cerdas kami
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/entry"
                                className="btn-primary text-lg px-8 py-4"
                            >
                                <i className="fas fa-car mr-2"></i>
                                Mulai Parkir
                            </Link>
                            <Link
                                to="/login"
                                className="btn-outline text-lg px-8 py-4"
                            >
                                <i className="fas fa-user mr-2"></i>
                                Login Admin
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center gap-3 mb-4 md:mb-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <i className="fas fa-parking text-white"></i>
                            </div>
                            <span className="font-bold text-xl">Smart Parking</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            © 2024 Smart Parking Management System. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
