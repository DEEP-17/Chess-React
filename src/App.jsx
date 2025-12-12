import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your pages
import Landing from './pages/Landing';
import Game from './pages/Game';
import PlayStockfish from './pages/PlayStockfish';
import PassAndPlay from './pages/PassAndPlay';
import Evaluate from './pages/Evaluate';
import SignIn from './pages/SignIn';
import Rules from './pages/Rules';
import Profile from './pages/Profile';
import PassAndPlay960 from './pages/PassAndPlay960';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game" element={<Game />} />
        <Route path="/stockfish" element={<PlayStockfish />} />
        <Route path="/pass-play" element={<PassAndPlay />} />
        <Route path="/evaluate" element={<Evaluate />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/PassAndPlay960" element={<PassAndPlay960 />} />
      </Routes>
    </Router>
  );
}

export default App;