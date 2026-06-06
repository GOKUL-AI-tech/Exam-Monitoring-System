// SafeWebcam — never crashes, never calls Permissions API directly
import React, { forwardRef, useState, useEffect } from 'react';

const SafeWebcam = forwardRef(({ className = '', onError, screenshotFormat = 'image/jpeg', ...props }, ref) => {
  const [Webcam, setWebcam] = useState(null);
  const [failed, setFailed]   = useState(false);

  useEffect(() => {
    // Only load if browser supports mediaDevices at all
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setFailed(true);
      if (onError) onError();
      return;
    }

    import('react-webcam')
      .then(mod => setWebcam(() => mod.default))
      .catch(() => { setFailed(true); if (onError) onError(); });
  }, []);

  if (failed) {
    return (
      <div className={`${className} bg-gray-800 rounded-lg flex items-center justify-center`}>
        <span className="text-gray-500 text-xs">No camera</span>
      </div>
    );
  }

  if (!Webcam) {
    return (
      <div className={`${className} bg-gray-800 rounded-lg flex items-center justify-center`}>
        <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Webcam
      ref={ref}
      screenshotFormat={screenshotFormat}
      className={className}
      onUserMediaError={() => {
        setFailed(true);
        if (onError) onError();
      }}
      {...props}
    />
  );
});

SafeWebcam.displayName = 'SafeWebcam';

// getScreenshot passthrough so refs work
export default SafeWebcam;
