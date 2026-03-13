import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Activity from './pages/Activity'
import Network from './pages/Network'
import Gamification from './pages/Gamification'
import Live from './pages/Live'
import Arena from './pages/Arena'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/network" element={<Network />} />
        <Route path="/gamification" element={<Gamification />} />
        <Route path="/live" element={<Live />} />
        <Route path="/arena" element={<Arena />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}
