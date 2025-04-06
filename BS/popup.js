document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('securityToggle');
    const riskScore = document.getElementById('riskScore');
    const statusEl = document.getElementById('status');
  
    // Initialize default state
    toggle.checked = true;
    riskScore.textContent = "0%";
    statusEl.textContent = "✅ Safe";
    statusEl.className = "status safe";
  
    toggle.addEventListener('change', () => {
      chrome.storage.local.set({ scanEnabled: toggle.checked });
    });
  
    chrome.storage.local.get(['scanEnabled'], (result) => {
      toggle.checked = result.scanEnabled ?? true;
    });
  });
  