import React from 'react';
import {createRoot} from 'react-dom/client';
import GymApp from '../app/gym-app';
import DesktopRoot from '../desktop/root';
import {installDesktopBridge} from '../desktop/bridge';
import '../app/globals.css';
installDesktopBridge();
createRoot(document.getElementById('root')!).render(window.ironpulse?<DesktopRoot/>:<GymApp portable/>);
