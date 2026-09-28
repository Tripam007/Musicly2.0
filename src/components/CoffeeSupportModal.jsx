import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Heart, 
  Coffee, 
  Plus, 
  Search, 
  Trash2, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { 
  loadCoffeeDonations, 
  addCoffeeDonation, 
  deleteCoffeeDonation, 
  calculateDonationStats, 
  formatRelativeTime 
} from '../utils/coffeeLedgerDB';

export default function CoffeeSupportModal({ isOpen, onClose, isAdmin = false, onOpenFeedback, onOpenAboutUs }) {
  const [isDone, setIsDone] = useState(false);
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [mounted, setMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const handleOpenThoughts = (e) => {
    e?.stopPropagation?.();
    handleClose();
    setTimeout(() => {
      onOpenFeedback?.();
    }, 180);
  };

  const handleOpenAboutUs = (e) => {
    e?.stopPropagation?.();
    handleClose();
    setTimeout(() => {
      onOpenAboutUs?.();
    }, 180);
  };

  // Admin Ledger State
  const [donations, setDonations] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    donorName: '',
    amount: 150,
    cups: 3,
    message: '',
    paymentMethod: 'UPI • pingpay',
  });

  // Sync mounted and closing state with isOpen
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setIsClosing(false);
      setIsDone(false);
      setCopiedUPI(false);
      setShowAddForm(false);
      setSearchQuery('');

      if (isAdmin) {
        setLoadingLedger(true);
        loadCoffeeDonations()
          .then((items) => {
            setDonations(items);
            setLoadingLedger(false);
          })
          .catch((err) => {
            console.warn('Error loading coffee ledger:', err);
            setLoadingLedger(false);
          });
      }
    } else if (mounted) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setIsClosing(false);
      }, 270);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isAdmin]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setMounted(false);
      setIsClosing(false);
    }, 260);
  };

  // Handle Escape key to close smoothly
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  const handleCopyUPI = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText('tripambiswas007@pingpay');
    setCopiedUPI(true);
    setTimeout(() => setCopiedUPI(false), 2200);
  };

  // Admin Ledger Actions
  const stats = useMemo(() => calculateDonationStats(donations), [donations]);

  const filteredDonations = useMemo(() => {
    if (!searchQuery.trim()) return donations;
    const q = searchQuery.toLowerCase().trim();
    return donations.filter((d) => 
      (d.donorName && d.donorName.toLowerCase().includes(q)) ||
      (d.message && d.message.toLowerCase().includes(q)) ||
      (d.paymentMethod && d.paymentMethod.toLowerCase().includes(q))
    );
  }, [donations, searchQuery]);

  const handleAddDonationSubmit = async (e) => {
    e.preventDefault();
    if (!formData.donorName.trim() || !formData.amount) return;

    const newRecord = {
      donorName: formData.donorName.trim(),
      amount: Number(formData.amount),
      currency: '₹',
      cups: Number(formData.cups) || Math.max(1, Math.round(Number(formData.amount) / 50)),
      message: formData.message.trim() || 'A coffee for the music! ☕',
      paymentMethod: formData.paymentMethod || 'UPI • pingpay',
      timestamp: Date.now(),
      verified: true,
    };

    const saved = await addCoffeeDonation(newRecord);
    setDonations((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
    setFormData({
      donorName: '',
      amount: 150,
      cups: 3,
      message: '',
      paymentMethod: 'UPI • pingpay',
    });
    setShowAddForm(false);
  };

  const handleDeleteEntry = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Remove this contribution record from the ledger?')) {
      await deleteCoffeeDonation(id);
      setDonations((prev) => prev.filter((d) => d.id !== id));
    }
  };

  if (!mounted && !isOpen) return null;

  return (
    <div 
      className={`modal-overlay coffee-modal-overlay ${isClosing ? 'is-closing' : 'is-opening'} ${isAdmin ? 'admin-coffee-overlay' : ''}`} 
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coffee-modal-title"
    >
      <div 
        className={`glass-modal-panel coffee-modal-panel ${isAdmin ? 'admin-coffee-ledger-panel' : ''} ${isClosing ? 'is-closing' : 'is-opening'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right close button */}
        <button 
          id="btn-close-coffee-modal" 
          className="drawer-close-btn coffee-close-btn" 
          onClick={handleClose}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* ================= ADMIN VIEW: COFFEE & CREATOR DONATIONS LEDGER ================= */}
        {isAdmin ? (
          <div className="admin-coffee-ledger-content">
            {/* Aesthetic Header */}
            <div className="admin-coffee-header">
              <div className="admin-coffee-tag-pill">
                <span className="admin-live-indicator" />
                <Sparkles size={13} className="admin-tag-icon" />
                <span>CREATOR COFFEE LEDGER</span>
              </div>
              <h2 id="coffee-modal-title" className="admin-ledger-title">
                Received Contributions ☕
              </h2>
              <p className="admin-ledger-subtitle">
                Live stream of listener donations, coffee cups, and heartfelt messages.
              </p>
            </div>

            {/* Glowing Metric Summary Cards */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card stat-total-received">
                <div className="stat-label-row">
                  <span className="stat-card-label">Total Received</span>
                  <TrendingUp size={15} className="stat-icon-trend" />
                </div>
                <div className="stat-main-number gold-glow-text">
                  ₹{stats.totalAmount.toLocaleString('en-IN')}
                </div>
                <div className="stat-subtext">
                  <span>Across {stats.totalCups} coffees gifted</span>
                </div>
              </div>

              <div className="admin-stat-card stat-supporters">
                <div className="stat-label-row">
                  <span className="stat-card-label">Supporters</span>
                  <Heart size={15} className="stat-icon-heart" />
                </div>
                <div className="stat-main-number">
                  {stats.totalSupporters}
                </div>
                <div className="stat-subtext">
                  <span>~₹{stats.avgDonation} avg contribution</span>
                </div>
              </div>

              <div className="admin-stat-card stat-cups">
                <div className="stat-label-row">
                  <span className="stat-card-label">Coffees Brewed</span>
                  <Coffee size={15} className="stat-icon-coffee" />
                </div>
                <div className="stat-main-number">
                  {stats.totalCups} ☕
                </div>
                <div className="stat-subtext">
                  <span>Pure creator energy</span>
                </div>
              </div>
            </div>

            {/* Search & Action Bar */}
            <div className="admin-ledger-toolbar">
              <div className="admin-search-wrapper">
                <Search size={14} className="search-input-icon" />
                <input 
                  type="text"
                  placeholder="Filter by supporter name, note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-ledger-search-input"
                  aria-label="Filter donations"
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    className="search-clear-btn" 
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>

              <button 
                type="button" 
                className={`admin-add-entry-btn ${showAddForm ? 'btn-active' : ''}`}
                onClick={() => setShowAddForm(!showAddForm)}
                title={showAddForm ? 'Cancel' : 'Record Received Coffee'}
              >
                <Plus size={15} className={showAddForm ? 'icon-rotate-45' : ''} />
                <span>{showAddForm ? 'Cancel' : 'Record Payment'}</span>
              </button>
            </div>

            {/* Expandable Manual Donation Logger Form */}
            {showAddForm && (
              <form onSubmit={handleAddDonationSubmit} className="admin-record-form-card">
                <div className="form-heading-row">
                  <h4>Record Received Donation (UPI / Cash)</h4>
                  <span className="form-sub-hint">Saves directly to your ledger</span>
                </div>

                <div className="form-inputs-row">
                  <div className="form-field-group field-donor">
                    <label>Supporter Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Rahul Sen"
                      value={formData.donorName}
                      onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                      className="ledger-input"
                    />
                  </div>

                  <div className="form-field-group field-amount">
                    <label>Amount (₹)</label>
                    <input 
                      type="number"
                      required
                      min="10"
                      step="10"
                      placeholder="150"
                      value={formData.amount}
                      onChange={(e) => {
                        const amt = Number(e.target.value);
                        setFormData({ 
                          ...formData, 
                          amount: amt, 
                          cups: Math.max(1, Math.round(amt / 50)) 
                        });
                      }}
                      className="ledger-input"
                    />
                  </div>

                  <div className="form-field-group field-cups">
                    <label>Cups ☕</label>
                    <input 
                      type="number"
                      min="1"
                      placeholder="3"
                      value={formData.cups}
                      onChange={(e) => setFormData({ ...formData, cups: Number(e.target.value) })}
                      className="ledger-input"
                    />
                  </div>
                </div>

                <div className="form-inputs-row">
                  <div className="form-field-group field-message" style={{ flex: 2 }}>
                    <label>Supporter Note / Message</label>
                    <input 
                      type="text"
                      placeholder="e.g. Thanks for the late night coding tracks!"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="ledger-input"
                    />
                  </div>

                  <div className="form-field-group field-method" style={{ flex: 1 }}>
                    <label>Payment Method</label>
                    <select 
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="ledger-input ledger-select"
                    >
                      <option value="UPI • pingpay">UPI • pingpay</option>
                      <option value="GPay • UPI">GPay • UPI</option>
                      <option value="PhonePe • UPI">PhonePe • UPI</option>
                      <option value="Paytm • UPI">Paytm • UPI</option>
                      <option value="Direct Transfer">Direct Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions-row">
                  <button type="submit" className="ledger-submit-btn">
                    <Check size={14} /> Add to Ledger
                  </button>
                  <button 
                    type="button" 
                    className="ledger-cancel-btn"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Supporter Contributions Feed */}
            <div className="admin-ledger-list-container">
              <div className="ledger-list-header">
                <span className="ledger-list-title">Contributions Stream</span>
                <span className="ledger-list-count">{filteredDonations.length} records</span>
              </div>

              {loadingLedger ? (
                <div className="admin-ledger-empty-state">
                  <div className="ledger-spinner" />
                  <p>Loading donations stream...</p>
                </div>
              ) : filteredDonations.length === 0 ? (
                <div className="admin-ledger-empty-state">
                  <p>No contributions found matching your search.</p>
                </div>
              ) : (
                <div className="admin-donations-scroll-list">
                  {filteredDonations.map((item) => (
                    <div key={item.id} className="admin-donation-item-card">
                      <div className="donation-card-top">
                        {/* Supporter Avatar badge */}
                        <div className="donation-supporter-info">
                          <div className="supporter-avatar-circle">
                            {item.donorName ? item.donorName.charAt(0).toUpperCase() : '☕'}
                          </div>
                          <div className="supporter-meta">
                            <span className="supporter-name">{item.donorName}</span>
                            <span className="supporter-time">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Amount & Cups Badge */}
                        <div className="donation-amount-badge-group">
                          <span className="donation-amount-pill">
                            +{item.currency || '₹'}{Number(item.amount).toLocaleString('en-IN')}
                          </span>
                          <span className="donation-cups-pill">
                            {item.cups || 1} ☕
                          </span>
                        </div>
                      </div>

                      {/* Supporter Note/Message Quote */}
                      {item.message && (
                        <div className="donation-message-quote">
                          <span className="quote-mark">“</span>
                          <span className="quote-text">{item.message}</span>
                        </div>
                      )}

                      {/* Bottom Footer Info: Payment tag & Delete action */}
                      <div className="donation-card-footer">
                        <div className="donation-method-tag">
                          <ShieldCheck size={12} className="tag-verified-icon" />
                          <span>{item.paymentMethod || 'UPI • pingpay'}</span>
                        </div>

                        <button 
                          type="button" 
                          className="donation-delete-btn"
                          onClick={(e) => handleDeleteEntry(item.id, e)}
                          title="Remove entry"
                          aria-label={`Remove donation by ${item.donorName}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Bar with UPI Handle Quick Copy */}
            <div className="admin-ledger-footer">
              <div className="admin-upi-preview">
                <span className="upi-preview-label">Active Receiver UPI:</span>
                <span className="upi-preview-value">tripambiswas007@pingpay</span>
                <button 
                  type="button" 
                  className="upi-quick-copy-btn"
                  onClick={handleCopyUPI}
                  title="Copy receiver UPI"
                >
                  {copiedUPI ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= VIEWER SUPPORT VIEW (REGULAR USERS) ================= */
          !isDone ? (
            <div className="coffee-modal-content">
              {/* Real Coffee Cup with Smoking Cool Aesthetic Animation */}
              <div className="coffee-modal-hero" aria-hidden="true">
                <div className="coffee-modal-hero-glow" />
                <div className="coffee-modal-cup-frame">
                  <img 
                    src="/assets/images/coffee_cup_real.jpg" 
                    alt="Aesthetic Steaming Coffee" 
                    className="coffee-modal-cup-img" 
                  />
                  {/* Multi-layered smoking steam aesthetic animation */}
                  <div className="aesthetic-smoke-overlay">
                    <span className="smoke-wisp wisp-layer-1" />
                    <span className="smoke-wisp wisp-layer-2" />
                    <span className="smoke-wisp wisp-layer-3" />
                    <span className="smoke-wisp wisp-layer-4" />
                  </div>
                </div>
              </div>

              {/* Warm, intimate creator message */}
              <h3 id="coffee-modal-title" className="coffee-modal-title">
                Keep the lights on. ☕
              </h3>
              <p className="coffee-modal-subtitle">
                Musicly is free, and I'd like to keep it that way.<br />
                If you enjoyed the music, a little coffee goes a long way.
              </p>

              {/* Clean UPI QR Code with Musicly Branding */}
              <div className="coffee-qr-wrapper">
                <div className="coffee-qr-card">
                  <img 
                    src="/assets/images/musicly_qr_code.png" 
                    alt="Musicly coffee support UPI QR code" 
                    className="coffee-qr-img" 
                    loading="eager"
                  />
                </div>
              </div>

              {/* UPI ID Quick-Copy Pill */}
              <div className="coffee-upi-row">
                <button 
                  type="button"
                  className="coffee-upi-id-pill" 
                  onClick={handleCopyUPI}
                  title="Click to copy UPI ID"
                  aria-label="Copy UPI ID tripambiswas007@pingpay"
                >
                  <span className="upi-id-label">UPI ID:</span>
                  <span className="upi-id-text">tripambiswas007@pingpay</span>
                  {copiedUPI ? (
                    <span className="upi-copied-badge"><Check size={12} /> Copied</span>
                  ) : (
                    <span className="upi-copy-action"><Copy size={12} /> Copy</span>
                  )}
                </button>
              </div>

              {/* Heartfelt gesture note */}
              <div className="coffee-caption-block">
                <span className="coffee-gesture-hint">Your little gesture means a lot. ❤️</span>
              </div>
            </div>
          ) : (
            /* Playful Thank-You State */
            <div className="coffee-thankyou-view">
              <div className="coffee-modal-hero thankyou-hero" aria-hidden="true">
                <div className="coffee-modal-hero-glow" />
                <div className="coffee-modal-cup-frame thankyou-cup-frame">
                  <img 
                    src="/assets/images/coffee_cup_real.jpg" 
                    alt="Aesthetic Steaming Coffee" 
                    className="coffee-modal-cup-img" 
                  />
                  <div className="aesthetic-smoke-overlay">
                    <span className="smoke-wisp wisp-layer-1" />
                    <span className="smoke-wisp wisp-layer-2" />
                    <span className="smoke-wisp wisp-layer-3" />
                  </div>
                </div>
              </div>
              <h3 className="coffee-modal-title">Coffee received in spirit. ☕</h3>
              <p className="coffee-thankyou-song">The next song is on me.</p>
              <p className="coffee-thankyou-note">
                Thank you for tuning in and keeping this corner of the web alive.
              </p>
              <div className="coffee-modal-actions">
                <button 
                  type="button" 
                  id="btn-coffee-thankyou-back"
                  className="coffee-back-btn thankyou-back-btn" 
                  onClick={handleClose}
                >
                  ← Back to the music
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* 💭 "Your Thoughts" Floating Below that Whole Box in the Open */}
      <div 
        className={`coffee-below-box-container ${isAdmin ? 'admin-below-box' : ''} ${isClosing ? 'is-closing' : 'is-opening'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button"
          id="btn-coffee-your-thoughts"
          className="coffee-floating-thoughts-btn"
          onClick={handleOpenThoughts}
          title="Share your review & thoughts 💭"
        >
          <span className="thoughts-ambient-halo" />
          <span className="thoughts-shimmer-sweep" />
          <span className="thoughts-cloud-icon">💭</span>
          <span className="thoughts-btn-label">Your Thoughts</span>
          <span className="thoughts-sparkle-dot">✨</span>
        </button>
      </div>
    </div>
  );
}
