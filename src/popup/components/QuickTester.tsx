import { h } from 'preact';
import { useState } from 'preact/hooks';

interface QuickTesterProps {
  onExecuteText: (text: string) => void;
}

export function QuickTester({ onExecuteText }: QuickTesterProps) {
  const [val, setVal] = useState('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!val.trim()) return;
    onExecuteText(val.trim());
    setVal('');
  };

  return (
    <form class="quick-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        class="quick-input"
        placeholder='Test command (e.g. "open youtube", "scroll down")'
        value={val}
        onInput={(e) => setVal((e.target as HTMLInputElement).value)}
      />
      <button type="submit" class="btn" style={{ padding: '8px 12px' }}>
        Run
      </button>
    </form>
  );
}

