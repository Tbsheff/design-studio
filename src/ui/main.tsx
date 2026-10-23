import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/controls.css';
import './styles/forms.css';
import './styles/feedback.css';
import './styles/overlays.css';
import './styles/home.css';
import './styles/layout.css';
import './styles/versions.css';
import './styles/canvas.css';
import './styles/chat.css';
import './styles/composer.css';
import './styles/ai.css';
import './styles/inspector.css';
import './styles/packs.css';
import './styles/token-ui.css';
import './styles/token-pop.css';
import './styles/tokens-panel.css';
import './styles/tweaks.css';
import './styles/variations.css';
import './styles/responsive.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
