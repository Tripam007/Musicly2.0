import React, { useState } from 'react';
import { X, Key, Check, RotateCcw, Shield } from 'lucide-react';
import { getStoredFirebaseConfig, initFirebase } from '../firebase';

export default function FirebaseConfigModal({
  isOpen,
  onClose
}) {
  const currentConfig = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig.authDomain || '');
  const [projectId, setProjectId] = useState(currentConfig.projectId || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig.appId || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const config = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId
    };
    localStorage.setItem('musicly_firebase_config', JSON.stringify(config));
    initFirebase(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetDefault = () => {
    localStorage.removeItem('musicly_firebase_config');
    initFirebase(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-modal-panel config-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Key className="panel-title-icon" size={22} style={{ color: '#ffb703' }} />
            <div>
              <h3>Firebase Project Settings</h3>
              <p>Connect your personal Google Firebase credentials</p>
            </div>
          </div>
          <button id="btn-close-config" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="config-form">
          <div className="form-group">
            <label>API Key</label>
            <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Auth Domain</label>
            <input type="text" value={authDomain} onChange={(e) => setAuthDomain(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Project ID</label>
            <input type="text" value={projectId} onChange={(e) => setProjectId(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>App ID</label>
            <input type="text" value={appId} onChange={(e) => setAppId(e.target.value)} required />
          </div>

          <div className="modal-actions-row">
            <button type="button" className="preset-chip reset-chip" onClick={handleResetDefault}>
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <button id="btn-save-firebase-config" type="submit" className="auth-submit-btn">
              {savedSuccess ? <><Check size={16} /> Config Saved!</> : 'Save & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
