import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainMenu } from './routes/MainMenu'
import { StarMapScreen } from './routes/StarMapScreen'
import { BattleScreen } from './routes/BattleScreen'
import { StationScreen } from './routes/StationScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/starmap" element={<StarMapScreen />} />
        <Route path="/battle" element={<BattleScreen />} />
        <Route path="/station" element={<StationScreen />} />
      </Routes>
    </BrowserRouter>
  )
}
