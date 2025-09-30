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
        setModalStatus({ show: true, type: 'success', message: 'You are in! Check your email.' });
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
        setPageStatus({ show: true, type: 'success', message: 'You are in! Check your email.' });
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
