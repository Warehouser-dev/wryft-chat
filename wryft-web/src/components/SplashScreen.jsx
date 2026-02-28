import { useState, useEffect } from 'react';
import '../styles/SplashScreen.css';

const funFacts = [
  "Fun fact: Wryft Is Made In Sweden 🇸🇪",
  "Fun fact: Voice channels use WebRTC technology",
  "Fun fact: You can customize your theme in settings",
  "Fun fact: Premium is kinda cheap here",
  "Fun fact: Wryft is made by a 15 year old",
  "Fun fact: You can drag and drop files to share",
  "Fun fact: Dark mode is better for your eyes",
  "Fun fact: We dont ask for your ID :)",
];

function SplashScreen({ isConnecting }) {
  const [funFact, setFunFact] = useState('');

  useEffect(() => {
    const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
    setFunFact(randomFact);
  }, []);

  if (!isConnecting) return null;

  return (
    <div className="splash-screen">
      <div className="splash-logo">
        <img src="/wryfttransparent.png" alt="Wryft" width="100" height="100" />
      </div>
      <h1 className="splash-title">STARTING...</h1>
      <p className="splash-fun-fact">{funFact}</p>
    </div>
  );
}

export default SplashScreen;
