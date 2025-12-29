/**
 * Captures browser and device metadata for comments
 * Similar to Jam's metadata capture
 */

// Parse user agent for browser info
function getBrowserInfo(userAgent) {
  const browsers = [
    { name: 'Chrome', pattern: /Chrome\/(\d+[\.\d]*)/ },
    { name: 'Firefox', pattern: /Firefox\/(\d+[\.\d]*)/ },
    { name: 'Safari', pattern: /Version\/(\d+[\.\d]*).*Safari/ },
    { name: 'Edge', pattern: /Edg\/(\d+[\.\d]*)/ },
    { name: 'Opera', pattern: /OPR\/(\d+[\.\d]*)/ },
    { name: 'IE', pattern: /MSIE (\d+[\.\d]*)/ },
  ];

  for (const browser of browsers) {
    const match = userAgent.match(browser.pattern);
    if (match) {
      return { name: browser.name, version: match[1] };
    }
  }

  return { name: 'Unknown', version: '' };
}

// Parse user agent for OS info
function getOSInfo(userAgent) {
  const osPatterns = [
    { name: 'Windows 11', pattern: /Windows NT 10\.0.*Win64/ },
    { name: 'Windows 10', pattern: /Windows NT 10\.0/ },
    { name: 'Windows 8.1', pattern: /Windows NT 6\.3/ },
    { name: 'Windows 8', pattern: /Windows NT 6\.2/ },
    { name: 'Windows 7', pattern: /Windows NT 6\.1/ },
    { name: 'macOS', pattern: /Mac OS X (\d+[._]\d+[._]?\d*)/ },
    { name: 'iOS', pattern: /iPhone OS (\d+[._]\d+)/ },
    { name: 'Android', pattern: /Android (\d+[\.\d]*)/ },
    { name: 'Linux', pattern: /Linux/ },
    { name: 'Chrome OS', pattern: /CrOS/ },
  ];

  for (const os of osPatterns) {
    const match = userAgent.match(os.pattern);
    if (match) {
      let version = '';
      if (match[1]) {
        version = match[1].replace(/_/g, '.');
      }
      return { name: os.name, version };
    }
  }

  return { name: 'Unknown', version: '' };
}

// Detect device type
function getDeviceType(userAgent) {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'Tablet';
  }
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(userAgent)) {
    return 'Mobile';
  }
  return 'Desktop';
}

// Get timezone name
function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Unknown';
  }
}

// Get browser language
function getLanguage() {
  return navigator.language || navigator.userLanguage || 'Unknown';
}

/**
 * Captures all metadata about the current browser/device state
 * @param {string} pageUrl - The URL of the page being commented on
 * @param {string} pageTitle - Optional title of the page
 * @returns {Object} Metadata object
 */
export function captureMetadata(pageUrl, pageTitle = '') {
  const userAgent = navigator.userAgent;
  const browserInfo = getBrowserInfo(userAgent);
  const osInfo = getOSInfo(userAgent);

  return {
    browser: {
      name: browserInfo.name,
      version: browserInfo.version,
    },
    os: {
      name: osInfo.name,
      version: osInfo.version,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    pageUrl: pageUrl || window.location.href,
    pageTitle: pageTitle || document.title,
    timezone: getTimezone(),
    language: getLanguage(),
    deviceType: getDeviceType(userAgent),
    userAgent: userAgent,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Formats metadata for display
 * @param {Object} metadata - The metadata object
 * @returns {Array} Array of { label, value, icon } objects
 */
export function formatMetadataForDisplay(metadata) {
  if (!metadata) return [];

  const items = [];

  if (metadata.pageUrl) {
    items.push({
      label: 'URL',
      value: metadata.pageUrl,
      icon: 'globe',
      isLink: true,
    });
  }

  if (metadata.capturedAt) {
    const date = new Date(metadata.capturedAt);
    items.push({
      label: 'Timestamp',
      value: date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
      icon: 'clock',
    });
  }

  if (metadata.os?.name) {
    items.push({
      label: 'OS',
      value: `${metadata.os.name}${metadata.os.version ? ' ' + metadata.os.version : ''}`,
      icon: 'monitor',
    });
  }

  if (metadata.browser?.name) {
    items.push({
      label: 'Browser',
      value: `${metadata.browser.name} ${metadata.browser.version || ''}`.trim(),
      icon: 'chrome',
    });
  }

  if (metadata.viewport?.width && metadata.viewport?.height) {
    items.push({
      label: 'Window size',
      value: `${metadata.viewport.width}×${metadata.viewport.height}`,
      icon: 'maximize',
    });
  }

  if (metadata.screen?.width && metadata.screen?.height) {
    items.push({
      label: 'Screen',
      value: `${metadata.screen.width}×${metadata.screen.height}${metadata.screen.pixelRatio > 1 ? ` @${metadata.screen.pixelRatio}x` : ''}`,
      icon: 'monitor',
    });
  }

  if (metadata.deviceType) {
    items.push({
      label: 'Device',
      value: metadata.deviceType,
      icon: metadata.deviceType === 'Mobile' ? 'smartphone' : metadata.deviceType === 'Tablet' ? 'tablet' : 'monitor',
    });
  }

  if (metadata.timezone) {
    items.push({
      label: 'Timezone',
      value: metadata.timezone,
      icon: 'map-pin',
    });
  }

  if (metadata.language) {
    items.push({
      label: 'Language',
      value: metadata.language,
      icon: 'languages',
    });
  }

  return items;
}

export default captureMetadata;

