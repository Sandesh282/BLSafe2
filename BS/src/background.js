// Background script for BlockSafe extension
// Monitors URL visits and checks against phishing database

// Cache for the blacklist to avoid frequent reads
let phishingDomains = [];
let suspiciousPatterns = [];

// Load the blacklist when the extension starts
async function loadBlacklist() {
  try {
    const response = await fetch(chrome.runtime.getURL('src/blacklist.json'));
    const data = await response.json();
    phishingDomains = data.phishingDomains || [];
    suspiciousPatterns = data.suspiciousPatterns || [];
    console.log('Blacklist loaded successfully:', { 
      domains: phishingDomains.length, 
      patterns: suspiciousPatterns.length 
    });
  } catch (error) {
    console.error('Failed to load blacklist:', error);
  }
}

// Initialize by loading the blacklist
loadBlacklist();

// Listen for tab updates to check URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only check when the page has completed loading
  if (changeInfo.status === 'complete' && tab.url) {
    checkUrl(tab.url, tabId);
  }
});

// Function to check if a URL is in our phishing database
function checkUrl(url, tabId) {
  try {
    // Skip checking extension pages and non-http(s) URLs
    if (!url.startsWith('http')) return;

    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check for exact domain matches
    if (phishingDomains.includes(hostname)) {
      console.log(`⚠️ Blocked phishing site: ${hostname}`);
      showWarning(tabId, url, 'known_phishing');
      return;
    }
    
    // Check for suspicious patterns in the domain
    for (const pattern of suspiciousPatterns) {
      if (hostname.includes(pattern)) {
        console.log(`⚠️ Suspicious pattern detected: ${pattern} in ${hostname}`);
        showWarning(tabId, url, 'suspicious_pattern');
        return;
      }
    }
    
    // Check for typosquatting (similar to popular domains)
    const popularDomains = [
      { name: 'metamask.io', similar: ['metamask'] },
      { name: 'uniswap.org', similar: ['uniswap'] },
      { name: 'opensea.io', similar: ['opensea'] },
      { name: 'phantom.app', similar: ['phantom'] }
    ];
    
    for (const domain of popularDomains) {
      // Skip if it's the actual legitimate domain
      if (hostname === domain.name) continue;
      
      // Check if the hostname contains the domain name but isn't exactly the same
      for (const keyword of domain.similar) {
        if (hostname.includes(keyword) && hostname !== domain.name) {
          console.log(`⚠️ Potential typosquatting detected: ${hostname} similar to ${domain.name}`);
          showWarning(tabId, url, 'typosquatting', domain.name);
          return;
        }
      }
    }
    
    // If we reach here, the site appears safe
    updatePopupStatus(tabId, 'safe');
    
  } catch (error) {
    console.error('Error checking URL:', error);
  }
}

// Function to show a warning page
function showWarning(tabId, url, reason, legitimateDomain = '') {
  // Store information about the blocked site
  chrome.storage.local.set({
    'blocksafe_last_blocked': {
      url: url,
      reason: reason,
      timestamp: Date.now(),
      legitimateDomain: legitimateDomain
    }
  });
  
  // Redirect to our warning page
  const warningUrl = chrome.runtime.getURL('src/warning.html');
  chrome.tabs.update(tabId, { url: warningUrl });
}

// Update the popup status for the current tab
function updatePopupStatus(tabId, status) {
  chrome.storage.local.set({ [`tab_${tabId}_status`]: status });
}

// Listen for messages from popup or warning page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTabStatus') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        chrome.storage.local.get(`tab_${tabId}_status`, (result) => {
          sendResponse({ status: result[`tab_${tabId}_status`] || 'unknown' });
        });
      } else {
        sendResponse({ status: 'unknown' });
      }
    });
    return true; // Required for async sendResponse
  }
  
  if (message.action === 'getLastBlocked') {
    chrome.storage.local.get('blocksafe_last_blocked', (result) => {
      sendResponse({ data: result.blocksafe_last_blocked || null });
    });
    return true; // Required for async sendResponse
  }
});
