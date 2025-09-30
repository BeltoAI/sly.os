'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalForm, setModalForm] = useState({ email: '', audience: 'company', organization: '' });
  const [pageForm, setPageForm] = useState({ email: '', audience: 'company', organization: '' });
  const [modalStatus, setModalStatus] = useState({ show: false, type: '', message: '' });
  const [pageStatus, setPageStatus] = useState({ show: false, type: '', message: '' });
  const [spotsLeft, setSpotsLeft] = useState(23);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem('slyos_modal_seen');
    if (!hasSeenModal) {
      setTimeout(() => {
        setIsModalOpen(true);
        document.body.style.overflow = 'hidden';
      }, 2000);
    }
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = '';
    sessionStorage.setItem('slyos_modal_seen', 'true');
  };

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!modalForm.email || !modalForm.email.includes('@')) {
      setModalStatus({ show: true, type: 'error', message: 'Please enter a valid email.' });
      return;
    }

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modalForm),
      });

      const data = await response.json();

      if (response.ok) {
        setModalStatus({ show: true, type: 'success', message: '🔥 You're in! Check your email.' });
        setModalForm({ email: '', audience: 'company', organization: '' });
        setTimeout(() => closeModal(), 2000);
      } else {
        setModalStatus({ show: true, type: 'error', message: data.error || 'Something went wrong.' });
      }
    } catch (error) {
      setModalStatus({ show: true, type: 'error', message: 'Network error. Please try again.' });
    }
  };

  const handlePageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!pageForm.email || !pageForm.email.includes('@')) {
      setPageStatus({ show: true, type: 'error', message: 'Please enter a valid email.' });
      return;
    }

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageForm),
      });

      const data = await response.json();

      if (response.ok) {
        setPageStatus({ show: true, type: 'success', message: '🔥 You're in! Check your email.' });
        setPageForm({ email: '', audience: 'company', organization: '' });
        setTimeout(() => setPageStatus({ show: false, type: '', message: '' }), 5000);
      } else {
        setPageStatus({ show: true, type: 'error', message: data.error || 'Something went wrong.' });
      }
    } catch (error) {
      setPageStatus({ show: true, type: 'error', message: 'Network error. Please try again.' });
    }
  };

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; font-size: clamp(14px, 1.5vw, 16px); }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #06070a; color: #e7eaf5; line-height: 1.6; overflow-x: hidden; }
        img { max-width: 100%; height: auto; display: block; }
        button { font: inherit; cursor: pointer; border: none; }
        a { color: inherit; text-decoration: none; }
        
        .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 24px); }
        .section { padding: clamp(40px, 8vw, 80px) 0; }
        .grad { background: linear-gradient(120deg, #ff7a18, #ffb800, #ff3d81); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 800; }
        .btn { display: inline-block; padding: 12px 20px; border-radius: 12px; font-weight: 600; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); text-align: center; white-space: nowrap; }
        .btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        .btn.primary { background: linear-gradient(120deg, #ff7a18, #ffb800); border-color: transparent; color: #111; }
        .btn.primary:hover { filter: brightness(1.1); box-shadow: 0 8px 24px rgba(255,184,0,0.3); }
        .btn.prominent { padding: 14px 24px; font-size: 1.05rem; }
        .card { background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: clamp(16px, 3vw, 24px); }
        .rule { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); margin: clamp(16px, 3vw, 24px) 0; }
        h2 { font-size: clamp(1.75rem, 4vw, 2.5rem); margin-bottom: 0.5em; line-height: 1.1; }
        h3 { font-size: clamp(1.25rem, 2.5vw, 1.5rem); margin-bottom: 0.5em; }
        
        .nav { position: sticky; top: 0; z-index: 999; background: rgba(6,7,10,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nav .inner { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; gap: 12px; }
        .logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.25rem; z-index: 1001; position: relative; }
        .navx-desktop { display: flex; gap: clamp(8px, 1.5vw, 14px); align-items: center; list-style: none; }
        .navx-desktop a:not(.btn) { padding: 8px 4px; position: relative; }
        .uline { background: linear-gradient(currentColor, currentColor) left bottom/0 1px no-repeat; }
        .uline:hover { background-size: 100% 1px; transition: background-size 0.25s; }
        .navx-toggle { display: none; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); border-radius: 12px; padding: 10px 12px; z-index: 1001; position: relative; cursor: pointer; }
        .navx-bars { display: inline-grid; gap: 5px; }
        .navx-bars i { display: block; width: 22px; height: 2px; background: #e7eaf5; border-radius: 2px; transition: transform 0.25s ease, opacity 0.2s ease; }
        .nav.open .navx-bars i:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nav.open .navx-bars i:nth-child(2) { opacity: 0; }
        .nav.open .navx-bars i:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .navx-scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 998; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
        .nav.open .navx-scrim { opacity: 1; pointer-events: auto; }
        .navx-panel { position: fixed; top: 0; right: 0; width: 100%; max-width: 400px; height: 100vh; background: #06070a; z-index: 999; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.22,0.61,0.36,1); border-left: 1px solid rgba(255,255,255,0.1); padding: 24px; overflow-y: auto; }
        .nav.open .navx-panel { transform: translateX(0); }
        .navx-mobile { display: flex; flex-direction: column; gap: 4px; list-style: none; margin-top: 60px; }
        .navx-mobile a { display: block; padding: 16px 12px; font-size: 1.15rem; font-weight: 500; border-radius: 12px; }
        @media (max-width: 860px) { .navx-desktop { display: none !important; } .navx-toggle { display: inline-flex !important; align-items: center; } }
        
        .hero { min-height: 90vh; display: grid; place-items: center; padding: clamp(80px, 12vh, 120px) 0 clamp(60px, 10vh, 100px); text-align: center; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(255,122,24,0.15), transparent 70%); top: -200px; right: -200px; pointer-events: none; animation: float 20s ease-in-out infinite; }
        .hero::after { content: ''; position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(255,61,129,0.1), transparent 70%); bottom: -100px; left: -100px; pointer-events: none; animation: float 25s ease-in-out infinite reverse; }
        @keyframes float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -30px) scale(1.1); } }
        .hero__wrap { max-width: 1000px; margin: 0 auto; position: relative; z-index: 1; }
        .eyebrow { font-size: 0.9rem; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.8; margin-bottom: 1.5rem; font-weight: 700; }
        .hero__title { font-size: clamp(2.5rem, 7vw, 5rem); line-height: 1; margin: 0.25em 0 0.5em; letter-spacing: -0.03em; font-weight: 900; }
        .hero__subtitle { font-size: clamp(1.15rem, 2.5vw, 1.5rem); color: #c8cfdd; margin: 0 auto 1rem; max-width: 800px; line-height: 1.5; font-weight: 500; }
        .hero__tagline { font-size: clamp(0.95rem, 1.5vw, 1.1rem); color: #9fa8bf; margin: 0 auto 2.5rem; max-width: 700px; line-height: 1.6; }
        .cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 2rem 0; }
        .metrics { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 2.5rem; list-style: none; }
        .metrics li { font-size: 0.9rem; padding: 10px 18px; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; background: rgba(255,255,255,0.03); }
        
        .killer { background: linear-gradient(180deg, transparent, rgba(255,20,20,0.03), transparent); }
        .killer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: clamp(16px, 2.5vw, 24px); margin: 2rem 0; }
        .killer-card { padding: clamp(20px, 3vw, 28px); border: 1px solid rgba(255,80,80,0.2); border-radius: 16px; background: linear-gradient(135deg, rgba(255,50,50,0.05), rgba(255,20,20,0.02)); position: relative; overflow: hidden; }
        .killer-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #ff3d3d, #ff7a18); }
        .killer-icon { font-size: 2rem; margin-bottom: 0.5em; }
        .killer-title { color: #ff6b6b; font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5em; }
        .killer-text { color: #c8cfdd; font-size: 0.95rem; line-height: 1.5; }
        .killer-cta { text-align: center; margin-top: 2rem; font-size: 1.1rem; color: #ffb800; font-weight: 600; }
        
        .manifesto { background: linear-gradient(180deg, rgba(255,184,0,0.02), transparent); position: relative; }
        .manifesto-wrap { max-width: 900px; margin: 0 auto; text-align: center; }
        .manifesto-title { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 1em; }
        .manifesto-grid { display: grid; gap: clamp(20px, 3vw, 32px); margin: 2rem 0; text-align: left; }
        .manifesto-item { padding: clamp(20px, 3vw, 28px); border-left: 3px solid #ffb800; background: rgba(255,184,0,0.05); border-radius: 0 12px 12px 0; }
        .manifesto-item h3 { color: #ffb800; margin-bottom: 0.5em; font-size: 1.2rem; }
        .manifesto-item p { color: #c8cfdd; line-height: 1.6; }
        
        .demo-section { background: linear-gradient(180deg, rgba(255,122,24,0.03), transparent); }
        .demo-steps { display: grid; gap: clamp(40px, 6vw, 80px); margin: 3rem 0; }
        .demo-step { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(24px, 4vw, 48px); align-items: center; }
        .demo-step:nth-child(even) { direction: rtl; }
        .demo-step:nth-child(even) > * { direction: ltr; }
        .demo-content h3 { font-size: clamp(1.5rem, 3vw, 2rem); margin-bottom: 0.5em; color: #ffb800; }
        .demo-content p { color: #c8cfdd; font-size: clamp(1rem, 1.5vw, 1.15rem); line-height: 1.6; margin-bottom: 1em; }
        .demo-number { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #ff7a18, #ffb800); color: #111; font-weight: 900; font-size: 1.5rem; margin-bottom: 1rem; }
        .demo-image { border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.3); transition: transform 0.3s ease; }
        .demo-image:hover { transform: scale(1.02); }
        @media (max-width: 900px) { .demo-step { grid-template-columns: 1fr; } .demo-step:nth-child(even) { direction: ltr; } }
        
        .howx-wrap { display: flex; align-items: stretch; justify-content: center; gap: 0; max-width: 1100px; margin: 24px auto; padding: clamp(20px, 3vw, 28px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; background: linear-gradient(180deg, rgba(255,255,255,0.03), transparent); }
        .howx-step { flex: 1 1 0; min-width: 0; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: clamp(18px, 3vw, 24px) clamp(12px, 2vw, 16px); background: rgba(255,255,255,0.02); text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
        .howx-num { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 999px; background: linear-gradient(120deg, #ff7a18, #ffb800); color: #111; font-weight: 800; font-size: 1.1rem; margin-bottom: 12px; }
        .howx-title { font-weight: 700; margin: 0 0 8px; font-size: clamp(1.05rem, 1.5vw, 1.2rem); color: #e7eaf5; }
        .howx-sub { color: #c8cfdd; font-size: clamp(0.85rem, 1.2vw, 0.95rem); margin: 0; line-height: 1.4; }
        .howx-conn { width: 80px; height: 6px; border-radius: 6px; background: #1a1f2b; position: relative; overflow: hidden; flex-shrink: 0; align-self: center; margin: 0 -8px; }
        .howx-conn::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,122,24,0.1), rgba(255,184,0,0.85), rgba(255,61,129,0.1)); transform: translateX(-100%); animation: sweep 2.4s cubic-bezier(0.22,0.61,0.36,1) infinite; }
        @keyframes sweep { to { transform: translateX(100%); } }
        @media (max-width: 820px) { .howx-wrap { flex-direction: column; gap: 16px; } .howx-conn { width: 6px; height: 60px; margin: -8px 0; } }
        
        .no-bs { background: linear-gradient(180deg, transparent, rgba(255,184,0,0.02)); }
        .no-bs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: clamp(12px, 2vw, 20px); margin: 2rem 0; }
        .no-bs-item { padding: clamp(16px, 2.5vw, 24px); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); text-align: center; transition: all 0.2s; }
        .no-bs-item:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,184,0,0.3); }
        .no-bs-icon { font-size: 2rem; margin-bottom: 0.5em; }
        .no-bs-text { font-size: 0.95rem; color: #c8cfdd; font-weight: 600; }
        .no-bs-item.yes { border-color: rgba(0,255,100,0.3); }
        .no-bs-item.yes .no-bs-icon { color: #00ff88; }
        
        .promoX { padding: clamp(12px, 3vw, 24px) 0; }
        .promoX-card { position: relative; overflow: hidden; border-radius: 20px; background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)); border: 1px solid rgba(255,255,255,0.14); }
        .promoX-wrap { display: grid; gap: clamp(16px, 3vw, 24px); padding: clamp(16px, 3vw, 24px); grid-template-columns: 1fr; }
        @media (min-width: 768px) { .promoX-wrap { grid-template-columns: 1.2fr 1fr; align-items: center; } }
        .promoX-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.16); padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.05); font-weight: 700; font-size: 0.9rem; }
        .promoX-pulse { width: 10px; height: 10px; border-radius: 999px; background: radial-gradient(circle at 50% 50%, #ffb800, #ff7a18); animation: pulse 1.6s ease-out infinite; }
        @keyframes pulse { to { box-shadow: 0 0 0 12px rgba(255,184,0,0); } }
        .promoX-title { margin: 0.5em 0 0.25em; line-height: 1.05; font-size: clamp(1.5rem, 4vw, 2.25rem); }
        .promoX-sub { color: #cfd6e6; margin-bottom: 1rem; font-size: clamp(1rem, 1.5vw, 1.1rem); }
        .promoX-cta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 1rem; }
        .promoX-cta .btn { width: 100%; min-height: 48px; padding: 12px 16px; }
        .promoX-badges { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; list-style: none; }
        .promoX-badges li { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,0.03); font-size: 0.9rem; text-align: center; }
        .promoX-badges svg { width: 16px; height: 16px; fill: #e7eaf5; flex-shrink: 0; }
        .promoX-meter { display: grid; gap: 12px; }
        .promoX-meter-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .promoX-meter-left { font-weight: 800; font-size: clamp(1.5rem, 4vw, 2rem); background: linear-gradient(120deg, #ff7a18, #ffb800, #ff3d81); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .promoX-bar { position: relative; height: 14px; border-radius: 999px; overflow: hidden; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.04); }
        .promoX-fill { position: absolute; inset: 0 0 0 0; border-radius: inherit; background: linear-gradient(90deg, rgba(255,122,24,0.85), rgba(255,184,0,0.9), rgba(255,61,129,0.85)); transition: width 0.5s cubic-bezier(0.22,0.61,0.36,1); }
        
        .grid4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: clamp(12px, 2vw, 20px); }
        .ptile { text-align: center; padding: clamp(20px, 3vw, 28px) clamp(14px, 2vw, 18px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(255,255,255,0.02); transition: all 0.3s; }
        .ptile:hover { transform: translateY(-4px); border-color: rgba(255,184,0,0.3); }
        .ptile .num { font-weight: 800; line-height: 1; font-size: clamp(2.5rem, 8vw, 4rem); background: linear-gradient(120deg, #ff7a18, #ffb800, #ff3d81); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 0.25em; }
        .ptile .lbl { color: #cfd6e6; font-size: clamp(0.85rem, 1.2vw, 0.95rem); }
        
        .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: clamp(12px, 2vw, 16px); margin: 1.5rem 0; }
        .box { text-align: center; padding: clamp(16px, 3vw, 20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.02); transition: all 0.2s; }
        .box:hover { transform: translateY(-2px); }
        .box .num { font-size: clamp(1.5rem, 3vw, 1.8rem); font-weight: 700; color: #ff7a18; margin-bottom: 4px; }
        .box .lbl { font-size: clamp(0.8rem, 1.2vw, 0.9rem); color: #9fa8bf; }
        #slyBox { border-color: rgba(255,184,0,0.35); background: rgba(255,184,0,0.06); }
        #slyBox .num { color: #ffb800; }
        
        .mgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: clamp(16px, 2.5vw, 24px); }
        .mcard { padding: clamp(20px, 3vw, 28px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(255,255,255,0.02); }
        .mcard h3 { margin-bottom: 0.75em; font-size: clamp(1.15rem, 2vw, 1.35rem); }
        .mcard p { color: #c8cfdd; line-height: 1.6; }
        
        .wgrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(16px, 2.5vw, 24px); }
        @media (max-width: 768px) { .wgrid { grid-template-columns: 1fr; } }
        .wtile { padding: clamp(20px, 3vw, 28px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(255,255,255,0.02); }
        .wtile h3 { margin-bottom: 0.5em; font-size: clamp(1.15rem, 2vw, 1.35rem); }
        .wtile h4 { color: #ffb800; font-size: 0.9rem; font-weight: 600; margin: 1em 0 0.5em; }
        .wtile p, .wtile ul { color: #c8cfdd; line-height: 1.6; margin-bottom: 0.75em; }
        .wtile ul { padding-left: 1.25em; }
        .wtile li { margin-bottom: 0.35em; }
        
        .tablecmp { overflow-x: auto; margin: 1.5rem 0; }
        table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
        th, td { padding: clamp(10px, 2vw, 14px); text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); }
        th { font-weight: 700; background: rgba(255,255,255,0.03); }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(255,184,0,0.15); border: 1px solid rgba(255,184,0,0.3); font-size: 0.85rem; font-weight: 600; }
        
        .faq { max-width: 900px; margin: 0 auto; }
        details { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-bottom: 12px; background: rgba(255,255,255,0.02); cursor: pointer; }
        summary { font-weight: 600; cursor: pointer; list-style: none; display: flex : justify-content: space-between; align-items: center; font-size: 1.05rem; }
        summary::after { content: '+'; font-size: 1.5rem; transition: transform 0.2s; color: #ffb800; }
        details[open] summary::after { transform: rotate(45deg); }
        details p { margin-top: 12px; color: #c8cfdd; line-height: 1.6; }
        
        .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 6px; }
        .seg input { position: absolute; opacity: 0; pointer-events: none; }
        .seg label { display: grid; place-items: center; padding: 12px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; color: #cfd6e6; font-weight: 600; transition: all 0.2s; }
        .seg input:checked + label { background: linear-gradient(120deg, #ff7a18, #ffb800, #ff3d81); -webkit-background-clip: text; background-clip: text; color: transparent; border-color: rgba(255,184,0,0.4); }
        
        input[type="email"], input[type="text"] { width: 100%; min-height: 48px; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); color: #e7eaf5; font-size: 1rem; }
        input:focus { outline: 2px solid rgba(255,184,0,0.5); outline-offset: 2px; }
        
        .status { margin-top: 12px; padding: 10px; border-radius: 8px; display: none; }
        .status.show { display: block; }
        .status.success { background: rgba(0,200,100,0.1); border: 1px solid rgba(0,200,100,0.3); color: #00ff88; }
        .status.error { background: rgba(255,50,50,0.1); border: 1px solid rgba(255,50,50,0.3); color: #ff6b6b; }
        
        .modal { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 20px; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
        .modal.open { opacity: 1; pointer-events: auto; }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); }
        .modal-content { position: relative; width: 100%; max-width: 480px; background: linear-gradient(180deg, rgba(15,17,25,0.98), rgba(6,7,10,0.98)); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: clamp(24px, 5vw, 40px); box-shadow: 0 20px 60px rgba(0,0,0,0.5); transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.22,0.61,0.36,1); }
        .modal.open .modal-content { transform: scale(1); }
        .modal-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: #e7eaf5; font-size: 24px; line-height: 1; cursor: pointer; }
        .modal-body { text-align: center; }
        .modal-icon { width: 64px; height: 64px; margin: 0 auto 20px; padding: 12px; background: linear-gradient(120deg, rgba(255,122,24,0.1), rgba(255,184,0,0.1)); border-radius: 16px; border: 1px solid rgba(255,184,0,0.2); }
        
        footer { border-top: 1px solid rgba(255,255,255,0.06); padding: 40px 0; text-align: center; color: #9fa8bf; font-size: 0.9rem; }
        
        @media (max-width: 600px) { .cta { flex-direction: column; width: 100%; } .cta .btn { width: 100%; } }
      `}</style>

      {/* Modal - keeping it exactly as you had */}
      <div className={`modal ${isModalOpen ? 'open' : ''}`}>
        <div className="modal-backdrop" onClick={closeModal}></div>
        <div className="modal-content">
          <button className="modal-close" onClick={closeModal}>×</button>
          
          <div className="modal-body">
            <div className="modal-icon">
              <Image src="/SlyOS_Flame.png" alt="SlyOS" width={40} height={40} />
            </div>
            
            <h2 className="grad" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.5em' }}>
              Skip the Cloud Tax
            </h2>
            
            <p style={{ color: '#c8cfdd', marginBottom: '1.5em', lineHeight: 1.6 }}>
              Be among the first <strong style={{ color: '#ffb800' }}>100 builders</strong> to get <strong style={{ color: '#ffb800' }}>1,000 free SLY credits</strong>. No card. No gatekeeping.
            </p>
            
            <form onSubmit={handleModalSubmit}>
              <input 
                type="email" 
                value={modalForm.email}
                onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                placeholder="you@company.com" 
                required 
                style={{ marginBottom: '12px' }}
              />
              
              <div className="seg">
                <input 
                  type="radio" 
                  id="modal-company" 
                  name="modalAudience" 
                  value="company"
                  checked={modalForm.audience === 'company'}
                  onChange={(e) => setModalForm({ ...modalForm, audience: e.target.value })}
                />
                <label htmlFor="modal-company">Company</label>
                <input 
                  type="radio" 
                  id="modal-app" 
                  name="modalAudience" 
                  value="app"
                  checked={modalForm.audience === 'app'}
                  onChange={(e) => setModalForm({ ...modalForm, audience: e.target.value })}
                />
                <label htmlFor="modal-app">Individual</label>
              </div>
              
              {modalForm.audience === 'company' && (
                <input 
                  type="text" 
                  value={modalForm.organization}
                  onChange={(e) => setModalForm({ ...modalForm, organization: e.target.value })}
                  placeholder="Company (optional)" 
                  style={{ marginBottom: '12px' }}
                />
              )}
              
              <button type="submit" className="btn primary prominent" style={{ width: '100%', minHeight: '52px' }}>
                Start Building Free
              </button>
              
              <div className={`status ${modalStatus.show ? 'show' : ''} ${modalStatus.type}`}>
                {modalStatus.message}
              </div>
            </form>
            
            <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#9fa8bf' }}>
              {spotsLeft} spots left · No card required
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`nav ${isMenuOpen ? 'open' : ''}`}>
        <div className="container inner">
          <a href="#top" className="logo">
            <Image src="/SlyOS_Flame.png" alt="SlyOS Logo" width={32} height={32} />
            <span className="grad">SlyOS</span>
          </a>

          <ul className="navx-desktop">
            <li><a className="uline" href="#how">How</a></li>
            <li><a className="uline" href="#demo">Demo</a></li>
            <li><a className="uline" href="#pricing">Pricing</a></li>
            <li><a className="uline" href="#mine">Mine SLY</a></li>
            <li><a className="uline" href="#who">Who</a></li>
            <li><a className="uline" href="#compare">Compare</a></li>
            <li><a className="uline" href="#faqs">FAQs</a></li>
            <li><a className="btn primary prominent" href="#waitlist">Start Free</a></li>
          </ul>

          <button className="navx-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className="navx-bars">
              <i></i><i></i><i></i>
            </span>
          </button>
        </div>

        <div className="navx-scrim" onClick={() => setIsMenuOpen(false)}></div>
        <aside className="navx-panel">
          <ul className="navx-mobile">
            <li><a href="#how" onClick={() => setIsMenuOpen(false)}>How</a></li>
            <li><a href="#demo" onClick={() => setIsMenuOpen(false)}>Demo</a></li>
            <li><a href="#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a></li>
            <li><a href="#mine" onClick={() => setIsMenuOpen(false)}>Mine SLY</a></li>
            <li><a href="#who" onClick={() => setIsMenuOpen(false)}>Who</a></li>
            <li><a href="#compare" onClick={() => setIsMenuOpen(false)}>Compare</a></li>
            <li><a href="#faqs" onClick={() => setIsMenuOpen(false)}>FAQs</a></li>
            <li><a className="btn primary prominent" href="#waitlist" onClick={() => setIsMenuOpen(false)}>Start Free</a></li>
          </ul>
        </aside>
      </nav>

      {/* Hero - Enhanced */}
      <header className="hero container" id="top">
        <div className="hero__wrap">
          <p className="eyebrow">Break free from cloud monopolies</p>
          <h1 className="grad hero__title">
            AI deployment without the giant's blessing
          </h1>
          <p className="hero__subtitle">
            Decentralized AI inference powered by idle smartphones. Verified at the edge.
          </p>
          <p className="hero__tagline">
            No credit card gatekeeping. No surprise bills. No GPU waitlists. Just proof-verified compute that costs 70% less.
          </p>
          <div className="cta">
            <a className="btn primary prominent" href="#waitlist">Skip the cloud tax</a>
            <a className="btn" href="#demo">See how it works</a>
          </div>
          <ul className="metrics">
            <li><strong>~70%</strong> lower cost</li>
            <li><strong>Proof-verified</strong> outputs</li>
            <li><strong>Edge-first</strong> latency</li>
          </ul>
        </div>
      </header>

      {/* The Startup Killer - NEW */}
      <section className="section killer">
        <div className="container">
          <h2 className="grad" style={{ textAlign: 'center', marginBottom: '0.5em' }}>Cloud Costs Are Killing Great Ideas</h2>
          <p style={{ textAlign: 'center', color: '#9fa8bf', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto 2rem' }}>
            Building AI shouldn't require a VC's checkbook or AWS's permission.
          </p>
          <div className="killer-grid">
            <div className="killer-card">
              <div className="killer-icon">💸</div>
              <div className="killer-title">$10K/month minimum</div>
              <div className="killer-text">Just to experiment. Before you've validated anything.</div>
            </div>
            <div className="killer-card">
              <div className="killer-icon">⏳</div>
              <div className="killer-title">3-month GPU waitlists</div>
              <div className="killer-text">By the time you get access, your competitor shipped.</div>
            </div>
            <div className="killer-card">
              <div className="killer-icon">🚫</div>
              <div className="killer-title">Quota denials</div>
              <div className="killer-text">"Unverified startups" don't get the good stuff.</div>
            </div>
            <div className="killer-card">
              <div className="killer-icon">🔒</div>
              <div className="killer-title">Vendor lock-in</div>
              <div className="killer-text">Proprietary APIs trap you from day one.</div>
            </div>
          </div>
          <p className="killer-cta">There's a better way →</p>
        </div>
      </section>

      {/* Democratize AI Manifesto - NEW */}
      <section className="section manifesto">
        <div className="container">
          <div className="manifesto-wrap">
            <h2 className="grad manifesto-title">Democratize AI Deployment</h2>
            <div className="manifesto-grid">
              <div className="manifesto-item">
                <h3>Billions of idle devices</h3>
                <p>Every phone on Earth has compute sitting unused. Why rent from monopolies when we can share peer-to-peer?</p>
              </div>
              <div className="manifesto-item">
                <h3>Proof over trust</h3>
                <p>Cryptographic receipts and 15x redundant validation. Math over marketing.</p>
              </div>
              <div className="manifesto-item">
                <h3>Pay for what you use</h3>
                <p>Not what AWS thinks you'll use. Not what your quota allows. Actual inference tokens processed.</p>
              </div>
              <div className="manifesto-item">
                <h3>Open infrastructure</h3>
                <p>Your models. Your policies. Your devices. No proprietary lock-in. Full API ownership.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo */}
      <section className="promoX">
        <div className="container">
          <div className="promoX-card">
            <div className="promoX-wrap">
              <div className="promoX-copy">
                <div className="promoX-pill">
                  <span className="promoX-pulse"></span>
                  1,000 SLY credits — free
                </div>
                <h2 className="promoX-title grad">
                  First <span>100 builders</span> get paid to try SlyOS.
                </h2>
                <p className="promoX-sub">No card. Signed receipts. Ship faster.</p>
                <div className="promoX-cta">
                  <a className="btn primary prominent" href="#waitlist">Start building free</a>
                </div>
                <ul className="promoX-badges">
                  <li>
                    <svg viewBox="0 0 16 16"><path d="M6.4 10.6 3.8 8l-.9.9 3.5 3.5L13 5.8l-.9-.9z"/></svg>
                    Proof-verified results
                  </li>
                  <li>
                    <svg viewBox="0 0 16 16"><path d="M8 1l6 3v4c0 4-2.6 6.7-6 7C4.6 14.7 2 12 2 8V4z"/></svg>
                    Private pools available
                  </li>
                  <li>
                    <svg viewBox="0 0 16 16"><path d="M2 8h4l1 3 2-6 1 3h4"/></svg>
                    Edge-first latency
                  </li>
                </ul>
              </div>
              <div className="promoX-meter">
                <div className="promoX-meter-head">
                  <span className="promoX-meter-left">{spotsLeft}</span>
                  <span style={{ color: '#cfd6e6', fontSize: '0.95rem' }}>spots left</span>
                </div>
                <div className="promoX-bar">
                  <div className="promoX-fill" style={{ width: `${(spotsLeft / 100) * 100}%` }}></div>
                </div>
                <p style={{ color: '#9fa8bf', fontSize: '0.8rem', margin: 0 }}>
                  Private beta · Q1 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section with Screenshots - NEW */}
      <section id="demo" className="section demo-section">
        <div className="container">
          <h2 className="grad" style={{ textAlign: 'center' }}>Deploy AI in 3 Steps</h2>
          <p style={{ textAlign: 'center', color: '#9fa8bf', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto 3rem' }}>
            From GGUF to production endpoint in minutes. No DevOps required.
          </p>
          
          <div className="demo-steps">
            <div className="demo-step">
              <div className="demo-content">
                <div className="demo-number">1</div>
                <h3>Upload your GGUFs</h3>
                <p>Drag and drop your quantized models. We support all major formats: Q4_K_M, Q5_K_S, and more. Your models stay private.</p>
              </div>
              <div className="demo-image">
                <Image src="/step1.png" alt="Upload GGUFs" width={600} height={400} />
              </div>
            </div>

            <div className="demo-step">
              <div className="demo-content">
                <div className="demo-number">2</div>
                <h3>Select & Deploy</h3>
                <p>Choose which models to deploy. Set your redundancy level. Configure device policies. Hit deploy. That's it.</p>
              </div>
              <div className="demo-image">
                <Image src="/step2.png" alt="Select and deploy models" width={600} height={400} />
              </div>
            </div>

            <div className="demo-step">
              <div className="demo-content">
                <div className="demo-number">3</div>
                <h3>Test & Use</h3>
                <p>Test your endpoint immediately. Get cryptographic receipts for every inference. Scale from zero to production instantly.</p>
              </div>
              <div className="demo-image">
                <Image src="/step3.png" alt="Test endpoint" width={600} height={400} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - ORIGINAL */}
      <section id="how" className="section">
        <div className="container">
          <h2 className="grad">How It Works</h2>
          <div className="rule"></div>
          <div className="howx-wrap">
            <div className="howx-step">
              <div className="howx-num">1</div>
              <p className="howx-title">Submit</p>
              <p className="howx-sub">Client sends job + constraints.</p>
            </div>
            <div className="howx-conn"></div>
            <div className="howx-step">
              <div className="howx-num">2</div>
              <p className="howx-title">Shard</p>
              <p className="howx-sub">Coordinator splits & routes slices.</p>
            </div>
            <div className="howx-conn"></div>
            <div className="howx-step">
              <div className="howx-num">3</div>
              <p className="howx-title">Validate</p>
              <p className="howx-sub">Phones run; slices cross-check.</p>
            </div>
            <div className="howx-conn"></div>
            <div className="howx-step">
              <div className="howx-num">4</div>
              <p className="howx-title">Merge</p>
              <p className="howx-sub">Coordinator assembles result + receipt.</p>
            </div>
          </div>
        </div>
      </section>

      {/* No BS Features - NEW */}
      <section className="section no-bs">
        <div className="container">
          <h2 className="grad" style={{ textAlign: 'center' }}>No Bullshit</h2>
          <div className="no-bs-grid">
            <div className="no-bs-item">
              <div className="no-bs-icon">❌</div>
              <div className="no-bs-text">No minimum spend</div>
            </div>
            <div className="no-bs-item">
              <div className="no-bs-icon">❌</div>
              <div className="no-bs-text">No credit card to test</div>
            </div>
            <div className="no-bs-item">
              <div className="no-bs-icon">❌</div>
              <div className="no-bs-text">No surprise egress fees</div>
            </div>
            <div className="no-bs-item">
              <div className="no-bs-icon">❌</div>
              <div className="no-bs-text">No vendor lock-in</div>
            </div>
            <div className="no-bs-item yes">
              <div className="no-bs-icon">✓</div>
              <div className="no-bs-text">Pay per inference</div>
            </div>
            <div className="no-bs-item yes">
              <div className="no-bs-icon">✓</div>
              <div className="no-bs-text">Cancel anytime</div>
            </div>
            <div className="no-bs-item yes">
              <div className="no-bs-icon">✓</div>
              <div className="no-bs-text">Full API ownership</div>
            </div>
            <div className="no-bs-item yes">
              <div className="no-bs-icon">✓</div>
              <div className="no-bs-text">Proof-verified outputs</div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics - ORIGINAL */}
      <section id="metrics" className="section">
        <div className="container">
          <h2 className="grad" style={{ textAlign: 'center' }}>By the Numbers</h2>
          <div className="rule"></div>
          <div className="grid4">
            <div className="ptile">
              <div className="num">70%</div>
              <div className="lbl">lower cost vs GPU cloud</div>
            </div>
            <div className="ptile">
              <div className="num">60%</div>
              <div className="lbl">faster first-token at edge</div>
            </div>
            <div className="ptile">
              <div className="num">15x</div>
              <div className="lbl">redundant validations</div>
            </div>
            <div className="ptile">
              <div className="num">100%</div>
              <div className="lbl">jobs get signed receipts</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - ORIGINAL */}
      <section id="pricing" className="section">
        <div className="container">
          <h2 className="grad" style={{ textAlign: 'center' }}>Transparent Pricing</h2>
          <div className="rule"></div>
          <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: 'clamp(20px, 4vw, 28px)', margin: '1.5rem 0' }} className="card">
              <div className="grad" style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', fontWeight: 800, lineHeight: 1, marginBottom: '0.4em' }}>
                up to 69%
              </div>
              <div style={{ color: '#cfd6e6', fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>
                Savings vs AWS & GCP
              </div>
            </div>
            <div className="totals">
              <div className="box" id="slyBox">
                <div className="num">$400</div>
                <div className="lbl">SlyOS (20M tokens)</div>
              </div>
              <div className="box">
                <div className="num">$1,200</div>
                <div className="lbl">AWS (20M tokens)</div>
              </div>
              <div className="box">
                <div className="num">$1,400</div>
                <div className="lbl">GCP (20M tokens)</div>
              </div>
            </div>
            <p style={{ textAlign: 'center', color: '#9fa8bf', fontSize: '0.9rem', marginTop: '1rem' }}>
              Pay per inference. No minimums. No surprises.
            </p>
          </div>
        </div>
      </section>

      {/* Mine SLY - ORIGINAL */}
      <section id="mine" className="section">
        <div className="container">
          <h2 className="grad">Mine SLY</h2>
          <div className="rule"></div>
          <div className="mgrid">
            <div className="mcard">
              <h3 className="grad">Earn credits</h3>
              <p>Validated workloads turn into SLY usage credits that offset your future jobs.</p>
            </div>
            <div className="mcard">
              <h3 className="grad">Green impact</h3>
              <p>Tap idle phones instead of spinning new servers. Less stranded capacity.</p>
            </div>
            <div className="mcard">
              <h3 className="grad">Transparent by design</h3>
              <p>Per-task receipts: job type, duration, replication %, anomalies, timings.</p>
            </div>
            <div className="mcard">
              <h3 className="grad">Idle-first, capped</h3>
              <p>Opportunistic background tasks with device caps to avoid interference.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For - ORIGINAL */}
      <section id="who" className="section">
        <div className="container">
          <h2 className="grad">Who It's For</h2>
          <div className="rule"></div>
          <div className="wgrid">
            <div className="wtile">
              <h3 className="grad">AI Startups</h3>
              <p>Build and scale AI products without the infrastructure burden.</p>
              <h4>Perfect for:</h4>
              <ul>
                <li>Running continuous model evaluations</li>
                <li>Prototype inference without GPU waitlists</li>
                <li>Cost-effective A/B testing at scale</li>
                <li>Flexible burst capacity for demos</li>
              </ul>
            </div>
            <div className="wtile">
              <h3 className="grad">Enterprises</h3>
              <p>Deploy AI with compliance, auditability, and control.</p>
              <h4>Key benefits:</h4>
              <ul>
                <li>Private compute pools for sensitive workloads</li>
                <li>Cryptographic receipts for audit trails</li>
                <li>Policy-based device selection</li>
                <li>Geographic routing options</li>
              </ul>
            </div>
            <div className="wtile">
              <h3 className="grad">ML Researchers</h3>
              <p>Accelerate experimentation with elastic compute.</p>
              <h4>Research advantages:</h4>
              <ul>
                <li>Run hundreds of experiments in parallel</li>
                <li>Affordable hyperparameter sweeps</li>
                <li>Quick iteration cycles</li>
                <li>No infrastructure management</li>
              </ul>
            </div>
            <div className="wtile">
              <h3 className="grad">App Developers</h3>
              <p>Integrate AI features with edge-optimized performance.</p>
              <h4>Developer tools:</h4>
              <ul>
                <li>Simple REST API integration</li>
                <li>Edge-aware routing for low latency</li>
                <li>Pay-per-use pricing model</li>
                <li>Built-in monitoring and analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Compare - ORIGINAL */}
      <section id="compare" className="section">
        <div className="container">
          <h2 className="grad" style={{ textAlign: 'center' }}>How We Compare</h2>
          <div className="rule"></div>
          <div className="tablecmp">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Acurast</th>
                  <th>Enurochain</th>
                  <th className="grad">SlyOS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Built-in validation</td>
                  <td>~</td>
                  <td>✕</td>
                  <td>✔</td>
                </tr>
                <tr>
                  <td>AI-optimized inference</td>
                  <td>✕</td>
                  <td>~</td>
                  <td>✔</td>
                </tr>
                <tr>
                  <td>Edge-first latency</td>
                  <td>~</td>
                  <td>✕</td>
                  <td>✔</td>
                </tr>
                <tr>
                  <td>Cryptographic receipts</td>
                  <td>✕</td>
                  <td>✕</td>
                  <td>✔</td>
                </tr>
                <tr>
                  <td>Private compute pools</td>
                  <td>✕</td>
                  <td>✕</td>
                  <td>✔</td>
                </tr>
                <tr>
                  <td>Cost structure</td>
                  <td><span className="badge">Variable</span></td>
                  <td><span className="badge">Token-based</span></td>
                  <td><span className="badge">Up to 70% lower* </span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ color: '#9fa8bf', fontSize: '0.9rem' }}>
            *Illustrative savings shown in Pricing section compared to traditional cloud providers.
          </p>
        </div>
      </section>

      {/* FAQs - ORIGINAL */}
      <section id="faqs" className="section">
        <div className="container">
          <h2 className="grad">FAQs</h2>
          <div className="rule"></div>
          <div className="faq">
            <details>
              <summary>Is this crypto or blockchain-based?</summary>
              <p>No. SLY are platform usage credits—not cryptocurrency or tokens. There's no blockchain, no mining rewards, and no speculative trading. Think of SLY credits like AWS credits: they're simply accounting units for compute time on our platform.</p>
            </details>
            <details>
              <summary>What types of AI workloads can I run?</summary>
              <p>Currently optimized for embeddings, lightweight inference (up to 7B parameter models), and bursty evaluation tasks. We're expanding to support larger models through device-class routing, where higher-spec smartphones handle more demanding workloads. RAG pipelines, semantic search, and classification tasks work particularly well.</p>
            </details>
            <details>
              <summary>How do I trust the results from random smartphones?</summary>
              <p>Every job gets cryptographic receipts that include: redundancy percentage (typically 15x validation), consensus details showing which devices agreed, anomaly detection results, and precise timing data. You can verify that multiple independent devices produced identical outputs, making tampering mathematically impractical.</p>
            </details>
            <details>
              <summary>Can I restrict where my jobs run?</summary>
              <p>Absolutely. You can create private pools with your own devices, use vetted contributor pools with KYC'd participants, set geographic restrictions (e.g., "EU devices only"), require minimum device specifications, or combine these policies. Enterprise customers get granular control over device selection.</p>
            </details>
            <details>
              <summary>What about SLAs and reliability?</summary>
              <p>We measure validated completion time, not just raw device speed. Our SLA guarantees are based on successfully validated outputs. If redundancy fails or consensus isn't reached, you don't pay. Typical jobs complete within 2-5 seconds for inference, with sub-second p95 latency for edge-local requests.</p>
            </details>
            <details>
              <summary>How does pricing compare to AWS/GCP/Azure?</summary>
              <p>For supported workloads, you'll typically see 60-70% cost reduction compared to cloud GPU instances. Pricing is transparent: you pay per million tokens processed, with volume discounts automatically applied. No hidden fees, no egress charges.</p>
            </details>
            <details>
              <summary>What happens to my data privacy?</summary>
              <p>Jobs can be end-to-end encrypted. Input data is sharded before distribution—no single device sees your complete dataset. Models run in secure enclaves where available. For maximum privacy, use private pools where you control all devices. We never log or store your inference inputs or outputs.</p>
            </details>
            <details>
              <summary>How do contributors earn SLY credits?</summary>
              <p>Device owners earn credits proportional to validated compute time. Earnings depend on device specs, uptime, and validation success rate. High-performing contributors get priority routing. You can cash out credits or use them to offset your own inference costs.</p>
            </details>
            <details>
              <summary>What's the onboarding process?</summary>
              <p>Join our waitlist above. We're onboarding in phases: first companies with immediate inference needs, then individual developers, and finally contributor device owners. Beta participants get 1,000 free SLY credits. Typical onboarding takes 2-3 days including API key setup and initial testing.</p>
            </details>
            <details>
              <summary>Which models and frameworks do you support?</summary>
              <p>We support ONNX, TensorFlow Lite, and PyTorch Mobile formats. Popular models include Sentence Transformers (embeddings), DistilBERT, MobileBERT, BERT-small, and quantized versions of Llama, Mistral, and Phi. If you have a specific model, reach out—we're rapidly expanding compatibility.</p>
            </details>
          </div>
        </div>
      </section>

      {/* Waitlist - ORIGINAL */}
      <section id="waitlist" className="section">
        <div className="container">
          <h2 className="grad" style={{ textAlign: 'center' }}>Join the waitlist</h2>
          <div className="rule"></div>
          <div className="card" style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ marginBottom: '16px', fontSize: '1.1rem', color: '#c8cfdd' }}>
              Onboarding in phases. Add your email for early access.
            </p>
            <form onSubmit={handlePageSubmit}>
              <input 
                type="email" 
                value={pageForm.email}
                onChange={(e) => setPageForm({ ...pageForm, email: e.target.value })}
                placeholder="you@company.com" 
                required 
              />
              
              <div className="seg">
                <input 
                  type="radio" 
                  id="page-company" 
                  name="pageAudience" 
                  value="company"
                  checked={pageForm.audience === 'company'}
                  onChange={(e) => setPageForm({ ...pageForm, audience: e.target.value })}
                />
                <label htmlFor="page-company">Company</label>
                <input 
                  type="radio" 
                  id="page-app" 
                  name="pageAudience" 
                  value="app"
                  checked={pageForm.audience === 'app'}
                  onChange={(e) => setPageForm({ ...pageForm, audience: e.target.value })}
                />
                <label htmlFor="page-app">Individual</label>
              </div>
              
              {pageForm.audience === 'company' && (
                <input 
                  type="text" 
                  value={pageForm.organization}
                  onChange={(e) => setPageForm({ ...pageForm, organization: e.target.value })}
                  placeholder="Company (optional)" 
                />
              )}
              
              <div style={{ marginTop: '16px' }}>
                <button type="submit" className="btn primary prominent" style={{ width: '100%' }}>
                  Join waitlist
                </button>
              </div>
              
              <div className={`status ${pageStatus.show ? 'show' : ''} ${pageStatus.type}`}>
                {pageStatus.message}
              </div>
            </form>
            <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#9fa8bf', lineHeight: 1.5 }}>
              We store your email, audience type, and (if provided) company to manage access invites.
            </p>
          </div>
        </div>
      </section>

      {/* Footer - ORIGINAL */}
      <footer className="section">
        <div className="container">
          <p>© {new Date().getFullYear()} SlyOS — Democratizing AI Deployment · <a className="uline" href="/privacy">Privacy Policy</a></p>
        </div>
      </footer>
    </>
  );
}
