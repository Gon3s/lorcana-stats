/**
 * screens.js — Transitions entre écrans (SRP)
 * Responsabilité unique : afficher / masquer les trois écrans.
 */

const SCREENS = {
  upload:    { id: 'upload-screen',  display: 'flex'  },
  loading:   { id: 'loading-screen', display: 'flex'  },
  dashboard: { id: 'dashboard',      display: 'block' },
};

function showOnly(active) {
  for (const [key, { id, display }] of Object.entries(SCREENS)) {
    document.getElementById(id).style.display = key === active ? display : 'none';
  }
}

export const showUploadScreen  = () => showOnly('upload');
export const showLoadingScreen = () => showOnly('loading');
export const showDashboard     = () => showOnly('dashboard');
