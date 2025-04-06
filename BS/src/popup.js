// Popup script for BlockSafe extension
document.addEventListener('DOMContentLoaded', function() {
    // Get the current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        
        if (currentTab && currentTab.url) {
            // Update the domain display
            try {
                const url = new URL(currentTab.url);
                document.getElementById('current-domain').textContent = url.hostname;
                
                // Check the security status for this tab
                checkSecurityStatus(currentTab);
            } catch (error) {
                console.error('Error parsing URL:', error);
                document.getElementById('current-domain').textContent = 'Invalid URL';
                updateStatusUI('unknown');
            }
        } else {
            document.getElementById('current-domain').textContent = 'No active website';
            updateStatusUI('unknown');
        }
    });
});

// Function to check the security status of the current tab
function checkSecurityStatus(tab) {
    // First, check if we have a cached status for this tab
    chrome.runtime.sendMessage({ action: 'getTabStatus' }, function(response) {
        if (response && response.status) {
            updateStatusUI(response.status);
        } else {
            // If no status is available, perform a check now
            try {
                const url = new URL(tab.url);
                
                // Skip checking for browser internal pages
                if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
                    updateStatusUI('safe');
                    return;
                }
                
                // For demo purposes, we'll check against our blacklist directly here as well
                checkAgainstBlacklist(url.hostname);
            } catch (error) {
                console.error('Error checking security status:', error);
                updateStatusUI('unknown');
            }
        }
    });
}

// Function to check a domain against our blacklist
// This is a simplified version for the popup, the main check happens in background.js
async function checkAgainstBlacklist(domain) {
    try {
        const response = await fetch(chrome.runtime.getURL('src/blacklist.json'));
        const data = await response.json();
        
        // Check for exact domain matches
        if (data.phishingDomains.includes(domain)) {
            updateStatusUI('danger');
            return;
        }
        
        // Check for suspicious patterns
        for (const pattern of data.suspiciousPatterns) {
            if (domain.includes(pattern)) {
                updateStatusUI('warning');
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
        
        for (const popularDomain of popularDomains) {
            // Skip if it's the actual legitimate domain
            if (domain === popularDomain.name) continue;
            
            // Check if the domain contains the domain name but isn't exactly the same
            for (const keyword of popularDomain.similar) {
                if (domain.includes(keyword) && domain !== popularDomain.name) {
                    updateStatusUI('warning');
                    return;
                }
            }
        }
        
        // If we reach here, the site appears safe
        updateStatusUI('safe');
        
    } catch (error) {
        console.error('Error loading blacklist:', error);
        updateStatusUI('unknown');
    }
}

// Function to update the UI based on security status
function updateStatusUI(status) {
    const statusContainer = document.getElementById('status-container');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const statusDescription = document.getElementById('status-description');
    
    // Remove all status classes
    statusContainer.classList.remove('status-safe', 'status-warning', 'status-danger', 'status-unknown');
    
    // Update based on status
    switch (status) {
        case 'safe':
            statusContainer.classList.add('status-safe');
            statusIcon.textContent = '✅';
            statusText.textContent = 'Safe Website';
            statusDescription.textContent = 'This website appears to be safe to use.';
            break;
            
        case 'warning':
            statusContainer.classList.add('status-warning');
            statusIcon.textContent = '⚠️';
            statusText.textContent = 'Suspicious Website';
            statusDescription.textContent = 'This website has some suspicious characteristics. Proceed with caution.';
            break;
            
        case 'danger':
            statusContainer.classList.add('status-danger');
            statusIcon.textContent = '🚫';
            statusText.textContent = 'Dangerous Website';
            statusDescription.textContent = 'This website has been flagged as potentially dangerous. We recommend leaving immediately.';
            break;
            
        default:
            statusContainer.classList.add('status-unknown');
            statusIcon.textContent = '❓';
            statusText.textContent = 'Unknown Status';
            statusDescription.textContent = 'We couldn\'t determine the safety of this website.';
            break;
    }
}
