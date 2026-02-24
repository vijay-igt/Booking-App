import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Film,
    Instagram,
    Twitter,
    Facebook,
    ArrowRight,
    ShieldCheck,
    Globe,
    Headset
} from 'lucide-react';

const SiteFooter: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        experience: [
            { name: 'Now Playing', path: '/' },
            { name: 'Upcoming Movies', path: '/' },
            { name: 'Cinemas', path: '/' },
            { name: 'Offers & Promotions', path: '/' },
        ],
        support: [
            { name: 'Help Center', path: '/' },
            { name: 'Terms of Service', path: '/terms' },
            { name: 'Privacy Policy', path: '/privacy' },
            { name: 'Refund Policy', path: '/refunds' },
        ],
        account: [
            { name: 'My Profile', path: '/profile' },
            { name: 'Booking History', path: '/history' },
            { name: 'Digital Wallet', path: '/wallet' },
            { name: 'Support Tickets', path: '/support' },
        ]
    };

    return (
        <footer className="relative bg-[#0a0a0a] border-t border-white/5 pt-20 pb-10 overflow-hidden font-sans">
            {/* Cinematic Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
                <div className="absolute bottom-0 left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
                <div className="absolute top-0 right-[-10%] w-[30%] h-[50%] bg-purple-500/5 blur-[100px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
                    {/* Brand Section */}
                    <div className="lg:col-span-4 lg:pr-12">
                        <Link to="/" className="flex items-center gap-3 mb-6 group">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                <Film className="w-6 h-6 text-neutral-950" />
                            </div>
                            <span className="text-2xl font-black italic tracking-tighter uppercase text-white">
                                CineVerse
                            </span>
                        </Link>
                        <p className="text-neutral-500 text-sm leading-relaxed mb-8 max-w-sm">
                            Revolutionizing the cinematic experience with seamless booking, premium choices, and exclusive rewards. Your journey into the extraordinary starts here.
                        </p>
                        <div className="flex gap-4">
                            {[Instagram, Twitter, Facebook].map((Icon, i) => (
                                <motion.a
                                    key={i}
                                    whileHover={{ y: -5, scale: 1.1 }}
                                    href="#"
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all shadow-xl"
                                >
                                    <Icon className="w-5 h-5" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {/* Link Sections */}
                    <div className="lg:col-span-2">
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8">The Experience</h4>
                        <ul className="space-y-4">
                            {footerLinks.experience.map(link => (
                                <li key={link.name}>
                                    <Link to={link.path} className="text-sm text-neutral-500 hover:text-white transition-colors font-medium">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-2">
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8">My Space</h4>
                        <ul className="space-y-4">
                            {footerLinks.account.map(link => (
                                <li key={link.name}>
                                    <Link to={link.path} className="text-sm text-neutral-500 hover:text-white transition-colors font-medium">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support Section */}
                    <div className="lg:col-span-4 lg:pl-8">
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-[40px] rounded-full group-hover:bg-purple-500/20 transition-all duration-700" />

                            <h4 className="text-lg font-black italic text-white mb-2 flex items-center gap-2">
                                <Headset className="w-5 h-5 text-purple-400" />
                                Support Center
                            </h4>
                            <p className="text-xs text-neutral-500 font-medium mb-6 uppercase tracking-wider">
                                Need help? Our experts are always here.
                            </p>

                            <Link
                                to="/support"
                                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/20"
                            >
                                Get Help Now
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-wrap justify-center md:justify-start gap-8">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">SSL Encrypted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-neutral-500" />
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Global Operations</span>
                        </div>
                    </div>

                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">
                            &copy; {currentYear} CineVerse Media Ltd.
                        </p>
                        <p className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest leading-none">
                            Developed with Passion for the Silver Screen
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default SiteFooter;
