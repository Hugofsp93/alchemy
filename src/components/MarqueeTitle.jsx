import { useState, useEffect, useRef, forwardRef } from 'react';

const MarqueeTitle = forwardRef(({ value, onChange, placeholder = 'Title' }, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const inputRef = useRef(null);

  const setInputRef = (element) => {
    inputRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  };

  const checkOverflow = () => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      setIsOverflowing(textWidth > containerWidth);
    }
  };

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={setInputRef}
        className="editor-title editing"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div
      className={`editor-title-container ${isOverflowing ? 'overflowing' : ''}`}
      ref={containerRef}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <div className="editor-title-marquee-wrapper">
        <span ref={textRef} className="editor-title-text">
          {value || placeholder}
        </span>
        {isOverflowing && (
          <span className="editor-title-text duplicate">
            {value || placeholder}
          </span>
        )}
      </div>
    </div>
  );
});

MarqueeTitle.displayName = 'MarqueeTitle';

export default MarqueeTitle;
