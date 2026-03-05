import { useState, useRef, useEffect } from 'react';

function ColorPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [hexInput, setHexInput] = useState(value);
  const pickerRef = useRef(null);
  const canvasRef = useRef(null);

  const presetColors = [
    '#5865F2', // Discord Blurple
    '#99AAB5', // Gray
    '#2ECC71', // Green
    '#F1C40F', // Yellow
    '#9B59B6', // Purple
  ];

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 100);
  };

  // Convert hex to HSL
  useEffect(() => {
    const hex = value.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    setHue(Math.round(h * 360));
    setSaturation(Math.round(s * 100));
    setLightness(Math.round(l * 100));
    setHexInput(value);
  }, [value]);

  // Convert HSL to hex
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    const toHex = (n) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleSaturationLightnessChange = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    const newSaturation = (x / rect.width) * 100;
    const newLightness = 100 - (y / rect.height) * 100;
    
    setSaturation(newSaturation);
    setLightness(newLightness);
    
    const hex = hslToHex(hue, newSaturation, newLightness);
    setHexInput(hex);
    onChange(hex);
  };

  const handleHueChange = (e) => {
    const newHue = parseInt(e.target.value);
    setHue(newHue);
    const hex = hslToHex(newHue, saturation, lightness);
    setHexInput(hex);
    onChange(hex);
  };

  const handleHexInput = (e) => {
    let input = e.target.value;
    if (!input.startsWith('#')) input = '#' + input;
    setHexInput(input);
    
    if (/^#[0-9A-F]{6}$/i.test(input)) {
      onChange(input);
    }
  };

  const handlePresetClick = (color) => {
    onChange(color);
    handleClose();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="color-picker-wrapper" ref={pickerRef}>
      <div 
        className="color-picker-swatch"
        style={{ background: value }}
        onClick={() => setIsOpen(!isOpen)}
      />
      
      {isOpen && (
        <div className={`color-picker-popover ${isClosing ? 'closing' : ''}`}>
          <div 
            className="color-picker-saturation"
            ref={canvasRef}
            style={{ background: `hsl(${hue}, 100%, 50%)` }}
            onMouseDown={(e) => {
              handleSaturationLightnessChange(e);
              const handleMove = (e) => handleSaturationLightnessChange(e);
              const handleUp = () => {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleUp);
              };
              document.addEventListener('mousemove', handleMove);
              document.addEventListener('mouseup', handleUp);
            }}
          >
            <div className="color-picker-saturation-white">
              <div className="color-picker-saturation-black">
                <div 
                  className="color-picker-cursor"
                  style={{
                    left: `${saturation}%`,
                    top: `${100 - lightness}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="color-picker-hue-wrapper">
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={handleHueChange}
              className="color-picker-hue-slider"
            />
          </div>

          <div className="color-picker-hex-input">
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInput}
              maxLength="7"
              placeholder="#000000"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ColorPicker;
